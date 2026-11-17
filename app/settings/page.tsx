import SettingsClient from '../../components/SettingsClient'; import { db } from '../../lib/db';
export const dynamic = 'force-dynamic';
export default function Page() {
  const s = Object.fromEntries((db().prepare('SELECT * FROM settings').all() as any[]).map(r => [r.key, r.value]));
  return <div className="space-y-4"><h1>Settings</h1><SettingsClient s={s} llmKey={!!process.env.PROOFRAIL_LLM_API_KEY} apiToken={!!process.env.PROOFRAIL_API_TOKEN} /></div>;
}
