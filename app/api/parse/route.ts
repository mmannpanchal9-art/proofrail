import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import { templateParse, openAICompatible } from "../../../lib/parser";
import { getSetting } from "../../../lib/db";
export async function POST(req: Request) {
  const { prompt } = await req.json();
  if (!prompt || typeof prompt !== "string") return NextResponse.json({ error: "prompt required" }, { status: 400 });
  const key = process.env.PROOFRAIL_LLM_API_KEY;
  const base = templateParse(prompt);
  if (!key) return NextResponse.json({ ...base, llm: "not configured (PROOFRAIL_LLM_API_KEY unset) — deterministic template parser used" });
  try {
    const p = openAICompatible(getSetting("llm_base_url")!, getSetting("llm_model")!, key);
    const spec = await p.parse(prompt);
    return NextResponse.json({ spec: { ...base.spec, ...spec, allowedFields: [spec.field || base.spec.field] }, parser: p.name, warnings: ["LLM output — review fields before running"], llm: "used" });
  } catch (e: any) {
    return NextResponse.json({ ...base, llm: "LLM call failed (" + e.message + "), fell back to template parser" });
  }
}
