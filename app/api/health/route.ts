import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db } from "../../../lib/db";
export async function GET() { db(); return NextResponse.json({ ok: true }); }
