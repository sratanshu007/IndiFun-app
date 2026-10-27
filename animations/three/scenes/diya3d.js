// Diwali Diya: painted clay lamp with a living flame, surrounded by smaller diyas and marigold petals.
import { THREE, lights, heroMotion, halo, rays, twinkles, rain, dust, seg, easeOut, lathe, petalGeo, canvasTexture, rng } from '../fx.js';
import { makeFlame } from '../objects.js';
import { sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 3.4, 13.5); camera.lookAt(0, 0.1, 0);
  const sweep = lights(scene, { warm: 0xffd29a, key: 2.0, sweep: 40 });
  const h = halo(scene, 0xff8a00, 10, -3, 0.6);
  const r = rays(scene, 0xffc46b, 12, -3.5, 0.6);
  const rand = rng(51);
  const paint = canvasTexture(1024, 256, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#d9622b'); gr.addColorStop(1, '#8f3416'); g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.fillStyle = '#ffd166'; for (let x = 16; x < w; x += 42) { g.beginPath(); g.arc(x, 70, 9, 0, Math.PI * 2); g.fill(); }
    g.strokeStyle = '#fff3c4'; g.lineWidth = 6; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, 120 + Math.sin(x / 20) * 14); g.stroke();
    g.fillStyle = '#2bb673'; for (let x = 30; x < w; x += 64) { g.beginPath(); g.ellipse(x, 175, 12, 22, 0.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e63946'; for (let x = 62; x < w; x += 64) { g.beginPath(); g.arc(x, 175, 10, 0, Math.PI * 2); g.fill(); }
  });
  const clay = new THREE.MeshPhysicalMaterial({ map: paint, roughness: 0.55, clearcoat: 0.4, side: THREE.DoubleSide });
  const oil = new THREE.MeshPhysicalMaterial({ color: 0x8a5a00, roughness: 0.05, metalness: 0.3, clearcoat: 1 });
  function diya(scale) {
    const g = new THREE.Group();
    const geo = lathe([[0.001, -0.42], [0.55, -0.4], [1.05, -0.12], [1.25, 0.18], [1.2, 0.2], [1.0, 0.0], [0.001, -0.1]], 96);
    const p = geo.attributes.position; // pull one side out into a spout
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const a = Math.atan2(z, x); const k = Math.pow(Math.max(0, Math.cos(a)), 6); p.setX(i, x * (1 + 0.45 * k)); p.setY(i, p.getY(i) + 0.12 * k * Math.max(0, p.getY(i) + 0.2)); }
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, clay));
    const o = new THREE.Mesh(new THREE.CircleGeometry(1.0, 64), oil); o.rotation.x = -Math.PI / 2; o.position.y = -0.02; g.add(o);
    const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xf5e6c8 })); wick.position.set(1.35, 0.12, 0); wick.rotation.z = 0.7; g.add(wick);
    const f = makeFlame(1.6); f.position.set(1.47, 0.24, 0); g.add(f);
    const gl = sprite(glowTex, 0xffa31a, 2.2, 0.85); gl.position.set(1.47, 0.6, 0); g.add(gl);
    const gl2 = sprite(glowTex, 0xfff3c4, 0.7, 0.9); gl2.position.set(1.47, 0.45, 0); g.add(gl2);
    g.scale.setScalar(scale);
    return { g, f, gl };
  }
  const hero = new THREE.Group(); scene.add(hero);
  const main = diya(0.85); main.g.position.x = -0.6; hero.add(main.g);
  const smalls = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const d = diya(0.32); d.g.position.set(Math.cos(a) * 2.5, -0.35, Math.sin(a) * 1.6); d.g.rotation.y = -a; hero.add(d.g); smalls.push(d);
  }
  // rangoli-like ring of marigold petals
  const mari = [new THREE.MeshPhysicalMaterial({ color: 0xff9f1c, roughness: 0.5, sheen: 1, side: THREE.DoubleSide }), new THREE.MeshPhysicalMaterial({ color: 0xffd60a, roughness: 0.5, sheen: 1, side: THREE.DoubleSide })];
  const pg = petalGeo(0.2, 0.24, 0.06, 0.02);
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2, rr = 1.85 + (i % 2) * 0.15;
    const m = new THREE.Mesh(pg, mari[i % 2]); m.position.set(Math.cos(a) * rr, -0.45, Math.sin(a) * rr * 0.75); m.rotation.set(-Math.PI / 2 + 0.3, 0, a); hero.add(m);
  }
  const fall = rain(scene, 34, (i) => new THREE.Mesh(pg, mari[i % 2]), { t0: 1.2, t1: 3.9, speed: [1.2, 2], spin: 2.5 });
  const tw = twinkles(scene, 16, (i, v) => v.set(Math.cos(i * 2.2) * 2, 0.4 + Math.sin(i * 1.4) * 1.3, 1.2), { colors: [0xfff3c4, 0xffffff] });
  const d = dust(scene, 40, { colors: [0xffd166, 0xffa31a, 0xffffff] });
  const all = [main, ...smalls];
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.3, tiltX: 0.0, idleSpin: 0.25, baseY: -0.3 });
      all.forEach((x, i) => { x.f.userData.flicker(t, i * 1.3); x.gl.material.opacity = 0.75 + 0.15 * Math.sin(t * 17 + i); });
      h(t, on, 0.5); r(t, on, 0.35); fall(t); tw(t, on); d(t, on);
    },
  };
}
