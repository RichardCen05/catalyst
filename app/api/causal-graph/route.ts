import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { causalGraphRequestSchema } from "@/lib/schemas";
import { isKnownSymbol } from "@/lib/data/sectors-client";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const parsed = causalGraphRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Graph request invalid", details: parsed.error.flatten() }, { status: 400 });
    // Zero-credit universe guard: unknown symbols 404 here, never reach a live Sectors call.
    if (!isKnownSymbol(parsed.data.symbol)) return NextResponse.json({ error: "Belum ada bukti yang cukup untuk ticker ini" }, { status: 404 });
    const graph = await agentEngine.buildCausalGraph(
      parsed.data.symbol,
      parsed.data.profile as UserProfile,
      { scope: parsed.data.scope, minRelevance: parsed.data.minRelevance }
    );
    if (!graph) return NextResponse.json({ error: "Belum ada bukti yang cukup untuk ticker ini" }, { status: 404 });
    return NextResponse.json({ graph, mode: "recorded" });
  } catch {
    return NextResponse.json({ error: "Graph request invalid" }, { status: 400 });
  }
}
