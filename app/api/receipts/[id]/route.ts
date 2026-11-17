import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { buildReceipt, receiptPdf } from "../../../../lib/receipt";
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const r = buildReceipt(Number(params.id));
  if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
  const fmt = new URL(req.url).searchParams.get("format") || "json";
  if (fmt === "pdf") return new NextResponse(new Uint8Array(await receiptPdf(r)), { headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename=proofrail-receipt-${r.verification.id}.pdf` } });
  return new NextResponse(JSON.stringify(r, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename=proofrail-receipt-${r.verification.id}.json` } });
}
