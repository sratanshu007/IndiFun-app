// Lotus: a pink lotus opens on a lily pad over glowing water ripples, petals glisten.
import { THREE, lights, heroMotion, halo, rays, twinkles, dust, seg, easeOut, petalGeo, rng } from '../fx.js';
import { sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 3.0, 10.5); camera.lookAt(0, 0.4, 0);
  const sweep = lights(scene, { warm: 0xfff0f6, key: 2.2 });
  const h = halo(scene, 0xff7ab6, 9, -3, 0.8);
  const r = rays(scene, 0xffd6ec, 12, -3.5, 0.8);
  const hero = new THREE.Group(); scene.add(hero);
  const pinkM = new THREE.MeshPhysicalMaterial({ color: 0xff9cc8, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, vertexColors: true, emissive: 0x3a0a20, clearcoat: 0.3 });
  const layers = [];
  const spec = [[8, 0.75, 1.5, 1.35], [8, 0.65, 1.3, 0.95], [6, 0.55, 1.05, 0.6], [5, 0.4, 0.75, 0.25]];
  spec.forEach(([n, w, hh, open], li) => {
    const g = petalGeo(w, hh, 0.32, -0.12);
    const items = [];
    for (let i = 0; i < n; i++) {
      const piv = new THREE.Group(); piv.rotation.y = (i / n) * Math.PI * 2 + li * 0.35; hero.add(piv);
      const tilt = new THREE.Group(); tilt.position.z = 0.08; piv.add(tilt);
      const m = new THREE.Mesh(g, pinkM); m.rotation.y = Math.PI; tilt.add(m);
      items.push(tilt);
    }
    layers.push({ items, open });
  });
  const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.22, 0.25, 32), new THREE.MeshPhysicalMaterial({ color: 0xffd43b, roughness: 0.5, sheen: 1 })); pod.position.y = 0.15; hero.add(pod);
  for (let i = 0; i < 40; i++) { const a = i * 2.4, rr = 0.3 + (i % 3) * 0.04; const s = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 6), new THREE.MeshStandardMaterial({ color: 0xffc300 })); s.position.set(Math.cos(a) * rr, 0.2, Math.sin(a) * rr); s.rotation.z = Math.cos(a) * 0.4; s.rotation.x = -Math.sin(a) * 0.4; hero.add(s); }
  const pad = new THREE.Mesh(new THREE.CircleGeometry(1.7, 64, 0.3, Math.PI * 2 - 0.3), new THREE.MeshPhysicalMaterial({ color: 0x1e6b34, sheen: 0.6, sheenColor: new THREE.Color(0x9be29e), roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
  pad.rotation.x = -Math.PI / 2; pad.position.y = -0.1; hero.add(pad);
  const water = new THREE.Mesh(new THREE.CircleGeometry(4.5, 96), new THREE.MeshPhysicalMaterial({ color: 0x10306a, metalness: 0.8, roughness: 0.1, transparent: true, opacity: 0.75, clearcoat: 1 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.14; hero.add(water);
  const ripples = [];
  for (let i = 0; i < 4; i++) {
    const rg = new THREE.Mesh(new THREE.RingGeometry(1, 1.04, 96), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, side: THREE.DoubleSide }));
    rg.rotation.x = -Math.PI / 2; rg.position.y = -0.12; hero.add(rg); ripples.push(rg);
  }
  const drops = [];
  const dropM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 3 });
  for (let i = 0; i < 10; i++) { const d0 = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), dropM); d0.position.set(Math.cos(i * 2) * 0.9, 0.45 + (i % 3) * 0.2, Math.sin(i * 2) * 0.9); hero.add(d0); drops.push(d0); }
  const glowC = sprite(glowTex, 0xfff3c4, 1.6, 0); glowC.position.y = 0.5; hero.add(glowC);
  const tw = twinkles(scene, 18, (i, v) => { drops[i % drops.length].getWorldPosition(v); v.z += 0.2; }, { start: 1.5, size: [0.4, 0.9] });
  const d = dust(scene, 34, { colors: [0xffffff, 0xffd6ec, 0xfff3c4] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'rise', spin: 0.3, tiltX: 0.0, idleSpin: 0.25, baseY: -0.5 });
      const b = easeOut(seg(t, 0.4, 2.2));
      layers.forEach((L, li) => L.items.forEach((tilt) => { tilt.rotation.x = 0.05 + L.open * b * (1 - li * 0.04); }));
      ripples.forEach((rg, i) => { const k = ((t * 0.5 + i / 4) % 1); rg.scale.setScalar(1 + k * 3.2); rg.material.opacity = (1 - k) * 0.5 * on; });
      glowC.material.opacity = 0.7 * b * on;
      h(t, on, 0.5); r(t, on, 0.35); tw(t, on); d(t, on);
    },
  };
}
