#!/usr/bin/env python3
"""System One: the local NLI screen for the web-watch review queue.

The screen reads the pending items from the decide route
(`GET /api/internal/web-watch-decide`), scores each one with a multilingual
NLI model, and posts one verdict per item back to the same route. It never
writes `queue.json` and holds no GCS credentials: the route is the only writer
(W11). It never calls an LLM.

What the runner does NOT decide:
- Windows, language and hypothesis sentences come from the route payload,
  rendered from the TypeScript tables (`lib/web-watch/screen-payload.ts`).
- Thresholds come from the same payload (`lib/agent/thresholds.ts`).
- Accepts still need a verified proposal; the route enforces that.

Model: MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7, ONNX int8
(`onnx/model_quantized.onnx`), run with onnxruntime on CPU, tokenized with
`tokenizers`. No torch.

Usage:
    python screen.py --service-url URL [--apply] [--calibration calibration.json]
    python screen.py --payload-file payload.json          # offline, prints verdicts

`--apply` is off by default: the first production runs are dry-runs whose
report a person reads before anything is written.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterable, Sequence

import numpy as np

HERE = Path(__file__).resolve().parent
DEFAULT_MODEL_DIR = HERE / ".model"
MODEL_REPO = "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7"
MODEL_FILES = {
    "model_quantized.onnx": "onnx/model_quantized.onnx",
    "tokenizer.json": "tokenizer.json",
    "config.json": "config.json",
}
MAX_TOKENS = 512
BATCH = 8

# Which calibration entry each check reads. `official` shares the rumor
# temperature: the two are one pair in the (b) rule and are labeled together.
CALIBRATION_KEY = {"rumor": "rumor", "official": "rumor", "title": "title", "substance": "substance", "relevance": "relevance"}

# Signature of a scorer: (premise, hypothesis) pairs -> logits [n, 3].
Scorer = Callable[[Sequence[tuple[str, str]]], np.ndarray]


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


def label_index(config: dict) -> dict[str, int]:
    """entailment / neutral / contradiction positions, read from the model's
    own `id2label`, never assumed."""
    id2label = config.get("id2label") or {}
    index = {str(label).lower(): int(i) for i, label in id2label.items()}
    missing = {"entailment", "neutral", "contradiction"} - index.keys()
    if missing:
        raise ValueError(f"model config lacks labels: {sorted(missing)}")
    return index


class OnnxNli:
    """mDeBERTa NLI on onnxruntime. `__call__` returns raw logits."""

    def __init__(self, model_dir: Path):
        import onnxruntime as ort
        from tokenizers import Tokenizer

        self.config = json.loads((model_dir / "config.json").read_text())
        self.labels = label_index(self.config)
        self.tokenizer = Tokenizer.from_file(str(model_dir / "tokenizer.json"))
        # Truncate the premise only: the hypothesis is short and must survive whole.
        self.tokenizer.enable_truncation(max_length=MAX_TOKENS, strategy="only_first")
        self.tokenizer.enable_padding(pad_id=self.tokenizer.token_to_id("[PAD]") or 0, pad_token="[PAD]")
        options = ort.SessionOptions()
        options.intra_op_num_threads = os.cpu_count() or 1
        self.session = ort.InferenceSession(str(model_dir / "model_quantized.onnx"), options, providers=["CPUExecutionProvider"])
        self.inputs = {i.name for i in self.session.get_inputs()}

    def __call__(self, pairs: Sequence[tuple[str, str]]) -> np.ndarray:
        out: list[np.ndarray] = []
        for start in range(0, len(pairs), BATCH):
            chunk = pairs[start : start + BATCH]
            encoded = self.tokenizer.encode_batch([(p, h) for p, h in chunk])
            feed = {
                "input_ids": np.array([e.ids for e in encoded], dtype=np.int64),
                "attention_mask": np.array([e.attention_mask for e in encoded], dtype=np.int64),
            }
            if "token_type_ids" in self.inputs:
                feed["token_type_ids"] = np.array([e.type_ids for e in encoded], dtype=np.int64)
            out.append(self.session.run(None, {k: v for k, v in feed.items() if k in self.inputs})[0])
        return np.concatenate(out) if out else np.zeros((0, 3), dtype=np.float32)


def ensure_model(model_dir: Path) -> Path:
    """Fail loudly when the model files are missing. Fetching them is the
    Cloud Build step's job (bucket cache first, Hugging Face second), or a
    person's; the runner never downloads on its own."""
    missing = [name for name in MODEL_FILES if not (model_dir / name).exists()]
    if missing:
        raise SystemExit(f"model files missing in {model_dir}: {', '.join(missing)} (fetch {MODEL_REPO})")
    return model_dir


