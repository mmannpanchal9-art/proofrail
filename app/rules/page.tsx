import RulesClient from '../../components/RulesClient'; import { listRules } from '../../lib/service';
export const dynamic = 'force-dynamic';
export default function Page() { return <div className="space-y-4"><h1>Rules</h1><p className="text-sm text-zinc-400">Reusable deterministic rules applied to every verification. Critical rules (*) failing → FAILED.</p><RulesClient rules={listRules()} /></div>; }
