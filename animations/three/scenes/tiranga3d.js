// Tiranga: silk flag waving in 3D on a steel pole, Ashoka Chakra, tricolour fireworks and confetti.
import { THREE, lights, halo, twinkles, confetti, dust, seg, easeOut, easeInOut, canvasTexture, rng } from '../fx.js';
import { sprite, glowTex, sparkTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0.6, 0.4, 11.5); camera.lookAt(0.4, 0.6, 0);
  const sweep = lights(scene, { key: 2.2, sweep: 40 });
  const h = halo(scene, 0xffffff, 9, -3, 0.8);
  const rand = rng(61);
  const flagTex = canvasTexture(1200, 800, (g, w, hh) => {
    g.fillStyle = '#FF9933'; g.fillRect(0, 0, w, hh / 3);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, hh / 3, w, hh / 3);
    g.fillStyle = '#138808'; g.fillRect(0, (2 * hh) / 3, w, hh / 3);
    const cx = w / 2, cy = hh / 2, R = hh / 6 - 6;
    g.strokeStyle = '#000080'; g.fillStyle = '#000080'; g.lineWidth = 8;
    g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(cx, cy, R * 0.18, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(-R * 0.06, R * 0.45); g.lineTo(0, R); g.lineTo(R * 0.06, R * 0.45); g.closePath(); g.fill();
      g.beginPath(); g.arc(0, R * 0.98, 5, 0, Math.PI * 2); g.fill();
      g.restore();
    }
  });
  const flagM = new THREE.MeshPhysicalMaterial({ map: flagTex, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xffffff), sheenRoughness: 0.3, side: THREE.DoubleSide });
  const W = 3.3, H = 2.2;
  const geo = new THREE.PlaneGeometry(W, H, 80, 50);
  geo.translate(W / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const flag = new THREE.Mesh(geo, flagM);
  const rig = new THREE.Group(); scene.add(rig);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 6.5, 32), new THREE.MeshPhysicalMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.15 }));
  pole.position.set(-1.5, -1.0, 0); rig.add(pole);
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.14, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xffc53d, metalness: 1, roughness: 0.15 })); top.position.set(-1.5, 2.3, 0); rig.add(top);
  flag.position.set(-1.45, 1.05, 0); rig.add(flag);
  // tricolour fireworks
  const shots = [];
  const cols = [0xff9933, 0xffffff, 0x138808, 0xff9933, 0x138808];
  for (let b = 0; b < 5; b++) {
    const c = new THREE.Vector3(-2 + b * 1.1 + (rand() - 0.5) * 0.6, 2.4 + rand() * 1.5, -3);
    const t0 = 1.5 + b * 0.45;
    const parts = [];
    for (let i = 0; i < 40; i++) {
      const s = sprite(i % 3 ? glowTex : sparkTex, i % 4 ? cols[b] : 0xffffff, 0.22, 0); scene.add(s);
      const a = rand() * Math.PI * 2, e = Math.acos(2 * rand() - 1);
      parts.push({ s, v: new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)).multiplyScalar(1.4 + rand() * 0.5) });
    }
    shots.push({ c, t0, parts });
  }
  const c = confetti(scene, 70, { t0: 1.0, t1: 4.0, colors: [0xff9933, 0xffffff, 0x138808, 0x000080] });
  const tw = twinkles(scene, 12, (i, v) => v.set(-1 + Math.cos(i * 2) * 1.6, 1 + Math.sin(i * 1.3) * 1.0, 1.2));
  const d = dust(scene, 26);
  const pos = geo.attributes.position;
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const up = easeOut(seg(t, 0, 1.3));
      const out = easeInOut(seg(t, 4.4, 5));
      rig.position.y = -7 * (1 - up) + out * 8 - 0.2;
      rig.rotation.y = -0.35 + 0.15 * Math.sin(t * 0.7);
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1];
        const u = x / W;
        const wave = Math.sin(x * 2.4 - t * 6.5) * 0.28 * u + Math.sin(x * 4.1 - t * 9 + y * 1.5) * 0.06 * u;
        pos.setXYZ(i, x - 0.05 * u * u * Math.abs(wave), y - 0.12 * u * u + Math.sin(x * 2 - t * 5) * 0.04 * u, wave);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      const on = seg(t, 0.6, 1.2) * (1 - out);
      for (const s of shots) {
        const k = seg(t, s.t0, s.t0 + 1.3), vis = t > s.t0 && k < 1;
        for (const p of s.parts) { p.s.position.copy(s.c).addScaledVector(p.v, easeOut(k)); p.s.position.y -= k * k; p.s.material.opacity = vis ? 1 - k : 0; }
      }
      h(t, on, 0.35); c(t); tw(t, on); d(t, on);
    },
  };
}
