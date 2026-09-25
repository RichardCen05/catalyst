import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { chatRequestSchema } from "@/lib/schemas";
import { ensureOverlay } from "@/lib/web-watch/queue";
import type { ChatRequest, InvestorResearchPlaybook, SymbolCode, UserInsight, UserProfile } from "@/lib/types";

/**
 * Three outcomes, three statuses.
 *
 * One `try` around both the parse and the answer reported every engine
 * failure as `Body request tidak dapat dibaca` with `400`, so a fault inside
 * the engine reached the reader as "your question was rejected" and the panel
 * told them to send it again. Separated so the status names what happened:
 * `400` only when the body really is unreadable or invalid, `500` when the
 * request was fine and this service was not.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Body request tidak dapat dibaca" }, { status: 400 });
  }

  const parsed = chatRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Pertanyaan atau profil tidak valid", details: parsed.error.flatten() }, { status: 400 });

  try {
    await ensureOverlay().catch(() => []);
    const answer = await agentEngine.answerFollowUp({
      question: parsed.data.question,
      profile: parsed.data.profile as UserProfile,
      contextSymbol: parsed.data.contextSymbol as SymbolCode | undefined,
      userInsights: parsed.data.userInsights as UserInsight[] | undefined,
      playbook: parsed.data.playbook as InvestorResearchPlaybook | undefined,
      caseMandate: parsed.data.caseMandate,
      // Cast like every other field parsed here: the schema checks the shape,
      // and the engine checks each symbol against the registry before it
      // selects anything.
      history: parsed.data.history as ChatRequest["history"],
      view: parsed.data.view,
    });
    // `generator` says whether the model wrote the sentence or the template
    // did, which is safe to show anyone. The reason for a fallback is an
    // error message and can name a gateway or a quota; outside development it
    // stays in the `[llm-fallback]` log line, where it already is.
    const { fallbackReason, ...shipped } = answer;
    return NextResponse.json({ answer: process.env.NODE_ENV === "production" ? shipped : { ...shipped, ...(fallbackReason ? { fallbackReason } : {}) }, mode: "recorded" });
  } catch (error) {
    // Logged rather than returned: the message can name internals, and the
    // reader's copy is written by the panel from the status alone.
    console.error(`[chat] answer failed: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json({ error: "Jawaban gagal disusun" }, { status: 500 });
  }
}
