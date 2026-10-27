// Cricket Six: willow bat swings, leather ball flies off with a fiery trail, stumps flash, crowd confetti.
import { THREE, lights, halo, rays, twinkles, confetti, burst, dust, seg, easeOut, easeIn, easeInOut, lathe, canvasTexture, rng } from '../fx.js';
import { sprite, glowTex, sparkTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 0.8, 14); camera.lookAt(0, 0.6, 0);
  const sweep = lights(scene, { key: 2.4, sweep: 60 });
  const h = halo(scene, 0x3fa9ff, 10, -3, 0.5);
  const r = rays(scene, 0xffe28a, 12, -3.5, 0.5);
  const rand = rng(81);
  const willow = canvasTexture(256, 1024, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#e9cf9a'); gr.addColorStop(0.5, '#f6e3b8'); gr.addColorStop(1, '#d9b97c'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(150,110,50,0.25)'; for (let x = 10; x < w; x += 14) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 4, hh); g.stroke(); } g.fillStyle = '#c1121f'; g.fillRect(0, 160, w, 50); g.fillStyle = '#1d3557'; g.fillRect(0, 215, w, 24); });
  const batM = new THREE.MeshPhysicalMaterial({ map: willow, roughness: 0.45, clearcoat: 0.6 });
  const gripM = new THREE.MeshPhysicalMaterial({ color: 0x1d3557, roughness: 0.7, sheen: 0.5 });
  const bat = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 2.4, 0.16, 4, 8, 4), batM);
  const bp = blade.geometry.attributes.position; for (let i = 0; i < bp.count; i++) { const z = bp.getZ(i); if (z < 0) bp.setZ(i, z * 1.8 * (1 - Math.abs(bp.getX(i)) * 1.6)); } blade.geometry.computeVertexNormals();
  blade.position.y = -1.2; bat.add(blade);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.0, 24), gripM); handle.position.y = 0.5; bat.add(handle);
  for (let i = 0; i < 8; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 24), new THREE.MeshStandardMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.1 + i * 0.11; bat.add(ring); }
  const batPivot = new THREE.Group(); batPivot.position.set(0.9, 1.2, 0); batPivot.add(bat); bat.scale.setScalar(0.85); scene.add(batPivot);
  const leather = canvasTexture(512, 256, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#d0021b'); gr.addColorStop(1, '#7a0010'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.fillStyle = '#f5e6c8'; for (const y of [hh / 2 - 10, hh / 2 + 6]) for (let x = 0; x < w; x += 10) g.fillRect(x, y, 6, 4); });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.28, 64, 48), new THREE.MeshPhysicalMaterial({ map: leather, roughness: 0.25, clearcoat: 1 }));
  scene.add(ball);
  const fire = Array.from({ length: 26 }, (_, i) => { const s = sprite(glowTex, i % 3 ? 0xff7b00 : 0xffd166, 0.5, 0); scene.add(s); return s; });
  const stumpM = new THREE.MeshPhysicalMaterial({ color: 0xf1e3c6, roughness: 0.5, clearcoat: 0.4 });
  const stumps = new THREE.Group(); stumps.position.set(-1.1, -2.0, -1); scene.add(stumps);
  for (const x of [-0.25, 0, 0.25]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 16), stumpM); s.position.set(x, 0, 0); stumps.add(s); }
  const bails = [];
  for (const x of [-0.125, 0.125]) { const b0 = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.18, 6, 12), new THREE.MeshPhysicalMaterial({ color: 0xffd166, emissive: 0xff4400, emissiveIntensity: 0 })); b0.rotation.z = Math.PI / 2; b0.position.set(x, 0.82, 0); stumps.add(b0); bails.push(b0); }
  const hit = new THREE.Vector3(0.15, -0.6, 0.4);
  const bst = burst(scene, hit, 1.55, 26, { colors: [0xffffff, 0xffd166, 0xff7b00], speed: [2, 4.5], dur: 0.8, size: 0.5 });
  const c = confetti(scene, 80, { t0: 2.0, t1: 4.3, colors: [0xff9933, 0xffffff, 0x138808, 0x3fa9ff, 0xffd166] });
  const tw = twinkles(scene, 12, (i, v) => v.set(Math.cos(i * 2) * 2, 1 + Math.sin(i * 1.3) * 1.3, 1.2), { start: 1.8 });
  const d = dust(scene, 24);
  const path = (k) => new THREE.Vector3(hit.x + k * 3.2, hit.y + Math.sin(k * Math.PI * 0.85) * 4.2 + k * 1.5, hit.z - k * 6);
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 0.8));
      batPivot.position.set(0.9 - (1 - inn) * 5, 1.2, 0);
      const back = easeOut(seg(t, 0.7, 1.3)), swing = easeIn(seg(t, 1.3, 1.55)), follow = easeOut(seg(t, 1.55, 2.2));
      batPivot.rotation.z = 0.6 + back * 1.2 - swing * 2.7 - follow * 0.8;
      batPivot.rotation.y = -0.4 + swing * 0.6;
      const kIn = seg(t, 0.6, 1.55);
      if (t < 1.55) { ball.position.set(3.5 - kIn * 3.35, -1.2 + Math.sin(kIn * Math.PI) * 0.6 + kIn * 0.6, 0.4); ball.scale.setScalar(1); }
      else { const k = easeOut(seg(t, 1.55, 3.2)); ball.position.copy(path(k)); ball.scale.setScalar(1 - k * 0.6); }
      ball.rotation.set(t * 14, t * 9, 0);
      ball.visible = t < 3.3;
      fire.forEach((s, i) => { const k = easeOut(seg(t - i * 0.025, 1.55, 3.2)); s.position.copy(path(k)); s.material.opacity = t > 1.55 && t < 3.4 ? (1 - i / 26) * 0.85 : 0; s.scale.setScalar(0.55 * (1 - i / 30)); });
      bails.forEach((b0) => { b0.material.emissiveIntensity = seg(t, 1.55, 1.7) * (1 - seg(t, 2.6, 3)) * 2; });
      stumps.visible = t > 0.3;
      const on = seg(t, 0.3, 0.8) * (1 - seg(t, 4.4, 5));
      batPivot.scale.setScalar(1 - seg(t, 4.4, 5)); stumps.scale.setScalar(1 - seg(t, 4.4, 5));
      h(t, on, 0.4); r(t, on * seg(t, 1.55, 1.9), 0.5); bst(t); c(t); tw(t, on); d(t, on);
    },
  };
}