# ---------------------------------------------------------------------------
# Scoring
# ---------------------------------------------------------------------------


def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    z = np.asarray(logits, dtype=np.float64) / temperature
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


@dataclass
class CheckScore:
    """One hypothesis over every window: the window logits and the best window."""

    logits: list[list[float]]
    windows: list[str]

    def best(self, cls: int, temperature: float) -> tuple[float, int]:
        if not self.logits:
            return 0.0, -1
        probs = softmax(np.array(self.logits), temperature)[:, cls]
        i = int(np.argmax(probs))
        return float(probs[i]), i


def fingerprint(item: dict) -> str:
    """What the scores of an item depend on: its windows and its hypotheses.
    A cached score whose fingerprint differs was computed for other text."""
    material = json.dumps({"windows": [w["text"] for w in item.get("windows") or []], "hypotheses": item["hypotheses"]}, sort_keys=True)
    return hashlib.sha256(material.encode("utf-8")).hexdigest()


@dataclass
class ItemScores:
    id: str
    rumor: CheckScore
    official: CheckScore
    substance: CheckScore
    title: CheckScore | None
    relevance: dict[str, CheckScore] = field(default_factory=dict)
    fingerprint: str = ""

    def to_json(self) -> dict:
        def cs(score: CheckScore | None):
            return None if score is None else {"logits": score.logits, "windows": score.windows}

        return {
            "id": self.id,
            "rumor": cs(self.rumor),
            "official": cs(self.official),
            "substance": cs(self.substance),
            "title": cs(self.title),
            "relevance": {symbol: cs(s) for symbol, s in self.relevance.items()},
            "fingerprint": self.fingerprint,
        }

    @staticmethod
    def from_json(data: dict) -> "ItemScores":
        def cs(value):
            return None if value is None else CheckScore(value["logits"], value["windows"])

        return ItemScores(
            id=data["id"],
            rumor=cs(data["rumor"]),
            official=cs(data["official"]),
            substance=cs(data["substance"]),
            title=cs(data.get("title")),
            relevance={symbol: cs(v) for symbol, v in (data.get("relevance") or {}).items()},
            fingerprint=data.get("fingerprint", ""),
        )


def score_item(item: dict, scorer: Scorer) -> ItemScores:
    """Every hypothesis against every window, in one batch per item."""
    windows = [w["text"] for w in item.get("windows") or []]
    hyp = item["hypotheses"]
    named: list[tuple[str, str]] = [("rumor", hyp["rumor"]), ("official", hyp["official"]), ("substance", hyp["substance"])]
    if hyp.get("title"):
        named.append(("title", hyp["title"]))
    for rel in hyp.get("relevance") or []:
        named.append((f"relevance:{rel['symbol']}", rel["hypothesis"]))
    pairs = [(w, h) for _, h in named for w in windows]
    logits = scorer(pairs) if pairs else np.zeros((0, 3))
    per: dict[str, CheckScore] = {}
    for k, (name, _) in enumerate(named):
        rows = logits[k * len(windows) : (k + 1) * len(windows)]
        per[name] = CheckScore([[float(x) for x in row] for row in rows], windows)
    return ItemScores(
        id=item["id"],
        rumor=per["rumor"],
        official=per["official"],
        substance=per["substance"],
        title=per.get("title"),
        relevance={name.split(":", 1)[1]: s for name, s in per.items() if name.startswith("relevance:")},
        fingerprint=fingerprint(item),
    )


# ---------------------------------------------------------------------------
# Verdicts
# ---------------------------------------------------------------------------


