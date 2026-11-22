import { chromium } from '@playwright/test';
import { mkdir, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');
const outDir = path.join(root, 'public', 'captures');
const tmpDir = path.join(root, 'scripts', '.capture-tmp');

await rm(tmpDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
await mkdir(tmpDir, { recursive: true });

const server = await createServer({
  root: repoRoot,
  configLoader: 'runner',
  define: {
    'import.meta.env.VITE_SUPABASE_URL': '""',
    'import.meta.env.VITE_SUPABASE_ANON_KEY': '""',
    'import.meta.env.VITE_DEMO_MODE': '"true"',
  },
  server: {
    host: '127.0.0.1',
    port: 3019,
    strictPort: true,
    hmr: false,
    watch: { ignored: ['**/video/**', '**/tunaeye-product-demo/**', '**/tunaeye-cinematic-film/**', '**/test-results/**'] },
  },
});
await server.listen();

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--disable-gpu', '--disable-software-rasterizer'],
});

function trimClip(srcWebm, startSec, durSec, outName) {
  const dest = path.join(outDir, outName);
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-v',
      'error',
      '-ss',
      startSec.toFixed(2),
      '-t',
      durSec.toFixed(2),
      '-i',
      srcWebm,
      '-vf',
      'scale=1280:864:flags=lanczos,fps=30',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-an',
      dest,
    ],
    { encoding: 'utf8' },
  );
  if (r.status !== 0) throw new Error(`ffmpeg failed for ${outName}: ${r.stderr}`);
  console.log(`Captured ${outName} (${durSec.toFixed(2)}s from ${startSec.toFixed(2)}s)`);
}

async function setupContext() {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 864 },
    deviceScaleFactor: 1,
    hasTouch: true,
    isMobile: true,
    recordVideo: { dir: tmpDir, size: { width: 1280, height: 864 } },
  });
  const page = await ctx.newPage();
  await page.route('**/local-api/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(route.request().url().endsWith('/health') ? { sqlite: 'ready', writable: true } : { records: [] }),
    }),
  );
  await page.route('**/status', (route) =>
    route.fulfill({ contentType: 'application/json', body: '{"models":{"sashibocore":true,"tailcut":true}}' }),
  );
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  return { ctx, page };
}

async function enterKiosk(page) {
  await page.goto('http://127.0.0.1:3019/', { waitUntil: 'domcontentloaded' });
  await page.locator('iframe[title="TunaEye"]').waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  const kiosk = page.frames().find((f) => f.parentFrame());
  await kiosk.waitForFunction(() => Boolean(window.__tunaeyeAttached), null, { timeout: 15000 });
  return { landing: kiosk };
}

async function getKiosk(_page, landing) {
  const startBtn = landing.locator('[data-act="start"]').first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await landing.waitForTimeout(500);
  }
  await landing.locator('#gs').waitFor({ state: 'visible', timeout: 15000 });
  return landing;
}

