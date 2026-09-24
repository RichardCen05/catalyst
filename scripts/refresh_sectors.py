#!/usr/bin/env python3
"""
Re-record the Sectors feeds in data/sectors/ up to a new end date.

`scripts/build_market_data.py` is a pure transform: the bundle it writes is only
as current as the recordings on disk. This is what moves them. It runs from this
repository alone — the scheduled refresh executes in a container that has the
repo and nothing else, so the request for each recording is read from
`data/sectors/_requests.json` rather than from a sibling research checkout.

Which recordings move, and when:

  Every session: daily prices for every symbol, the IHSG index and foreign
  flow. `build_market_data.py` derives the timeline from the intersection of
  the IHSG dates with every symbol's daily dates, so refreshing a subset of
  symbols would not advance it — all of a feed's symbols move together.

  Every --slow-every days (default 3, so about twice a week): news, filings and
  broker summaries. They are 48 of the 85 credits a full run costs, and the
  build dates what it derives from them by their own window, not by the price
  timeline, so a lag never reads as a claim about days they do not cover.

  Recordings with no window (company report, segments, shareholders,
  financials, free-float, taxonomy, mining) move far too slowly to be worth a
  credit a day and are left alone.

Extending beats shifting: a window call costs the same credit whether it spans
twelve days or fifty, so asking for a later `end` with the same `start` acquires
the missing days in the same paid call and leaves one coherent window behind
rather than two adjacent ones to stitch.

The grant is 1,000 credits, non-renewable, and expires at the end of the event.
Guardrails: dry-run by default, a hard --max-credits ceiling checked before each
call, 25 calls per 30s with 1.5s spacing (matching lib/data/sectors-client.ts),
and a ledger at data/sectors/_ledger.jsonl. Three consecutive failures abort the
run rather than spend the grant proving the plan is wrong.

    python3 scripts/refresh_sectors.py                     # plan + cost, spends nothing
    python3 scripts/refresh_sectors.py --execute
    python3 scripts/refresh_sectors.py --execute --end 2026-09-30

Unattended runs (cloudbuild-refresh.yaml) add three things, so the job can be
tried several times an evening without paying for each try:

  --adopt DIR       start from the recordings the last scheduled run deployed,
                    when they hold a later session than the snapshot does;
  --probe           ask the one-credit IHSG window first, and spend the rest
                    only if it holds a session the recordings do not;
  --status-file F   write "deploy" when the recordings now hold a later session
                    than --live-url serves, "skip" otherwise, for the build
                    steps after this one to read.

The key is read from $SECTORS_API_KEY. It is never logged, never placed in a
URL, and never written to a recording.
"""
import argparse
import json
import os
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"
REGISTRY = RAW / "_requests.json"
LEDGER = RAW / "_ledger.jsonl"
BASE_URL = os.environ.get("SECTORS_BASE_URL", "https://api.sectors.app")
# Sectors sits behind Cloudflare, which answers urllib's default
# "Python-urllib/x.y" signature with 403 "error code: 1010" before the request
# reaches the API — no credit spent, and no data either. Any named client passes.
USER_AGENT = "catalyst-refresh/1.0 (+https://catalyst-web-ibyebnreqa-uc.a.run.app)"

# Rate discipline, mirrored from lib/data/sectors-client.ts so the two callers
# cannot disagree about what the API tolerates.
RATE_WINDOW_S = 30.0
RATE_LIMIT = 25
MIN_CALL_SPACING_S = 1.5
TIMEOUT_S = 90

DATE_KEYS = ("start", "end")
# The feeds build_market_data.py intersects to find the last session. Only these
# say which trading day the recordings actually hold.
PRICE_PATHS = ("/v2/daily/", "/v2/index-daily/")
# The cheapest windowed feed, and the one every session appears in first.
PROBE_PATH = "/v2/index-daily/"
# Re-asked every session. Everything else windowed waits for --slow-every.
SESSION_PATHS = PRICE_PATHS + ("/v2/foreign-flow/",)
EXCHANGE_TZ = ZoneInfo("Asia/Jakarta")


