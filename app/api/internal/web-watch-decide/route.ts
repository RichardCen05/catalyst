/**
 * Internal web-watch decide — the one place pending items are accepted or
 * rejected without a person.
 *
 * An offline screen (the Cloud Build runner in `scripts/screen/`) reads the
 * pending items with `GET`, judges each one, and posts its verdicts here. This
 * route applies them through the same generation-guarded `saveQueue` every
 * other queue write uses, so the screen never writes `queue.json` itself and
 * never needs GCS credentials for it.
 *
 * Dry-run by default: `POST { verdicts }` reports what the verdicts would do,
 * with counts and sampled titles, and writes nothing. Only `{ apply: true }`
 * writes. Non-rumor rejects are final, so the first run on real items stays a
 * dry-run until a person has read its report. Rumor and misleading-title
 * verdicts quarantine to the rumor tab instead of rejecting finally.
 *
 * The figure check (d) runs here, not in the screen: it compares an article's
 * closing figures with the recordings compiled into this service
 * (`checkFigures`), so the comparison always uses the data the engine reads. A
 * pending item whose figures contradict the recordings is rejected with
 * `check: "figure"`, whatever the screen posted for it, and the dry-run
 * report lists it under `figures`.
 *
 * Gate: when the auto-decide switch is off (`isAutoDecideEnabled`), a POST
 * answers `{ applied: false, disabled: true }` and writes nothing.
 *
 * Auth: `INTERNAL_CRON_SECRET` bearer, same as `check-sources`
 * (`lib/internal-auth.ts`). Every path checks it first.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { checkInternalAuth } from "@/lib/internal-auth";
import { isAutoDecideEnabled } from "@/lib/settings";
import { checkFigures, type FigureCheck } from "@/lib/web-watch/figures";
import {
  applyVerdicts,
  gcsQueueStore,
  normalizeQueue,
  PENDING_MAX,
  saveQueue,
  SCREEN_VERDICT_CHECKS,
  type ReviewQueue,
  type ScreenVerdict,
  type VerdictResult,
} from "@/lib/web-watch/queue";
import { gcsRegistryStore, listSources } from "@/lib/web-watch/registry";
import { screenPayload } from "@/lib/web-watch/screen-payload";
import { EVENT_MARKERS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAMPLE_SIZE = 10;

const verdictSchema = z
  .object({
    candidateId: z.string().min(1).max(120),
    verdict: z.enum(["accept", "reject", "residual"]),
    check: z.enum(SCREEN_VERDICT_CHECKS).optional(),
    reason: z.string().trim().min(1).max(500),
    span: z.string().max(2000).optional(),
    score: z.number().min(0).max(1).optional(),
    markers: z.array(z.enum(EVENT_MARKERS)).max(EVENT_MARKERS.length).optional(),
  })
  .refine((v) => v.verdict !== "reject" || v.check !== undefined, { message: "reject wajib menyebut check", path: ["check"] });

const decideSchema = z.object({
  verdicts: z.array(verdictSchema).max(PENDING_MAX),
  apply: z.boolean().optional(),
});

/**
 * The posted verdicts with the figure check laid over them: every pending item
 * is checked, and one whose figures contradict the recordings becomes a figure
 * reject, replacing whatever the screen posted for it. Figure rejects are
 * final; rumor verdicts quarantine to the rumor tab instead.
 */
function withFigureCheck(queue: ReviewQueue, posted: ScreenVerdict[]) {
  const figures = new Map<string, FigureCheck>(queue.pending.map((event) => [event.id, checkFigures(event)]));
  const verdicts: ScreenVerdict[] = posted.filter((v) => figures.get(v.candidateId)?.status !== "contradicted");
  for (const [candidateId, check] of figures) {
    const wrong = check.figures.filter((f) => f.status === "contradicted");
    if (!wrong.length) continue;
    verdicts.push({
      candidateId,
      verdict: "reject",
      check: "figure",
      reason: `angka bertentangan dengan rekaman: ${wrong.map((f) => f.reason).join("; ")}`.slice(0, 500),
      span: wrong[0].span,
    });
  }
  return { verdicts, figures };
}

