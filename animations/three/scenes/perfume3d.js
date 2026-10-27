// Luxury Perfume: faceted glass bottle with pink perfume, gold cap and tassel; sprays a sparkling mist.
import { THREE, lights, heroMotion, halo, rays, twinkles, dust, seg, easeOut, petalGeo, rain, rng } from '../fx.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mats, sprite, glowTex, sparkTex, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.6;
  camera.position.set(0, 0.6, 10.5); camera.lookAt(0, 0.4, 0);
  const sweep = lights(scene, { cool: 0xffd6f0, key: 2.4, sweep: 90 });
  const h = halo(scene, 0xff7ab6, 8, -2.5, 0.4);
  const r = rays(scene, 0xffd6f0, 11, -3, 0.4);
  const rand = rng(31);
  const hero = new THREE.Group(); scene.add(hero);
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffeef7, metalness: 0.1, roughness: 0.02, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 3, side: THREE.DoubleSide, depthWrite: false, iridescence: 0.4 });
  const liquid = new THREE.MeshPhysicalMaterial({ color: 0xff4fa3, roughness: 0.05, transparent: true, opacity: 0.8, clearcoat: 1, emissive: 0x5a0030, envMapIntensity: 1.5 });
  const bottle = new THREE.Mesh(new RoundedBoxGeometry(1.7, 2.0, 0.9, 4, 0.18), glass); bottle.position.y = 0; hero.add(bottle);
  const juice = new THREE.Mesh(new RoundedBoxGeometry(1.5, 1.45, 0.72, 4, 0.14), liquid); juice.position.y = -0.22; hero.add(juice);
  const gold = mats.gold();
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.25, 48), gold); neck.position.y = 1.12; hero.add(neck);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.55, 8), gold); cap.position.y = 1.52; hero.add(cap);
  const capTop = new THREE.Mesh(cutGem(0.345), mats.gem(0xff4fa3)); capTop.position.y = 1.95; capTop.scale.set(1, 0.7, 1); hero.add(capTop);
  const label = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.38), new THREE.MeshPhysicalMaterial({ color: 0xffd36b, metalness: 1, roughness: 0.25 })); label.position.set(0, 0.05, 0.46); hero.add(label);
  const tassel = new THREE.Group(); tassel.position.set(0.3, 1.1, 0.25); hero.add(tassel);
  tassel.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.25, -0.2, 0.05), new THREE.Vector3(0.35, -0.6, 0.1)]), 32, 0.015, 6), gold));
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), gold); knob.position.set(0.35, -0.62, 0.1); tassel.add(knob);
  for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.35, 4), new THREE.MeshStandardMaterial({ color: 0xff4fa3 })); s.position.set(0.35 + (i % 4 - 1.5) * 0.02, -0.82, 0.1 + (Math.floor(i / 4) - 1) * 0.02); tassel.add(s); }
  // spray mist
  const mist = [];
  for (let i = 0; i < 46; i++) {
    const s = sprite(i % 4 ? glowTex : sparkTex, i % 3 ? 0xffc2e2 : 0xffffff, 0.3, 0); scene.add(s);
    mist.push({ s, a: (rand() - 0.5) * 0.9, sp: 2 + rand() * 2.5, t0: 1.4 + rand() * 0.9, sz: 0.25 + rand() * 0.45 });
  }
  const pm = new THREE.MeshPhysicalMaterial({ color: 0xff7ab6, roughness: 0.5, sheen: 1, side: THREE.DoubleSide });
  const petals = rain(scene, 22, () => new THREE.Mesh(petalGeo(0.25, 0.3, 0.1, 0.04), pm), { t0: 1.6, t1: 3.9, speed: [1, 1.8], spin: 2.2 });
  const tw = twinkles(scene, 14, (i, v) => v.set(-0.6 + (i % 5) * 0.3, -0.3 + Math.floor(i / 5) * 0.5, 0.6), { start: 0.8, colors: [0xffffff, 0xffd6f0] });
  const d = dust(scene, 26, { colors: [0xffffff, 0xffd6f0] });
  const nozzle = new THREE.Vector3();
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.8, tiltX: 0.08, idleSpin: 0.3, baseY: -0.4 });
      cap.position.y = 1.52 - 0.08 * Math.max(0, Math.sin((t - 1.3) * 12)) * seg(t, 1.3, 1.5) * (1 - seg(t, 2.1, 2.3));
      tassel.rotation.z = 0.2 * Math.sin(t * 3);
      hero.updateMatrixWorld(true); neck.getWorldPosition(nozzle); nozzle.y += 0.9;
      for (const m of mist) {
        const k = (t - m.t0) / 1.4;
        const vis = k > 0 && k < 1;
        m.s.position.set(nozzle.x + Math.sin(m.a) * k * m.sp + 0.6 * k, nozzle.y + Math.cos(m.a) * k * m.sp * 0.6, nozzle.z + 0.5);
        m.s.material.opacity = vis ? (1 - k) * 0.9 : 0; m.s.scale.setScalar(m.sz * (0.5 + k * 1.6));
      }
      h(t, on, 0.55); r(t, on, 0.35); petals(t); tw(t, on); d(t, on);
    },
  };
}
