# PROOFRAIL — Honest Technical Analysis

## 1. Feasibility
Feasible, with a clear boundary: PROOFRAIL can only verify outcomes it can **independently observe**. For web apps where the result is visible (a record page, an API, a DB read-replica), deterministic verification is straightforward and reliable. It is *not* feasible to "verify any task on any website" — verification needs a defined expected state and a read path that does not depend on the agent.

## 2. MVP priority (what was built first)
1. Structured task spec (target, record ID, field, expected value, allowed fields) — the source of truth.
2. Independent verifier: re-reads state in a fresh browser context, deterministic checks, 4 statuses.
3. Executor (Playwright) kept separate; its success message stored only as a *claim*.
4. Evidence store (screenshots, observed values, URLs, logs) with origin = `real` vs `agent_claim`.
5. Receipts (JSON + PDF), history, re-verification as separate records.
6. Claim-ingestion API for external agents.
7. Reusable rules, monitoring from real DB data, settings. NL parsing last (it is the least reliable piece).

## 3. Verification engine
- `lib/evaluate.ts` is a **pure function**: input = spec, baseline snapshot, post snapshot, rules, allowlist, (agent claim). Output = checks + status.
- Snapshots come from `lib/browser.ts#readRecord`, which launches a **new browser and context** (no shared cookies/cache with the executor), so a value must come from the server to pass "persisted after reload".
- Baseline is taken by the verifier *before* execution, enabling "no out-of-scope field changed" diffing.
- Status: any critical check fails → **FAILED**; state not observable / execution didn't reach verifiable state → **INCOMPLETE**; unknown checks, non-critical failures, or no screenshot evidence → **NEEDS_REVIEW**; else **VERIFIED**.
- The agent claim is added as an informational check with result `unknown` and is never an input to a passing check. A claim of success that contradicts state is called out in the summary.

## 4. Agent integration architecture
- **Built-in executor adapter** (Playwright) — the one implemented and tested.
- **Claim ingestion API** `POST /api/claims` — any agent (LangChain, browser-use, custom scripts) posts `{agent, customerId, field, expectedValue, claimedSuccess, claim, baseline?}`; PROOFRAIL verifies against live state. Optional bearer token via `PROOFRAIL_API_TOKEN`.
- Next step: an `Adapter` interface `{ execute(spec): ExecResult }` per provider and a `StateReader` interface per target type (browser page, REST API, SQL). Readers are the key extension point — the verifier, not the agent, owns them.
- No third-party agent integrations were built or claimed.

## 5. What really automates vs. limits
Works well: deterministic forms/records on sites you control or are authorized for, API-backed state, field equality/regex/non-empty/scope checks, persistence after reload.
Limits:
- **CAPTCHA / bot protection**: should not be bypassed; such flows → INCOMPLETE/human.
- **Auth/2FA**: needs per-target credential vaulting and session handling (not in MVP).
- **Dynamic UIs**: selectors break; the MVP reader is tailored to the demo CRM (`name=` inputs). Every real target needs a reader config or an API reader.
- **Eventual consistency**: re-read may race async saves; needs retry/backoff windows (not in MVP).
- **LLM plan parsing**: non-deterministic and can hallucinate IDs/values. Hence the structured form is the source of truth, the user reviews parsed fields, and the default parser is a deterministic regex template (no LLM). The LLM path (OpenAI-compatible) is implemented but **untested** here because no API key was available.
- Verification of "soft" outcomes (report quality, emails' tone) can't be deterministic → NEEDS_REVIEW.

## 6. Security & scalability
Implemented: domain allowlist enforced on executor and verifier; explicit `authorized=true` for data-modifying tasks; LLM key only from env (never in DB/UI/logs); evidence filenames validated; evidence origin separation; uncertain → never VERIFIED; history append-only for verifications.
Not yet: authN/authZ on UI, multi-tenant isolation, credential vault, PII redaction in screenshots, signed/hashed receipts (tamper evidence), rate limiting, prompt-injection hardening for an LLM-driven executor, a security audit. **Do not treat this MVP as secure for production.**
Scale path: move SQLite→Postgres, run executions/verifications in a job queue with isolated browser workers (containers), object storage for evidence, hash-chained receipts.

## 7. Differentiation (practical, not "industry-first")
Testing tools (Playwright Test, Cypress) assert on scripted flows written by engineers; RPA tools and agent frameworks focus on *doing* the task; observability/eval tools (tracing, LLM evals) mostly record or score what the agent said/did. PROOFRAIL's practical angle is narrower: an **outcome-verification service** that takes a task spec + agent claim, independently re-reads target state, and issues a structured, evidence-linked receipt with a conservative status. Overlap with these categories is real; whether competitors already offer this exact combination was **not researched** here, so no uniqueness claim is made.
