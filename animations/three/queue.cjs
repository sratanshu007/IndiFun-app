// Render queue: drop an empty file queue/<scene>.todo and a worker renders it.
// node queue.cjs [workers=2] [idleMinutes=40]
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const dir = path.join(__dirname, 'queue');
fs.mkdirSync(dir, { recursive: true });
const workers = Number(process.argv[2] || 2);
const idleMs = Number(process.argv[3] || 40) * 60e3;
let lastWork = Date.now();

function claim() {
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.todo')).sort()) {
    const name = f.slice(0, -5);
    try { fs.renameSync(path.join(dir, f), path.join(dir, `${name}.doing`)); return name; } catch { /* taken */ }
  }
  return null;
}

async function worker(id) {
  for (;;) {
    const name = claim();
    if (!name) {
      if (Date.now() - lastWork > idleMs) return;
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }
    lastWork = Date.now();
    const t0 = Date.now();
    console.log(`[w${id}] start ${name}`);
    const code = await new Promise((res) => {
      const p = spawn('node', [path.join(__dirname, 'render.cjs'), name], { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => { err += d; });
      p.on('close', (c) => { if (c) fs.writeFileSync(path.join(dir, `${name}.err`), err); res(c); });
    });
    fs.renameSync(path.join(dir, `${name}.doing`), path.join(dir, `${name}.${code ? 'failed' : 'done'}`));
    lastWork = Date.now();
    console.log(`[w${id}] ${code ? 'FAILED' : 'done'} ${name} in ${Math.round((Date.now() - t0) / 1000)}s`);
  }
}
Promise.all(Array.from({ length: workers }, (_, i) => worker(i + 1))).then(() => console.log('queue idle, exiting'));
