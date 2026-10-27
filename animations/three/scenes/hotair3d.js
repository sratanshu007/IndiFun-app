// Hot Air Balloon: rainbow-striped balloon with wicker basket rises through soft clouds, burner flaring.
import { THREE, lights, halo, twinkles, dust, seg, easeOut, easeInOut, lathe, canvasTexture, rng } from '../fx.js';
import { makeFlame } from '../objects.js';
import { sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 0.5, 13); camera.lookAt(0, 0.6, 0);
  const sweep = lights(scene, { warm: 0xffe8cc, key: 2.6 });
  const h = halo(scene, 0xffc46b, 11, -4, 1.0);
  const rand = rng(99);
  const stripes = canvasTexture(1024, 512, (g, w, hh) => {
    const cols = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#0a84ff', '#5e5ce6', '#ff2d95', '#ffffff'];
    const n = 16; for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect((i / n) * w, 0, w / n + 1, hh); }
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.fillRect(0, hh * 0.62, w, 22); g.fillStyle = '#ffd60a'; for (let x = 0; x < w; x += 32) { g.beginPath(); g.arc(x + 16, hh * 0.62 + 11, 7, 0, Math.PI * 2); g.fill(); }
  });
  const env = new THREE.Mesh(lathe([[0.55, -1.25], [0.9, -0.9], [1.55, -0.1], [1.85, 0.6], [1.85, 1.3], [1.55, 2.0], [0.9, 2.45], [0.001, 2.6]], 96),
    new THREE.MeshPhysicalMaterial({ map: stripes, roughness: 0.4, sheen: 1, sheenColor: new THREE.Color(0xffffff), clearcoat: 0.4, side: THREE.DoubleSide }));
  const gp = env.geometry.attributes.position;
  for (let i = 0; i < gp.count; i++) { const x = gp.getX(i), z = gp.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.035 * Math.cos(a * 16); gp.setX(i, x * k); gp.setZ(i, z * k); }
  env.geometry.computeVertexNormals();
  const balloon = new THREE.Group(); balloon.add(env);
  const wicker = canvasTexture(256, 256, (g, w, hh) => { g.fillStyle = '#8b5a2b'; g.fillRect(0, 0, w, hh); for (let y = 0; y < hh; y += 16) for (let x = (y / 16) % 2 ? 0 : 16; x < w; x += 32) { g.fillStyle = '#c08a4f'; g.fillRect(x, y, 28, 12); } });
  wicker.wrapS = wicker.wrapT = THREE.RepeatWrapping; wicker.repeat.set(2, 1);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.38, 0.55, 32), new THREE.MeshStandardMaterial({ map: wicker, roughness: 0.8 }));
  basket.position.y = -2.35; balloon.add(basket);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 12, 48), new THREE.MeshStandardMaterial({ color: 0x5a3216, roughness: 0.7 })); rim.rotation.x = Math.PI / 2; rim.position.y = -2.08; balloon.add(rim);
  const ropeM = new THREE.MeshStandardMaterial({ color: 0x3b2a1a });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const p0 = new THREE.Vector3(Math.cos(a) * 0.42, -2.08, Math.sin(a) * 0.42), p1 = new THREE.Vector3(Math.cos(a) * 0.58, -1.25, Math.sin(a) * 0.58);
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, p0.distanceTo(p1), 6), ropeM); rope.position.copy(p0).add(p1).multiplyScalar(0.5); rope.lookAt(p1); rope.rotateX(Math.PI / 2); balloon.add(rope);
  }
  const burner = makeFlame(2.2); burner.position.y = -1.95; balloon.add(burner);
  const bg = sprite(glowTex, 0xffa31a, 1.8, 0); bg.position.y = -1.6; balloon.add(bg);
  const inner = sprite(glowTex, 0xffb347, 2.5, 0); inner.position.y = -0.8; balloon.add(inner);
  scene.add(balloon);
  const clouds = Array.from({ length: 30 }, () => { const s = sprite(glowTex, 0xffffff, 1.5 + rand() * 2.5, 0); scene.add(s); return { s, x: rand() * 12 - 6, y: rand() * 12 - 6, z: -4 + rand() * 6, o: 0.25 + rand() * 0.35 }; });
  const tw = twinkles(scene, 12, (i, v) => v.set(Math.cos(i * 2) * 2.2, 1 + Math.sin(i * 1.4) * 1.6, 1.2), { start: 1.0 });
  const d = dust(scene, 26, { colors: [0xffffff, 0xffe8cc] });
  return {
    frames: Math.round(T * 30), hdri: 'sky',
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 1.8)), out = easeInOut(seg(t, 4.1, 5));
      balloon.position.set(0.3 * Math.sin(t * 0.8), -8 * (1 - inn) + 0.2 + out * 9 + 0.12 * Math.sin(t * 1.6), 0);
      balloon.rotation.set(0.04 * Math.sin(t * 1.1), t * 0.35, 0.05 * Math.sin(t * 1.3));
      const fire = Math.max(0, Math.sin(t * 2.4)) * seg(t, 1.0, 1.4);
      burner.userData.flicker(t);
      burner.scale.multiplyScalar(0.4 + fire * 0.9);
      bg.material.opacity = 0.3 + fire * 0.6; inner.material.opacity = 0.15 + fire * 0.35;
      const on = seg(t, 0.2, 0.8) * (1 - out);
      for (const c of clouds) { c.s.position.set(c.x, ((c.y - t * 1.2) % 12 + 18) % 12 - 6, c.z); c.s.material.opacity = c.o * on; }
      h(t, on, 0.45); tw(t, on); d(t, on);
    },
  };
}
