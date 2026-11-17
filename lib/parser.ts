import type { TaskSpec } from './types';

export interface ParseResult { spec: Partial<TaskSpec>; parser: string; warnings: string[]; }
export interface LLMProvider { name: string; parse(prompt: string): Promise<Partial<TaskSpec>>; }

const FIELD_ALIASES: Record<string, string> = { 'company name': 'company', company: 'company', email: 'email', phone: 'phone', name: 'name' };

/** Deterministic template parser. Works without any API key. */
export function templateParse(prompt: string): ParseResult {
  const warnings: string[] = [];
  const spec: Partial<TaskSpec> = {};
  const id = prompt.match(/\b(C-\d{3,})\b/i);
  if (id) spec.customerId = id[1].toUpperCase(); else warnings.push('No customer ID (format C-1234) found. Exact ID is required; names are not used to avoid updating the wrong record.');
  const upd = prompt.match(/(company name|company|email|phone)\s+(?:ko\s+)?(?:to\s+|=\s*)?["“']?([^"”'\n]+?)["”']?\s+(?:mein|me|main)\s+update/i)
    || prompt.match(/(?:update|change|set)\s+(?:the\s+)?(company name|company|email|phone)(?:\s+(?:of|for)\s+(?:customer\s+)?[\w-]+)?\s+(?:to|=)\s+["“']?(.+?)["”']?(?=\s+and\s|[.,;]\s|[.,;]?$|\n)/i);
  if (upd) { spec.field = FIELD_ALIASES[upd[1].toLowerCase()]; spec.expectedValue = upd[2].trim(); }
  else warnings.push('Could not find "update <field> to <value>" pattern.');
  const url = prompt.match(/https?:\/\/[^\s"']+/);
  if (url) spec.targetBaseUrl = url[0].replace(/\/crm.*$/, '').replace(/\/$/, '');
  if (spec.field) spec.allowedFields = [spec.field];
  spec.title = spec.customerId && spec.field ? `Update ${spec.field} of ${spec.customerId}` : 'Untitled task';
  return { spec, parser: 'template (deterministic, no LLM)', warnings };
}

/** OpenAI-compatible chat-completions provider. Only used when an API key is set in env. */
export function openAICompatible(baseUrl: string, model: string, apiKey: string): LLMProvider {
  return {
    name: `llm:${model}`,
    async parse(prompt) {
      const r = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, response_format: { type: 'json_object' }, messages: [
          { role: 'system', content: 'Extract a JSON object {customerId, field (one of company,email,phone,name), expectedValue, targetBaseUrl?}. Only output JSON. Never invent values that are not in the text.' },
          { role: 'user', content: prompt }] }),
      });
      if (!r.ok) throw new Error(`LLM HTTP ${r.status}`);
      const j = await r.json();
      return JSON.parse(j.choices[0].message.content);
    },
  };
}

export function buildPlan(s: TaskSpec) {
  return {
    plan: [
      `Open target website ${s.targetBaseUrl}/crm (approved domain check first)`,
      `Find customer record ${s.customerId} by exact ID`,
      `Read existing ${s.field} value (baseline snapshot by verifier)`,
      `Update approved field "${s.field}" to "${s.expectedValue}"`,
      'Click Save and capture the app/agent success message (claim only)',
      'Verifier re-opens the record in a fresh browser context',
      'Run deterministic checks and classify status',
    ],
    constraints: [
      `Only customer ${s.customerId} may be modified`,
      `Only fields [${s.allowedFields.join(', ')}] may change`,
      'If the exact customer ID is not found, stop the task',
      'Navigation only to approved domains',
    ],
  };
}
