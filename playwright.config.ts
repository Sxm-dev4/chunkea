import { defineConfig, devices } from '@playwright/test';

const isCI = !!process.env.CI;
// En local se usa el Chrome instalado (sin descargar navegadores); en CI, el Chromium de Playwright.
const channel = isCI ? undefined : 'chrome';
// WebGL por software para poder probar el armador 3D sin GPU.
const launchOptions = { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] };

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  // El 3D por software usa mucho CPU: pocos procesos a la vez para que sea estable
  workers: isCI ? 2 : 4,
  reporter: isCI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 45_000,
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    locale: 'es-CO',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !isCI,
    timeout: 60_000,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel, launchOptions } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel, launchOptions } },
  ],
});
