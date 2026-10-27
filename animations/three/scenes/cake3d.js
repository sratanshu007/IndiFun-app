// Birthday Cake: three tiers, cream piping, drips, strawberries, lit candles and a topper card.
import { THREE, lights, heroMotion, halo, rays, twinkles, confetti, dust, seg, easeOut, lathe, canvasTexture, rng } from '../fx.js';
import { makeFlame, textPlate } from '../objects.js';
import { sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 2.2, 12); camera.lookAt(0, 0.4, 0);
  const sweep = lights(scene, { warm: 0xfff3e6, key: 2.2 });
  const h = halo(scene, 0xffb36b, 9, -3, 0.6);
  const r = rays(scene, 0xffe0b5, 11, -3.5, 0.6);
  const rand = rng(12);
  const hero = new THREE.Group(); scene.add(hero);
  const fondant = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.25 });
  const cream = new THREE.MeshPhysicalMaterial({ color: 0xfffaf0, roughness: 0.5, sheen: 0.4 });
  const choc = new THREE.MeshPhysicalMaterial({ color: 0x4a2412, roughness: 0.25, clearcoat: 0.9 });
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.6, 0.08, 96), new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.15 }));
  plate.position.y = -1.3; hero.add(plate);
  const tiers = [[1.45, 0.85, -0.85, 0xffc2d6], [1.05, 0.75, -0.05, 0xffffff], [0.7, 0.65, 0.65, 0xffd6e4]];
  for (const [rad, ht, y, col] of tiers) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, ht, 96), fondant(col)); c.position.y = y; hero.add(c);
    // chocolate drips around the top edge
    const n = Math.round(rad * 22);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, len = 0.12 + rand() * 0.22;
      const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, len, 6, 12), choc);
      d.position.set(Math.cos(a) * (rad + 0.01), y + ht / 2 - len / 2 - 0.02, Math.sin(a) * (rad + 0.01)); hero.add(d);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(rad + 0.02, rad + 0.02, 0.05, 96), choc); top.position.y = y + ht / 2; hero.add(top);
    // cream piping beads at the base
    const m = Math.round(rad * 30);
    for (let i = 0; i < m; i++) {
      const a = (i / m) * Math.PI * 2;
      const bd = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), cream);
      bd.position.set(Math.cos(a) * (rad + 0.02), y - ht / 2 + 0.06, Math.sin(a) * (rad + 0.02)); bd.scale.y = 0.75; hero.add(bd);
    }
    // strawberries and cream swirls on the rim
    const k = Math.round(rad * 6);
    for (let i = 0; i < k; i++) {
      const a = (i / k) * Math.PI * 2 + 0.3;
      const sw = new THREE.Mesh(lathe([[0.001, 0], [0.12, 0.02], [0.1, 0.1], [0.05, 0.16], [0.001, 0.22]], 24), cream);
      sw.position.set(Math.cos(a) * (rad - 0.16), y + ht / 2 + 0.02, Math.sin(a) * (rad - 0.16)); hero.add(sw);
    }
  }
  const berryM = new THREE.MeshPhysicalMaterial({ color: 0xd1001f, roughness: 0.2, clearcoat: 1 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f8f3a, roughness: 0.5 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * 0.38, 1.0, Math.sin(a) * 0.38); hero.add(g);
    const bb = new THREE.Mesh(lathe([[0.001, 0], [0.09, 0.05], [0.12, 0.13], [0.1, 0.2], [0.001, 0.22]], 24), berryM); bb.rotation.x = Math.PI; bb.position.y = 0.22; g.add(bb);
    const lf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.05, 6), leafM); lf.position.y = 0.23; g.add(lf);
  }
  // candles
  const stripe = canvasTexture(64, 256, (g, w, hh) => { for (let y = -hh; y < hh * 2; y += 40) { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, hh); } g.fillStyle = '#ff4d8d'; for (let y = -64; y < hh + 64; y += 48) { g.save(); g.translate(0, y); g.transform(1, 0.6, 0, 1, 0, 0); g.fillRect(0, 0, w, 20); g.restore(); } });
  const candleM = new THREE.MeshPhysicalMaterial({ map: stripe, roughness: 0.4, clearcoat: 0.5 });
  const flames = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.6;
    const x = i === 0 ? 0 : Math.cos(a) * 0.32, z = i === 0 ? 0 : Math.sin(a) * 0.32;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 24), candleM); c.position.set(x, 1.23, z); hero.add(c);
    const f = makeFlame(0.9); f.position.set(x, 1.5, z); hero.add(f);
    const gl = sprite(glowTex, 0xffb347, 0.6, 0.8); gl.position.set(x, 1.6, z); hero.add(gl);
    flames.push({ f, gl, s: i * 1.7 });
  }
  const card = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.36), new THREE.MeshPhysicalMaterial({ map: textPlate('Happy Birthday', { w: 640, h: 192, bg: '#fff7e6', color: '#d6336c', font: 'bold 70px sans-serif' }), roughness: 0.5, side: THREE.DoubleSide }));
  card.position.set(0, 2.0, 0.1); hero.add(card);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5), new THREE.MeshStandardMaterial({ color: 0xffc53d, metalness: 1, roughness: 0.3 })); st.position.set(s * 0.45, 1.65, 0.08); hero.add(st); }
  const c = confetti(scene, 60, { t0: 1.1, t1: 3.8 });
  const tw = twinkles(scene, 12, (i, v) => v.set(Math.cos(i * 2.3) * 1.6, 0.5 + Math.sin(i * 1.1) * 1.3, 1.6));
  const d = dust(scene, 24, { colors: [0xffffff, 0xffe0b5] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'rise', spin: 0.5, tiltX: 0.0, idleSpin: 0.25, baseY: -0.3 });
      for (const fl of flames) { fl.f.userData.flicker(t, fl.s); fl.gl.material.opacity = 0.7 + 0.2 * Math.sin(t * 20 + fl.s); }
      h(t, on, 0.45); r(t, on, 0.3); c(t); tw(t, on); d(t, on);
    },
  };
}
