import {defineConfig} from '@playwright/test';
import path from 'node:path';
import base from '../../playwright.config';

const root = path.resolve(__dirname, '../..');
export default defineConfig({
  ...base,
  testDir: path.join(root, 'tests'),
  outputDir: path.join(__dirname, 'kiosk-artifacts'),
  reporter: [['line'], ['json', {outputFile:path.join(__dirname,'existing-suite-report.json')}]],
  webServer: {
    command:'npm run dev -- --host 127.0.0.1 --port 4178',
    url:'http://127.0.0.1:4178',
    reuseExistingServer:true,
    cwd:root,
  },
});
