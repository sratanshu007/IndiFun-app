// Magic Lamp: golden oil lamp with jewels; magic smoke spirals out and bursts into stars.
import { THREE, lights, heroMotion, halo, rays, twinkles, burst, dust, seg, easeOut, lathe, rng } from '../fx.js';
import { mats, sprite, glowTex, sparkTex, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 1.4, 11); camera.lookAt(0, 0.6, 0);
  const sweep = lights(scene, { key: 2.6, sweep: 80 });
  const h = halo(scene, 0x9b5cff, 9, -3, 1.2);
  const r = rays(scene, 0xd6b8ff, 12, -3.5, 1.2);
  const rand = rng(41);
  const gold = mats.gold();
  const hero = new THREE.Group(); scene.add(hero);
  const body = new THREE.Mesh(lathe([[0.001, -0.35], [0.55, -0.32], [0.95, -0.1], [1.0, 0.05], [0.85, 0.22], [0.42, 0.32], [0.3, 0.42], [0.001, 0.44]], 96), gold);
  body.scale.set(1.15, 1, 0.8); hero.add(body);
  const foot = new THREE.Mesh(lathe([[0.45, -0.62], [0.42, -0.55], [0.22, -0.42], [0.25, -0.33]], 64), gold); hero.add(foot);
  const lid = new THREE.Mesh(lathe([[0.3, 0.42], [0.32, 0.5], [0.18, 0.62], [0.08, 0.7], [0.1, 0.76], [0.001, 0.86]], 64), gold); hero.add(lid);
  const knob = new THREE.Mesh(cutGem(0.115), mats.gem(0xe0115f)); knob.position.y = 0.92; hero.add(knob);
  // spout: tapered tube
  const spPts = [new THREE.Vector3(0.9, 0.05, 0), new THREE.Vector3(1.4, 0.15, 0), new THREE.Vector3(1.8, 0.45, 0), new THREE.Vector3(2.05, 0.62, 0)];
  const spGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spPts), 64, 0.16, 24);
  const pos = spGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); const k = 1 - Math.min(1, Math.max(0, (x - 0.9) / 1.2)) * 0.55; const c = spPts[0]; pos.setY(i, c.y + (pos.getY(i) - c.y) * 1); pos.setZ(i, pos.getZ(i) * k); }
  spGeo.computeVertexNormals();
  hero.add(new THREE.Mesh(spGeo, gold));
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 16, 64, Math.PI * 1.3), gold); handle.position.set(-1.15, 0.12, 0); handle.rotation.z = -Math.PI * 0.65; hero.add(handle);
  const gemC = [0xe0115f, 0x1e5bff, 0x00a86b];
  for (let i = 0; i < 5; i++) { const a = -0.6 + i * 0.3; const g = new THREE.Mesh(cutGem(0.092), mats.gem(gemC[i % 3])); g.position.set(Math.sin(a) * 1.0, 0.05, Math.cos(a) * 0.78); g.scale.set(1, 1.2, 0.6); g.lookAt(Math.sin(a) * 5, 0.05, Math.cos(a) * 5); hero.add(g); }
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.03, 8, 96), gold); band.rotation.x = Math.PI / 2; band.scale.set(1.15, 0.8, 1); band.position.y = 0.05; hero.add(band);
  // magic smoke: sprites travelling up a spiral from the spout
  const smoke = [];
  for (let i = 0; i < 90; i++) {
    const s = sprite(i % 5 ? glowTex : sparkTex, [0x9b5cff, 0x5ad1ff, 0xff7ad9, 0xffffff][i % 4], 0.4, 0); scene.add(s);
    smoke.push({ s, t0: 1.2 + (i / 90) * 2.2, ph: rand() * 6, sz: 0.3 + rand() * 0.6 });
  }
  const tip = new THREE.Vector3();
  const b = burst(scene, new THREE.Vector3(0.6, 3.2, 0), 3.6, 30, { colors: [0xffffff, 0xd6b8ff, 0x5ad1ff, 0xffe28a], speed: [2.5, 5], dur: 1.1, size: 0.6 });
  const tw = twinkles(scene, 14, (i, v) => { const a = i * 2.2; v.set(Math.cos(a) * 1.0, 0.2 + Math.sin(a) * 0.4, 1.2); }, { start: 0.8 });
  const d = dust(scene, 30, { colors: [0xffffff, 0xd6b8ff] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.5, tiltX: 0.1, idleSpin: 0.2, baseY: -0.7, baseScale: 1.25 });
      hero.updateMatrixWorld(true);
      tip.set(2.05, 0.62, 0).applyMatrix4(hero.matrixWorld);
      for (const m of smoke) {
        const k = (t - m.t0) / 1.6;
        const vis = k > 0 && k < 1 && t < 4.4;
        const rad = 0.2 + k * 1.1;
        m.s.position.set(tip.x - k * 1.4 + Math.cos(k * 9 + m.ph) * rad * 0.6, tip.y + k * 3.0, tip.z + Math.sin(k * 9 + m.ph) * rad * 0.6);
        m.s.material.opacity = vis ? Math.sin(k * Math.PI) * 0.85 : 0;
        m.s.scale.setScalar(m.sz * (0.6 + k * 2.2));
      }
      h(t, on, 0.55); r(t, on * seg(t, 1.5, 2.2), 0.4); b(t); tw(t, on); d(t, on);
    },
  };
}
