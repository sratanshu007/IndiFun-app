// Big Diamond: a huge brilliant-cut diamond spins with rainbow fire and orbiting mini diamonds.
import { THREE, lights, heroMotion, halo, rays, twinkles, dust, seg, easeOut, rng } from '../fx.js';
import { mats } from '../common.js';

function brilliant(r = 1) {
  const pts = [[0.001, -0.95], [0.22, -0.74], [0.45, -0.5], [0.75, -0.25], [1, -0.02], [1, 0.05], [0.93, 0.13], [0.82, 0.24], [0.62, 0.36], [0.001, 0.36]].map(([x, y]) => new THREE.Vector2(x * r, y * r));
  const g = new THREE.LatheGeometry(pts, 32).toNonIndexed(); g.computeVertexNormals(); return g;
}

// High-contrast "jeweller's light box": black room with many small white panels -> crisp sparkly facets.
function sparkleEnv(renderer) {
  // Ice-white light box: pale room, dense bright panels and a few rainbow "fire" panels,
  // so facets read as clear white crystal with coloured flashes instead of dark metal.
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x6f7c92);
  const rand = rng(99);
  const fire = [0xff4d6d, 0xffb84d, 0xfff35c, 0x5cff9d, 0x4dc3ff, 0x9b6bff];
  for (let i = 0; i < 160; i++) {
    const isFire = rand() > 0.82, dark = !isFire && rand() > 0.72;
    const col = isFire ? new THREE.Color(fire[Math.floor(rand() * fire.length)]).multiplyScalar(5) : dark ? new THREE.Color(0x0a0d14) : new THREE.Color(rand() > 0.7 ? 0xdff0ff : 0xffffff).multiplyScalar(3 + rand() * 6);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + rand() * 1.6, 0.5 + rand() * 1.6), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    const a = rand() * Math.PI * 2, e = (rand() - 0.4) * 2.4;
    m.position.set(Math.cos(a) * Math.cos(e) * 10, Math.sin(e) * 10, Math.sin(a) * Math.cos(e) * 10); m.lookAt(0, 0, 0); env.add(m);
  }
  const pm = new THREE.PMREMGenerator(renderer);
  return pm.fromScene(env, 0.004).texture;
}

export default function build({ scene, camera, renderer }) {
  const T = 4.6;
  camera.position.set(0, 1.0, 10); camera.lookAt(0, 0.1, 0);
  const sweep = lights(scene, { cool: 0xbfe6ff, key: 2.8, sweep: 90 });
  const h = halo(scene, 0x8fd3ff, 8, -2.5, 0.2);
  const h2 = halo(scene, 0xff9ee5, 5, -2, 0.6);
  const r = rays(scene, 0xd6f0ff, 11, -3, 0.2);
  const hero = new THREE.Group(); scene.add(hero);
  const dm = new THREE.MeshPhysicalMaterial({ envMap: sparkleEnv(renderer), color: 0xffffff, metalness: 1, roughness: 0, flatShading: true, envMapIntensity: 1.9, clearcoat: 1,
    iridescence: 0.6, iridescenceIOR: 2.3, iridescenceThicknessRange: [200, 1100], emissive: 0x000000 });
  const big = new THREE.Mesh(brilliant(1.25), dm); hero.add(big);
  const rand = rng(8);
  const minis = [];
  const cols = [0xffffff, 0xff8fb1, 0x8fd3ff, 0xd4a5ff];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.Mesh(brilliant(0.22), i % 4 ? dm : mats.gem(cols[i % 4]));
    scene.add(m);
    minis.push({ m, a: (i / 10) * Math.PI * 2, r: 2.0 + rand() * 0.4, y: (rand() - 0.5) * 1.2, s: 0.7 + rand() * 0.6 });
  }
  const tw = twinkles(scene, 22, (i, v) => { const a = i * 2.4; v.set(Math.cos(a) * 0.8, 0.3 + Math.sin(a * 1.3) * 0.35, 1.4); }, { colors: [0xffffff, 0xbfe6ff, 0xffd6f0], size: [0.35, 0.9], start: 0.9 });
  const d = dust(scene, 36, { colors: [0xffffff, 0xbfe6ff, 0xffd6f0] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 1.5, tiltX: 0.22, idleSpin: 0.0, baseY: 0.1 });
      hero.rotation.y += t * 0.9;
      for (const m of minis) {
        const a = m.a + t * 1.1;
        m.m.position.set(Math.cos(a) * m.r, m.y + 0.1 * Math.sin(t * 2 + m.a), Math.sin(a) * m.r * 0.5);
        m.m.scale.setScalar(m.s * on);
        m.m.rotation.set(0.4, t * 2 + m.a, 0);
      }
      h(t, on, 0.55); h2(t, on, 0.3); r(t, on, 0.45); tw(t, on); d(t, on);
    },
  };
}
