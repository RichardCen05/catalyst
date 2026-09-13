import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const profile = body.profileId ? ({ id: body.profileId } as any) : undefined;
    const graph = await agentEngine.buildCausalGraph(
      body.symbol,
      profile,
      { scope: body.scope, minRelevance: body.minRelevance }
    );
    return NextResponse.json({ graph });
  } catch {
    return NextResponse.json({ error: "Graph request invalid" }, { status: 400 });
  }
}
