#!/usr/bin/env python3
"""
Copy the recordings a refresh plan paid for out of the harness into data/sectors/.

`scripts/plan_sectors_refresh.py` writes the plan, `capture.py` in the Sectors
research repo spends the credit and writes the responses into its own
`recorded/` directory, and this script moves the results across.

The plan is the instruction, not a guess: each call carries the `replaces` slug
it was generated for, so the file that lands here is the one that was paid for
and the recording it supersedes is the one the plan said it would. Re-deriving
that mapping separately would let the two scripts disagree about what a run
bought — which is how a refresh ends up leaving two overlapping windows on disk
for build_market_data.py to trip over.

The superseded recording is removed only after its replacement is in place, so
an interrupted sync leaves a tree that still builds.

    python3 scripts/sync_sectors_recordings.py --plan <plan.json> --dry-run
    python3 scripts/sync_sectors_recordings.py --plan <plan.json>
    python3 scripts/build_market_data.py
"""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"
HARNESS = Path(os.environ.get("SECTORS_HARNESS", Path.home() / "dumpProject" / "Sectors" / "research" / "harness"))

sys.path.insert(0, str(HARNESS / "src"))


def slug_for(call: dict) -> str:
    """The recording name capture.py writes for this call.

    Imported from the harness rather than reimplemented: it owns the naming,
    and a second copy of the rule here would be a second thing to keep in step.
    """
    from capture import slug  # noqa: PLC0415 — the harness path is set above

    return slug(call["path"], call.get("params") or {}, call.get("method", "GET"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--plan", required=True, help="the refresh plan that was captured")
    parser.add_argument("--dry-run", action="store_true", help="report the moves, change nothing")
    args = parser.parse_args()

    plan = json.loads(Path(args.plan).read_text(encoding="utf-8"))
    calls = plan.get("calls") or []
    if not calls:
        raise SystemExit(f"{args.plan} has no calls")

    moved, missing, unchanged = [], [], 0
    for call in calls:
        old_slug = call.get("replaces")
        if not old_slug:
            raise SystemExit(
                f"plan call {call['path']} has no 'replaces' slug — regenerate the plan with "
                "scripts/plan_sectors_refresh.py so the mapping is recorded."
            )
        new_slug = slug_for(call)
        if new_slug == old_slug:
            unchanged += 1
            continue
        source = HARNESS / "recorded" / f"{new_slug}.json"
        if not source.exists():
            missing.append(new_slug)
            continue
        target = RAW / f"{new_slug}.json"
        superseded = RAW / f"{old_slug}.json"
        if not args.dry_run:
            shutil.copy2(source, target)
            if superseded.exists() and superseded != target:
                superseded.unlink()
        moved.append((old_slug, new_slug))

    for old, new in moved:
        print(f"  {old}.json\n  -> {new}.json")
    for slug in missing:
        print(f"  MISSING in harness: {slug}.json — superseded recording left in place")
    print(f"\n{len(moved)} replaced, {unchanged} already current, {len(missing)} missing"
          + (" (dry run — nothing changed)" if args.dry_run else ""))
    if not args.dry_run and moved:
        print("Next: python3 scripts/build_market_data.py && pnpm test")
    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
