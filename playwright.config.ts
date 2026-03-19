import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90 * 60 * 1000, // 90 minutes for large datasets (dataset9 has 79 tests)
  expect: {
    timeout: 30000 // 30 seconds for assertions
  },
  fullyParallel: false, // Run sequentially to manage browser session
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker to maintain session
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  use: {
    baseURL: 'https://pib.myscheme.in',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30000,
    navigationTimeout: 60000,
  },
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-web-security',
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-gpu', // Reduce GPU memory usage
            '--no-sandbox', // Needed for some environments
            '--disable-setuid-sandbox',
            '--disable-software-rasterizer',
            '--disable-extensions',
            '--js-flags=--max-old-space-size=4096', // Increase memory for V8
          ]
        }
      },
    },
  ],
  outputDir: 'test-results/',
});
