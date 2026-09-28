import { NextResponse } from "next/server";
import { RELEVANCE_BAND_SCORE } from "@/lib/agent/thresholds";
import { webWatchReviewSchema } from "@/lib/schemas";
import { isAutoDecideEnabled, isAutoDecidePinnedByEnv, saveRuntimeSettings } from "@/lib/settings";
import { listSources, gcsRegistryStore } from "@/lib/web-watch/registry";
import {
  acceptProposals,
  autoAcceptedSince,
  decide,
  dismissSuspected,
  disputeSuspected,
  ensureOverlay,
  gcsQueueStore,
  isBatchAcceptable,
  isQuarantineCheck,
  legacySuspectedDecisions,
  listKnownSymbols,
  overlayCounts,
  restoreAutoReject,
  revertAutoAccept,
  ReviewError,
  saveQueue,
  setOverlayForTests,
  sourceHealth,
  withResidualLabel,
  type ReviewQueue,
} from "@/lib/web-watch/queue";
import { resolveThresholds } from "@/lib/agent/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — everything the Pantau page needs: source health, the pending queue
 * with triage matches and verified proposals, which pending items the screen
 * left for a person (`residual`, with its reason), what triage archived,
 * accepted events, what the screen decided alone (`autoAccepted`, undoable;
 * `autoRejected`, non-rumor checks a reviewer can take back), the rumor tab (`suspected`,
 * reviewable: new quarantines plus legacy rumor auto-rejects), the
 * auto-decide switch, and the symbol universe for mapping.
 */
export async function GET() {
  try {
    await ensureOverlay().catch(() => []);
    const [sources, queue, auto] = await Promise.all([
      listSources(gcsRegistryStore).catch(() => []),
      gcsQueueStore.load().then((r) => r?.data ?? null).catch(() => null),
      isAutoDecideEnabled(),
    ]);
    const nowIso = new Date().toISOString();
    const autoAccepted = Object.values(queue?.decided ?? {})
      .filter((decision) => decision.auto)
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .map((decision) => ({
        id: decision.candidateId,
        title: decision.auto?.event.title ?? "",
        url: decision.auto?.event.citations[0]?.url ?? null,
        provider: decision.auto?.event.citations[0]?.provider ?? null,
        decidedAt: decision.decidedAt,
        impacts: (decision.auto?.proposal.impacts ?? []).map(({ symbol, direction, band, path, rationale }) => ({ symbol, direction, band, path, rationale })),
      }));
    const autoRejected = Object.values(queue?.decided ?? {})
      .filter((decision) => decision.autoReject && !isQuarantineCheck(decision.autoReject.check))
      .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
      .map((decision) => ({
        id: decision.candidateId,
        title: decision.autoReject?.title ?? null,
        url: decision.autoReject?.url ?? null,
        decidedAt: decision.decidedAt,
        check: decision.autoReject?.check ?? null,
        span: decision.autoReject?.span ?? null,
        score: decision.autoReject?.score ?? null,
        reason: decision.reason,
      }));
    const suspected = [
      ...Object.entries(queue?.suspected ?? {})
        .map(([id, entry]) => ({
          id,
          title: entry.event.title,
          summary: entry.event.summary,
          body: entry.event.body ?? null,
          category: entry.event.category,
          publishedAt: entry.event.publishedAt,
          provider: entry.event.citations[0]?.provider ?? null,
          url: entry.event.citations[0]?.url ?? null,
          check: entry.check,
          span: entry.span ?? null,
          score: typeof entry.score === "number" ? entry.score : null,
          reason: entry.reason,
          at: entry.at,
          legacy: false,
        })),
      ...legacySuspectedDecisions(queue ?? { decided: {} } as ReviewQueue)
        .map((decision) => ({
          id: decision.candidateId,
          title: decision.autoReject?.title ?? decision.candidateId,
          summary: decision.reason,
          body: null,
          category: "company",
          publishedAt: decision.decidedAt,
          provider: null,
          url: decision.autoReject?.url ?? null,
          check: decision.autoReject?.check ?? null,
          span: decision.autoReject?.span ?? null,
          score: typeof decision.autoReject?.score === "number" ? decision.autoReject.score : null,
          reason: decision.reason,
          at: decision.autoReject?.at ?? decision.decidedAt,
          legacy: true,
        })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    const residual = (queue?.pending ?? []).flatMap((event) => {
      const mark = queue?.matches[event.id]?.residual;
      return mark ? [{ id: event.id, reason: mark.reason, at: mark.at }] : [];
    });
    const health = new Map((queue ? sourceHealth(queue, sources) : []).map((h) => [h.sourceId, h]));
    const archived = Object.entries(queue?.archived ?? {})
      .sort(([, a], [, b]) => b.at.localeCompare(a.at))
      .map(([id, entry]) => ({
        id,
        title: entry.event.title,
        provider: entry.event.citations[0]?.provider ?? null,
        url: entry.event.citations[0]?.url ?? null,
        rule: entry.rule,
        reason: entry.reason,
        at: entry.at,
      }));
    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        enabled: s.enabled,
        lastStatus: s.lastStatus,
        lastError: s.lastError,
        lastCheckedAt: s.lastCheckedAt,
        lastChangedAt: s.lastChangedAt,
        checks: s.checks,
        changes: s.changes,
        health: health.get(s.id) ?? null,
      })),
      pending: queue?.pending ?? [],
      matches: queue?.matches ?? {},
      proposals: queue?.proposals ?? {},
      batchable: Object.keys(queue?.proposals ?? {}).filter((id) => isBatchAcceptable(queue?.proposals[id])),
      archived,
      healthWindow: resolveThresholds().webWatchSourceHealthWindow,
      accepted: queue?.accepted ?? [],
      residual,
      autoAccepted,
      autoRejected,
      suspected,
      autoAccept: {
        enabled: auto.enabled,
        source: auto.source,
        pinnedByEnv: isAutoDecidePinnedByEnv(),
        dailyMax: resolveThresholds().webWatchAutoAcceptDailyMax,
        usedToday: queue ? autoAcceptedSince(queue, nowIso) : 0,
      },
      decidedCount: queue ? Object.keys(queue.decided).length : 0,
      lastScreenAt: queue?.lastScreenAt ?? null,
      symbols: listKnownSymbols(),
      bands: RELEVANCE_BAND_SCORE,
    });
  } catch (error) {
    return NextResponse.json(
      { unavailable: true, error: error instanceof Error ? error.message : "gcs-unavailable" },
      { status: 200 },
    );
  }
}

