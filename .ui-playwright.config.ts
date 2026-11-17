import { defineConfig } from '@playwright/test'
import config from './playwright.config'

export default defineConfig({
  ...config,
  outputDir: './test-results/ui-integration',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4185' },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4185',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: true,
    env: { VITE_DEMO_MODE: 'false' },
  },
})