function summarizeFigures(queue: ReviewQueue, figures: Map<string, FigureCheck>) {
  const titleOf = new Map(queue.pending.map((event) => [event.id, event.title]));
  const counts = { contradicted: 0, consistent: 0, uncheckable: 0 };
  for (const check of figures.values()) counts[check.status] += 1;
  const contradicted = [...figures]
    .filter(([, check]) => check.status === "contradicted")
    .slice(0, SAMPLE_SIZE)
    .map(([id, check]) => ({
      id,
      title: titleOf.get(id) ?? "",
      why: check.figures.filter((f) => f.status === "contradicted").map((f) => f.reason),
      span: check.figures.find((f) => f.status === "contradicted")?.span ?? "",
    }));
  return { counts, contradicted };
}

/** What the dry-run and apply answers carry: counts, and a few titles per outcome. */
function summarize(queue: ReviewQueue, result: VerdictResult) {
  const titleOf = new Map(queue.pending.map((event) => [event.id, event.title]));
  const sample = (ids: string[], why: (id: string) => string | undefined) =>
    ids.slice(0, SAMPLE_SIZE).map((id) => ({ id, title: titleOf.get(id) ?? "", why: why(id) ?? "" }));
  return {
    counts: {
      accepted: result.accepted.length,
      rejected: result.rejected.length,
      quarantined: result.quarantined.length,
      residual: result.residual.length,
      skipped: result.skipped.length,
    },
    accepted: sample(result.accepted, () => undefined),
    rejected: sample(result.rejected, (id) => {
      const decision = result.next.decided[id];
      return decision ? `${decision.autoReject?.check ?? ""}: ${decision.reason}` : undefined;
    }),
    quarantined: sample(result.quarantined, (id) => {
      const entry = result.next.suspected[id];
      return entry ? `${entry.check}: ${entry.reason}` : undefined;
    }),
    residual: sample(result.residual, (id) => result.next.matches[id]?.residual?.reason),
    skipped: result.skipped.slice(0, SAMPLE_SIZE),
  };
}

/**
 * The pending items the screen needs to judge, without the rest of the queue:
 * per item its language, prose windows and rendered hypotheses, plus the
 * decision thresholds (`screenPayload`). The runner builds none of these.
 */
export async function GET(request: Request) {
  const auth = checkInternalAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  try {
    const [loaded, sources] = await Promise.all([gcsQueueStore.load(), listSources(gcsRegistryStore).catch(() => [])]);
    const queue = normalizeQueue(loaded?.data);
    return NextResponse.json(screenPayload(queue, sources));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "decide-read-failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = checkInternalAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  const parsed = decideSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Verdict tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }
  const { verdicts } = parsed.data;
  const apply = parsed.data.apply === true;
  const nowIso = new Date().toISOString();
  try {
    const gate = await isAutoDecideEnabled();
    if (!gate.enabled) return NextResponse.json({ applied: false, disabled: true, source: gate.source });
    // Read first, and let a failed read end the request: `saveQueue` falls
    // back to an empty queue when a read fails, and a decide run has nothing
    // to decide on an empty one.
    const loaded = await gcsQueueStore.load();
    const queue = normalizeQueue(loaded?.data);
    const screened = withFigureCheck(queue, verdicts);
    let report = summarize(queue, applyVerdicts(queue, screened.verdicts, nowIso));
    let figures = summarizeFigures(queue, screened.figures);
    if (apply && loaded) {
      await saveQueue(gcsQueueStore, (current) => {
        const again = withFigureCheck(current, verdicts);
        const result = applyVerdicts(current, again.verdicts, nowIso);
        report = summarize(current, result);
        figures = summarizeFigures(current, again.figures);
        return { ...result.next, lastScreenAt: nowIso };
      });
    }
    return NextResponse.json({ applied: apply && Boolean(loaded), report, figures });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "decide-failed" }, { status: 500 });
  }
}
