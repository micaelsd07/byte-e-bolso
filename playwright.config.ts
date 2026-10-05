import { defineConfig } from '@playwright/test';

// Com BASE_URL, os testes rodam contra um ambiente publicado (homologação ou
// produção). Sem ela, sobem o dist/ local com `vite preview`.
const baseURL = process.env.BASE_URL;
// PW_CHANNEL=msedge (ou chrome) usa o navegador já instalado na máquina em vez
// do Chromium baixado pelo Playwright. Na pipeline fica vazio.
const channel = process.env.PW_CHANNEL || undefined;

const celular = { isMobile: true, hasTouch: true, deviceScaleFactor: 2, channel };
const desktop = { isMobile: false, hasTouch: false, channel };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['junit', { outputFile: 'reports/junit-e2e.xml' }], ['html', { outputFolder: 'reports/e2e', open: 'never' }]],
  use: {
    baseURL: baseURL ?? 'http://localhost:4173/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'celular-360', use: { ...celular, viewport: { width: 360, height: 800 } } },
    { name: 'celular-390', use: { ...celular, viewport: { width: 390, height: 844 } } },
    { name: 'celular-412', use: { ...celular, viewport: { width: 412, height: 915 } } },
    { name: 'tablet-768', use: { ...celular, viewport: { width: 768, height: 1024 } } },
    { name: 'desktop-1280', use: { ...desktop, viewport: { width: 1280, height: 720 } } },
    { name: 'desktop-1920', use: { ...desktop, viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: baseURL
    ? undefined
    : { command: 'npm run preview', url: 'http://localhost:4173/', reuseExistingServer: !process.env.CI, timeout: 30_000 },
});
