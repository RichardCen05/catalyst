import { NextResponse } from "next/server";
import { DATA_AS_OF, WINDOW_SESSIONS } from "@/lib/data/fixtures";

export async function GET() {
  return NextResponse.json({ status: "ok", dataAsOf: DATA_AS_OF, windowSessions: WINDOW_SESSIONS });
}
