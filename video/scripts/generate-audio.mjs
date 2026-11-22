import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Original C-major score and effects: no sampled or externally licensed recordings.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public/audio');
await mkdir(out,{recursive:true});
const SR=48000,TAU=2*Math.PI,beat=60/98;
let seed=270098;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2147483648-1;};
const freq=n=>440*2**((n-69)/12);
const clamp=n=>Math.max(0,Math.min(1,n));
const buffer=seconds=>new Float32Array(Math.round(seconds*SR)*2);
function tone(b,start,duration,midi,level,kind='marimba',pan=0){
  const first=Math.round(start*SR),n=Math.min(Math.round(duration*SR),b.length/2-first),f=freq(midi);
  const l=Math.cos((pan+1)*Math.PI/4),r=Math.sin((pan+1)*Math.PI/4);
  let low=0;
  for(let i=0;i<n;i++){
    const t=i/SR,p=TAU*f*t,release=clamp((duration-t)/Math.min(.22,duration*.3));
    let s=0,e=1;
    if(kind==='marimba') {s=Math.sin(p)+.35*Math.sin(p*3.997)*Math.exp(-t*13)+.14*Math.sin(p*9.03)*Math.exp(-t*25);e=clamp(t/.003)*Math.exp(-t*4.5)*release;}
    if(kind==='pad') {s=(Math.sin(p*.998)+Math.sin(p*1.002)+.22*Math.sin(p*2.001))/2.22;e=clamp(t/1.5)*clamp((duration-t)/1.8)*(.8+.2*Math.sin(t*TAU*.11));}
    if(kind==='bass') {s=Math.sin(p)+.14*Math.sin(p*2);e=clamp(t/.025)*Math.exp(-t*1.9)*release;}
    if(kind==='bell') {s=Math.sin(p)+.23*Math.sin(p*2.76)+.12*Math.sin(p*5.41);e=clamp(t/.003)*Math.exp(-t*2.8)*release;}
    if(kind==='tap') {low=.7*low+.3*noise();s=.28*(noise()-low)+.72*Math.sin(p)*Math.sin(p*1.41);e=clamp(t/.002)*Math.exp(-t*65)*release;}
    if(kind==='thud') {s=Math.sin(TAU*(52*t+130*.025*(1-Math.exp(-t/.025))))+.08*noise();e=clamp(t/.004)*Math.exp(-t*14)*release;}
    if(kind==='shutter') {s=noise()*.65+Math.sin(TAU*1280*t)*.25;e=(Math.exp(-t*55)+.65*Math.exp(-Math.abs(t-.08)*90))*clamp(t/.001)*release;}
    if(kind==='sweep') {low=.94*low+.06*noise();s=low*.8+Math.sin(TAU*(160*t+750*t*t/duration))*.12;e=Math.sin(Math.PI*t/duration)**2;}
    if(kind==='paper') {low=.7*low+.3*noise();s=(noise()-low)*(.3+.7*Math.sin(t*TAU*43)**2)+Math.sin(TAU*260*t)*.08;e=clamp(t/.05)*release;}
    if(kind==='ocean') {low=.997*low+.003*noise();s=low*3;e=clamp(t/3)*clamp((duration-t)/4)*(.5+.5*Math.sin(t*TAU*.08)**2);}
    s*=e*level;
    const idx=(first+i)*2;b[idx]+=s*l;b[idx+1]+=s*r;
    if(kind==='marimba'||kind==='bell'){
      for(const [delay,gain] of [[.19,.18],[.37,.1]]) {const j=idx+Math.round(delay*SR)*2;if(j+1<b.length){b[j]+=s*r*gain;b[j+1]+=s*l*gain;}}
    }
  }
}
const report=[];
async function save(name,b,ceiling){
  const frames=b.length/2;
  for(let i=0;i<frames;i++){const g=clamp(i/(SR*.008))*clamp((frames-1-i)/(SR*.02));b[i*2]*=g;b[i*2+1]*=g;}
  let peak=0;for(const v of b){assert(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));}
  const gain=ceiling/(peak||1),n=b.length/2;
  const wav=Buffer.alloc(44+b.length*2);wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(b.length*2,40);
  let energy=0,post=0;for(let i=0;i<b.length;i++){const x=b[i]*gain;post=Math.max(post,Math.abs(x));energy+=x*x;wav.writeInt16LE(Math.round(x*32767),44+i*2);}
  assert(post<1);assert(Math.abs(b[0]*gain)<.001&&Math.abs(b.at(-1)*gain)<.001,'No hard-cut endpoints');
  await writeFile(path.join(out,name),wav);report.push({file:name,seconds:n/SR,sampleRate:SR,channels:2,bitDepth:16,peakDbFS:20*Math.log10(post),rmsDbFS:10*Math.log10(energy/b.length),clippedSamples:0});
}