def slug_for(path: str, params: dict) -> str:
    """The recording filename a request implies.

    Same rule the recordings on disk already follow: path segments joined by
    underscores, then the parameters in sorted order as `key-value`.
    """
    base = path.strip("/").replace("/", "_")
    if not params:
        return base
    tail = "_".join(f"{key}-{params[key]}" for key in sorted(params))
    return f"{base}__{tail}"


def rows_of(payload) -> list:
    if isinstance(payload, dict):
        payload = payload.get("data") or payload.get("results") or []
    return payload if isinstance(payload, list) else []


def sessions_in(payload) -> set:
    return {str(row["date"])[:10] for row in rows_of(payload) if isinstance(row, dict) and row.get("date")}


def is_windowed(entry: dict) -> bool:
    params = entry.get("params") or {}
    return all(key in params for key in DATE_KEYS)


def last_recorded_session(requests: dict, directory: Path = RAW):
    """The last trading day every price recording actually holds.

    A request's `end` is what was asked for, not what came back. A window asked
    for during the trading day carries today's date in its name while its rows
    stop at yesterday's close, and judging "already current" by the name alone
    left the board a day behind with nothing to make it catch up: the scheduled
    run saw `end` = today and spent nothing. This reads the rows, and takes the
    intersection the build takes, so it agrees with the bundle's asOf.
    """
    sessions = None
    for slug, entry in requests.items():
        if not str(entry.get("path", "")).startswith(PRICE_PATHS):
            continue
        recording = directory / f"{slug}.json"
        if not recording.exists():
            return None
        dates = sessions_in(json.loads(recording.read_text(encoding="utf-8")))
        sessions = dates if sessions is None else sessions & dates
    if not sessions:
        return None
    return date.fromisoformat(max(sessions))


