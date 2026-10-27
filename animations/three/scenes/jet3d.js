// Private Jet: sleek white jet with gold trim banks through clouds leaving contrails.
import { THREE, lights, halo, twinkles, dust, seg, easeOut, easeInOut, lathe, rng } from '../fx.js';
import { mats, sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 1.0, 15); camera.lookAt(0, 0.2, 0);
  const sweep = lights(scene, { key: 2.8, cool: 0xcfe7ff });
  const h = halo(scene, 0x8fd3ff, 11, -4, 0.6);
  const rand = rng(95);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf8f9fc, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.04 });
  const gold = mats.gold();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0b1220, metalness: 0.4, roughness: 0.02, clearcoat: 1 });
  const jet = new THREE.Group();
  const fus = new THREE.Mesh(lathe([[0.001, -2.9], [0.18, -2.75], [0.38, -2.3], [0.5, -1.6], [0.52, 0.6], [0.47, 1.6], [0.32, 2.3], [0.12, 2.75], [0.001, 2.85]], 64), white);
  fus.rotation.z = -Math.PI / 2; jet.add(fus);
  const stripe = new THREE.Mesh(new THREE.CylinderGeometry(0.525, 0.525, 3.6, 64, 1, true), gold); stripe.rotation.z = Math.PI / 2; stripe.scale.set(1, 1, 1); stripe.position.x = -0.4;
  const sGeo = new THREE.TorusGeometry(0.52, 0.025, 8, 64); for (const x of [-2.1, 1.3]) { const ring = new THREE.Mesh(sGeo, gold); ring.rotation.y = Math.PI / 2; ring.position.x = x; jet.add(ring); }
  const cock = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2.5), glass); cock.position.set(2.2, 0.12, 0); cock.rotation.z = -1.1; cock.scale.set(1, 0.6, 1); jet.add(cock);
  for (let i = 0; i < 8; i++) for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24), glass); w.position.set(-1.4 + i * 0.36, 0.15, s * 0.515); w.rotation.y = s > 0 ? 0 : Math.PI; jet.add(w); }
  const wing = new THREE.Shape(); wing.moveTo(0.6, 0); wing.lineTo(-0.5, 0); wing.lineTo(-1.5, 2.7); wing.lineTo(-1.0, 2.75); wing.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wing, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 });
  for (const s of [-1, 1]) {
    const w = new THREE.Mesh(wingGeo, white); w.rotation.x = s * Math.PI / 2; w.position.set(0, -0.2, s * 0.3); jet.add(w);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.05), gold); tip.position.set(-1.3, 0.05, s * 3.05); tip.rotation.z = 0.4; jet.add(tip);
    const eng = new THREE.Mesh(lathe([[0.18, -0.6], [0.24, -0.4], [0.25, 0.3], [0.2, 0.55]], 32), white); eng.rotation.z = Math.PI / 2; eng.position.set(-2.0, 0.35, s * 0.82); jet.add(eng);
    const intake = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 12, 32), gold); intake.rotation.y = Math.PI / 2; intake.position.set(-1.45, 0.35, s * 0.82); jet.add(intake);
    const ex = sprite(glowTex, 0x9fd8ff, 0.5, 0.7); ex.position.set(-2.65, 0.35, s * 0.82); jet.add(ex);
    const hs = new THREE.Mesh(wingGeo, white); hs.scale.set(0.45, 0.4, 1); hs.rotation.x = s * Math.PI / 2; hs.position.set(-2.4, 1.25, s * 0.05); jet.add(hs);
  }
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(-0.9, 0); fin.lineTo(-1.35, 1.2); fin.lineTo(-0.95, 1.2); fin.closePath();
  const finM = new THREE.Mesh(new THREE.ExtrudeGeometry(fin, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02 }), white); finM.position.set(-1.6, 0.35, -0.03); jet.add(finM);
  const finGold = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.12, 0.09), gold); finGold.position.set(-2.55, 1.3, 0); jet.add(finGold);
  jet.scale.setScalar(0.62);
  const rig = new THREE.Group(); rig.add(jet); scene.add(rig);
  const clouds = Array.from({ length: 34 }, (_, i) => { const s = sprite(glowTex, 0xffffff, 1.5 + rand() * 2.5, 0); scene.add(s); return { s, x: rand() * 16 - 8, y: -2.5 + rand() * 5, z: -4 + rand() * 6, sp: 2 + rand() * 3, o: 0.35 + rand() * 0.4 }; });
  const trails = Array.from({ length: 40 }, () => { const s = sprite(glowTex, 0xffffff, 0.5, 0); scene.add(s); return s; });
  const tw = twinkles(scene, 12, (i, v) => { jet.getWorldPosition(v); v.x += (i % 4) * 0.8 - 1.2; v.y += 0.4; v.z += 1; }, { start: 1.2 });
  const d = dust(scene, 20);
  const tailW = new THREE.Vector3();
  return {
    frames: Math.round(T * 30), hdri: 'sky',
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 1.6)), out = easeInOut(seg(t, 4.0, 5));
      rig.position.set(-10 * (1 - inn) + out * 12, -0.4 + 0.15 * Math.sin(t * 1.5) + out * 3, 0);
      rig.rotation.set(-0.25 + 0.2 * Math.sin(t * 0.8), -0.35 + 0.25 * easeInOut(seg(t, 1.6, 3.8)), 0.1 + out * 0.25);
      jet.rotation.x = 0.35 * Math.sin(t * 1.2) * seg(t, 1.2, 1.8);
      const on = seg(t, 0.2, 0.8) * (1 - out);
      for (const c of clouds) { c.s.position.set(((c.x - t * c.sp) % 16 + 16) % 16 - 8, c.y, c.z); c.s.material.opacity = c.o * on; }
      rig.updateMatrixWorld(true);
      trails.forEach((s, i) => { tailW.set(-2.7 - i * 0.25, 0.35, (i % 2 ? 1 : -1) * 0.82).applyMatrix4(jet.matrixWorld); s.position.copy(tailW); s.material.opacity = on * 0.5 * (1 - i / 40); s.scale.setScalar(0.3 + i * 0.03); });
      h(t, on, 0.4); tw(t, on); d(t, on);
    },
  };
}
