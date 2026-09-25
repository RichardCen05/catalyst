#!/usr/bin/env python3
"""Fit one softmax temperature per NLI check from labeled items.

Temperature scaling (Guo et al. 2017, "On Calibration of Modern Neural
Networks"): one scalar T per check, fit by minimising the negative
log-likelihood of the labels under softmax(logits / T). The screen then reads
`calibration.json` and uses T only for a check with at least
`webWatchCalibrationMinLabels` labels; below that it keeps T = 1 and the
strict floor.

Each labeled item contributes the logits of its best window (the window the
screen would act on at T = 1) and a binary label:
- rumor: the golden `rumor` flag and the pending-label `rumor` flag, scored on
  the entailment class of the rumor hypothesis;
- title: the `misleadingTitle` flag, scored on the contradiction class of the
  title hypothesis.
Checks without labels (official, substance, relevance) are written with n = 0.

The labels were written by Claude, not by a person (W17). `labeledBy` records
that in every entry until a reviewer signs them off.

Usage:
    python calibrate.py --scores scores.json --labels ../../tests/fixtures/web-watch-pending-labels.json \
        --golden ../../tests/fixtures/web-watch-golden.json [--out calibration.json]
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from screen import HERE, ItemScores, softmax  # noqa: E402

CHECK_CLASS = {"rumor": "entailment", "title": "contradiction"}
LABEL_FIELD = {"rumor": "rumor", "title": "misleadingTitle"}
ECE_BINS = 10
T_GRID = np.exp(np.linspace(np.log(0.05), np.log(20.0), 400))


def nll(logits: np.ndarray, y: np.ndarray, cls: int, temperature: float) -> float:
    p = np.clip(softmax(logits, temperature)[:, cls], 1e-12, 1 - 1e-12)
    return float(-np.mean(y * np.log(p) + (1 - y) * np.log(1 - p)))


def fit_temperature(logits: np.ndarray, y: np.ndarray, cls: int) -> float:
    """Grid search in log space, then golden-section refinement around the best cell."""
    losses = [nll(logits, y, cls, t) for t in T_GRID]
    k = int(np.argmin(losses))
    lo, hi = T_GRID[max(0, k - 1)], T_GRID[min(len(T_GRID) - 1, k + 1)]
    g = (np.sqrt(5) - 1) / 2
    a, b = lo, hi
    for _ in range(60):
        c, d = b - g * (b - a), a + g * (b - a)
        if nll(logits, y, cls, c) < nll(logits, y, cls, d):
            b = d
        else:
            a = c
    return float((a + b) / 2)


def ece(p: np.ndarray, y: np.ndarray, bins: int = ECE_BINS) -> float:
    """Expected calibration error of a binary probability, equal-width bins."""
    if len(p) == 0:
        return 0.0
    edges = np.linspace(0, 1, bins + 1)
    total = 0.0
    for lo, hi in zip(edges[:-1], edges[1:]):
        mask = (p >= lo) & (p < hi) if hi < 1 else (p >= lo) & (p <= hi)
        if mask.any():
            total += mask.mean() * abs(p[mask].mean() - y[mask].mean())
    return float(total)


def labeled_rows(scores: dict[str, ItemScores], labels: dict[str, dict], check: str, cls: int) -> tuple[np.ndarray, np.ndarray]:
    xs, ys = [], []
    for item_id, label in labels.items():
        s = scores.get(item_id)
        score = getattr(s, check, None) if s else None
        if score is None or not score.logits or LABEL_FIELD[check] not in label:
            continue
        _, i = score.best(cls, 1.0)
        xs.append(score.logits[i])
        ys.append(1.0 if label[LABEL_FIELD[check]] else 0.0)
    return np.array(xs, dtype=np.float64).reshape(-1, 3), np.array(ys, dtype=np.float64)


def load_labels(pending_path: str | None, golden_path: str | None) -> tuple[dict[str, dict], str]:
    labels: dict[str, dict] = {}
    labeled_by = []
    if pending_path:
        data = json.loads(Path(pending_path).read_text())
        labeled_by.append(data.get("labeledBy") or "unknown")
        for item in data["items"]:
            labels[item["candidateId"]] = item
    if golden_path:
        data = json.loads(Path(golden_path).read_text())
        labeled_by.append(data.get("labeledBy") or "unknown")
        for item in data["text"]:
            labels[item["id"]] = item
    return labels, ",".join(sorted(set(labeled_by)))


def calibrate(scores: dict[str, ItemScores], labels: dict[str, dict], labeled_by: str, class_index: dict[str, int]) -> dict:
    out: dict[str, dict] = {}
    for check in ("rumor", "title"):
        cls = class_index[CHECK_CLASS[check]]
        x, y = labeled_rows(scores, labels, check, cls)
        entry = {"n": int(len(y)), "positives": int(y.sum()), "labeledBy": labeled_by}
        if len(y) and 0 < y.sum() < len(y):
            t = fit_temperature(x, y, cls)
            entry.update(
                T=round(t, 4),
                ece_before=round(ece(softmax(x)[:, cls], y), 4),
                ece_after=round(ece(softmax(x, t)[:, cls], y), 4),
            )
        out[check] = entry
    for check in ("substance", "relevance"):
        out[check] = {"n": 0, "positives": 0, "labeledBy": labeled_by}
    return out


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Fit NLI temperatures per check")
    parser.add_argument("--scores", required=True, help="scores.json written by replay.py")
    parser.add_argument("--labels")
    parser.add_argument("--golden")
    parser.add_argument("--out", default=str(HERE / "calibration.json"))
    args = parser.parse_args(argv)

    raw = json.loads(Path(args.scores).read_text())
    scores = {k: ItemScores.from_json(v) for k, v in raw["items"].items()}
    labels, labeled_by = load_labels(args.labels, args.golden)
    checks = calibrate(scores, labels, labeled_by, raw["labels"])
    result = {
        "about": "Temperature per NLI check, fit on labels written by Claude and not yet reviewed by a person (W17).",
        "model": raw.get("model"),
        "checks": checks,
    }
    Path(args.out).write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(checks, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
