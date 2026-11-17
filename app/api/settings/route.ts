import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db, setSetting } from "../../../lib/db";
const KEYS = ["allowed_domains","target_base_url","crm_buggy_mode","llm_base_url","llm_model"];
export async function GET() {
  const rows = db().prepare("SELECT * FROM settings").all() as any[];
  return NextResponse.json({ ...Object.fromEntries(rows.map(r => [r.key, r.value])), llm_api_key_configured: !!process.env.PROOFRAIL_LLM_API_KEY });
}
export async function POST(req: Request) {
  const b = await req.json();
  for (const k of KEYS) if (typeof b[k] === "string") setSetting(k, b[k].trim());
  return NextResponse.json({ ok: true });
}