/**
 * POST — accept (with reviewer-mapped impacts, or a verified proposal the
 * reviewer took as-is), accept several high-band proposals at once, dismiss a
 * candidate, dispute a suspected rumor back to review, confirm a suspected
 * rumor as dismissed, undo an auto-accept, take back a screen's final
 * reject, or flip the auto-decide switch.
 * Every one of these is a person pressing a button; decisions made without a
 * person happen in the internal decide route (`applyVerdicts`), not here.
 * Archived items are final: there is no action that brings them back. A
 * screen reject comes back only through `restore-reject`, with a reason. Accepted events join the queue's `accepted` list
 * and the engine overlay; the engine itself is untouched.
 *
 * Open to anyone who can reach the service: reviewing costs no Sectors credit
 * and never called the provider, so the bearer that used to sit here only
 * stood between a reader and the queue. The deployed URL is public, so an
 * accept from here is not attributable to a person — the queue records the
 * decision, not who made it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  const parsed = webWatchReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukan review tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }
  const nowIso = new Date().toISOString();
  const input = parsed.data;
  if (input.action === "set-auto-accept") {
    if (isAutoDecidePinnedByEnv()) {
      const gate = await isAutoDecideEnabled();
      return NextResponse.json(
        { error: "Keputusan otomatis dikunci operator lewat WEB_WATCH_AUTO_DECIDE atau WEB_WATCH_AUTO_ACCEPT; sakelar ini tidak berlaku.", enabled: gate.enabled },
        { status: 409 },
      );
    }
    try {
      const saved = await saveRuntimeSettings({ webWatchAutoDecide: input.enabled });
      return NextResponse.json({ ok: true, enabled: saved.webWatchAutoDecide });
    } catch {
      return NextResponse.json({ error: "Gagal menyimpan sakelar terima otomatis" }, { status: 500 });
    }
  }
  try {
    const next = await saveQueue(gcsQueueStore, (queue): ReviewQueue => {
      if (input.action === "accept-proposals") return withResidualLabel(queue, acceptProposals(queue, input.candidateIds, nowIso), input.candidateIds);
      if (input.action === "revert-auto") return revertAutoAccept(queue, input.candidateId);
      if (input.action === "dispute-rumor") return disputeSuspected(queue, input.candidateId, input.reason, nowIso);
      if (input.action === "dismiss-suspected") return dismissSuspected(queue, input.candidateId, input.reason, nowIso);
      if (input.action === "restore-reject") return restoreAutoReject(queue, input.candidateId, input.reason, nowIso);
      return withResidualLabel(queue, decide(queue, input.candidateId, input, nowIso), [input.candidateId]);
    });
    // Push freshly accepted events straight into this instance's overlay so
    // the next analysis on the same instance sees them before the TTL lapses.
    setOverlayForTests(next.accepted, overlayCounts(next));
    const status =
      input.action === "revert-auto" || input.action === "dispute-rumor" || input.action === "restore-reject"
        ? "restored"
        : input.action === "accept-proposals"
          ? "accepted"
          : input.action === "dismiss-suspected"
            ? "dismissed"
            : next.decided[input.candidateId].status;
    return NextResponse.json({
      ok: true,
      status,
      pending: next.pending.length,
      accepted: next.accepted.length,
      suspected: Object.keys(next.suspected ?? {}).length,
    });
  } catch (error) {
    if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Gagal menyimpan keputusan review" }, { status: 500 });
  }
}