def load_registry() -> dict:
    if not REGISTRY.exists():
        raise SystemExit(f"{REGISTRY} is missing — it records the request behind each recording")
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def save_registry(registry: dict) -> None:
    REGISTRY.write_text(json.dumps(registry, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def adopt(published: Path, registry: dict) -> bool:
    """Swap in the windowed recordings the last scheduled run deployed.

    The snapshot the job runs from is frozen when a human uploads it; the
    recordings the job fetched since live only in the bucket it publishes to.
    Starting from those makes "already current" true across runs, so a second
    or third attempt in one evening spends nothing once the first has landed.

    Only the windowed recordings move, and only when the published set asks for
    the same feeds: a snapshot that added or dropped a feed knows something the
    bucket does not, and wins.
    """
    source = published / REGISTRY.name
    if not source.exists():
        print(f"adopt: nothing published at {published}")
        return False
    theirs = json.loads(source.read_text(encoding="utf-8"))["requests"]
    ours = registry["requests"]
    their_windowed = {slug: entry for slug, entry in theirs.items() if is_windowed(entry)}
    our_windowed = {slug: entry for slug, entry in ours.items() if is_windowed(entry)}
    if {e["path"] for e in their_windowed.values()} != {e["path"] for e in our_windowed.values()}:
        print("adopt: published recordings ask for different feeds than the snapshot — keeping the snapshot")
        return False
    their_last = last_recorded_session(their_windowed, published)
    our_last = last_recorded_session(our_windowed)
    if their_last is None or (our_last is not None and their_last <= our_last):
        print(f"adopt: published rows reach {their_last}, snapshot reaches {our_last} — keeping the snapshot")
        return False
    for slug in our_windowed:
        (RAW / f"{slug}.json").unlink(missing_ok=True)
        ours.pop(slug)
    for slug, entry in their_windowed.items():
        shutil.copyfile(published / f"{slug}.json", RAW / f"{slug}.json")
        ours[slug] = entry
    save_registry(registry)
    print(f"adopt: took the published recordings, rows reach {their_last} (snapshot reached {our_last})")
    return True


def live_session(url: str):
    """The session the serving revision reports, or None when it cannot say."""
    try:
        with urllib.request.urlopen(url, timeout=TIMEOUT_S) as response:
            as_of = json.loads(response.read()).get("dataAsOf")
        return date.fromisoformat(str(as_of)[:10]) if as_of else None
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"live: could not read {url}: {error}", file=sys.stderr)
        return None


def write_status(path, verdict: str, reason: str) -> None:
    print(f"status: {verdict} — {reason}")
    if path:
        Path(path).write_text(verdict + "\n", encoding="utf-8")


class RateLimiter:
    def __init__(self) -> None:
        self.calls: list[float] = []
        self.last = 0.0

    def wait(self) -> None:
        if self.last:
            gap = MIN_CALL_SPACING_S - (time.monotonic() - self.last)
            if gap > 0:
                time.sleep(gap)
        now = time.monotonic()
        self.calls = [t for t in self.calls if now - t <= RATE_WINDOW_S]
        if len(self.calls) >= RATE_LIMIT:
            time.sleep(max(0.0, RATE_WINDOW_S - (now - self.calls[0]) + 0.1))
            now = time.monotonic()
            self.calls = [t for t in self.calls if now - t <= RATE_WINDOW_S]
        self.calls.append(time.monotonic())
        self.last = self.calls[-1]


def fetch(path: str, params: dict, api_key: str) -> bytes:
    url = f"{BASE_URL}{path}"
    if params:
        url = f"{url}?{urllib.parse.urlencode(params)}"
    request = urllib.request.Request(url, headers={"Authorization": api_key, "User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # Carry the API's own reason: on a non-refillable grant the move after
        # an opaque failure is a blind retry, which is what this guards against.
        detail = error.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"HTTP {error.code} on {path}: {detail}") from None
    except (urllib.error.URLError, TimeoutError) as error:
        # A dropped connection counts toward the three-failure abort like any
        # other failed call, instead of killing the run between recordings.
        raise RuntimeError(f"network error on {path}: {error}") from None


def spent_so_far() -> int:
    if not LEDGER.exists():
        return 0
    total = 0
    for line in LEDGER.read_text(encoding="utf-8").splitlines():
        if line.strip():
            try:
                total += json.loads(line).get("cost", 0)
            except json.JSONDecodeError:
                continue
    return total


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--execute", action="store_true", help="spend credit and write recordings (default: plan only)")
    parser.add_argument("--end", default=datetime.now(EXCHANGE_TZ).date().isoformat(),
                        help="new last day of the window (default: today on the exchange's clock)")
    parser.add_argument("--max-credits", type=int, default=120, help="abort before exceeding this many credits in one run")
    parser.add_argument("--adopt", type=Path, help="directory holding the recordings the last scheduled run published")
    parser.add_argument("--probe", action="store_true", help="spend the rest only if the IHSG window holds a new session")
    parser.add_argument("--status-file", help='write "deploy" or "skip" here for the steps after this one')
    parser.add_argument("--live-url", help="health endpoint of the serving revision; its dataAsOf decides the status")
    parser.add_argument("--slow-every", type=int, default=3,
                        help="re-ask news, filings and broker summaries once their window is this many days old")
    parser.add_argument("--all", action="store_true", help="re-ask every windowed feed now, whatever its age")
    args = parser.parse_args()

    new_end = date.fromisoformat(args.end)
    registry = load_registry()
    if args.adopt:
        adopt(args.adopt, registry)
    requests = registry["requests"]

    # Behind when the rows stop short of the new end on a weekday. The exchange
    # never trades on a weekend, so a Saturday run whose rows end on Friday is
    # current and is not re-asked.
    start_session = last_recorded_session(requests)
    behind = start_session is None or (start_session < new_end and new_end.weekday() < 5)

    plan = []
    for slug, entry in sorted(requests.items()):
        params = dict(entry.get("params") or {})
        if not is_windowed(entry):
            continue
        asked_to = date.fromisoformat(str(params["end"]))
        if entry["path"].startswith(SESSION_PATHS):
            due = asked_to < new_end or behind
        else:
            due = args.all or (new_end - asked_to).days >= args.slow_every
        if not due:
            continue
        params["end"] = new_end.isoformat()
        plan.append({
            "replaces": slug,
            "slug": slug_for(entry["path"], params),
            "path": entry["path"],
            "params": params,
            "cost": entry.get("est_cost", 1),
        })
    # The probe goes first, so a session Sectors has not published yet costs one
    # credit instead of the whole window.
    plan.sort(key=lambda item: not item["path"].startswith(PROBE_PATH))

    total = sum(item["cost"] for item in plan)
    print(f"{len(plan)} calls, {total} credits — window ends {new_end.isoformat()}; "
          f"rows on disk reach {start_session.isoformat() if start_session else 'nothing'}")
    print(f"ledger to date: {spent_so_far()} credits ({LEDGER.relative_to(ROOT)})")
    if not plan:
        print("nothing to refresh: every windowed recording already reaches that date.")
        return finish(args, requests)
    for item in plan:
        print(f"  {item['cost']:>2}c  {item['path']}?{urllib.parse.urlencode(item['params'])}")

    if not args.execute:
        print("\ndry run — nothing fetched, nothing written. Re-run with --execute to spend.")
        return 0
    if total > args.max_credits:
        raise SystemExit(f"plan costs {total} credits, over --max-credits={args.max_credits}")

    api_key = (os.environ.get("SECTORS_API_KEY") or "").strip()
    if not api_key:
        raise SystemExit("no API key — set SECTORS_API_KEY. Never pass the key as an argument.")

    limiter = RateLimiter()
    run_id = datetime.now(timezone.utc).isoformat()
    spent = failures = written = 0
    for index, item in enumerate(plan):
        limiter.wait()
        try:
            body = fetch(item["path"], item["params"], api_key)
            parsed = json.loads(body)
        except (RuntimeError, json.JSONDecodeError) as error:
            failures += 1
            print(f"  FAIL {item['slug']}: {error}", file=sys.stderr)
            if failures >= 3:
                raise SystemExit("three consecutive failures — aborting before more credit is spent")
            continue
        failures = 0
        spent += item["cost"]
        with LEDGER.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"path": item["path"], "params": item["params"], "cost": item["cost"],
                                     "at": datetime.now(timezone.utc).isoformat(), "run": run_id},
                                    separators=(",", ":")) + "\n")

        if args.probe and index == 0 and item["path"].startswith(PROBE_PATH):
            newest = max(sessions_in(parsed), default=None)
            if start_session is not None and (newest is None or date.fromisoformat(newest) <= start_session):
                # Nothing is written: one recording at a new window beside the
                # rest at the old one is a bundle the build refuses.
                print(f"probe: IHSG rows still end at {newest}; Sectors has no session after "
                      f"{start_session} yet. Spent {spent} credit, wrote nothing.")
                return finish(args, requests)
            print(f"probe: IHSG rows reach {newest} — fetching the rest")

        target = RAW / f"{item['slug']}.json"
        temp = target.with_suffix(".json.tmp")
        temp.write_text(json.dumps(parsed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temp.replace(target)
        written += 1

        superseded = RAW / f"{item['replaces']}.json"
        if superseded != target and superseded.exists():
            superseded.unlink()
        requests.pop(item["replaces"], None)
        requests[item["slug"]] = {"path": item["path"], "params": item["params"], "est_cost": item["cost"]}
        save_registry(registry)
        print(f"  {spent:>4}c  {item['slug']}")

    print(f"\nwrote {written}/{len(plan)} recordings, spent {spent} credits this run.")
    if written != len(plan):
        print("Some calls did not land — the bundle still has one window only if every call did.", file=sys.stderr)
        return 1
    print("Next: python3 scripts/build_market_data.py")
    return finish(args, requests)


def finish(args, requests: dict) -> int:
    """Decide whether the recordings on disk are worth a deploy."""
    if not args.status_file and not args.live_url:
        return 0
    ours = last_recorded_session(requests)
    live = live_session(args.live_url) if args.live_url else None
    if ours is None:
        write_status(args.status_file, "skip", "the recordings on disk hold no complete session")
    elif live is None:
        write_status(args.status_file, "deploy", f"rows reach {ours}; the live session is unknown")
    elif ours > live:
        write_status(args.status_file, "deploy", f"rows reach {ours}, live serves {live}")
    else:
        write_status(args.status_file, "skip", f"rows reach {ours}, live already serves {live}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
