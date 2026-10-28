import { defineConfig } from '@playwright/test';
import os from 'node:os';
import path from 'node:path';

export default defineConfig({
  testDir: './e2e', fullyParallel: false, workers: 1, timeout: 30000,
  use: {
    baseURL: 'http://127.0.0.1:5189', locale: 'en-US', trace: 'retain-on-failure',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {},
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: [
    {
      command: '../venv/bin/python -m uvicorn app.main:app --app-dir ../backend --port 8018',
      url: 'http://127.0.0.1:8018/api/health', reuseExistingServer: false,
      env: { DATABASE_URL: `sqlite:///${path.join(os.tmpdir(), `bankdesk-e2e-${process.pid}.db`)}` },
    },
    {
      command: 'npm run dev -- --port 5189', url: 'http://127.0.0.1:5189', reuseExistingServer: false,
      env: { VITE_BACKEND_URL: 'http://127.0.0.1:8018' },
    },
  ],
});
