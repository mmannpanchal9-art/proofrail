# PROOFRAIL MVP
Verification layer for AI agents — "Don't trust the action. Verify the outcome."

## Run on your laptop

You need Node.js 18 or newer.

    npm install
    npx playwright install chromium
    npm run build && npm start

Then open http://localhost:3100 in your browser.

## Run
    npm install && npx playwright install chromium
    npm run build && npm start          # http://localhost:3100
Optional env: `PROOFRAIL_LLM_API_KEY` (OpenAI-compatible NL parsing), `PROOFRAIL_API_TOKEN` (protects /api/claims), `PROOFRAIL_DATA_DIR` (default data/app).

Demo: open /tasks/new → tick authorize → Execute & verify (VERIFIED). Then Settings → Toggle buggy mode → run again (FAILED: CRM said "Saved successfully" but did not save).

## Tests
    npm test            # vitest unit tests
    npx playwright test # API integration + browser e2e (starts its own server on :3199 with a separate DB)

## External agent claim
    curl -X POST localhost:3100/api/claims -H 'content-type: application/json' \
      -d '{"agent":"my-agent","customerId":"C-1003","field":"company","expectedValue":"Acme Technologies","claimedSuccess":true}'

See ANALYSIS.md for design, limitations and security notes.