const music=buffer(160);
tone(music,0,160,48,.09,'ocean',-.25);
const chords=[[48,55,60,64,67],[45,52,57,60,64],[41,48,53,57,60],[43,50,55,59,62]];
for(let bar=0;bar*beat*4<160;bar++){
  const t=bar*beat*4,tension=t>=67&&t<91;
  const chord=tension?[43,50,55,60,62]:chords[bar%4];
  chord.forEach((note,j)=>tone(music,t,beat*4+1.5,note,.047,'pad',(j-2)/3));
  tone(music,t,beat*1.8,chord[0]-12,.12,'bass',0);
  tone(music,t+beat*2,beat*1.6,chord[0]-12,.085,'bass',0);
  const arp=[0,2,3,1,2,4,3,2];
  arp.forEach((degree,j)=>tone(music,t+j*beat/2,1.35,chord[degree]+12,.09*(j%2?.7:1),'marimba',j%2?.4:-.4));
  if(bar%4===0)tone(music,t+beat*3,2.4,chord[4]+12,.03,'bell',.2);
}
for(let i=0;i<music.length/2;i++){const t=i/SR,g=clamp(t/3)*clamp((160-t)/5);music[i*2]*=g;music[i*2+1]*=g;}
await save('ocean-bed-98bpm.wav',music,.75);

let b=buffer(3.4);tone(b,0,3.4,36,.4,'pad');tone(b,.18,2.6,36,.32,'sweep');[72,79,84].forEach((n,i)=>tone(b,.7+i*.2,2.2,n,.24,'bell',(i-1)*.3));await save('intro.wav',b,.45);
b=buffer(.23);tone(b,0,.2,87,.5,'tap');await save('tap.wav',b,10**(-14/20));
b=buffer(1.35);[0,1,2,3,4].forEach(i=>tone(b,i*.19,.18,75+i,.3,'tap',(i-2)*.08));tone(b,.92,.4,84,.12,'bell');await save('keypad.wav',b,.4);
b=buffer(2);tone(b,0,1.65,48,.45,'sweep');tone(b,.15,1.7,59,.16,'pad');await save('glide.wav',b,.4);
b=buffer(.85);tone(b,0,.22,60,.6,'shutter');tone(b,.12,.55,72,.2,'sweep');await save('shutter.wav',b,.45);
for(const [name,chord] of [['gradeA.wav',[72,76,79,84]],['gradeB.wav',[67,71,74,79]]]){b=buffer(2.4);chord.forEach((n,i)=>tone(b,.05+i*.065,2,n,.25,'bell',(i-1.5)*.15));await save(name,b,.45);}
b=buffer(2.4);[60,65,67].forEach((n,i)=>tone(b,.05+i*.08,2.1,n,.25,'pad',(i-1)*.2));await save('tail.wav',b,.4);
b=buffer(2.7);[60,64,67,72,76,79,84].forEach((n,i)=>tone(b,i*.14,1.7,n,.27,'marimba',(i-3)*.12));await save('lift.wav',b,.45);
b=buffer(1.1);[.02,.25].forEach(t=>tone(b,t,.5,45,.4,'thud'));tone(b,.1,.8,62,.12,'pad');await save('alert.wav',b,.4);
b=buffer(1.5);[0,.17,.34,.51].forEach((t,i)=>tone(b,t,.17,80+i,.3,'tap'));tone(b,.75,.5,38,.7,'thud');tone(b,.86,.55,72,.12,'bell');await save('lock.wav',b,.45);
b=buffer(2.8);tone(b,.02,2.05,60,.4,'paper');tone(b,2.08,.28,60,.5,'sweep');tone(b,2.27,.3,60,.35,'shutter');await save('print.wav',b,.4);
b=buffer(2.3);[72,76,79,84,91].forEach((n,i)=>tone(b,i*.15,1.4,n,.2,'bell',(i-2)*.15));await save('sync.wav',b,.45);
await writeFile(path.join(out,'audio-report.json'),JSON.stringify({description:'Original deterministic offline synth; 98 BPM C major with suspended bridge at 67–91 seconds.',files:report},null,2));
console.log(JSON.stringify(report,null,2));
