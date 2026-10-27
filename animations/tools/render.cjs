// Renders Lottie files to PNG frames with headless Chromium.
// node render.cjs sheet <out.png> name1 name2 ...   -> contact sheet (5 frames per animation)
// node render.cjs icon <name> <frameFraction> <out.png> [size]
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
const lottieSrc = fs.readFileSync(require.resolve('lottie-web/build/player/lottie_svg.min.js'), 'utf8');
(async () => {
  const [mode, ...rest] = process.argv.slice(2);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.setContent('<html><body style="margin:0;background:transparent"></body></html>');
  await page.addScriptTag({ content: lottieSrc });
  async function frameOf(name, frac, w, h, bg, noFx) {
    const data = JSON.parse(fs.readFileSync(path.join(dist, name + '.json'), 'utf8'));
    if (noFx) data.layers = data.layers.filter((l) => !String(l.nm).startsWith('fx_'));
    await page.evaluate(({ data, frac, w, h, bg }) => {
      document.body.innerHTML = `<div id=c style="width:${w}px;height:${h}px;background:${bg}"></div>`;
      window.anim = lottie.loadAnimation({ container: document.getElementById('c'), renderer: 'svg', loop: false, autoplay: false, animationData: data });
      window.anim.goToAndStop(Math.floor((data.op - 1) * frac), true);
    }, { data, frac, w, h, bg });
    await page.waitForTimeout(60);
    return page.locator('#c').screenshot({ omitBackground: bg === 'transparent' });
  }
  if (mode === 'sheet') {
    const [out, ...names] = rest;
    const fracs = [0.08, 0.25, 0.45, 0.65, 0.85];
    const tiles = [];
    for (const n of names) {
      const d = JSON.parse(fs.readFileSync(path.join(dist, n + '.json'), 'utf8'));
      const h = 240, w = Math.round(h * d.w / d.h);
      for (const f of fracs) tiles.push({ n, img: (await frameOf(n, f, w, h, '#1d1b2e')).toString('base64'), w, h });
    }
    await page.setViewportSize({ width: 1600, height: 1200 });
    await page.setContent('<body style="margin:0;background:#000;font:12px sans-serif;color:#fff"><div id=g style="display:grid;grid-template-columns:repeat(5,auto);gap:4px;width:max-content"></div></body>');
    await page.evaluate((tiles) => { const g = document.getElementById('g'); for (const t of tiles) { const i = new Image(); i.src = 'data:image/png;base64,' + t.img; i.width = t.w; i.height = t.h; g.appendChild(i); } }, tiles);
    await page.waitForTimeout(200);
    await page.locator('#g').screenshot({ path: out });
  } else if (mode === 'banner') {
    const [out, title, sub, c1, c2, iconFile] = rest;
    const icon = fs.readFileSync(iconFile).toString('base64');
    await page.setViewportSize({ width: 1000, height: 400 });
    await page.setContent(`<body style="margin:0"><div id=b style="width:1000px;height:340px;display:flex;align-items:center;gap:30px;padding:0 60px;box-sizing:border-box;background:linear-gradient(120deg,${c1},${c2});font-family:sans-serif;color:#fff"><img src="data:image/png;base64,${icon}" style="width:230px"><div><div style="font-size:58px;font-weight:800;line-height:1.05">${title}</div><div style="font-size:30px;margin-top:14px;opacity:.9">${sub}</div></div></div></body>`);
    await page.waitForTimeout(100);
    await page.locator('#b').screenshot({ path: out });
  } else if (mode === 'icon') {
    // icon <name> <frac> <out> [w] [h] [fx]  : crop box w x h around centre of the comp scaled to fit
    const [name, frac, out, size, keepFx] = rest;
    const d = JSON.parse(fs.readFileSync(path.join(dist, name + '.json'), 'utf8'));
    const s = Number(size || 160);
    const buf = await frameOf(name, Number(frac), s, Math.round(s * d.h / d.w), 'transparent', keepFx !== 'fx');
    fs.writeFileSync(out, buf);
  }
  await browser.close();
})();
