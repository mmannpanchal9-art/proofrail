'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function SettingsClient({ s, llmKey, apiToken }: { s: Record<string, string>; llmKey: boolean; apiToken: boolean }) {
  const [v, setV] = useState(s); const [msg, setMsg] = useState(''); const r = useRouter();
  const save = async (patch?: any) => { const body = { ...v, ...patch }; setV(body); await fetch('/api/settings', { method: 'POST', body: JSON.stringify(body) }); setMsg('Saved'); r.refresh(); };
  const F = (k: string, l: string) => <label className="block"><span className="lbl">{l}</span><input name={k} className="inp" value={v[k] || ''} onChange={e => setV({ ...v, [k]: e.target.value })} /></label>;
  return (<div className="grid md:grid-cols-2 gap-4">
    <div className="card space-y-3"><div className="font-medium">Automation scope</div>{F('allowed_domains', 'Approved domains (comma separated)')}{F('target_base_url', 'Default target base URL')}
      <button className="btn" onClick={() => save()}>Save</button>{msg && <span className="text-xs text-emerald-400 ml-2">{msg}</span>}</div>
    <div className="card space-y-3"><div className="font-medium">AI provider</div>{F('llm_base_url', 'OpenAI-compatible base URL')}{F('llm_model', 'Model')}
      <div className="text-sm">API key: {llmKey ? <span className="text-emerald-400">configured (env PROOFRAIL_LLM_API_KEY, never stored in DB or shown)</span> : <span className="text-amber-400">not set — template parser in use</span>}</div>
      <div className="text-sm">Claims API token: {apiToken ? 'required (PROOFRAIL_API_TOKEN set)' : <span className="text-amber-400">not set — /api/claims is open (local dev only)</span>}</div></div>
    <div className="card space-y-3"><div className="font-medium">Demo CRM target</div>
      <div className="text-sm">Buggy mode: <b data-testid="buggy-state">{v.crm_buggy_mode}</b> — when ON, the CRM says “Saved successfully” but does not save.</div>
      <div className="flex gap-2"><button className="btn2" name="buggy-toggle" onClick={() => save({ crm_buggy_mode: v.crm_buggy_mode === 'on' ? 'off' : 'on' })}>Toggle buggy mode</button>
        <button className="btn2" onClick={async () => { await fetch('/api/crm/reset', { method: 'POST' }); setMsg('CRM data reset'); }}>Reset demo CRM data</button></div></div>
  </div>);
}
