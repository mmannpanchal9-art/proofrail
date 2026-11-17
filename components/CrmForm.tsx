'use client';
import { useState } from 'react';
export default function CrmForm({ c }: { c: any }) {
  const [v, setV] = useState(c); const [msg, setMsg] = useState('');
  return (<form data-testid="record-form" className="card space-y-3 max-w-md" onSubmit={async e => { e.preventDefault(); const j = await (await fetch(`/api/crm/${c.id}`, { method: 'POST', body: JSON.stringify(v) })).json(); setMsg(j.message || j.error); }}>
    <label className="block"><span className="lbl">id</span><input name="id" className="inp" value={v.id} readOnly /></label>
    {['name', 'email', 'company', 'phone'].map(f => <label key={f} className="block"><span className="lbl">{f}</span><input name={f} className="inp" value={v[f] || ''} onChange={e => setV({ ...v, [f]: e.target.value })} /></label>)}
    <button className="btn" type="submit">Save</button>{msg && <div data-testid="save-message" className="text-sm text-emerald-400">{msg}</div>}</form>);
}
