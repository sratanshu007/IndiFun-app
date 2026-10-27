// Rocket: glossy rocket lifts off from a cloud of smoke with a roaring flame and streaking stars.
import { THREE, lights, halo, twinkles, dust, seg, easeOut, easeIn, lathe, rng } from '../fx.js';
import { mats, sprite, glowTex, sparkTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 0.5, 12); camera.lookAt(0, 0.4, 0);
  const sweep = lights(scene, { key: 2.6, sweep: 80 });
  const h = halo(scene, 0xff8a00, 9, -3, -1.5);
  const rand = rng(97);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf6f7fb, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05 });
  const red = new THREE.MeshPhysicalMaterial({ color: 0xd90429, roughness: 0.18, clearcoat: 1, metalness: 0.2 });
  const rocket = new THREE.Group();
  rocket.add(new THREE.Mesh(lathe([[0.42, -1.6], [0.6, -1.2], [0.66, 0.0], [0.6, 0.9], [0.45, 1.6], [0.001, 1.65]], 96), white));
  const nose = new THREE.Mesh(lathe([[0.452, 1.2], [0.36, 1.85], [0.18, 2.3], [0.001, 2.5]], 96), red); rocket.add(nose);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.665, 0.665, 0.18, 96, 1, true), red); band.position.y = -0.6; rocket.add(band);
  const nozzle = new THREE.Mesh(lathe([[0.25, -1.62], [0.38, -1.95], [0.42, -2.0]], 64), mats.platinum()); rocket.add(nozzle);
  const fin = new THREE.Shape(); fin.moveTo(0, 0); fin.lineTo(0.75, -0.75); fin.lineTo(0.75, -1.15); fin.lineTo(0, -0.7); fin.closePath();
  const finGeo = new THREE.ExtrudeGeometry(fin, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3 }); finGeo.translate(0, 0, -0.04);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(finGeo, red); const p = new THREE.Group(); p.rotation.y = (i / 4) * Math.PI * 2 + Math.PI / 4; f.position.set(0.55, -0.7, 0); p.add(f); rocket.add(p); }
  const port = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 16, 48), mats.platinum()); port.position.set(0, 0.55, 0.63); rocket.add(port);
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshPhysicalMaterial({ color: 0x5ad1ff, metalness: 0.3, roughness: 0.02, clearcoat: 1, emissive: 0x0a3a5a })); glass.position.set(0, 0.55, 0.64); rocket.add(glass);
  const flame = new THREE.Group(); flame.position.y = -2.0; rocket.add(flame);
  const fo = new THREE.Mesh(lathe([[0.38, 0], [0.45, -0.4], [0.3, -1.2], [0.001, -2.0]], 32), new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.85, depthWrite: false })); flame.add(fo);
  const fi = new THREE.Mesh(lathe([[0.25, 0], [0.28, -0.3], [0.15, -0.8], [0.001, -1.2]], 32), new THREE.MeshBasicMaterial({ color: 0xfff3c4 })); flame.add(fi);
  const fg = sprite(glowTex, 0xffa31a, 2.6, 0.9); fg.position.y = -0.8; flame.add(fg);
  rocket.rotation.z = 0.12;
  scene.add(rocket);
  const smoke = Array.from({ length: 50 }, () => { const s = sprite(glowTex, rand() > 0.3 ? 0xf1f3f5 : 0xffc89a, 1, 0); scene.add(s); return { s, a: rand() * Math.PI * 2, sp: 1 + rand() * 2.5, t0: rand() * 1.4, sz: 1 + rand() * 1.5 }; });
  const stars = Array.from({ length: 40 }, () => { const s = sprite(sparkTex, 0xffffff, 0.15 + rand() * 0.2, 0); scene.add(s); return { s, x: (rand() - 0.5) * 7, z: -2 - rand() * 3, sp: 6 + rand() * 6, off: rand() * 14 }; });
  const tw = twinkles(scene, 10, (i, v) => { rocket.getWorldPosition(v); v.x += (i % 3 - 1) * 0.8; v.y += 1.2; v.z += 0.8; }, { start: 0.8 });
  const d = dust(scene, 20, { colors: [0xffffff, 0xffd166] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const rise = easeOut(seg(t, 0, 1.3)), launch = easeIn(seg(t, 3.6, 5));
      rocket.position.set(0.04 * Math.sin(t * 40) * seg(t, 1.3, 3.6), -6 * (1 - rise) + 0.3 + launch * 10, 0);
      rocket.rotation.y = t * 0.8;
      const f = 1 + 0.15 * Math.sin(t * 31) + 0.1 * Math.sin(t * 47);
      flame.scale.set(1 / Math.sqrt(f), f * (1 + launch * 0.8), 1 / Math.sqrt(f));
      for (const s of smoke) { const k = ((t - s.t0) * 0.45) % 1; s.s.position.set(Math.cos(s.a) * k * s.sp * 1.6, -2.6 + k * 0.6 - launch * 2, Math.sin(s.a) * k * s.sp * 0.6); s.s.scale.setScalar(s.sz * (0.5 + k * 1.8)); s.s.material.opacity = (1 - k) * 0.55 * seg(t, 0.4, 1.0) * (1 - seg(t, 4.3, 5)); }
      for (const s of stars) { s.s.position.set(s.x, 5 - ((t * s.sp + s.off) % 14), s.z); s.s.scale.set(0.06, 0.6, 1); s.s.material.opacity = seg(t, 1, 1.6) * 0.8 * (1 - seg(t, 4.6, 5)); }
      const on = seg(t, 0.4, 1.0) * (1 - seg(t, 4.2, 5));
      h(t, on, 0.45); tw(t, on); d(t, on);
    },
  };
}
