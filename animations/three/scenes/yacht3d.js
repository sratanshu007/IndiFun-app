// Luxury Yacht: glossy white superyacht cruises over animated sea with a foamy wake, at golden hour.
import { THREE, lights, halo, twinkles, dust, seg, easeOut, easeInOut, rng } from '../fx.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(4.5, 3.8, 15.5); camera.lookAt(0, 0, 0);
  const sweep = lights(scene, { warm: 0xffe2b5, key: 2.6 });
  const h = halo(scene, 0xffb36b, 11, -4, 1.0);
  const rand = rng(93);
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf7f8fb, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 });
  const navy = new THREE.MeshPhysicalMaterial({ color: 0x0f2347, roughness: 0.2, clearcoat: 1 });
  const teak = new THREE.MeshPhysicalMaterial({ color: 0x9c6b3c, roughness: 0.45, clearcoat: 0.6 });
  const tint = new THREE.MeshPhysicalMaterial({ color: 0x0b1626, metalness: 0.4, roughness: 0.02, clearcoat: 1, envMapIntensity: 2 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe8edf5, metalness: 1, roughness: 0.1 });
  const yacht = new THREE.Group();
  const top = new THREE.Shape();
  top.moveTo(-2.6, -0.75); top.lineTo(1.6, -0.75); top.quadraticCurveTo(2.9, -0.4, 3.3, 0); top.quadraticCurveTo(2.9, 0.4, 1.6, 0.75); top.lineTo(-2.6, 0.75); top.quadraticCurveTo(-2.75, 0, -2.6, -0.75);
  const hullGeo = new THREE.ExtrudeGeometry(top, { depth: 0.9, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.08, bevelSegments: 6, curveSegments: 48 });
  hullGeo.rotateX(-Math.PI / 2); hullGeo.translate(0, -0.6, 0);
  const hp = hullGeo.attributes.position;
  for (let i = 0; i < hp.count; i++) { const y = hp.getY(i); const k = 0.55 + 0.45 * Math.min(1, (y + 0.6) / 0.9); hp.setZ(i, hp.getZ(i) * k); }
  hullGeo.computeVertexNormals();
  yacht.add(new THREE.Mesh(hullGeo, white));
  const stripe = new THREE.Mesh(hullGeo, navy); stripe.scale.set(1.005, 0.25, 1.01); stripe.position.y = -0.47; yacht.add(stripe);
  const deck = new THREE.Mesh(new THREE.ExtrudeGeometry(top, { depth: 0.04, bevelEnabled: false }).rotateX(-Math.PI / 2), teak); deck.scale.set(0.96, 1, 0.9); deck.position.y = 0.32; yacht.add(deck);
  const levels = [[3.0, 0.55, 1.25, -0.35, 0.62], [2.2, 0.48, 1.05, -0.55, 1.12], [1.3, 0.4, 0.85, -0.75, 1.55]];
  for (const [w, hh, d, x, y] of levels) {
    const c = new THREE.Mesh(new RoundedBoxGeometry(w, hh, d, 4, 0.12), white); c.position.set(x, y, 0); yacht.add(c);
    const g = new THREE.Mesh(new RoundedBoxGeometry(w * 0.86, hh * 0.45, d + 0.02, 2, 0.06), tint); g.position.set(x + 0.05, y + 0.03, 0); yacht.add(g);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 12), chrome); mast.position.set(-0.75, 2.1, 0); yacht.add(mast);
  const radar = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.08), chrome); radar.position.set(-0.75, 2.45, 0); yacht.add(radar);
  for (let i = 0; i < 18; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), chrome); const x = -2.4 + i * 0.28; p.position.set(x, 0.45, x > 1.5 ? 0.75 - (x - 1.5) * 0.4 : 0.72); yacht.add(p); const q = p.clone(); q.position.z *= -1; yacht.add(q); }
  // sea
  const seaGeo = new THREE.PlaneGeometry(26, 16, 160, 100); seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshPhysicalMaterial({ color: 0x0e4c7a, metalness: 0.3, roughness: 0.3, clearcoat: 0.4, transparent: true, opacity: 0.92, envMapIntensity: 0.8 }));
  sea.position.y = -0.62; scene.add(sea);
  const foam = Array.from({ length: 60 }, () => { const s = sprite(glowTex, 0xffffff, 0.35 + rand() * 0.3, 0); scene.add(s); return { s, off: rand(), side: rand() > 0.5 ? 1 : -1, sp: rand() }; });
  const sun = sprite(glowTex, 0xffc46b, 4.5, 0.9); sun.position.set(-4, 3.6, -8); scene.add(sun);
  yacht.rotation.y = -0.45; yacht.scale.setScalar(0.62);
  scene.add(yacht);
  const tw = twinkles(scene, 18, (i, v) => v.set(-4 + rand() * 8, -0.5, -2 + rand() * 4), { start: 0.6, size: [0.3, 0.7] });
  const d = dust(scene, 20, { colors: [0xffffff, 0xffe2b5] });
  const sp = seaGeo.attributes.position;
  return {
    frames: Math.round(T * 30), hdri: 'sunset',
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 2.2)), out = easeInOut(seg(t, 4.2, 5));
      yacht.position.x = -9 * (1 - inn) + out * 9;
      yacht.position.y = 0.06 * Math.sin(t * 2.2);
      yacht.rotation.z = 0.03 * Math.sin(t * 1.7); yacht.rotation.x = 0.02 * Math.sin(t * 1.3);
      for (let i = 0; i < sp.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; sp.setY(i, Math.sin(x * 0.9 + t * 2) * 0.07 + Math.sin(z * 1.4 + t * 1.6) * 0.05 + Math.sin((x + z) * 2.2 + t * 3) * 0.025); }
      sp.needsUpdate = true; seaGeo.computeVertexNormals();
      const on = seg(t, 0.3, 1) * (1 - out);
      sea.material.opacity = 0.92 * on;
      sun.material.opacity = 0.9 * on;
      for (const f of foam) { const k = (t * 0.6 + f.off) % 1; f.s.position.set(yacht.position.x - 2.6 - k * 4, -0.55, f.side * (0.3 + k * 1.4)); f.s.material.opacity = (1 - k) * 0.7 * on * Math.min(1, inn * 2); }
      h(t, on, 0.5); tw(t, on); d(t, on);
    },
  };
}
