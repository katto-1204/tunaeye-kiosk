import assert from 'node:assert/strict';
import {createReadStream} from 'node:fs';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qa = path.join(root, 'qa');
const samples = [2,14,22,30,38,48,57,62,70,80,87,91,101,106,113,119,125,130,135,138,141,145,149,155,159];
const parseRange = (header, size) => {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2])) return null;
  const start = m[1] ? Number(m[1]) : Math.max(0,size-Number(m[2]));
  const end = m[1] && m[2] ? Math.min(size-1,Number(m[2])) : size-1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start<=end && start<size ? {start,end} : null;
};
if (process.argv.includes('--self-check')) {
  assert.deepEqual(parseRange('bytes=0-99',1000),{start:0,end:99});
  assert.deepEqual(parseRange('bytes=900-',1000),{start:900,end:999});
  assert.deepEqual(parseRange('bytes=-100',1000),{start:900,end:999});
  assert.equal(parseRange('bytes=1000-',1000),null);
  assert.equal(parseRange('bytes=200-100',1000),null);
  assert.equal(parseRange('bytes=0-10,20-30',1000),null);
  console.log('Playback byte-range server self-check passed.');
  process.exit(0);
}
await mkdir(path.join(qa,'playback'),{recursive:true});
const captureErrors = (page, result) => {
  page.on('console',m=>{if(m.type()==='error')result.consoleErrors.push(m.text());if(m.type()==='warning')result.consoleWarnings.push(m.text());});
  page.on('pageerror',e=>result.pageErrors.push(e.message));
  page.on('requestfailed',r=>{const item={url:r.url(),error:r.failure()?.errorText};(item.error==='net::ERR_ABORTED'?result.seekAborts:result.failedRequests).push(item);});
  page.on('response',r=>{if(r.status()>=400)result.httpErrors.push({url:r.url(),status:r.status()});});
};
const emptyResult = () => ({checkedAt:new Date().toISOString(),passed:false,consoleErrors:[],consoleWarnings:[],pageErrors:[],failedRequests:[],seekAborts:[],httpErrors:[],samples:[]});
const clean = result => {
  for (const key of ['consoleErrors','consoleWarnings','pageErrors','failedRequests','httpErrors']) assert.equal(result[key].length,0,`${key}: ${JSON.stringify(result[key])}`);
};
const browser = await chromium.launch({headless:true,channel:'chrome',args:['--autoplay-policy=no-user-gesture-required']});
try {
  if (!process.argv.includes('--final')) {
    const result = emptyResult();
    const page = await browser.newPage({viewport:{width:1600,height:1000}});
    captureErrors(page,result);
    try {
      await page.goto('http://localhost:3107/TunaEyeDemo',{waitUntil:'networkidle',timeout:60000});
      await page.getByRole('button',{name:'Play',exact:true}).waitFor({timeout:60000});
      for (const seconds of (process.argv.includes('--scaffold')?[2]:[2,14,22,30,37,39,41,44,48,57,62,66,70,73,76,80,82,84,87,91,93,95,98,101,104,108,113,119,125,128,130,135,138,140,142,144,145,146,147,149,157])) {
        await page.keyboard.press('g');
        // Studio's Go to frame shortcut focuses its numeric frame field.
        const focused = page.locator('input:focus');
        await focused.waitFor();
        await focused.fill(String(seconds*60));
        await focused.press('Enter');
        await page.getByRole('button',{name:String(seconds*60),exact:true}).waitFor();
        await page.waitForFunction(()=>Array.from(document.querySelectorAll('img')).filter(i=>i.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).every(i=>i.complete&&i.naturalWidth>0),{},{timeout:15000});
        await page.waitForTimeout(150);
        const images = await page.locator('img').evaluateAll(items=>items.filter(i=>i.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(i=>{
          const item={src:i.currentSrc,loaded:i.complete&&i.naturalWidth>0};
          if(!i.currentSrc.includes('/kiosk-screens/'))return item;
          let scene=i.parentElement;
          while(scene&&!(scene.offsetWidth>=1900&&scene.offsetHeight>=1000))scene=scene.parentElement;
          const r=scene.getBoundingClientRect(),b=i.getBoundingClientRect();
          return {...item,bounds:{left:(b.left-r.left)/r.width*1920,right:(b.right-r.left)/r.width*1920,top:(b.top-r.top)/r.height*1080,bottom:(b.bottom-r.top)/r.height*1080}};
        }));
        if(!process.argv.includes('--scaffold'))assert(images.some(i=>i.loaded),'Studio must display loaded image assets');
        assert(images.every(i=>i.loaded),`Unloaded Studio assets at ${seconds}s`);
        for(const i of images.filter(i=>i.bounds)){const b=i.bounds;assert(b.left>=40&&b.right<=1880&&b.top>=120&&b.bottom<=1000,`Tablet image leaves safe region at ${seconds}s: ${JSON.stringify(b)}`);}
        const textBounds=await page.locator('[data-video-title]').evaluateAll(items=>items.filter(el=>el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})).map(el=>{
          let scene=el.parentElement;
          while(scene && !(scene.offsetWidth>=1900&&scene.offsetHeight>=1000))scene=scene.parentElement;
          const r=scene.getBoundingClientRect(),copy=el.parentElement.getBoundingClientRect();
          return {title:el.textContent,copyTop:(copy.top-r.top)/r.height*1080,copyBottom:(copy.bottom-r.top)/r.height*1080,copyLeft:(copy.left-r.left)/r.width*1920,copyRight:(copy.right-r.left)/r.width*1920,overflow:el.scrollWidth-el.clientWidth};
        }));
        for(const b of textBounds){assert(b.overflow<=1,`Title overflows at ${seconds}s: ${b.title}`);assert(b.copyTop>=120&&b.copyBottom<=1000,`Copy leaves safe vertical region at ${seconds}s: ${JSON.stringify(b)}`);assert(b.copyLeft>=40&&b.copyRight<=1880,`Copy leaves safe horizontal region at ${seconds}s`);}
        result.samples.push({seconds,frame:seconds*60,visibleImages:images.length,textBounds,imageBounds:images.filter(i=>i.bounds).map(i=>i.bounds)});
      }
      await page.screenshot({path:path.join(qa,'studio-preview.png')});
      await page.getByRole('button',{name:'Play',exact:true}).click();
      await page.getByRole('button',{name:'Pause',exact:true}).waitFor();
      await page.waitForTimeout(750);
      await page.getByRole('button',{name:'Pause',exact:true}).click();
      clean(result);
      result.passed=true;
    } catch(error) {result.error=error.message;}
    await page.close();
    await writeFile(path.join(qa,process.argv.includes('--scaffold')?'studio-scaffold-verification.json':'studio-verification.json'),JSON.stringify(result,null,2));
    console.log(`Studio verification: ${result.passed?'passed':result.error}`);
    if (!result.passed) process.exitCode=1;
  }
  if (!process.argv.includes('--studio')) {
    const result = emptyResult();
    const filename=path.join(root,'out/tunaeye-demo-v2.7.mp4');
    const info=await stat(filename);
    const server=createServer((request,response)=>{
      const pathname=new URL(request.url,'http://localhost').pathname;
      if(pathname==='/') {
        response.writeHead(200,{'Content-Type':'text/html'});
        response.end('<!doctype html><html><head><title>TunaEye final playback</title><link rel="icon" href="data:,"><style>html,body{margin:0;background:#0f172a}video{display:block;width:100vw;height:100vh;object-fit:contain}</style></head><body><video src="/final.mp4" preload="auto" playsinline></video></body></html>');
        return;
      }
      if(pathname!=='/final.mp4'){response.writeHead(404);response.end();return;}
      const range=request.headers.range?parseRange(request.headers.range,info.size):{start:0,end:info.size-1};
      if(!range){response.writeHead(416,{'Content-Range':`bytes */${info.size}`});response.end();return;}
      response.writeHead(request.headers.range?206:200,{'Content-Type':'video/mp4','Accept-Ranges':'bytes','Content-Length':range.end-range.start+1,...(request.headers.range?{'Content-Range':`bytes ${range.start}-${range.end}/${info.size}`}:{})});
      if(request.method==='HEAD'){response.end();return;}
      const stream=createReadStream(filename,range);
      stream.on('error',()=>response.destroy());response.on('close',()=>stream.destroy());stream.pipe(response);
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const page=await browser.newPage({viewport:{width:1280,height:720}});
    captureErrors(page,result);
    try {
      await page.goto(`http://127.0.0.1:${server.address().port}`,{waitUntil:'load'});
      await page.waitForFunction(()=>document.querySelector('video').readyState>=2,{},{timeout:30000});
      result.metadata=await page.locator('video').evaluate(v=>({duration:v.duration,width:v.videoWidth,height:v.videoHeight}));
      assert(Math.abs(result.metadata.duration-160)<.05);
      assert.equal(result.metadata.width,1920);assert.equal(result.metadata.height,1080);
      for(const seconds of samples){
        await page.locator('video').evaluate(async(v,time)=>{
          v.pause();
          await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Seek ${time}s timeout`)),15000);v.addEventListener('seeked',()=>{clearTimeout(timer);resolve();},{once:true});v.currentTime=time;});
          await v.play();
        },seconds);
        await page.waitForFunction(time=>document.querySelector('video').currentTime>time+.12,seconds,{timeout:15000});
        await page.locator('video').evaluate(v=>v.pause());
        const state=await page.locator('video').evaluate(v=>({currentTime:v.currentTime,readyState:v.readyState,error:v.error?.message??null,audioDecodedBytes:v.webkitAudioDecodedByteCount??null,decodedFrames:v.getVideoPlaybackQuality().totalVideoFrames}));
        assert.equal(state.error,null);assert(state.readyState>=2);assert(state.decodedFrames>0);
        if(state.audioDecodedBytes!==null)assert(state.audioDecodedBytes>0,'Audio must decode');
        result.samples.push({seconds,...state});
        if([2,57,80,106,130,149,155].includes(seconds))await page.locator('video').screenshot({path:path.join(qa,'playback',`second-${seconds}.png`)});
      }
      clean(result);result.passed=true;
    } catch(error){result.error=error.message;}
    finally{await page.close();await new Promise(resolve=>server.close(resolve));}
    await writeFile(path.join(qa,'playback-verification.json'),JSON.stringify(result,null,2));
    console.log(`Final playback verification: ${result.passed?'passed':result.error}`);
    if(!result.passed)process.exitCode=1;
  }
} finally {await browser.close();}
