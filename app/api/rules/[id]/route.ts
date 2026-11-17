import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db } from "../../../../lib/db";
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const b = await req.json(); db().prepare("UPDATE rules SET enabled=? WHERE id=?").run(b.enabled ? 1 : 0, Number(params.id)); return NextResponse.json({ ok: true });
}
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  db().prepare("DELETE FROM rules WHERE id=?").run(Number(params.id)); return NextResponse.json({ ok: true });
}
