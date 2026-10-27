// Saturn: banded gas giant with glowing rings and little moons, drifting through a starfield.
import { THREE, lights, halo, twinkles, dust, seg, easeOut, easeInOut, canvasTexture, rng } from '../fx.js';
import { sprite, glowTex, sparkTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 1.6, 13.5); camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));
  const sun = new THREE.DirectionalLight(0xfff1dc, 3.2); sun.position.set(6, 3, 5); scene.add(sun);
  const rimL = new THREE.DirectionalLight(0x9fc8ff, 1.0); rimL.position.set(-6, 1, -4); scene.add(rimL);
  const h = halo(scene, 0x9b7bff, 11, -4, 0);
  const h2 = halo(scene, 0xffc46b, 6, -3, 0);
  const rand = rng(103);
  const bands = canvasTexture(1024, 512, (g, w, hh) => {
    const cols = ['#f3d9a4', '#e7b97a', '#d89a5b', '#f6e2b8', '#c98a52', '#efd29b', '#b9773f', '#f1dcae'];
    let y = 0; while (y < hh) { const bh = 8 + rand() * 40; g.fillStyle = cols[Math.floor(rand() * cols.length)]; g.fillRect(0, y, w, bh); y += bh; }
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(255,255,255,${rand() * 0.06})`; g.fillRect(rand() * w, rand() * hh, 30 + rand() * 120, 2); }
    g.fillStyle = 'rgba(160,90,40,0.5)'; g.beginPath(); g.ellipse(w * 0.3, hh * 0.62, 40, 18, 0, 0, Math.PI * 2); g.fill();
  });
  const planet = new THREE.Mesh(new THREE.SphereGeometry(1.5, 128, 96), new THREE.MeshPhysicalMaterial({ map: bands, roughness: 0.7, sheen: 0.4, sheenColor: new THREE.Color(0xffe2b5) }));
  const ringTex = canvasTexture(1024, 32, (g, w) => { for (let x = 0; x < w; x++) { const u = x / w; const a = (0.35 + 0.65 * Math.abs(Math.sin(u * 40 + Math.sin(u * 7) * 3))) * (u < 0.08 || (u > 0.55 && u < 0.6) ? 0.1 : 1); const c = 200 + Math.floor(40 * Math.sin(u * 23)); g.fillStyle = `rgba(${c},${c - 20},${c - 60},${a})`; g.fillRect(x, 0, 1, 32); } });
  const ringGeo = new THREE.RingGeometry(1.9, 3.4, 256, 1);
  const rp = ringGeo.attributes.position, uv = ringGeo.attributes.uv;
  for (let i = 0; i < rp.count; i++) { const d = Math.hypot(rp.getX(i), rp.getY(i)); uv.setXY(i, (d - 1.9) / 1.5, 0.5); }
  const rings = new THREE.Mesh(ringGeo, new THREE.MeshStandardMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, roughness: 0.8, depthWrite: false }));
  rings.rotation.x = -Math.PI / 2;
  const sys = new THREE.Group(); sys.add(planet, rings); sys.rotation.set(0.38, 0, 0.32); scene.add(sys);
  const moons = [0.18, 0.12, 0.09].map((r0, i) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r0, 48, 32), new THREE.MeshStandardMaterial({ color: [0xd8d8d8, 0xc9a77c, 0xa8c8ff][i], roughness: 0.8 })); scene.add(m); return { m, r: 4 + i * 0.6, sp: 0.6 - i * 0.12, ph: i * 2 }; });
  const stars = Array.from({ length: 80 }, () => { const s = sprite(rand() > 0.85 ? sparkTex : glowTex, rand() > 0.8 ? 0xcfe2ff : 0xffffff, 0.08 + rand() * 0.18, 0); s.position.set((rand() - 0.5) * 16, (rand() - 0.5) * 22, -6 - rand() * 4); scene.add(s); return { s, ph: rand() * 6 }; });
  const tw = twinkles(scene, 10, (i, v) => v.set(Math.cos(i * 2.3) * 3, Math.sin(i * 1.7) * 2.2, 1.0), { start: 1.0 });
  const d = dust(scene, 20, { colors: [0xffffff, 0xcfe2ff] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      const inn = easeOut(seg(t, 0, 1.8)), out = easeInOut(seg(t, 4.3, 5));
      const s = 0.2 + 0.8 * inn - 0.5 * out;
      sys.scale.setScalar(s);
      sys.position.set(-0.2 + out * 3, 0.1 * Math.sin(t), 0);
      planet.rotation.y = t * 0.45;
      rings.rotation.z = t * 0.08;
      const on = seg(t, 0.2, 0.8) * (1 - out);
      for (const m of moons) { const a = m.ph + t * m.sp; m.m.position.set(Math.cos(a) * m.r * s, Math.sin(a) * 0.9 * s, Math.sin(a) * m.r * 0.4 * s); m.m.scale.setScalar(on); }
      for (const st of stars) st.s.material.opacity = on * (0.5 + 0.5 * Math.abs(Math.sin(t * 1.8 + st.ph)));
      h(t, on, 0.4); h2(t, on, 0.25); tw(t, on); d(t, on);
    },
  };
}
