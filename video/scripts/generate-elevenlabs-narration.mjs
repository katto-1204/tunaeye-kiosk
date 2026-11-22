import {mkdir, writeFile, access, readFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(root, '..');
const out = path.join(root, 'public/audio');
const cache = path.join(root, 'scripts/.elevenlabs-cache');
await mkdir(out, {recursive: true});
await mkdir(cache, {recursive: true});

async function loadEnvKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  for (const name of ['.env.local', '.env']) {
    try {
      const txt = await readFile(path.join(repoRoot, name), 'utf8');
      const m = txt.match(/^ELEVENLABS_API_KEY\s*=\s*["']?([^\r\n"']+)["']?/m);
      if (m?.[1]) return m[1].trim();
    } catch {}
  }
  return '';
}

const apiKey = await loadEnvKey();
if (!apiKey) {
  console.error('ELEVENLABS_API_KEY is missing. Add it to .env.local or environment variables.');
  process.exit(1);
}

// Warm natural male narrator (Brian by default; override with ELEVENLABS_VOICE_ID)
const voiceId = process.env.ELEVENLABS_VOICE_ID || 'nPczCjzI2devNBz1zQrb';
const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2';

// Aligned to 90s dynamic timeline: [0, 9, 17, 27, 55, 64, 73, 85, 90]
const starts = [0, 9, 17, 27, 55, 64, 73, 85, 90];
const fragments = [
  [1, 0.4, "TunaEye. We don't replace the expert eye—we extend its reach."],
  [1, 4.6, 'Offline-first on Raspberry Pi 5. One tap starts grading.'],
  [2, 9.4, 'The grader signs in, checks station readiness, and enters the fish weight.'],
  [3, 17.4, 'Slide the Sashibo core into the 5000 Kelvin chamber, and capture straight from the Pi camera.'],
  [4, 27.4, 'At 75 percent or higher, Grade A or Grade B goes straight to receipt.'],
  [4, 33.4, 'Grade C or uncertain cores trigger a Tail-Cut check—upgrading, confirming, or saving provisional.'],
  [4, 41.4, 'Non-tuna samples are rejected cleanly, and the camera resets.'],
  [4, 47.4, 'Severe disagreement locks behind a Supervisor PIN, keeping human judgment in control.'],
  [5, 55.4, 'Bluetooth auto-prints a 58 millimeter receipt, then counts down three seconds to the next fish.'],
  [6, 64.4, 'In the Grader Dashboard, review every session, inspect captured photos, and reprint anytime.'],
  [7, 73.4, 'Supervisors unlock the Admin Console for overview, records, team, and device checks.'],
  [7, 80.2, 'When internet returns, kiosk and mobile sync into one unified cloud ledger.'],
  [8, 85.4, 'TunaEye. Sea beyond the cut.'],
];

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, {encoding: 'utf8', maxBuffer: 5e6});
  assert.equal(r.status, 0, r.stderr || r.error?.message);
  return r.stdout;
};

for (const [i, frag] of fragments.entries()) {
  const [act, start, text] = frag;
  const file = path.join(cache, `el-${String(i + 1).padStart(2, '0')}.mp3`);
  try {
    await access(file);
  } catch {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.42,
          similarity_boost: 0.78,
          style: 0.28,
          use_speaker_boost: true,
        },
      }),
    });
    if (!res.ok) {
      throw new Error(`ElevenLabs error ${res.status}: ${await res.text()}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(file, buf);
  }
  const duration = Number(
    run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).trim(),
  );
  frag.push(file, duration);
  console.log(`${i + 1}: ${duration.toFixed(2)}s at ${start}s — ${text}`);
}

for (let act = 1; act <= 8; act++) {
  const selected = fragments.filter((f) => f[0] === act);
  const begin = starts[act - 1];
  const end = starts[act];
  const duration = end - begin;
  const filters = [];
  for (const [i, f] of selected.entries()) {
    const next = selected[i + 1]?.[1] ?? end - 0.15;
    const available = Math.max(0.5, next - f[1] - 0.1);
    const tempo = Math.min(1.35, Math.max(1, f[4] / available));
    filters.push(
      `[${i}:a]atempo=${tempo.toFixed(5)},loudnorm=I=-16:TP=-1.5:LRA=6,aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round((f[1] - begin) * 1000)}|${Math.round((f[1] - begin) * 1000)}[v${i}]`,
    );
  }
  filters.push(
    `${selected.map((_, i) => `[v${i}]`).join('')}amix=inputs=${selected.length}:normalize=0,apad=whole_len=${duration * 48000},atrim=end_sample=${duration * 48000},afade=t=out:st=${duration - 0.12}:d=0.12[voice]`,
  );
  const outWav = path.join(out, `voice-${String(act).padStart(2, '0')}.wav`);
  run('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    ...selected.flatMap((f) => ['-i', f[3]]),
    '-filter_complex',
    filters.join(';'),
    '-map',
    '[voice]',
    '-ar',
    '48000',
    '-ac',
    '2',
    '-c:a',
    'pcm_s16le',
    outWav,
  ]);
}
console.log('ELEVENLABS_NARRATION_OK');