@dataclass
class Gate:
    """Per-check temperature and bar. A check with fewer labels than the
    minimum keeps T = 1 and must clear the strict floor instead."""

    thresholds: dict
    calibration: dict

    def temperature(self, check: str) -> float:
        entry = self.calibration.get(CALIBRATION_KEY[check]) or {}
        return float(entry["T"]) if self.calibrated(check) else 1.0

    def calibrated(self, check: str) -> bool:
        entry = self.calibration.get(CALIBRATION_KEY[check]) or {}
        return "T" in entry and int(entry.get("n", 0)) >= int(self.thresholds["calibrationMinLabels"])

    def bar(self, check: str) -> float:
        return float(self.thresholds["decideMinConfidence"] if self.calibrated(check) else self.thresholds["strictFloor"])


def _span(score: CheckScore, index: int) -> str:
    return score.windows[index][:2000] if 0 <= index < len(score.windows) else ""


def verdict_for(item: dict, scores: ItemScores, gate: Gate, labels: dict[str, int]) -> dict:
    """One item's verdict, from the decisions table. An item with no prose
    window is residual. Otherwise:
    - rumor: P(rumor) >= bar and P(official) < 1 - bar -> reject.
    - title: contradicted (>= bar) with a body that is confidently not
      substantive -> reject; with a substantive body -> accept path with the
      `misleadingTitle` marker. Skipped for a headline cut from the address.
    - substance: P(substantive) <= 1 - bar -> reject.
    - relevance: every matched emiten confidently not relevant -> reject.
    - accept when every check is confidently clean; otherwise residual.
    """
    ent, con = labels["entailment"], labels["contradiction"]
    item_id = item["id"]
    if not scores.substance.windows:
        # No prose sentence to read: a structured JSON summary (a BMKG
        # forecast) or a page triage kept for another reason. The model has
        # no evidence either way, so a person decides. An empty page is
        # triage's `empty-extract`, not the screen's.
        return {"candidateId": item_id, "verdict": "residual", "reason": "penyaring NLI: tidak ada kalimat prosa untuk dibaca"}

    p_rumor, i_rumor = scores.rumor.best(ent, gate.temperature("rumor"))
    p_official, _ = scores.official.best(ent, gate.temperature("official"))
    p_sub, i_sub = scores.substance.best(ent, gate.temperature("substance"))
    b_rumor, b_sub, b_title, b_rel = gate.bar("rumor"), gate.bar("substance"), gate.bar("title"), gate.bar("relevance")

    rumor_hit = p_rumor >= b_rumor and p_official < 1 - b_rumor
    rumor_clean = p_rumor <= 1 - b_rumor or p_official >= b_rumor
    not_substantive = p_sub <= 1 - b_sub
    substantive = p_sub >= b_sub

    title_skipped = scores.title is None or item.get("titleSource") == "url"
    p_title, i_title = (0.0, -1) if title_skipped else scores.title.best(con, gate.temperature("title"))
    title_hit = not title_skipped and p_title >= b_title
    title_clean = title_skipped or p_title <= 1 - b_title

    rel = {symbol: s.best(ent, gate.temperature("relevance")) for symbol, s in scores.relevance.items()}
    all_irrelevant = bool(rel) and all(p <= 1 - b_rel for p, _ in rel.values())
    any_relevant = any(p >= b_rel for p, _ in rel.values())

    def reject(check: str, reason: str, score: float, span: str) -> dict:
        return {"candidateId": item_id, "verdict": "reject", "check": check, "reason": reason, "score": round(score, 4), "span": span}

    if rumor_hit:
        return reject("rumor", f"rumor: klaim hanya bersumber kabar tanpa nama (p={p_rumor:.2f})", p_rumor, _span(scores.rumor, i_rumor))
    if title_hit and not_substantive:
        return reject(
            "misleading-title",
            f"judul menyesatkan: isi membantah judul dan tidak substantif (p={p_title:.2f})",
            p_title,
            _span(scores.title, i_title),
        )
    if not_substantive:
        return reject("substance", f"tidak substantif: tidak ada peristiwa atau angka konkret (p={1 - p_sub:.2f})", 1 - p_sub, _span(scores.substance, i_sub))
    if all_irrelevant:
        worst = max(p for p, _ in rel.values())
        symbol, (_, i) = next(iter(rel.items()))
        return reject("relevance", f"tidak relevan untuk semua emiten cocok (p={1 - worst:.2f})", 1 - worst, _span(scores.relevance[symbol], i))

    markers = ["misleadingTitle"] if title_hit else []
    unsure = [
        name
        for name, clean in (("rumor", rumor_clean), ("title", title_clean or title_hit), ("substance", substantive), ("relevance", any_relevant))
        if not clean
    ]
    if not unsure:
        verdict = {"candidateId": item_id, "verdict": "accept", "reason": "penyaring NLI: semua cek bersih"}
        if markers:
            verdict["markers"] = markers
        return verdict
    return {"candidateId": item_id, "verdict": "residual", "reason": f"penyaring NLI ragu: {', '.join(unsure)}"}