try {
  // RUN 1: Landing -> Welcome -> SignIn -> Weight -> Placement -> Pi Scan -> Grade A -> Receipt -> Dashboard -> Admin
  {
    const { ctx, page } = await setupContext();
    const epoch = Date.now();
    const t = () => (Date.now() - epoch) / 1000;
    const marks = {};

    const { landing } = await enterKiosk(page);
    await page.waitForTimeout(400);
    marks.welcomeStart = t();
    await page.waitForTimeout(1600);
    const kiosk = await getKiosk(page, landing);
    await page.waitForTimeout(2200);
    marks.welcomeEnd = t();

    // Sign in (Owen Pilongo) + Weight (85 kg, 20-200 kg)
    marks.signinStart = t();
    await kiosk.locator('#gs').click();
    await page.waitForTimeout(900);
    await kiosk.locator('#dmsw').click();
    await page.waitForTimeout(500);
    await kiosk.getByRole('combobox', { name: 'Demo scenario' }).selectOption('confident');
    await kiosk.locator('#in').fill('Owen Pilongo');
    await page.waitForTimeout(1100);
    await kiosk.locator('#go').click();
    await page.waitForTimeout(1100);
    await kiosk.locator('[data-k="8"]').click();
    await page.waitForTimeout(500);
    await kiosk.locator('[data-k="5"]').click();
    await page.waitForTimeout(900);
    await kiosk.locator('#go').click();
    marks.signinEnd = t();

    // Placement + Core Scan
    marks.scanStart = t();
    await page.waitForTimeout(1400);
    if (await kiosk.locator('#tps').isVisible()) {
      await kiosk.locator('#tps').click();
      await page.waitForTimeout(1100);
    }
    await kiosk.locator('#sh').waitFor({ state: 'visible' });
    await page.waitForTimeout(1200);
    await kiosk.locator('#sh').click();
    await kiosk.locator('.med5-l').waitFor({ state: 'visible', timeout: 15000 });
    marks.scanEnd = t();

    // Grade A result
    marks.gradeAStart = t();
    await page.waitForTimeout(2400);
    marks.gradeAEnd = t();

    // Receipt + 3-2-1 countdown
    marks.receiptStart = t();
    await kiosk.locator('#go').click();
    await kiosk.locator('.rh1').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(5200);
    marks.receiptEnd = t();

    // Seed realistic synthetic grading records for Owen Pilongo + team so Dashboard & Admin show real populated data
    await kiosk.evaluate(() => {
      const now = Date.now();
      const mk = (id, offMin, grader, wt, grade, conf, synced) => {
        const rate = grade === 'A' ? 420 : grade === 'B' ? 350 : 280;
        return {
          id,
          sessionId: id,
          orderNumber: id,
          grader,
          weight: `${wt} kg`,
          sample: 'Sashibo core',
          grade,
          timestamp: now - offMin * 60000,
          result: { originalConfidence: conf, originalGrade: grade, modelSource: 'pi' },
          transaction: { syncState: synced ? 'synced' : 'local', amount: wt * rate, unitRatePerKg: rate },
          source: 'kiosk',
        };
      };
      const records = [
        mk('TE_0104', 8, 'Owen Pilongo', 85, 'A', 96.3, true),
        mk('TE_0103', 32, 'Owen Pilongo', 72, 'B', 91.4, true),
        mk('TE_0102', 75, 'Owen Pilongo', 64, 'A', 94.1, false),
        mk('TE_0101', 140, 'Maria Santos', 90, 'C', 88.2, true),
        mk('TE_0100', 210, 'Kat', 58, 'B', 84.5, true),
      ];
      localStorage.setItem('tunaeye-records', JSON.stringify(records));
      localStorage.setItem('tunaeye-graders', JSON.stringify(['Owen Pilongo', 'Maria Santos', 'Kat']));
      S.name = 'Owen Pilongo';
    });

    // Dashboard (continuous 9s interaction, no PIN leak)
    await kiosk.evaluate(() => go('dash'));
    await page.waitForTimeout(500);
    marks.dashStart = t();
    await page.waitForTimeout(2200);
    const allBtn = kiosk.getByRole('button', { name: /All device records/i }).first();
    if (await allBtn.isVisible().catch(() => false)) {
      await allBtn.click();
      await page.waitForTimeout(2000);
    }
    const mineBtn = kiosk.getByRole('button', { name: /My records/i }).first();
    if (await mineBtn.isVisible().catch(() => false)) {
      await mineBtn.click();
      await page.waitForTimeout(1600);
    }
    const firstRow = kiosk.locator('.row5, [data-record-id], tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForTimeout(2400);
    } else {
      await page.waitForTimeout(2400);
    }
    marks.dashEnd = t();

    // Admin PIN (1234) + Console tabs with real populated data
    await kiosk.evaluate(() => {
      S.pin = '';
      go('pin');
    });
    await page.waitForTimeout(400);
    marks.adminStart = t();
    await page.waitForTimeout(700);
    for (const d of ['1', '2', '3', '4']) {
      await kiosk.locator(`[data-k="${d}"]`).click();
      await page.waitForTimeout(250);
    }
    await kiosk.locator('.ad').waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(1600);
    for (const tab of ['Records', 'Expert graders', 'Devices', 'Settings', 'Audit logs']) {
      const btn = kiosk.getByRole('button', { name: new RegExp(tab, 'i') }).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(950);
      }
    }
    marks.adminEnd = t();

    const videoPath = await page.video().path();
    await ctx.close();

    trimClip(videoPath, marks.welcomeStart, marks.welcomeEnd - marks.welcomeStart, 'clip-01-welcome.mp4');
    trimClip(videoPath, marks.signinStart, marks.signinEnd - marks.signinStart, 'clip-02-signin-weight.mp4');
    trimClip(videoPath, marks.scanStart, marks.scanEnd - marks.scanStart, 'clip-03-placement-scan.mp4');
    trimClip(videoPath, marks.gradeAStart, marks.gradeAEnd - marks.gradeAStart, 'clip-04a-grade-a.mp4');
    trimClip(videoPath, marks.receiptStart, marks.receiptEnd - marks.receiptStart, 'clip-05-receipt.mp4');
    trimClip(videoPath, marks.dashStart, marks.dashEnd - marks.dashStart, 'clip-06-dashboard.mp4');
    trimClip(videoPath, marks.adminStart, marks.adminEnd - marks.adminStart, 'clip-07-admin.mp4');
  }

  // RUN 2: Tail-Cut Upgrade + Invalid Alert + Expert Override
  {
    const { ctx, page } = await setupContext();
    const epoch = Date.now();
    const t = () => (Date.now() - epoch) / 1000;
    const marks = {};

    const { landing } = await enterKiosk(page);
    const kiosk = await getKiosk(page, landing);

    // Tail-cut flow (needs-tail)
    await kiosk.locator('#gs').click();
    await kiosk.locator('#dmsw').click();
    await kiosk.getByRole('combobox', { name: 'Demo scenario' }).selectOption('needs-tail');
    await kiosk.locator('#in').fill('Kat');
    await kiosk.locator('#go').click();
    await kiosk.locator('[data-k="8"]').click();
    await kiosk.locator('[data-k="5"]').click();
    await kiosk.locator('#go').click();
    await page.waitForTimeout(700);
    if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click();
    await kiosk.locator('#sh').waitFor({ state: 'visible', timeout: 15000 });
    await kiosk.locator('#sh').click();
    await kiosk.getByRole('heading', { name: 'Tail cut needed' }).waitFor({ timeout: 15000 });

    marks.tailStart = t();
    await page.waitForTimeout(1200);
    const tailBtn = kiosk.getByRole('button', { name: /Scan Tail-Cut|Capture tail/i }).first();
    if (await tailBtn.isVisible().catch(() => false)) {
      await tailBtn.click();
    } else {
      await kiosk.locator('#go').click();
    }
    await page.waitForTimeout(700);
    if ((await kiosk.evaluate(() => S.scr)) === 'tailneed') {
      await kiosk.evaluate(() => go('tail'));
    }
    if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click();
    await kiosk.locator('#sh').waitFor({ state: 'visible', timeout: 15000 });
    await kiosk.locator('#sh').click();
    await kiosk.locator('.med5-l').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1600);
    marks.tailEnd = t();

    // Invalid core alert (fresh run timing, capture modal + camera reset cleanly)
    marks.invalidStart = t();
    await kiosk.evaluate(() => { S.core = S.tail = null; S.img = {}; go('name'); });
    await kiosk.getByRole('combobox', { name: 'Demo scenario' }).selectOption('invalid-core');
    await kiosk.evaluate(() => go('core'));
    await kiosk.locator('#sh').waitFor({ state: 'visible', timeout: 15000 });
    marks.invalidStart = t();
    await page.waitForTimeout(300);
    await kiosk.locator('#sh').click();
    await page.waitForTimeout(2800);
    marks.invalidEnd = t();

    // Expert override (needs-expert)
    await kiosk.evaluate(() => { S.core = S.tail = null; S.img = {}; go('name'); });
    await kiosk.getByRole('combobox', { name: 'Demo scenario' }).selectOption('needs-expert');
    await kiosk.evaluate(() => go('core'));
    await kiosk.locator('#sh').waitFor({ state: 'visible', timeout: 15000 });
    await kiosk.locator('#sh').click();
    await kiosk.getByRole('heading', { name: 'Tail cut needed' }).waitFor({ timeout: 15000 });
    const tailBtn2 = kiosk.getByRole('button', { name: /Scan Tail-Cut|Capture tail/i }).first();
    if (await tailBtn2.isVisible().catch(() => false)) {
      await tailBtn2.click();
    } else {
      await kiosk.locator('#go').click();
    }
    await page.waitForTimeout(700);
    if ((await kiosk.evaluate(() => S.scr)) === 'tailneed') {
      await kiosk.evaluate(() => go('tail'));
    }
    if (await kiosk.locator('#tps').isVisible()) await kiosk.locator('#tps').click();
    await kiosk.locator('#sh').waitFor({ state: 'visible', timeout: 15000 });
    await kiosk.locator('#sh').click();
    await kiosk.getByRole('heading', { name: /Manual override required|Expert grade required/i }).waitFor({ timeout: 15000 });

    marks.overrideStart = t();
    await page.waitForTimeout(1000);
    await kiosk.locator('#go, #orb').first().click({ force: true });
    const dialog = kiosk.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForTimeout(500);
    await dialog.getByRole('button', { name: 'Visual inspection' }).click();
    await page.waitForTimeout(350);
    for (const d of ['1', '2', '3', '4']) {
      await dialog.getByRole('button', { name: d, exact: true }).click();
      await page.waitForTimeout(220);
    }
    await page.waitForTimeout(1000);
    marks.overrideEnd = t();

    const videoPath = await page.video().path();
    await ctx.close();

    trimClip(videoPath, marks.tailStart, marks.tailEnd - marks.tailStart, 'clip-04b-tail-cut.mp4');
    trimClip(videoPath, marks.invalidStart, marks.invalidEnd - marks.invalidStart, 'clip-04c-invalid.mp4');
    trimClip(videoPath, marks.overrideStart, marks.overrideEnd - marks.overrideStart, 'clip-04d-override.mp4');
  }
} finally {
  await browser.close();
  await server.close();
}
console.log('LIVE_CLIPS_CAPTURED_OK');
