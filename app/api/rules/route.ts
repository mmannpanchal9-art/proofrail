import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db } from "../../../lib/db"; import { listRules } from "../../../lib/service";
const TYPES = ["record_id_match","approved_domain","persisted_after_reload","no_out_of_scope_changes","required_not_empty","field_matches_regex"];
export async function GET() { return NextResponse.json(listRules()); }
export async function POST(req: Request) {
  const b = await req.json();
  if (!b.name || !TYPES.includes(b.type)) return NextResponse.json({ error: "name and valid type required: " + TYPES.join(",") }, { status: 400 });
  if (b.type === "field_matches_regex") { try { new RegExp(b.config?.pattern); } catch { return NextResponse.json({ error: "invalid regex" }, { status: 400 }); } }
  const r = db().prepare("INSERT INTO rules (name,type,config,enabled) VALUES (?,?,?,1)").run(b.name, b.type, JSON.stringify(b.config || {}));
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
