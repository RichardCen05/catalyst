import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { analyzeRequestSchema } from "@/lib/schemas";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const parsed = analyzeRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Input analisis tidak valid", details: parsed.error.flatten() }, { status: 400 });
    const analysis = agentEngine.analyzeCompany(parsed.data.symbol, parsed.data.profile as UserProfile);
    if (!analysis) return NextResponse.json({ error: "Belum ada bukti yang cukup untuk ticker ini" }, { status: 404 });
    return NextResponse.json({ analysis, mode: "recorded" });
  } catch {
    return NextResponse.json({ error: "Body request tidak dapat dibaca" }, { status: 400 });
  }
}
