#!/usr/bin/env python3
"""
Re-record the Sectors feeds in data/sectors/ up to a new end date.

`scripts/build_market_data.py` is a pure transform: the bundle it writes is only
as current as the recordings on disk. This is what moves them. It runs from this
repository alone — the scheduled refresh executes in a container that has the
repo and nothing else, so the request for each recording is read from
`data/sectors/_requests.json` rather than from a sibling research checkout.

Which recordings move, and why all of them move together:

  `build_market_data.py` loads daily, news, filings and foreign-flow for every
  symbol at one shared window, and derives the timeline from the intersection of
  the IHSG dates with every symbol's daily dates. Refreshing a subset would not
  advance that intersection — the unrefreshed symbols hold it back — and the
  build would fail on the filenames that no longer exist. So every windowed
  recording is re-asked, or none is. Recordings with no window (company report,
  segments, shareholders, financials, free-float, taxonomy, mining) move far too
  slowly to be worth a credit a day and are left alone.

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

The key is read from $SECTORS_API_KEY. It is never logged, never placed in a
URL, and never written to a recording.
"""
import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"
REGISTRY = RAW / "_requests.json"
LEDGER = RAW / "_ledger.jsonl"
BASE_URL = os.environ.get("SECTORS_BASE_URL", "https://api.sectors.app")

# Rate discipline, mirrored from lib/data/sectors-client.ts so the two callers
# cannot disagree about what the API tolerates.
RATE_WINDOW_S = 30.0
RATE_LIMIT = 25
MIN_CALL_SPACING_S = 1.5
TIMEOUT_S = 90

DATE_KEYS = ("start", "end")


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


def load_registry() -> dict:
    if not REGISTRY.exists():
        raise SystemExit(f"{REGISTRY} is missing — it records the request behind each recording")
    return json.loads(REGISTRY.read_text(encoding="utf-8"))


def save_registry(registry: dict) -> None:
    REGISTRY.write_text(json.dumps(registry, indent=2, sort_keys=True) + "\n", encoding="utf-8")


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
    request = urllib.request.Request(url, headers={"Authorization": api_key})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_S) as response:
            return response.read()
    except urllib.error.HTTPError as error:
        # Carry the API's own reason: on a non-refillable grant the move after
        # an opaque failure is a blind retry, which is what this guards against.
        detail = error.read().decode("utf-8", "replace")[:300]
        raise RuntimeError(f"HTTP {error.code} on {path}: {detail}") from None


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
    parser.add_argument("--end", default=date.today().isoformat(), help="new last day of the window (default: today)")
    parser.add_argument("--max-credits", type=int, default=120, help="abort before exceeding this many credits in one run")
    args = parser.parse_args()

    new_end = date.fromisoformat(args.end)
    registry = load_registry()
    requests = registry["requests"]

    plan = []
    for slug, entry in sorted(requests.items()):
        params = dict(entry.get("params") or {})
        if not all(key in params for key in DATE_KEYS):
            continue
        if date.fromisoformat(str(params["end"])) >= new_end:
            continue
        params["end"] = new_end.isoformat()
        plan.append({
            "replaces": slug,
            "slug": slug_for(entry["path"], params),
            "path": entry["path"],
            "params": params,
            "cost": entry.get("est_cost", 1),
        })

    total = sum(item["cost"] for item in plan)
    print(f"{len(plan)} calls, {total} credits — window ends {new_end.isoformat()}")
    print(f"ledger to date: {spent_so_far()} credits ({LEDGER.relative_to(ROOT)})")
    if not plan:
        print("nothing to refresh: every windowed recording already reaches that date.")
        return 0
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
    for item in plan:
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

        target = RAW / f"{item['slug']}.json"
        temp = target.with_suffix(".json.tmp")
        temp.write_text(json.dumps(parsed, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        temp.replace(target)
        written += 1
        spent += item["cost"]

        superseded = RAW / f"{item['replaces']}.json"
        if superseded != target and superseded.exists():
            superseded.unlink()
        requests.pop(item["replaces"], None)
        requests[item["slug"]] = {"path": item["path"], "params": item["params"], "est_cost": item["cost"]}

        with LEDGER.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps({"path": item["path"], "params": item["params"], "cost": item["cost"],
                                     "at": datetime.now(timezone.utc).isoformat(), "run": run_id},
                                    separators=(",", ":")) + "\n")
        save_registry(registry)
        print(f"  {spent:>4}c  {item['slug']}")

    print(f"\nwrote {written}/{len(plan)} recordings, spent {spent} credits this run.")
    if written != len(plan):
        print("Some calls did not land — the bundle still has one window only if every call did.", file=sys.stderr)
        return 1
    print("Next: python3 scripts/build_market_data.py")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
