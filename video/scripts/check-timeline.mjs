import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';

const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');
const main = await read('src/TunaEyeDemo.tsx');
const decisions = await read('src/scenes/DecisionMontage.tsx');
const durations = [...main.matchAll(/<TransitionSeries.Sequence[^>]*durationInFrames=\{(\d+)\}/g)].map(m=>Number(m[1]));
assert.equal(durations.length, 8);
assert.equal(durations.reduce((a,b)=>a+b,0)-7*24, 9600);
let start = 0;
durations.forEach((duration,i)=>{
  assert.equal(start, [0,18,36,54,110,122,134,152][i]*60, `Act ${i+1} timing`);
  start += duration-24;
});
const montage = [...decisions.matchAll(/<Series.Sequence[^>]*durationInFrames=\{(\d+)\}/g)].map(m=>Number(m[1]));
assert.equal(montage.reduce((a,b)=>a+b,0), 3360);
for (let preset=1;preset<=12;preset++) assert(decisions.includes(`demo-${String(preset).padStart(2,'0')}-`), `Missing preset ${preset}`);
const workflow = await read('src/scenes/WorkflowActs.tsx');
for (const match of (workflow+decisions).matchAll(/screenshot="([^"]+)"/g)) await readFile(new URL(`public/kiosk-screens/${match[1]}`,root));
const manifest = JSON.parse(await read('qa/asset-manifest.json'));
for (const asset of manifest) {
  const bytes = await readFile(new URL(`public/${asset.file}`,root));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),asset.sha256,asset.file);
}
console.log(`Timeline passed: 8 acts, 9600 frames, 12 presets, ${manifest.length} unmodified copied assets. ${fileURLToPath(root)}`);
