import { mkdir, writeFile, access, readFile, rename } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'public/audio');
await mkdir(out,{recursive:true});
const cache=path.join(root,'scripts/.audio-cache-v5');await mkdir(cache,{recursive:true});
const starts=[0,10,20,28,48,54,63,78,83];
// Exact frame-synced 83s Problem -> Solution + Live Performance timeline.
const fragments=[
  [1,0.15,'Tuna grading depends on rare expert eyes, uneven light, and manual tallies.'],
  [1,5.15,'Enter Tuna Eye. Offline-first vision on Raspberry Pi five.'],
  [2,10.15,'One tap starts grading.'],
  [2,13.9,'Owen Pilongo signs in, checks readiness, and enters weight from twenty to two hundred kilograms.'],
  [3,20.15,'Place the Sashibo core in the controlled chamber, and capture live from the Pi camera.'],
  [4,28.15,'At seventy five percent or higher, Grade A or B goes straight to receipt.'],
  [4,34.15,'Grade C or uncertain cores trigger a live Tail-Cut check.'],
  [4,39.15,'Non-tuna samples are rejected cleanly.'],
  [4,43.15,'Severe disagreement locks behind a Supervisor PIN.'],
  [5,48.15,'Bluetooth auto-prints a fifty eight millimeter receipt, then counts down three seconds.'],
  [6,54.15,'In the Grader Dashboard, review every session, inspect photos, and reprint anytime.'],
  [7,63.15,'Supervisors enter PIN one two three four for live station data, records, and devices.'],
  [7,72.15,'Once Wi-Fi returns, local records sync to the Supabase cloud ledger.'],
  [8,78.15,'Tuna Eye. Sea beyond the cut.'],
];
const run = (cmd, args) => { const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 5e6 }); assert.equal(r.status, 0, r.stderr || r.error?.message); return r.stdout; };
const local = process.argv.includes('--local');
let service = local ? 'Windows local speech synthesis' : 'Microsoft Edge neural TTS (Python edge-tts)', voice = local ? 'Microsoft Zira Desktop' : 'en-US-BrianMultilingualNeural';
const ps = path.join(root, 'scripts/local-narration.ps1');
await writeFile(ps, `param([string]$TextPath,[string]$OutputPath)
Add-Type -AssemblyName System.Speech
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
$speaker.Rate = 0
$speaker.Volume = 100
$speaker.SetOutputToWaveFile($OutputPath)
$speaker.Speak([System.IO.File]::ReadAllText($TextPath))
$speaker.Dispose()
`);
for (const [i, fragment] of fragments.entries()) {
  const [act, start, text] = fragment;
  const filename = `narration-fragment-${String(i + 1).padStart(2, '0')}.${local ? 'wav' : 'mp3'}`;
  const file = path.join(cache, filename);
  try { await access(file); } catch { try { await rename(path.join(out, filename), file); } catch { } }
  try { await access(file); } catch {
    if (!local) {
      run('python', ['-m', 'edge_tts', '--voice', voice, '--rate=-2%', '--pitch=-1Hz', '--text', text, '--write-media', file]);
    } else {
      const textPath = path.join(cache, 'narration-input.txt'); await writeFile(textPath, text);
      run('powershell', ['-NoProfile', '-File', ps, '-TextPath', textPath, '-OutputPath', file]);
    }
  }
  const duration = Number(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]).trim());
  fragment.push(file, duration); console.log(`${i + 1}: ${duration.toFixed(2)}s at ${start}s ${text}`);
}
const manifest = { voice, service, sampleRate: 48000, channels: 2, acts: [] };
for (let act = 1; act <= 8; act++) {
  const selected = fragments.filter(f => f[0] === act), begin = starts[act - 1], end = starts[act], duration = end - begin;
  const filters = [];
  for (const [i, f] of selected.entries()) {
    const next = selected[i + 1]?.[1] ?? end - .2, available = next - f[1] - .15, tempo = Math.max(1, f[4] / available);
    assert(tempo < 1.5, `Act ${act} speech would be rushed: ${tempo}`);
    filters.push(`[${i}:a]atempo=${tempo.toFixed(5)},loudnorm=I=-19:TP=-5:LRA=6,aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round((f[1] - begin) * 1000)}|${Math.round((f[1] - begin) * 1000)}[v${i}]`);
  }
  filters.push(`${selected.map((_, i) => `[v${i}]`).join('')}amix=inputs=${selected.length}:normalize=0,apad=whole_len=${duration * 48000},atrim=end_sample=${duration * 48000},afade=t=out:st=${duration - .15}:d=0.15[voice]`);
  const file = `voice-${String(act).padStart(2, '0')}.wav`;
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...selected.flatMap(f => ['-i', f[3]]), '-filter_complex', filters.join(';'), '-map', '[voice]', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', path.join(out, file)]);
  manifest.acts.push({ act, start: begin, duration, file, fragments: selected.map(f => ({ start: f[1], text: f[2], sourceSeconds: f[4] })) });
}
await writeFile(path.join(out, 'narration-manifest.json'), JSON.stringify(manifest, null, 2));
const levels = [];
for (const act of manifest.acts) {
  const data = await readFile(path.join(out, act.file)); let p = 12, fmt, pcm;
  while (p + 8 <= data.length) { const kind = data.toString('ascii', p, p + 4), size = data.readUInt32LE(p + 4); if (kind === 'fmt ') fmt = data.subarray(p + 8, p + 8 + size); if (kind === 'data') pcm = data.subarray(p + 8, p + 8 + size); p += 8 + size + (size % 2); }
  assert(fmt && pcm); assert.equal(fmt.readUInt16LE(0), 1); assert.equal(fmt.readUInt16LE(2), 2); assert.equal(fmt.readUInt32LE(4), 48000); assert.equal(fmt.readUInt16LE(14), 16); assert.equal(pcm.length / 4 / 48000, act.duration);
  let peak = 0, clipped = 0, energy = 0; for (let p = 0; p < pcm.length; p += 2) { const x = pcm.readInt16LE(p) / 32768; peak = Math.max(peak, Math.abs(x)); energy += x * x; if (Math.abs(x) >= .9999) clipped++; }
  assert.equal(clipped, 0); assert(peak < .8);
  levels.push({ file: act.file, seconds: act.duration, sampleRate: 48000, channels: 2, bitDepth: 16, peakDbFS: 20 * Math.log10(peak), rmsDbFS: 10 * Math.log10(energy / (pcm.length / 2)), clippedSamples: clipped });
}
await writeFile(path.join(out, 'narration-audio-report.json'), JSON.stringify({ voice, service, files: levels }, null, 2));
try { await rename(path.join(out, 'narration-input.txt'), path.join(cache, 'narration-input-previous.txt')); } catch { }
console.log(JSON.stringify(manifest, null, 2));
