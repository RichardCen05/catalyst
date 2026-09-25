"""Unit tests for the NLI screen, with a stub model that returns fixed logits."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent))
import calibrate  # noqa: E402
import replay  # noqa: E402
import screen  # noqa: E402

LABELS = {"entailment": 0, "neutral": 1, "contradiction": 2}
THRESHOLDS = {"decideMinConfidence": 0.9, "strictFloor": 0.97, "calibrationMinLabels": 50, "residualMaxShare": 0.3}
SURE_YES = [8.0, 0.0, 0.0]  # entailment ~0.9993
SURE_NO = [0.0, 8.0, 0.0]  # neutral ~0.9993: entailment tiny
SURE_CONTRA = [0.0, 0.0, 8.0]
HALF = [0.0, 0.0, -9.0]  # entailment ~0.5


def stub(table: dict[str, list[float]], default=SURE_NO):
    """A scorer keyed by hypothesis text; every window gets the same logits."""

    def score(pairs):
        return np.array([table.get(h, default) for _, h in pairs], dtype=np.float64)

    return score


def item(**over):
    base = {
        "id": "web-x",
        "title": "Judul",
        "titleSource": "feed",
        "symbols": ["AAAA"],
        "windows": [{"text": "Jendela satu.", "start": 0}, {"text": "Jendela dua.", "start": 20}],
        "hypotheses": {
            "rumor": "H-RUMOR",
            "official": "H-OFFICIAL",
            "substance": "H-SUB",
            "title": "Judul",
            "relevance": [{"symbol": "AAAA", "hypothesis": "H-REL-A"}],
        },
    }
    base.update(over)
    return base


def decide(it, table, calibration=None):
    gate = screen.Gate(THRESHOLDS, calibration or {})
    return screen.verdict_for(it, screen.score_item(it, stub(table)), gate, LABELS)


CLEAN = {"H-RUMOR": SURE_NO, "H-OFFICIAL": SURE_YES, "H-SUB": SURE_YES, "Judul": SURE_NO, "H-REL-A": SURE_YES}


def test_label_order_comes_from_config():
    assert screen.label_index({"id2label": {"0": "entailment", "1": "neutral", "2": "contradiction"}}) == LABELS
    assert screen.label_index({"id2label": {"0": "CONTRADICTION", "1": "Neutral", "2": "entailment"}})["entailment"] == 2
    with pytest.raises(ValueError):
        screen.label_index({"id2label": {"0": "yes", "1": "no"}})


def test_clean_item_is_accepted():
    assert decide(item(), CLEAN)["verdict"] == "accept"


def test_rumor_high_and_official_low_rejects_with_span():
    v = decide(item(), {**CLEAN, "H-RUMOR": SURE_YES, "H-OFFICIAL": SURE_NO})
    assert v["verdict"] == "reject" and v["check"] == "rumor"
    assert v["span"] == "Jendela satu."
    assert v["score"] >= 0.97


def test_rumor_with_named_official_is_not_rejected():
    v = decide(item(), {**CLEAN, "H-RUMOR": SURE_YES, "H-OFFICIAL": SURE_YES})
    assert v["verdict"] == "accept"


def test_unsure_scores_go_to_residual():
    v = decide(item(), {**CLEAN, "H-RUMOR": HALF, "H-OFFICIAL": HALF})
    assert v["verdict"] == "residual"
    assert "rumor" in v["reason"]


def test_url_title_is_never_checked():
    v = decide(item(titleSource="url", hypotheses={**item()["hypotheses"], "title": None}), {**CLEAN, "Judul": SURE_CONTRA})
    assert v["verdict"] == "accept"
    assert "markers" not in v


def test_empty_body_clickbait_rejects_as_misleading_title():
    v = decide(item(), {**CLEAN, "Judul": SURE_CONTRA, "H-SUB": SURE_NO})
    assert v["verdict"] == "reject" and v["check"] == "misleading-title"


def test_body_rich_clickbait_takes_the_accept_path_with_marker():
    v = decide(item(), {**CLEAN, "Judul": SURE_CONTRA})
    assert v["verdict"] == "accept"
    assert v["markers"] == ["misleadingTitle"]


def test_item_without_prose_windows_waits_for_a_person():
    # A BMKG forecast is a JSON summary with no prose sentence; reviewers
    # accepted such items, so "nothing to read" must never be a reject.
    v = decide(item(windows=[]), CLEAN)
    assert v["verdict"] == "residual"


def test_body_the_model_reads_as_empty_is_not_substantive():
    v = decide(item(), {**CLEAN, "H-SUB": SURE_NO})
    assert v["verdict"] == "reject" and v["check"] == "substance"


def test_relevance_rejects_only_when_every_symbol_is_irrelevant():
    two = item(
        symbols=["AAAA", "BBBB"],
        hypotheses={**item()["hypotheses"], "relevance": [{"symbol": "AAAA", "hypothesis": "H-REL-A"}, {"symbol": "BBBB", "hypothesis": "H-REL-B"}]},
    )
    assert decide(two, {**CLEAN, "H-REL-A": SURE_NO, "H-REL-B": SURE_YES})["verdict"] == "accept"
    v = decide(two, {**CLEAN, "H-REL-A": SURE_NO, "H-REL-B": SURE_NO})
    assert v["verdict"] == "reject" and v["check"] == "relevance"


def test_item_without_matched_symbols_waits_for_a_person():
    v = decide(item(symbols=[], hypotheses={**item()["hypotheses"], "relevance": []}), CLEAN)
    assert v["verdict"] == "residual"


def test_strict_floor_applies_below_the_label_minimum():
    # entailment ~0.95: clears 0.9 but not the 0.97 floor.
    p95 = [np.log(0.95 / 0.05), 0.0, -30.0]
    table = {**CLEAN, "H-RUMOR": p95, "H-OFFICIAL": SURE_NO}
    assert decide(item(), table)["verdict"] == "residual"
    few = {"rumor": {"T": 1.0, "n": 49}}
    assert decide(item(), table, few)["verdict"] == "residual"
    enough = {"rumor": {"T": 1.0, "n": 50}}
    assert decide(item(), table, enough)["check"] == "rumor"


def test_gate_uses_calibrated_temperature():
    gate = screen.Gate(THRESHOLDS, {"title": {"T": 2.5, "n": 60}, "substance": {"T": 2.0, "n": 3}})
    assert gate.temperature("title") == 2.5 and gate.bar("title") == 0.9
    assert gate.temperature("substance") == 1.0 and gate.bar("substance") == 0.97


def test_scores_round_trip_through_json():
    it = item()
    scores = screen.score_item(it, stub(CLEAN))
    again = screen.ItemScores.from_json(json.loads(json.dumps(scores.to_json())))
    gate = screen.Gate(THRESHOLDS, {})
    assert screen.verdict_for(it, again, gate, LABELS) == screen.verdict_for(it, scores, gate, LABELS)


def test_fitted_temperature_recovers_a_known_one():
    rng = np.random.default_rng(7)
    true = rng.normal(0, 2.0, size=(20000, 3))
    p = screen.softmax(true)[:, 0]
    y = (rng.random(len(p)) < p).astype(np.float64)
    t0 = 2.5
    fitted = calibrate.fit_temperature(true * t0, y, 0)
    assert abs(fitted - t0) / t0 < 0.05


def test_ece_is_zero_for_a_perfect_forecaster():
    p = np.array([0.05] * 20 + [0.95] * 20)
    y = np.array([0.0] * 19 + [1.0] + [1.0] * 19 + [0.0])
    assert calibrate.ece(p, y) == pytest.approx(0.0, abs=1e-9)


def test_calibration_records_who_labeled():
    scores = {
        "a": screen.score_item(item(id="a"), stub({**CLEAN, "H-RUMOR": SURE_YES})),
        "b": screen.score_item(item(id="b"), stub(CLEAN)),
    }
    labels = {"a": {"rumor": True, "misleadingTitle": False}, "b": {"rumor": False, "misleadingTitle": False}}
    out = calibrate.calibrate(scores, labels, "claude-opus-5-5", LABELS)
    assert out["rumor"]["n"] == 2 and out["rumor"]["positives"] == 1 and "T" in out["rumor"]
    assert out["title"]["n"] == 2 and "T" not in out["title"]  # no positive: nothing to fit
    assert all(entry["labeledBy"] == "claude-opus-5-5" for entry in out.values())


def test_replay_gate_fails_on_an_accepted_dirty_item_and_a_rejected_clean_one():
    golden_labels = {"r1": {"rumor": True, "misleadingTitle": False, "title": "t"}, "c1": {"rumor": False, "misleadingTitle": False, "title": "t"}}
    golden_verdicts = [
        {"candidateId": "r1", "verdict": "accept", "reason": ""},
        {"candidateId": "c1", "verdict": "reject", "check": "rumor", "reason": "", "span": ""},
    ]
    result = replay.gate([], golden_verdicts, {}, golden_labels, {})
    assert not result["pass"]
    assert {f["rule"] for f in result["failures"]} == {"dirty item accepted", "golden clean item rejected"}
    ok = replay.gate([], [{"candidateId": "c1", "verdict": "reject", "check": "relevance", "reason": ""}], {}, golden_labels, {})
    assert ok["pass"]


def test_runner_exits_without_a_target(capsys):
    with pytest.raises(SystemExit):
        screen.main([])


def test_runner_needs_the_secret_for_the_live_route(monkeypatch):
    monkeypatch.delenv("INTERNAL_CRON_SECRET", raising=False)
    assert screen.main(["--service-url", "http://127.0.0.1:9"]) == 2


def test_unreachable_service_fails_the_run(monkeypatch):
    monkeypatch.setenv("INTERNAL_CRON_SECRET", "s")
    with pytest.raises(Exception):
        screen.main(["--service-url", "http://127.0.0.1:9"])


def test_cached_scores_are_reused_only_for_the_same_text():
    it = item()
    cached = screen.score_item(it, stub({**CLEAN, "H-RUMOR": SURE_YES, "H-OFFICIAL": SURE_NO}))
    payload = {"items": [it], "thresholds": THRESHOLDS}
    verdicts, _ = screen.run(payload, stub(CLEAN), {}, LABELS, {"web-x": cached})
    assert verdicts[0]["check"] == "rumor"  # same windows and hypotheses: cache used
    changed = item(hypotheses={**item()["hypotheses"], "rumor": "H-RUMOR-2"})
    verdicts, _ = screen.run({"items": [changed], "thresholds": THRESHOLDS}, stub(CLEAN), {}, LABELS, {"web-x": cached})
    assert verdicts[0]["verdict"] == "accept"  # hypothesis changed: rescored
