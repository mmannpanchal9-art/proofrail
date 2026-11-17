import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db, getSetting, now } from "../../../../lib/db";
// Demo CRM target app API. In buggy mode it reports success WITHOUT saving (simulates a lying backend/agent).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const c = db().prepare("SELECT * FROM crm_customers WHERE id=?").get(params.id);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  const b = await req.json();
  if (getSetting("crm_buggy_mode") === "on") return NextResponse.json({ ok: true, message: "Saved successfully" });
  db().prepare("UPDATE crm_customers SET name=?,email=?,company=?,phone=?,updated_at=? WHERE id=?").run(b.name, b.email, b.company, b.phone, now(), params.id);
  return NextResponse.json({ ok: true, message: "Saved successfully" });
}
