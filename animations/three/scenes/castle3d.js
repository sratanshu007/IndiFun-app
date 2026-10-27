// Fairytale Castle: pastel towers with conical roofs and waving flags rise up, windows glow, fireworks above.
import { THREE, lights, halo, rays, twinkles, dust, burst, seg, easeOut, easeInOut, rng } from '../fx.js';
import { mats, sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5.2;
  const sweep = lights(scene, { warm: 0xffeef8, key: 2.4 });
  const h = halo(scene, 0xd4a5ff, 12, -4, 1.0);
  const r = rays(scene, 0xffd6f0, 14, -4.5, 1.0);
  const rand = rng(101);
  const stone = new THREE.MeshPhysicalMaterial({ color: 0xfff3fa, roughness: 0.45, clearcoat: 0.3 });
  const pinkRoof = new THREE.MeshPhysicalMaterial({ color: 0xff7ab6, roughness: 0.3, clearcoat: 1 });
  const blueRoof = new THREE.MeshPhysicalMaterial({ color: 0x7aa7ff, roughness: 0.3, clearcoat: 1 });
  const winM = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  const gold = mats.gold();
  const castle = new THREE.Group();
  const flags = [];
  function tower(x, z, rad, hh, roof, roofH) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.05, hh, 48), stone); body.position.y = hh / 2; g.add(body);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; const m = new THREE.Mesh(new THREE.BoxGeometry(rad * 0.35, 0.22, rad * 0.25), stone); m.position.set(Math.cos(a) * rad * 1.02, hh + 0.05, Math.sin(a) * rad * 1.02); m.rotation.y = -a; g.add(m); }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(rad * 1.25, roofH, 48), roof); cone.position.y = hh + 0.15 + roofH / 2; g.add(cone);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), gold); tip.position.y = hh + 0.15 + roofH; g.add(tip);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 8), gold); pole.position.y = hh + 0.4 + roofH; g.add(pole);
    const fgeo = new THREE.PlaneGeometry(0.4, 0.22, 10, 4); fgeo.translate(0.2, 0, 0);
    const flag = new THREE.Mesh(fgeo, new THREE.MeshStandardMaterial({ color: roof === pinkRoof ? 0x7aa7ff : 0xff7ab6, side: THREE.DoubleSide })); flag.position.set(0, hh + 0.55 + roofH, 0); g.add(flag);
    flags.push({ geo: fgeo, base: fgeo.attributes.position.array.slice() });
    for (const y of [hh * 0.45, hh * 0.75]) { const w = new THREE.Mesh(new THREE.CircleGeometry(rad * 0.22, 24, 0, Math.PI), winM); w.position.set(0, y, rad * 1.01); g.add(w); const w2 = new THREE.Mesh(new THREE.PlaneGeometry(rad * 0.44, rad * 0.4), winM); w2.position.set(0, y - rad * 0.2, rad * 1.01); g.add(w2); }
    castle.add(g);
  }
  tower(0, 0, 0.62, 2.6, pinkRoof, 1.5);
  tower(-1.4, 0.4, 0.42, 1.8, blueRoof, 1.1); tower(1.4, 0.4, 0.42, 1.8, blueRoof, 1.1);
  tower(-0.8, -0.6, 0.36, 2.1, pinkRoof, 1.0); tower(0.85, -0.6, 0.36, 2.2, pinkRoof, 1.0);
  tower(-2.2, 0.9, 0.3, 1.2, pinkRoof, 0.8); tower(2.2, 0.9, 0.3, 1.2, pinkRoof, 0.8);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.5), stone); wall.position.set(0, 0.55, 0.9); castle.add(wall);
  for (let i = 0; i < 14; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.2, 0.5), stone); m.position.set(-2.1 + i * 0.32, 1.2, 0.9); castle.add(m); }
  const gateShape = new THREE.Shape(); gateShape.moveTo(-0.35, 0); gateShape.lineTo(-0.35, 0.5); gateShape.absarc(0, 0.5, 0.35, Math.PI, 0, true); gateShape.lineTo(0.35, 0); gateShape.closePath();
  const gate = new THREE.Mesh(new THREE.ShapeGeometry(gateShape, 24), new THREE.MeshStandardMaterial({ color: 0x8a5a2b, roughness: 0.6 })); gate.position.set(0, 0, 1.16); castle.add(gate);
  const gateGlow = sprite(glowTex, 0xffd36b, 1.4, 0.6); gateGlow.position.set(0, 0.45, 1.3); castle.add(gateGlow);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.35, 64), new THREE.MeshPhysicalMaterial({ color: 0xc6f6d5, roughness: 0.6, sheen: 1 })); base.position.y = -0.18; castle.add(base);
  castle.scale.setScalar(0.7); scene.add(castle);
  const fw = [];
  const fcols = [0xff7ab6, 0x7aa7ff, 0xffd36b, 0xd4a5ff];
  for (let i = 0; i < 4; i++) fw.push(burst(scene, new THREE.Vector3(-1.8 + i * 1.2, 4.6 + (i % 2) * 0.8, -1.5), 1.8 + i * 0.5, 34, { colors: [fcols[i], 0xffffff], speed: [1.6, 2.4], dur: 1.2, size: 0.3, seed: 200 + i }));
  const tw = twinkles(scene, 20, (i, v) => v.set(-2 + (i % 5), 1.2 + Math.floor(i / 5) * 0.9, 1.4), { start: 1.0, colors: [0xffffff, 0xffd6f0] });
  const d = dust(scene, 34, { colors: [0xffffff, 0xffd6f0, 0xd4a5ff] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 1.6)), out = easeInOut(seg(t, 4.6, 5.2));
      castle.position.y = -7 * (1 - inn) - 1.8 - out * 8;
      const ang = -0.5 + 1.0 * easeInOut(seg(t, 0, 5.2));
      camera.position.set(Math.sin(ang) * 13.5, 2.0, Math.cos(ang) * 13.5); camera.lookAt(0, 0.4, 0);
      for (const f of flags) { const p = f.geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = f.base[i * 3]; p.setZ(i, Math.sin(x * 12 - t * 8) * 0.04 * (x / 0.4)); } p.needsUpdate = true; }
      const on = seg(t, 0.6, 1.4) * (1 - out);
      gateGlow.material.opacity = 0.6 * on;
      h(t, on, 0.5); r(t, on, 0.35); fw.forEach((f) => f(t)); tw(t, on); d(t, on);
    },
  };
}
