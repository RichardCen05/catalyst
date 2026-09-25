#!/usr/bin/env python3
"""Replay the NLI screen offline and print the gate.

Runs the screen over two payloads dumped by
`tests/web-watch-screen-payload.test.ts` (never over GCS):
- the pending items of a local copy of the production queue;
- the golden text set, built from the gitignored article cache.

Hard gate (exit 1 on failure):
- no item labeled "should not enter" is accepted by the screen: the golden
  rumor and misleading-title items, and the pending items labeled reject;
- no golden clean item is rejected as rumor or misleading title.

The 18 items people dismissed on production are not replayable: a decided
entry keeps only its id and reason, not the article, and the bucket keeps no
object versions. The replay counts them and says so instead of pretending.

Reported only: ECE per check (from `calibration.json`), the false-reject list
with spans, residual share against `webWatchResidualMaxShare`, and any item
whose title contains a `--watch-title` string (the ICOMEX tin article, #45).

Every label here was written by Claude, not by a person (W17).

Usage:
    python replay.py --payload queue-payload.json --golden-payload golden-payload.json \
        --labels tests/fixtures/web-watch-pending-labels.json --golden tests/fixtures/web-watch-golden.json \
        [--scores scores.json] [--calibration calibration.json] [--queue queue.json] [--watch-title ICOMEX]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from screen import DEFAULT_MODEL_DIR, MODEL_REPO, ItemScores, OnnxNli, ensure_model, fingerprint, load_calibration, run  # noqa: E402


def load_scores(path: str | None) -> tuple[dict[str, ItemScores], dict | None]:
    if not path or not Path(path).exists():
        return {}, None
    raw = json.loads(Path(path).read_text())
    return {k: ItemScores.from_json(v) for k, v in raw["items"].items()}, raw.get("labels")


def gate(queue_verdicts: list[dict], golden_verdicts: list[dict], pending_labels: dict, golden_labels: dict, payload_items: dict) -> dict:
    failures: list[dict] = []
    for v in golden_verdicts:
        label = golden_labels.get(v["candidateId"], {})
        dirty = label.get("rumor") or label.get("misleadingTitle")
        if dirty and v["verdict"] == "accept":
            failures.append({"rule": "dirty item accepted", "id": v["candidateId"], "title": label.get("title")})
        if not dirty and v["verdict"] == "reject" and v.get("check") in ("rumor", "misleading-title"):
            failures.append({"rule": "golden clean item rejected", "id": v["candidateId"], "title": label.get("title"), "check": v["check"], "span": v.get("span", "")[:300]})
    for v in queue_verdicts:
        label = pending_labels.get(v["candidateId"])
        if label and label["decision"] == "reject" and v["verdict"] == "accept":
            failures.append(
                {
                    "rule": "item labeled reject accepted",
                    "id": v["candidateId"],
                    "title": label.get("title"),
                    "hasProposal": payload_items[v["candidateId"]].get("hasProposal"),
                }
            )
    return {"pass": not failures, "failures": failures}


def false_rejects(queue_verdicts: list[dict], golden_verdicts: list[dict], pending_labels: dict, golden_labels: dict) -> list[dict]:
    out = []
    for v in queue_verdicts:
        label = pending_labels.get(v["candidateId"])
        if label and label["decision"] == "accept" and v["verdict"] == "reject":
            out.append({"id": v["candidateId"], "title": label["title"], "check": v["check"], "reason": v["reason"], "span": v.get("span", "")[:300]})
    for v in golden_verdicts:
        label = golden_labels.get(v["candidateId"], {})
        if not (label.get("rumor") or label.get("misleadingTitle")) and v["verdict"] == "reject":
            out.append({"id": v["candidateId"], "title": label.get("title"), "check": v["check"], "reason": v["reason"], "span": v.get("span", "")[:300]})
    return out


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Offline replay and gate for the NLI screen")
    parser.add_argument("--payload", required=True, help="queue payload dumped by the TS test")
    parser.add_argument("--golden-payload", required=True)
    parser.add_argument("--labels", required=True)
    parser.add_argument("--golden", required=True)
    parser.add_argument("--calibration", default=None)
    parser.add_argument("--scores", default=None, help="score cache: read when present, written after scoring")
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    parser.add_argument("--queue", default=None, help="the queue.json copy, to count unreplayable human dismissals")
    parser.add_argument("--watch-title", action="append", default=[])
    parser.add_argument("--report", default=None)
    args = parser.parse_args(argv)

    queue_payload = json.loads(Path(args.payload).read_text())
    golden_payload = json.loads(Path(args.golden_payload).read_text())
    pending_labels = {i["candidateId"]: i for i in json.loads(Path(args.labels).read_text())["items"]}
    golden_file = json.loads(Path(args.golden).read_text())
    golden_labels = {i["id"]: i for i in golden_file["text"]}

    cache, cached_labels = load_scores(args.scores)
    ids = [i["id"] for i in queue_payload["items"] + golden_payload["items"]]
    model = None
    fresh = {i["id"]: fingerprint(i) for i in queue_payload["items"] + golden_payload["items"]}
    if any(i not in cache or cache[i].fingerprint != fresh[i] for i in ids):
        model = OnnxNli(ensure_model(Path(args.model_dir)))
    labels = model.labels if model else cached_labels
    calibration = load_calibration(args.calibration)

    queue_verdicts, queue_scores = run(queue_payload, model, calibration, labels, cache)
    golden_verdicts, golden_scores = run(golden_payload, model, calibration, labels, cache)
    if args.scores and model:
        items = {**cache, **queue_scores, **golden_scores}
        Path(args.scores).write_text(json.dumps({"model": MODEL_REPO, "labels": labels, "items": {k: v.to_json() for k, v in items.items()}}))

    counts = {k: sum(1 for v in queue_verdicts if v["verdict"] == k) for k in ("accept", "reject", "residual")}
    total = max(1, len(queue_verdicts))
    residual_max = queue_payload["thresholds"]["residualMaxShare"]
    by_id = {i["id"]: i for i in queue_payload["items"]}
    watch = [
        {
            "id": v["candidateId"],
            "title": by_id[v["candidateId"]]["title"],
            "verdict": v,
            "symbols": by_id[v["candidateId"]]["symbols"],
        }
        for v in queue_verdicts
        if any(w.lower() in by_id[v["candidateId"]]["title"].lower() for w in args.watch_title)
    ]
    unreplayable = None
    if args.queue:
        decided = json.loads(Path(args.queue).read_text()).get("decided", {})
        unreplayable = sum(1 for d in decided.values() if d.get("status") == "dismissed" and not d.get("auto") and not d.get("autoReject"))

    report = {
        "labeledBy": golden_file.get("labeledBy"),
        "reviewedBy": golden_file.get("reviewedBy"),
        "gate": gate(queue_verdicts, golden_verdicts, pending_labels, golden_labels, by_id),
        "queue": {"items": len(queue_verdicts), "counts": counts, "residualShare": round(counts["residual"] / total, 3), "residualMaxShare": residual_max},
        "golden": {
            "items": len(golden_verdicts),
            "counts": {k: sum(1 for v in golden_verdicts if v["verdict"] == k) for k in ("accept", "reject", "residual")},
            "verdicts": [{"id": v["candidateId"], "verdict": v["verdict"], "check": v.get("check"), "reason": v["reason"]} for v in golden_verdicts],
        },
        "rejectsByCheck": {c: sum(1 for v in queue_verdicts if v.get("check") == c) for c in ("rumor", "misleading-title", "substance", "relevance")},
        "falseRejects": false_rejects(queue_verdicts, golden_verdicts, pending_labels, golden_labels),
        "calibration": {k: {f: v.get(f) for f in ("n", "positives", "T", "ece_before", "ece_after")} for k, v in calibration.items()},
        "watch": watch,
        "humanDismissedNotReplayable": unreplayable,
    }
    text = json.dumps(report, ensure_ascii=False, indent=2)
    if args.report:
        Path(args.report).write_text(text + "\n")
    print(text)
    return 0 if report["gate"]["pass"] else 1


if __name__ == "__main__":
    sys.exit(main())
