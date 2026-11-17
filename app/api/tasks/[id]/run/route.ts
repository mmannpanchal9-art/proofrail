import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { runTask } from "../../../../../lib/service";
export async function POST(_: Request, { params }: { params: { id: string } }) {
  try { return NextResponse.json(await runTask(Number(params.id))); } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 404 }); }
}
