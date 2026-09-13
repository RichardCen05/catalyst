import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { impactRequestSchema } from "@/lib/schemas";
import type { UserProfile } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const parsed = impactRequestSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ error: "Masukan peta dampak tidak valid", details: parsed.error.flatten() }, { status: 400 });
    const event = agentEngine.mapEventImpact(parsed.data.eventId, parsed.data.profile as UserProfile, parsed.data.scope);
    if (!event) return NextResponse.json({ error: "Peristiwa tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ event, mode: "recorded" });
  } catch {
    return NextResponse.json({ error: "Body request tidak dapat dibaca" }, { status: 400 });
  }
}
