import { NextResponse } from "next/server";
import { agentEngine, defaultProfile } from "@/lib/agent/engine";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = (body.profile ?? defaultProfile) as UserProfile;
    const graph = await agentEngine.buildCausalGraph(
      body.symbol,
      profile,
      { scope: body.scope ?? "market", minRelevance: body.minRelevance ?? 60 }
    );
    if (!graph) return NextResponse.json({ error: "Belum ada bukti yang cukup untuk ticker ini" }, { status: 404 });
    return NextResponse.json({ graph, mode: "recorded" });
  } catch {
    return NextResponse.json({ error: "Graph request invalid" }, { status: 400 });
  }
}
