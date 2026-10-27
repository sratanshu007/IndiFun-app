// Crystal Ball: glass orb on an ornate gold stand; a swirling galaxy of light lives inside.
import { THREE, lights, halo, rays, twinkles, dust, heroMotion, seg, easeOut, lathe, rng } from '../fx.js';
import { mats, sprite, glowTex, sparkTex, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 1.0, 10.5); camera.lookAt(0, 0.3, 0);
  const sweep = lights(scene, { cool: 0xd6c2ff, key: 2.4, sweep: 70 });
  const h = halo(scene, 0x9b5cff, 10, -3, 0.6);
  const r = rays(scene, 0xd6b8ff, 12, -3.5, 0.6);
  const rand = rng(107);
  const hero = new THREE.Group(); scene.add(hero);
  const gold = mats.gold();
  const stand = new THREE.Mesh(lathe([[1.05, -1.85], [1.0, -1.7], [0.6, -1.55], [0.42, -1.3], [0.55, -1.1], [0.85, -0.95], [0.9, -0.85], [0.7, -0.78]], 96), gold); hero.add(stand);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; const claw = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(Math.cos(a) * 0.75, -0.9, Math.sin(a) * 0.75), new THREE.Vector3(Math.cos(a) * 1.15, -0.4, Math.sin(a) * 1.15), new THREE.Vector3(Math.cos(a) * 1.0, 0.1, Math.sin(a) * 1.0)]), 32, 0.06, 12), gold); hero.add(claw); }
  const gemC = [0x8a2be2, 0x1e5bff, 0xe0115f];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const g = new THREE.Mesh(cutGem(0.115), mats.gem(gemC[i % 3])); g.position.set(Math.cos(a) * 0.62, -1.42, Math.sin(a) * 0.62); g.lookAt(Math.cos(a) * 5, -1.42, Math.sin(a) * 5); hero.add(g); }
  const orbCenter = new THREE.Vector3(0, 0.45, 0);
  const inner = new THREE.Group(); inner.position.copy(orbCenter); hero.add(inner);
  const core = sprite(glowTex, 0xd6b8ff, 1.6, 0.9); inner.add(core);
  const swirl = [];
  for (let i = 0; i < 160; i++) {
    const arm = i % 3, k = rand();
    const s = sprite(i % 7 ? glowTex : sparkTex, [0x9b5cff, 0x5ad1ff, 0xff7ad9, 0xffffff][i % 4], 0.12 + rand() * 0.2, 0); inner.add(s);
    swirl.push({ s, arm, k, y: (rand() - 0.5) * 0.5, ph: rand() * 6 });
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1.15, 96, 64), new THREE.MeshPhysicalMaterial({ color: 0xe8e0ff, roughness: 0, metalness: 0.1, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 3, depthWrite: false, iridescence: 0.5 }));
  orb.position.copy(orbCenter); hero.add(orb);
  const tw = twinkles(scene, 16, (i, v) => { const a = i * 2.3; v.set(Math.cos(a) * 0.9, 0.45 + Math.sin(a) * 0.8, 1.3); }, { start: 0.9, colors: [0xffffff, 0xd6b8ff] });
  const d = dust(scene, 34, { colors: [0xffffff, 0xd6b8ff, 0x5ad1ff] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.3, tiltX: 0.05, idleSpin: 0.15, baseY: -0.2 });
      const power = seg(t, 0.8, 2.0);
      for (const p of swirl) { const ang = p.arm * 2.094 + p.k * 4 + t * (1.4 - p.k * 0.6); const rr = 0.1 + p.k * 0.85; p.s.position.set(Math.cos(ang) * rr, p.y * (1 - p.k * 0.5) + 0.05 * Math.sin(t * 3 + p.ph), Math.sin(ang) * rr); p.s.material.opacity = power * on * (0.6 + 0.4 * Math.sin(t * 5 + p.ph)); }
      core.material.opacity = 0.9 * power * on * (0.8 + 0.2 * Math.sin(t * 6)); core.scale.setScalar(1.2 + 0.3 * Math.sin(t * 3));
      h(t, on * (0.4 + 0.6 * power), 0.55); r(t, on * power, 0.4); tw(t, on); d(t, on);
    },
  };
}
