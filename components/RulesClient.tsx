'use client';
import { useState } from 'react'; import { useRouter } from 'next/navigation';
export default function RulesClient({ rules }: { rules: any[] }) {
  const r = useRouter(); const [n, setN] = useState({ name: '', type: 'required_not_empty', field: 'phone', pattern: '' }); const [err, setErr] = useState('');
  const call = async (u: string, m: string, b?: any) => { const x = await fetch(u, { method: m, body: b && JSON.stringify(b) }); if (!x.ok) setErr((await x.json()).error); else { setErr(''); r.refresh(); } };
  return (<div className="space-y-4"><div className="card"><table><thead><tr><th>Rule</th><th>Type</th><th>Config</th><th>Enabled</th><th></th></tr></thead><tbody>
    {rules.map(x => <tr key={x.id}><td>{x.name}</td><td className="text-zinc-400">{x.type}</td><td className="text-xs">{JSON.stringify(x.config)}</td>
      <td><input type="checkbox" checked={x.enabled} onChange={e => call(`/api/rules/${x.id}`, 'PATCH', { enabled: e.target.checked })} /></td>
      <td><button className="btn2" onClick={() => call(`/api/rules/${x.id}`, 'DELETE')}>Delete</button></td></tr>)}</tbody></table></div>
    <div className="card grid md:grid-cols-5 gap-2 items-end">
      <label><span className="lbl">Name</span><input className="inp" value={n.name} onChange={e => setN({ ...n, name: e.target.value })} /></label>
      <label><span className="lbl">Type</span><select className="inp" value={n.type} onChange={e => setN({ ...n, type: e.target.value })}>{['required_not_empty', 'field_matches_regex', 'record_id_match', 'approved_domain', 'persisted_after_reload', 'no_out_of_scope_changes'].map(t => <option key={t}>{t}</option>)}</select></label>
      <label><span className="lbl">Field</span><input className="inp" value={n.field} onChange={e => setN({ ...n, field: e.target.value })} /></label>
      <label><span className="lbl">Regex (for field_matches_regex)</span><input className="inp" value={n.pattern} onChange={e => setN({ ...n, pattern: e.target.value })} /></label>
      <button className="btn" onClick={() => call('/api/rules', 'POST', { name: n.name, type: n.type, config: { field: n.field, ...(n.pattern ? { pattern: n.pattern } : {}) } })}>Add rule</button>
      {err && <div className="text-red-400 text-sm col-span-5">{String(err)}</div>}</div></div>);
}
