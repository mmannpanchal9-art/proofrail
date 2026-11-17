import { metrics } from '../../lib/queries'; import { Empty } from '../../components/ui';
export const dynamic = 'force-dynamic';
export default function Page() {
  const m = metrics();
  if (!m.verifications) return <div className="space-y-4"><h1>Monitoring</h1><Empty t="No data yet. Metrics are computed only from recorded tasks — nothing is shown until real runs exist." /></div>;
  const cards: [string, string | number][] = [['Total tasks', m.total], ['Verified', m.verified], ['Failed', m.failed], ['Needs review', m.review], ['Incomplete', m.incomplete],
    ['Verification success rate', m.rate === null ? 'n/a' : `${(m.rate * 100).toFixed(1)}% (n=${m.verifications})`], ['Avg execution time', m.avgMs === null ? 'n/a' : `${m.avgMs} ms`]];
  return (<div className="space-y-4"><h1>Monitoring</h1><p className="text-sm text-zinc-400">Computed live from SQLite (initial verifications only; re-verifications excluded from rate).</p>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="metrics">{cards.map(([l, v]) => <div key={l} className="card"><div className="text-xs text-zinc-400">{l}</div><div className="text-xl font-semibold">{v}</div></div>)}</div>
    <div className="card"><div className="font-medium mb-2">Common failure reasons</div>{m.reasons.length ? <table><tbody>{m.reasons.map(([r, n]) => <tr key={r}><td>{r}</td><td>{n}</td></tr>)}</tbody></table> : <div className="text-sm text-zinc-500">No failed checks recorded.</div>}</div></div>);
}
