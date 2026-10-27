// Renders gift animations into one MP4 showcase:  node showcase.cjs out.mp4 "lion:Lion King:9999" ...
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const lottieSrc = fs.readFileSync(require.resolve('lottie-web/build/player/lottie_svg.min.js'), 'utf8');

(async () => {
  const [out, ...items] = process.argv.slice(2);
  const Wd = 540, Ht = 960;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: Wd, height: Ht } });
  await page.setContent(`<html><body style="margin:0;width:${Wd}px;height:${Ht}px;overflow:hidden;font-family:sans-serif;background:radial-gradient(circle at 50% 35%,#3b2a6b,#120f1f 70%)">
    <div id=c style="position:absolute;inset:0"></div>
    <div id=t style="position:absolute;left:0;right:0;bottom:46px;text-align:center;color:#fff;font-size:30px;font-weight:800;text-shadow:0 2px 10px #000"></div>
    <div id=p style="position:absolute;left:0;right:0;bottom:18px;text-align:center;color:#ffd166;font-size:18px;font-weight:700"></div></body></html>`);
  await page.addScriptTag({ content: lottieSrc });
  for (const it of items) {
    const [name, title, price] = it.split(':');
    const data = JSON.parse(fs.readFileSync(path.join(dist, `${name}.json`), 'utf8'));
    await page.evaluate(({ data, title, price }) => {
      document.getElementById('c').innerHTML = '';
      document.getElementById('t').textContent = title;
      document.getElementById('p').textContent = price ? `${Number(price).toLocaleString('en-IN')} coins` : '';
      window.anim = lottie.loadAnimation({ container: document.getElementById('c'), renderer: 'svg', loop: false, autoplay: false, animationData: data });
    }, { data, title, price });
    for (let f = 0; f < data.op; f++) {
      await page.evaluate((f) => window.anim.goToAndStop(f, true), f);
      ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 90 }));
    }
    for (let k = 0; k < 8; k++) ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 90 }));
    process.stdout.write(`${name} `);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  console.log('\nsaved', out);
})();
