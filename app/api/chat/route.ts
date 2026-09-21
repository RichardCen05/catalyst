import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { chatRequestSchema } from "@/lib/schemas";
import { ensureOverlay } from "@/lib/web-watch/queue";
import type { InvestorResearchPlaybook, SymbolCode, UserInsight, UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const parsed = chatRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Pertanyaan atau profil tidak valid", details: parsed.error.flatten() }, { status: 400 });
    await ensureOverlay().catch(() => []);
    const answer = await agentEngine.answerFollowUp({
      question: parsed.data.question,
      profile: parsed.data.profile as UserProfile,
      contextSymbol: parsed.data.contextSymbol as SymbolCode | undefined,
      userInsights: parsed.data.userInsights as UserInsight[] | undefined,
      playbook: parsed.data.playbook as InvestorResearchPlaybook | undefined,
      caseMandate: parsed.data.caseMandate,
      history: parsed.data.history,
      view: parsed.data.view,
    });
    return NextResponse.json({ answer, mode: "recorded" });
  } catch {
    return NextResponse.json({ error: "Body request tidak dapat dibaca" }, { status: 400 });
  }
}
