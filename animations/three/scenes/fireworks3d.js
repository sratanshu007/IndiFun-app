// Diwali Fireworks: 3D rockets with trails burst into peony, ring and willow shells across the sky.
import { THREE, lights, dust, seg, easeOut, rng } from '../fx.js';
import { sprite, glowTex, sparkTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5.5;
  camera.position.set(0, 0, 10); camera.lookAt(0, 0.5, 0);
  lights(scene);
  const rand = rng(71);
  const palette = [[0xffd166, 0xffffff], [0xff4d6d, 0xffd6e0], [0x4cc9f0, 0xffffff], [0xc77dff, 0xffffff], [0x06d6a0, 0xd8fff0], [0xff9933, 0xfff3c4], [0xff2d95, 0xffd166]];
  const shells = [];
  for (let k = 0; k < 11; k++) {
    const type = ['peony', 'ring', 'willow'][k % 3];
    const [c1, c2] = palette[k % palette.length];
    const end = new THREE.Vector3(-1.8 + rand() * 3.6, 0.2 + rand() * 3.0, -rand() * 2);
    const start = new THREE.Vector3(end.x * 0.7, -6, end.z);
    const t0 = 0.1 + k * 0.4 + rand() * 0.2;
    const rocket = sprite(glowTex, c2, 0.35, 0); scene.add(rocket);
    const trail = Array.from({ length: 10 }, () => { const s = sprite(glowTex, c1, 0.18, 0); scene.add(s); return s; });
    const flash = sprite(glowTex, c1, 4, 0); scene.add(flash);
    const n = type === 'ring' ? 46 : 70;
    const parts = [];
    const axis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    for (let i = 0; i < n; i++) {
      let v;
      if (type === 'ring') { const a = (i / n) * Math.PI * 2; v = new THREE.Vector3(Math.cos(a), Math.sin(a), 0).applyAxisAngle(axis, 1.2); } else { const a = rand() * Math.PI * 2, e = Math.acos(2 * rand() - 1); v = new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)); }
      v.multiplyScalar((type === 'willow' ? 2.2 : 2.9) * (0.85 + rand() * 0.3));
      const head = sprite(i % 4 ? glowTex : sparkTex, i % 5 ? c1 : c2, type === 'willow' ? 0.3 : 0.38, 0); scene.add(head);
      const tails = Array.from({ length: 4 }, () => { const s = sprite(glowTex, c1, 0.22, 0); scene.add(s); return s; });
      parts.push({ head, tails, v });
    }
    shells.push({ type, start, end, t0, rocket, trail, flash, parts });
  }
  const d = dust(scene, 30, { colors: [0xffffff, 0xffd166] });
  const P = new THREE.Vector3();
  return {
    frames: Math.round(T * 30),
    update(t) {
      for (const s of shells) {
        const k = seg(t, s.t0, s.t0 + 0.7);
        const flying = t > s.t0 && k < 1;
        P.lerpVectors(s.start, s.end, easeOut(k));
        s.rocket.position.copy(P); s.rocket.material.opacity = flying ? 1 : 0;
        s.trail.forEach((tr, i) => { const kk = Math.max(0, k - i * 0.03); tr.position.lerpVectors(s.start, s.end, easeOut(kk)); tr.material.opacity = flying ? 0.8 * (1 - i / 10) : 0; });
        const life = s.type === 'willow' ? 2.0 : 1.4;
        const b = seg(t, s.t0 + 0.7, s.t0 + 0.7 + life);
        const on = t > s.t0 + 0.7 && b < 1;
        s.flash.position.copy(s.end); s.flash.material.opacity = on ? Math.max(0, 0.8 - b * 3) : 0;
        const g = s.type === 'willow' ? 2.2 : 1.0;
        for (const p of s.parts) {
          const at = (q) => P.copy(s.end).addScaledVector(p.v, easeOut(q)).add(new THREE.Vector3(0, -g * q * q, 0));
          p.head.position.copy(at(b)); p.head.material.opacity = on ? (1 - b) * (0.7 + 0.3 * Math.sin(t * 40 + p.v.x * 10)) : 0;
          p.tails.forEach((tl, i) => { tl.position.copy(at(Math.max(0, b - (i + 1) * 0.04))); tl.material.opacity = on ? (1 - b) * 0.5 * (1 - i / 4) : 0; });
        }
      }
      d(t, seg(t, 0.5, 1) * (1 - seg(t, 5, 5.5)));
    },
  };
}