# ---------------------------------------------------------------------------
# I/O
# ---------------------------------------------------------------------------


def load_calibration(path: str | None) -> dict:
    if not path or not Path(path).exists():
        return {}
    data = json.loads(Path(path).read_text())
    return data.get("checks", data)


def fetch_payload(service_url: str, secret: str) -> dict:
    import requests

    response = requests.get(
        f"{service_url.rstrip('/')}/api/internal/web-watch-decide",
        headers={"Authorization": f"Bearer {secret}"},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()


def post_verdicts(service_url: str, secret: str, verdicts: list[dict], apply: bool) -> dict:
    import requests

    response = requests.post(
        f"{service_url.rstrip('/')}/api/internal/web-watch-decide",
        headers={"Authorization": f"Bearer {secret}", "Content-Type": "application/json"},
        json={"verdicts": verdicts, "apply": apply},
        timeout=300,
    )
    response.raise_for_status()
    return response.json()


def run(payload: dict, scorer: Scorer, calibration: dict, labels: dict[str, int], cache: dict[str, ItemScores] | None = None) -> tuple[list[dict], dict[str, ItemScores]]:
    gate = Gate(payload["thresholds"], calibration)
    scored: dict[str, ItemScores] = {}
    verdicts: list[dict] = []
    for item in payload["items"]:
        cached = (cache or {}).get(item["id"])
        scores = cached if cached and cached.fingerprint == fingerprint(item) else score_item(item, scorer)
        scored[item["id"]] = scores
        verdicts.append(verdict_for(item, scores, gate, labels))
    return verdicts, scored


def main(argv: Iterable[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--service-url")
    parser.add_argument("--payload-file", help="offline: a dumped GET payload instead of the live route")
    parser.add_argument("--apply", action="store_true", help="write the verdicts (default: dry-run)")
    parser.add_argument("--calibration", default=str(HERE / "calibration.json"))
    parser.add_argument("--model-dir", default=str(DEFAULT_MODEL_DIR))
    args = parser.parse_args(list(argv) if argv is not None else None)

    if not args.service_url and not args.payload_file:
        parser.error("--service-url or --payload-file is required")

    secret = os.environ.get("INTERNAL_CRON_SECRET", "")
    if args.payload_file:
        payload = json.loads(Path(args.payload_file).read_text())
    else:
        if not secret:
            print("INTERNAL_CRON_SECRET is not set", file=sys.stderr)
            return 2
        payload = fetch_payload(args.service_url, secret)

    items = payload.get("items") or []
    if not items:
        print(json.dumps({"items": 0, "note": "nothing pending"}))
        return 0

    model = OnnxNli(ensure_model(Path(args.model_dir)))
    verdicts, _ = run(payload, model, load_calibration(args.calibration), model.labels)
    counts = {v: sum(1 for x in verdicts if x["verdict"] == v) for v in ("accept", "reject", "residual")}
    print(json.dumps({"counts": counts}, ensure_ascii=False))

    if not args.service_url:
        print(json.dumps(verdicts, ensure_ascii=False, indent=2))
        return 0
    answer = post_verdicts(args.service_url, secret, verdicts, args.apply)
    if answer.get("disabled"):
        print("auto-decide is off; nothing written", file=sys.stderr)
        return 0
    print(json.dumps(answer, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
