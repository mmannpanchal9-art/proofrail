import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import fs from "fs"; import path from "path";
import { EVIDENCE_DIR } from "../../../../lib/db";
export async function GET(_: Request, { params }: { params: { file: string } }) {
  if (!/^[\w.-]+\.png$/.test(params.file)) return NextResponse.json({ error: "bad name" }, { status: 400 });
  const p = path.join(EVIDENCE_DIR, params.file);
  if (!fs.existsSync(p)) return NextResponse.json({ error: "not found" }, { status: 404 });
  return new NextResponse(new Uint8Array(fs.readFileSync(p)), { headers: { "content-type": "image/png" } });
}
