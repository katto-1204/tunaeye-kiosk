import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdir, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(root, 'qa');
const movie = path.join(root, 'out/tunaeye-demo-v2.7.mp4');
const samples = [2,8,14,22,30,37,39,41,44,48,57,62,66,70,73,76,80,82,84,87,91,93,95,98,101,104,108,113,119,125,128,130,135,138,140,142,144,145,146,147,149,157];
const run = (command, args) => {
  const result = spawnSync(command, args, {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024});
  assert.equal(result.status, 0, `${command}: ${result.error?.message ?? result.stderr}`);
  return result;
};
const probe = (file, count = false) => JSON.parse(run('ffprobe', ['-v', 'error', ...(count ? ['-count_frames'] : []), '-show_streams', '-show_format', '-of', 'json', file]).stdout);
const rate = value => {const [n, d = 1] = String(value).split('/').map(Number); return n / d;};
const last = (text, pattern) => {const matches = [...text.matchAll(pattern)]; assert(matches.length, `Missing analysis: ${pattern}`); return Number(matches.at(-1)[1]);};
const parseAudio = text => ({
  integratedLufs: last(text, /I:\s*(-?\d+(?:\.\d+)?)\s+LUFS/g),
  truePeakDbtp: last(text, /True peak:\s*\r?\n\s*Peak:\s*(-?\d+(?:\.\d+)?)\s+dBFS/g),
  samplePeakDbfs: last(text, /Peak level dB:\s*(-?\d+(?:\.\d+)?)/g),
  invalidSamples: [...text.matchAll(/Number of (?:NaNs|Infs):\s*(\d+)/g)].reduce((sum, m) => sum + Number(m[1]), 0),
});
if (process.argv.includes('--self-check')) {
  assert.equal(rate('60/1'), 60);
  assert.deepEqual(parseAudio('I: -18.2 LUFS\nTrue peak:\n Peak: -2.1 dBFS\nPeak level dB: -2.3\nNumber of NaNs: 0\nNumber of Infs: 0'), {integratedLufs: -18.2, truePeakDbtp: -2.1, samplePeakDbfs: -2.3, invalidSamples: 0});
  assert.throws(() => parseAudio('missing'));
  assert.equal(samples.length, 42);
  assert(samples.every(s => s * 60 < 9600));
  console.log('Export verification self-check passed.');
  process.exit(0);
}
await mkdir(path.join(qa, 'frames'), {recursive: true});
const report = {checkedAt: new Date().toISOString(), passed: false, requirements: {width:1920,height:1080,fps:60,frames:9600,seconds:160,sampleRate:48000,channels:2}, wavs: []};
try {
  const media = probe(movie, true);
  const videos = media.streams.filter(s => s.codec_type === 'video');
  const audios = media.streams.filter(s => s.codec_type === 'audio');
  assert.equal(videos.length, 1);
  assert.equal(audios.length, 1);
  const v = videos[0], a = audios[0];
  report.media = {width:v.width,height:v.height,fps:rate(v.avg_frame_rate),decodedFrames:Number(v.nb_read_frames),durationSeconds:Number(media.format.duration),videoCodec:v.codec_name,pixelFormat:v.pix_fmt,audioCodec:a.codec_name,sampleRate:Number(a.sample_rate),channels:a.channels};
  assert.equal(v.width, 1920); assert.equal(v.height, 1080);
  assert.equal(rate(v.avg_frame_rate), 60); assert.equal(Number(v.nb_read_frames), 9600);
  assert(Math.abs(Number(v.duration) - 160) <= 1/60);
  assert(Math.abs(Number(media.format.duration) - 160) <= .05);
  assert.equal(v.codec_name, 'h264'); assert.equal(v.pix_fmt, 'yuv420p');
  assert.equal(a.codec_name, 'aac'); assert.equal(Number(a.sample_rate), 48000); assert.equal(a.channels, 2);
  const analysis = run('ffmpeg', ['-hide_banner','-nostats','-i',movie,'-map','0:a:0','-af','ebur128=peak=true,astats=metadata=0:reset=0','-f','null','-']);
  report.audio = parseAudio(analysis.stderr);
  assert.equal(report.audio.invalidSamples, 0);
  assert(report.audio.samplePeakDbfs < 0, 'Sample clipping');
  assert(report.audio.truePeakDbtp < 0, 'True-peak clipping');
  assert(report.audio.integratedLufs > -35 && report.audio.integratedLufs < -8, 'Mixed audio is implausibly quiet or loud');
  const required = ['intro','tap','keypad','glide','shutter','gradeA','gradeB','tail','lift','alert','lock','print','sync','ocean-bed-98bpm'];
  const wavFiles = (await readdir(path.join(root,'public/audio'))).filter(n => n.endsWith('.wav'));
  required.forEach(n => assert(wavFiles.includes(`${n}.wav`), `Missing ${n}.wav`));
  for (const name of wavFiles) {
    const filename = path.join(root,'public/audio',name);
    const p = probe(filename), s = p.streams[0];
    assert(s.codec_name.startsWith('pcm_'), `${name}: PCM required`);
    assert.equal(Number(s.sample_rate), 48000, `${name}: 48 kHz required`);
    assert.equal(s.channels, 2, `${name}: stereo required`);
    const stats = run('ffmpeg',['-hide_banner','-nostats','-i',filename,'-af','astats=metadata=0:reset=0','-f','null','-']).stderr;
    const peak = last(stats, /Peak level dB:\s*(-?\d+(?:\.\d+)?)/g);
    assert(peak < 0, `${name}: sample clipping`);
    report.wavs.push({file:name,seconds:Number(p.format.duration),sampleRate:48000,channels:2,samplePeakDbfs:peak});
  }
  const select = samples.map(s => `eq(n\\,${s*60})`).join('+');
  run('ffmpeg',['-v','error','-y','-i',movie,'-vf',`select=${select}`,'-fps_mode','vfr',path.join(qa,'frames/frame-%02d.png')]);
  run('ffmpeg',['-v','error','-y','-framerate','1','-i',path.join(qa,'frames/frame-%02d.png'),'-vf','scale=320:180,tile=6x7','-frames:v','1','-q:v','2',path.join(qa,'final-contact-sheet.jpg')]);
  report.frames = samples.map((seconds,index)=>({file:`frames/frame-${String(index+1).padStart(2,'0')}.png`,seconds,frame:seconds*60}));
  report.passed = true;
} catch (error) {report.error = error.message;}
await writeFile(path.join(qa,'export-verification.json'), JSON.stringify(report,null,2));
await writeFile(path.join(qa,'export-verification.md'), `# Export verification\n\nStatus: **${report.passed?'passed':'failed'}**. Checked ${report.checkedAt}.\n\n${report.media?`Decoded export: ${report.media.decodedFrames} frames, ${report.media.durationSeconds}s, ${report.media.width}×${report.media.height} at ${report.media.fps}fps. ${report.media.videoCodec}/${report.media.audioCodec}; ${report.media.sampleRate}Hz stereo.`:''}\n\n${report.audio?`Audio: ${report.audio.integratedLufs} LUFS integrated, ${report.audio.truePeakDbtp} dBTP, ${report.audio.samplePeakDbfs} dBFS sample peak. Invalid samples: ${report.audio.invalidSamples}.`:''}\n\n${report.wavs.length} PCM WAV sources verified for 48kHz stereo and non-clipping sample peaks. All 13 requested effects and the music bed must exist.\n\n${report.frames?`${report.frames.length} decoded key frames extracted; contact sheet: final-contact-sheet.jpg. This extraction is not a claim of visual approval; visual review is recorded separately.`:''}\n\n${report.error?`Failure: ${report.error}\n\n`:''}Checks use ffprobe decoded frame counting and ffmpeg EBU R128/astats. Browser playback is recorded separately. Subjective listening, every-frame visual inspection, physical hardware and live cloud integration are outside this media verification.\n`);
console.log(JSON.stringify({passed:report.passed,media:report.media,audio:report.audio,error:report.error},null,2));
process.exitCode = report.passed ? 0 : 1;
