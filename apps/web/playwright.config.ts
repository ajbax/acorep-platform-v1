import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;
const CI = !!process.env.CI;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    // Locally reuse the installed Chrome; CI installs Playwright's Chromium.
    channel: CI ? undefined : 'chrome',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], channel: CI ? undefined : 'chrome' }, testIgnore: /desktop\.spec/ },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 } }, testMatch: /desktop\.spec/ },
  ],
  webServer: {
    // Production build, not the dev server: the dev server can reload mid-test while re-bundling deps.
    command: `pnpm exec vite build && pnpm exec vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
  },
});
