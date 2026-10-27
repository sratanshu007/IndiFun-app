// Renders a 3D gift scene to frames and encodes:
//   ../dist/<name>.mp4            side-by-side alpha video (left = colour, right = alpha) for the app's VAP player
//   ../preview/<name>_preview.mp4 the same over a dark background, to watch
// Usage: node render.cjs <scene> [--stills 0,40,90] [--every 1]
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require(require.resolve('playwright', { paths: [path.join(__dirname, '..', 'tools'), process.cwd()] }));

const root = __dirname;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  const [scene, ...args] = process.argv.slice(2);
  const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
  await new Promise((r) => server.listen(0, r));
  const PORT = server.address().port;
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const scale = stillsArg && !args.includes('--full') ? 0.4 : 1;
  const q = args.includes('--q') ? args[args.indexOf('--q') + 1] : 'ultra';
  const page = await browser.newPage({ viewport: { width: 1080 * scale, height: 1920 * scale } });
  page.on('pageerror', (e) => console.error('pageerror', e.message));
  page.on('console', (m) => m.type() === 'error' && console.error('console', m.text()));
  await page.goto(`http://localhost:${PORT}/index.html?scene=${scene}&scale=${scale}&q=${q}${args.includes('--icon') ? '&icon=1' : ''}${args.includes('--extra') ? '&' + args[args.indexOf('--extra') + 1] : ''}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 120000 });
  const total = await page.evaluate(() => window.FRAMES);
  const tmp = path.join('/tmp', `r3d_${scene}${args.includes('--tag') ? '_' + args[args.indexOf('--tag') + 1] : ''}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const list = stillsArg ? stillsArg.split(',').map(Number) : [...Array(total).keys()];
  const t0 = Date.now();
  for (const f of list) {
    const url = await page.evaluate((f) => window.renderFrame(f), f);
    fs.writeFileSync(path.join(tmp, stillsArg ? `still_${f}.png` : `f${String(f).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
    if (!stillsArg && f % 30 === 0) process.stdout.write(`${f}/${total} (${((Date.now() - t0) / 1000).toFixed(0)}s) `);
  }
  await browser.close();
  server.close();
  if (stillsArg) {
    // contact sheet over a dark background
    execFileSync('python3', ['-c', `
import glob
from PIL import Image
fs=sorted(glob.glob('${tmp}/still_*.png'), key=lambda f:int(f.split('_')[-1][:-4]))
ims=[Image.open(f).convert('RGBA') for f in fs]
w,h=ims[0].size; s=0.5
c=Image.new('RGB',(int(w*s)*len(ims),int(h*s)),(29,22,52))
for i,im in enumerate(ims):
  im=im.resize((int(w*s),int(h*s))); c.paste(im,(i*int(w*s),0),im)
c.save('${tmp}/sheet.png')`]);
    console.log('sheet', path.join(tmp, 'sheet.png'));
    return;
  }
  const dist = path.join(root, '..', 'dist');
  const prev = path.join(root, '..', 'preview');
  fs.mkdirSync(prev, { recursive: true });
  // Packed layout: colour 1080x1920 on the left, alpha at half size (540x960) top-right.
  const PACK = '[0:v]format=rgba,split[a][b];[a]format=rgb24[rgb];[b]alphaextract,scale=540:960,pad=540:1920:0:0,format=rgb24[al];[rgb][al]hstack';
  const ff = (a) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' });
  ff(['-framerate', '30', '-i', `${tmp}/f%04d.png`, '-filter_complex',
    PACK,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-profile:v', 'high', '-level', '5.1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', path.join(dist, `${scene}.mp4`)]);
  ff(['-framerate', '30', '-i', `${tmp}/f%04d.png`, '-filter_complex',
    PACK,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', '-deadline', 'realtime', '-cpu-used', '8', '-row-mt', '1', '-pix_fmt', 'yuv420p', path.join(dist, `${scene}.webm`)]);
  ff(['-f', 'lavfi', '-i', 'color=c=0x1d1634:s=1080x1920:r=30', '-framerate', '30', '-i', `${tmp}/f%04d.png`, '-filter_complex',
    '[0:v][1:v]overlay=shortest=1,scale=720:1280,format=yuv420p', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart', path.join(prev, `${scene}_preview.mp4`)]);
  // poster frame for the gift icon
  fs.copyFileSync(path.join(tmp, `f${String(Math.floor(total * 0.6)).padStart(4, '0')}.png`), path.join(tmp, 'poster.png'));
  console.log(`\ndone ${scene} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
})();
