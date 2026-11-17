import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'tests/e2e', timeout: 120000, workers: 1,
  use: { baseURL: 'http://localhost:3199' },
  webServer: { command: 'rm -rf data/test && PROOFRAIL_DATA_DIR=data/test PROOFRAIL_TARGET_BASE=http://localhost:3199 npx next start -p 3199', url: 'http://localhost:3199/api/health', reuseExistingServer: false, timeout: 120000 },
});
