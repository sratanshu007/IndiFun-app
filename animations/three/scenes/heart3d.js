// 3D Love Heart: glossy puffy heart with rose-gold trim, heartbeat, orbiting mini hearts, burst at the end.
import * as THREE from 'three';
import { mats, sprite, glowTex, sparkTex, rng, seg, easeOut, backOut, easeInOut } from '../common.js';

function heartGeo(size, depth, bevel) {
  const s = new THREE.Shape();
  const x = 0, y = 0;
  s.moveTo(x, y + 0.5 * size);
  s.bezierCurveTo(x, y + 0.75 * size, x - 0.3 * size, y + 1.0 * size, x - 0.62 * size, y + 1.0 * size);
  s.bezierCurveTo(x - 1.1 * size, y + 1.0 * size, x - 1.1 * size, y + 0.4 * size, x - 1.1 * size, y + 0.4 * size);
  s.bezierCurveTo(x - 1.1 * size, y + 0.05 * size, x - 0.75 * size, y - 0.45 * size, x, y - 0.9 * size);
  s.bezierCurveTo(x + 0.75 * size, y - 0.45 * size, x + 1.1 * size, y + 0.05 * size, x + 1.1 * size, y + 0.4 * size);
  s.bezierCurveTo(x + 1.1 * size, y + 0.4 * size, x + 1.1 * size, y + 1.0 * size, x + 0.62 * size, y + 1.0 * size);
  s.bezierCurveTo(x + 0.3 * size, y + 1.0 * size, x, y + 0.75 * size, x, y + 0.5 * size);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 12, curveSegments: 48 });
  g.center();
  return g;
}

export default function build({ scene, camera }) {
  const FR = 140;
  camera.position.set(0, 0, 12.5);
  const rand = rng(31);
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(3, 5, 6); scene.add(key);
  const rimL = new THREE.DirectionalLight(0xffb3d1, 2.2); rimL.position.set(-5, 2, -3); scene.add(rimL);
  const sweep = new THREE.PointLight(0xffffff, 50, 10); scene.add(sweep);

  const halo = sprite(glowTex, 0xff2d6f, 9, 0); halo.position.z = -2.5; scene.add(halo);
  const halo2 = sprite(glowTex, 0xffb3d1, 5, 0); halo2.position.z = -2; scene.add(halo2);

  const heart = new THREE.Group();
  scene.add(heart);
  const red = mats.candy(0xe0003c);
  red.emissive = new THREE.Color(0x5a0018);
  const big = new THREE.Mesh(heartGeo(1.0, 0.3, 0.38), red);
  heart.add(big);
  const trimGeo = heartGeo(1.04, 0.05, 0.06);
  const trim = new THREE.Mesh(trimGeo, mats.roseGold());
  trim.scale.set(1.04, 1.04, 1); trim.position.z = -0.05; heart.add(trim);

  const miniGeo = heartGeo(0.18, 0.07, 0.07);
  const minis = [];
  const cols = [0xff2d6f, 0xff7aa8, 0xffc2d8, 0xe0003c, 0xff4d8d];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(miniGeo, i % 4 === 0 ? mats.gold() : mats.candy(cols[i % cols.length]));
    scene.add(m);
    minis.push({ m, a0: (i / 16) * Math.PI * 2, r: 2.2 + rand() * 0.6, tilt: (rand() - 0.5) * 0.8, sp: 0.8 + rand() * 0.6, s: 0.6 + rand() * 0.6 });
  }
  const risers = [];
  for (let i = 0; i < 24; i++) {
    const m = new THREE.Mesh(miniGeo, mats.candy(cols[i % cols.length]));
    scene.add(m);
    risers.push({ m, x: (rand() - 0.5) * 5, z: -2 + rand() * 1.5, t0: 0.6 + rand() * 3, sp: 1.4 + rand(), s: 0.5 + rand() * 0.8, rot: rand() * 6 });
  }
  const burst = [];
  for (let i = 0; i < 30; i++) {
    const m = new THREE.Mesh(miniGeo, mats.candy(cols[i % cols.length]));
    scene.add(m);
    const a = rand() * Math.PI * 2, e = (rand() - 0.5) * 1.2;
    burst.push({ m, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)).multiplyScalar(3 + rand() * 2.5), s: 0.6 + rand() * 0.8 });
  }
  const sparks = [];
  for (let i = 0; i < 12; i++) {
    const s = sprite(sparkTex, 0xffffff, 1, 0); scene.add(s);
    sparks.push({ s, x: (rand() - 0.5) * 2.6, y: (rand() - 0.3) * 2.2, t0: 0.9 + rand() * 3, size: 0.6 + rand() * 0.8 });
  }

  return {
    frames: FR,
    update(t) {
      const pop = backOut(seg(t, 0, 0.8));
      const beat = 1 + 0.07 * Math.max(0, Math.sin(t * 7.5)) * seg(t, 0.8, 1.2);
      const end = seg(t, 3.9, 4.15);
      heart.scale.setScalar(pop * beat * (1 + end * 0.35) * (end >= 1 ? 0 : 1));
      heart.rotation.y = Math.PI * 2 * easeOut(seg(t, 0, 1.6)) + 0.35 * Math.sin(t * 1.4);
      heart.rotation.x = 0.1 * Math.sin(t * 1.1);
      sweep.position.set(Math.cos(t * 2.2) * 3, 1.5, 3 + Math.sin(t * 2.2));
      halo.material.opacity = 0.65 * seg(t, 0.2, 0.8) * (1 - seg(t, 4.0, 4.6)) * (0.8 + 0.2 * Math.sin(t * 7.5));
      halo2.material.opacity = 0.5 * seg(t, 0.3, 0.9) * (1 - end);
      for (const h of minis) {
        const a = h.a0 + t * h.sp;
        const vis = seg(t, 0.6, 1.2) * (1 - end);
        h.m.position.set(Math.cos(a) * h.r, Math.sin(a) * h.r * 0.35 + h.tilt, Math.sin(a) * h.r * 0.6);
        h.m.scale.setScalar(h.s * vis);
        h.m.rotation.set(0.3, a * 2, 0);
      }
      for (const r of risers) {
        const k = t - r.t0;
        r.m.visible = k > 0 && t < 4.6;
        r.m.position.set(r.x + Math.sin(k * 2 + r.x) * 0.3, -4.5 + k * r.sp * 2, r.z);
        r.m.scale.setScalar(r.s * Math.min(1, k * 2));
        r.m.rotation.set(0, r.rot + k * 2, 0.3 * Math.sin(k * 3));
      }
      for (const b of burst) {
        const k = seg(t, 4.0, 4.66);
        b.m.visible = k > 0 && k < 1;
        b.m.position.copy(b.v).multiplyScalar(easeOut(k));
        b.m.scale.setScalar(b.s * (1 - k * 0.6));
        b.m.rotation.set(k * 4, k * 6, 0);
      }
      for (const sp of sparks) {
        const k = (t - sp.t0) / 0.45;
        const v = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
        sp.s.position.set(sp.x, sp.y, 1.2);
        sp.s.material.opacity = v * (1 - end);
        sp.s.scale.setScalar(sp.size * (0.3 + v));
        sp.s.material.rotation = k;
      }
    },
  };
}
