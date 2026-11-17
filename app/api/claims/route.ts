import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { verifyExternalClaim } from "../../../lib/service";
/** External agent claim ingestion. Optional bearer auth via PROOFRAIL_API_TOKEN. */
export async function POST(req: Request) {
  const tok = process.env.PROOFRAIL_API_TOKEN;
  if (tok && req.headers.get("authorization") !== `Bearer ${tok}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const r = await verifyExternalClaim(await req.json());
  return NextResponse.json(r, { status: "error" in r ? 400 : 200 });
}
