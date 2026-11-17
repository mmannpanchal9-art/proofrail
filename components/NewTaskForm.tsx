'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function NewTaskForm({ defaultBase, llm, buggy }: { defaultBase: string; llm: boolean; buggy: boolean }) {
  const r = useRouter();
  const [prompt, setPrompt] = useState('Update company name of customer C-1003 to Acme Technologies and verify the change is saved.');
  const [spec, setSpec] = useState({ customerId: 'C-1003', field: 'company', expectedValue: 'Acme Technologies', targetBaseUrl: defaultBase });
  const [note, setNote] = useState(''); const [parser, setParser] = useState('structured form');
  const [auth, setAuth] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function parse() {
    const j = await (await fetch('/api/parse', { method: 'POST', body: JSON.stringify({ prompt }) })).json();
    setSpec(s => ({ ...s, ...Object.fromEntries(Object.entries(j.spec || {}).filter(([k, v]) => v && k in s)) }));
    setParser(j.parser); setNote([j.llm, ...(j.warnings || [])].filter(Boolean).join(' · '));
  }
  async function run() {
    setBusy(true); setErr('');
    const res = await fetch('/api/tasks', { method: 'POST', body: JSON.stringify({ spec, prompt, parser, authorized: auth }) });
    const j = await res.json(); setBusy(false);
    if (!res.ok) return setErr((j.error || []).join?.(', ') || String(j.error));
    r.push(`/executions/${j.taskId}`);
  }
  const F = (k: keyof typeof spec, l: string) => <label className="block"><span className="lbl">{l}</span><input name={`spec-${k}`} className="inp" value={spec[k]} onChange={e => setSpec({ ...spec, [k]: e.target.value })} /></label>;
  return (<div className="grid md:grid-cols-2 gap-4">
    <div className="card space-y-3"><div className="font-medium">1 · Natural language (optional)</div>
      <textarea className="inp h-28" value={prompt} onChange={e => setPrompt(e.target.value)} />
      <button className="btn2" onClick={parse}>Parse into structured task</button>
      <div className="text-xs text-amber-300">{llm ? 'LLM provider configured via PROOFRAIL_LLM_API_KEY.' : 'No LLM API key set → deterministic template parser is used (not AI). Requires an exact customer ID like C-1003.'}</div>
      {note && <div className="text-xs text-zinc-400" data-testid="parse-note">{note}</div>}</div>
    <div className="card space-y-3"><div className="font-medium">2 · Structured task (source of truth)</div>
      {F('targetBaseUrl', 'Target base URL (must be on allowlist)')}{F('customerId', 'Customer ID (exact)')}
      <label className="block"><span className="lbl">Field to update</span><select name="spec-field" className="inp" value={spec.field} onChange={e => setSpec({ ...spec, field: e.target.value })}>{['company', 'email', 'phone', 'name'].map(f => <option key={f}>{f}</option>)}</select></label>
      {F('expectedValue', 'Expected value')}
      <div className="text-xs text-zinc-400">Constraints: only this customer, only this field may change, stop if ID not found.</div>
      {buggy && <div className="text-xs text-red-300">Demo CRM is in BUGGY mode: it shows “Saved successfully” without saving.</div>}
      <label className="flex gap-2 text-sm items-center"><input type="checkbox" name="authorize" checked={auth} onChange={e => setAuth(e.target.checked)} />I authorize this data-modifying action</label>
      <button className="btn" disabled={busy || !auth} onClick={run}>{busy ? 'Executing + verifying…' : 'Execute & verify'}</button>
      {err && <div className="text-sm text-red-400">{err}</div>}</div>
  </div>);
}
