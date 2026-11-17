import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db, getSetting } from "../../../lib/db";
import { createTask, runTask, validateSpec } from "../../../lib/service";
export async function GET() { return NextResponse.json(db().prepare("SELECT * FROM tasks ORDER BY id DESC").all()); }
export async function POST(req: Request) {
  const b = await req.json();
  const s = { targetBaseUrl: getSetting("target_base_url"), ...b.spec };
  s.allowedFields = s.allowedFields?.length ? s.allowedFields : [s.field];
  s.title = s.title || `Update ${s.field} of ${s.customerId}`;
  const errs = validateSpec(s); if (errs.length) return NextResponse.json({ error: errs }, { status: 400 });
  if (b.authorized !== true) return NextResponse.json({ error: ["This task modifies data. Set authorized=true to confirm."] }, { status: 403 });
  const taskId = createTask(s, "ui", b.prompt || "", b.parser || "structured form");
  const r = await runTask(taskId);
  return NextResponse.json({ taskId, ...r });
}
