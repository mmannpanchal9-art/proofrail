import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { db } from "../../../../lib/db";
export async function POST() {
  const u = db().prepare("UPDATE crm_customers SET name=?,email=?,company=?,phone=? WHERE id=?");
  u.run("Riya Sharma","riya@example.com","Sharma Traders","+91-90000-00001","C-1001");
  u.run("Arjun Mehta","arjun@example.com","Mehta Logistics","+91-90000-00002","C-1002");
  u.run("XYZ Corp Contact","contact@xyz.example","XYZ Pvt Ltd","+91-90000-00003","C-1003");
  return NextResponse.json({ ok: true });
}
