import { defineConfig } from '@playwright/test'
import config from './.ui-playwright.config'
export default defineConfig({ ...config, outputDir: './test-results/label-tests', timeout: 45000, workers: 3, use: { ...config.use, trace: 'off', launchOptions: { executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe' } } })
