#!/usr/bin/env python3
"""
Write a capture.py plan that brings data/sectors/ up to a new end date.

`scripts/build_market_data.py` is a pure transform: the bundle it writes can
only be as current as the recordings on disk. Fetching those recordings is the
harness's job, not this repository's — `research/harness/src/capture.py` in the
Sectors research repo already owns the credit discipline (idempotent per slug,
hard budget cap, ledger, never re-pays a 404, resumable sweeps). This script
does the one thing the harness cannot know: which recordings *this* app reads,
and what window they should cover next.

It reads the recordings present in data/sectors/, looks each slug up in the
harness manifest for the request that produced it, keeps the ones whose params
pin a date window, and re-asks those with the window extended to --end. A
window call costs the same credit whether it spans twelve days or fifty, so
extending is the cheapest way to acquire the missing days and it leaves one
coherent window behind rather than two adjacent ones to stitch.

Recordings with no date window are left alone by default: company report,
segments, shareholders, financials, free-float and the taxonomy feeds move too
slowly to be worth a credit a day.

`--adopt-window` is for the other kind. `/v2/foreign-flow/` and
`/v2/broker-summary/{symbol}/top/` were first recorded with no parameters at
all, so they carry whatever trailing window the API chose on the day they were
fetched — 2026-06-08..2026-09-04 for one and 2026-06-15..2026-09-13 for the
other. `build_market_data.py` then sums the flow rows that fall inside the
*daily* window and divides by the *daily* window's traded value, so the moment
the daily recordings moved ahead of the flow recording the numerator covered
fewer sessions than the denominator and the resulting share understated itself.
Asking for the window explicitly puts all three feeds on one span, and makes
the window a thing this repository states rather than a thing the API happened
to pick.

    python3 scripts/plan_sectors_refresh.py --end 2026-09-23
    python3 scripts/plan_sectors_refresh.py --end 2026-09-23 \
        --adopt-window /v2/foreign-flow/ /v2/broker-summary/
    # then, from the Sectors repo:
    SECTORS_API_KEY=... python3 research/harness/src/capture.py \
        --plan <printed path> --dry-run
"""
import argparse
import json
import os
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"

# The harness that owns the recorder, its manifest, and the credit ledger.
# Overridable so a checkout somewhere else still works; nothing here writes to it.
HARNESS = Path(os.environ.get("SECTORS_HARNESS", Path.home() / "dumpProject" / "Sectors" / "research" / "harness"))

# Params that pin a date window. A recording carrying both is the only kind
# this refresh re-asks; everything else is left where it is.
DATE_KEYS = ("start", "end")


def load_manifest() -> dict:
    path = HARNESS / "recorded" / "_manifest.json"
    if not path.exists():
        raise SystemExit(
            f"harness manifest not found at {path}. Set SECTORS_HARNESS to the "
            f"research/harness directory of the Sectors repository."
        )
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--end", default=date.today().isoformat(), help="new last day of the window (default: today)")
    parser.add_argument("--out", default=None, help="where to write the plan (default: the harness plans/ directory)")
    parser.add_argument("--adopt-window", nargs="*", default=[], metavar="PATH_PREFIX",
                        help="paths whose recordings carry no window but should be re-asked with one "
                             "(e.g. /v2/foreign-flow/ /v2/broker-summary/)")
    parser.add_argument("--start", default=None,
                        help="window start for --adopt-window paths (default: the start the windowed recordings already pin)")
    args = parser.parse_args()

    new_end = date.fromisoformat(args.end)
    manifest = load_manifest()

    slugs = sorted(p.name[: -len(".json")] for p in RAW.glob("v2_*.json"))
    unknown = [s for s in slugs if s not in manifest]
    if unknown:
        raise SystemExit(
            "these recordings have no entry in the harness manifest, so the request "
            "that produced them cannot be reconstructed:\n  " + "\n  ".join(unknown)
        )

    # The start every windowed recording already agrees on, so an adopted
    # window lines up with the ones that have had it all along.
    starts = {
        str((manifest[s].get("params") or {})["start"])
        for s in slugs
        if all(key in (manifest[s].get("params") or {}) for key in DATE_KEYS)
    }
    if args.start:
        window_start = args.start
    elif len(starts) == 1:
        window_start = starts.pop()
    else:
        raise SystemExit(f"cannot infer a window start (found {sorted(starts)}); pass --start explicitly")

    calls, skipped = [], []
    for slug in slugs:
        entry = manifest[slug]
        params = dict(entry.get("params") or {})
        windowed = all(key in params for key in DATE_KEYS)

        if not windowed:
            if not any(entry["path"].startswith(prefix) for prefix in args.adopt_window):
                skipped.append(slug)
                continue
            params["start"] = window_start
            params["end"] = new_end.isoformat()
            note = f"catalyst refresh — {slug} adopts the stated window instead of the API default"
        else:
            if date.fromisoformat(str(params["end"])) >= new_end:
                skipped.append(slug)
                continue
            params["end"] = new_end.isoformat()
            note = f"catalyst refresh — extends {slug} to {new_end.isoformat()}"

        calls.append({
            "tier": 0,
            "path": entry["path"],
            "params": params,
            "est_cost": entry.get("est_cost", 1),
            "note": note,
            # The recording this call replaces. Carried in the plan so
            # sync_sectors_recordings.py does not have to re-derive the
            # mapping and risk disagreeing with the plan that was paid for.
            "replaces": slug,
        })

    plan = {
        "name": f"Catalyst window refresh to {new_end.isoformat()}",
        "notes": [
            "Generated by scripts/plan_sectors_refresh.py from data/sectors/ plus the harness manifest.",
            "Only recordings that pin a date window are re-asked; the window is extended, not shifted, "
            "so the existing days are kept and the missing ones are acquired in the same paid call.",
            f"Recordings left untouched on purpose: {len(skipped)}.",
        ],
        "calls": calls,
    }

    out = Path(args.out) if args.out else HARNESS / "plans" / f"plan-catalyst-refresh-{new_end.isoformat()}.json"
    out.write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")

    total = sum(call["est_cost"] for call in calls)
    print(f"{len(calls)} calls, {total} credits estimated — {len(skipped)} recordings left untouched")
    print(f"plan written to {out}")
    print("\nnext:")
    print(f"  SECTORS_API_KEY=... python3 {HARNESS / 'src' / 'capture.py'} --plan {out} --dry-run")
    print(f"  SECTORS_API_KEY=... python3 {HARNESS / 'src' / 'capture.py'} --plan {out} --budget {total}")
    print(f"  python3 {Path(__file__).parent / 'sync_sectors_recordings.py'} --end {new_end.isoformat()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
