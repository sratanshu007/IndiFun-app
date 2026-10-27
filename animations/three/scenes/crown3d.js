// 3D Royal Crown: polished gold, faceted rubies/sapphires/emeralds, pearls, velvet cap, falling gold coins.
import * as THREE from 'three';
import { mats, sprite, glowTex, sparkTex, raysTex, rng, seg, easeOut, backOut, easeInOut, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const FR = 150;
  camera.position.set(0, 0.9, 10.5);
  camera.lookAt(0, 0.1, 0);
  const rand = rng(11);

  // lights: warm key, cool rim, moving sweep light for travelling highlights
  scene.add(new THREE.AmbientLight(0xffffff, 0.25));
  const key = new THREE.DirectionalLight(0xfff1d6, 2.6); key.position.set(3, 5, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xb8d8ff, 1.6); rim.position.set(-5, 3, -4); scene.add(rim);
  const sweep = new THREE.PointLight(0xffffff, 60, 12); scene.add(sweep);

  // background glow + rotating rays
  const rays = sprite(raysTex, 0xffd54a, 11, 0.0); rays.position.z = -3; scene.add(rays);
  const halo = sprite(glowTex, 0xffb300, 8, 0.0); halo.position.z = -2.5; scene.add(halo);

  const crown = new THREE.Group();
  scene.add(crown);
  const gold = mats.gold();

  // crown wall: open cylinder whose top edge rises into 8 rounded points
  const R = 1.35, Hh = 0.75, N = 8;
  const wallGeo = new THREE.CylinderGeometry(R, R * 0.96, Hh, 256, 24, true);
  const pos = wallGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const u = (y + Hh / 2) / Hh; // 0 bottom .. 1 top
    const peak = Math.pow(Math.abs(Math.cos((a * N) / 2)), 3) * 1.05;
    pos.setY(i, y + u * u * peak);
    const flare = 1 + u * 0.06;
    pos.setX(i, x * flare); pos.setZ(i, z * flare);
  }
  wallGeo.computeVertexNormals();
  const wall = new THREE.Mesh(wallGeo, Object.assign(gold.clone(), { side: THREE.DoubleSide }));
  crown.add(wall);

  // band rings top/bottom + engraved middle band
  for (const [y, r, t] of [[-Hh / 2, R * 0.97, 0.07], [Hh / 2 - 0.12, R * 1.03, 0.05], [0.02, R * 1.015, 0.035]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, t, 24, 200), gold);
    ring.rotation.x = Math.PI / 2; ring.position.y = y; crown.add(ring);
  }
  // pearls along the bottom ring and on the tips
  const pearlM = mats.pearl();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), pearlM);
    p.position.set(Math.cos(a) * R * 1.0, -Hh / 2 - 0.0, Math.sin(a) * R * 1.0);
    crown.add(p);
  }
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 24), pearlM);
    p.position.set(Math.cos(a) * R * 1.07, Hh / 2 + 1.12, Math.sin(a) * R * 1.07);
    crown.add(p);
  }
  // gems around the band, facing outwards
  const gemCols = [0xe0115f, 0x1e5bff, 0x00a86b, 0xe0115f, 0x8a2be2, 0x1e5bff, 0x00a86b, 0xffb000];
  const gemMeshes = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + Math.PI / N;
    const g = new THREE.Mesh(cutGem(0.253), mats.gem(gemCols[i]));
    g.scale.set(1, 1.25, 0.55);
    g.position.set(Math.cos(a) * R * 1.07, 0.02, Math.sin(a) * R * 1.07);
    g.lookAt(Math.cos(a) * 5, 0.02, Math.sin(a) * 5);
    crown.add(g);
    const setting = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.035, 12, 48), gold);
    setting.position.copy(g.position); setting.lookAt(Math.cos(a) * 5, 0.02, Math.sin(a) * 5);
    crown.add(setting);
    gemMeshes.push(g);
    // small gem under each tip
    const a2 = (i / N) * Math.PI * 2;
    const s = new THREE.Mesh(cutGem(0.115), mats.gem(i % 2 ? 0xe0115f : 0x1e5bff));
    s.scale.set(1, 1.2, 0.6);
    s.position.set(Math.cos(a2) * R * 1.05, Hh / 2 + 0.55, Math.sin(a2) * R * 1.05);
    s.lookAt(Math.cos(a2) * 5, Hh / 2 + 0.55, Math.sin(a2) * 5);
    crown.add(s);
    gemMeshes.push(s);
  }
  // velvet cap and gold arches
  const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 0.93, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2), mats.velvet(0x6e0020));
  cap.scale.y = 0.95; cap.position.y = Hh / 2 - 0.15; crown.add(cap);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 8;
    const pts = [];
    for (let k = 0; k <= 20; k++) {
      const t = k / 20, ang = t * Math.PI / 2;
      const r = R * 1.02 * Math.cos(ang);
      pts.push(new THREE.Vector3(Math.cos(a) * r, Hh / 2 - 0.1 + Math.sin(ang) * 1.45, Math.sin(a) * r));
    }
    const arch = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.07, 16), gold);
    crown.add(arch);
    for (let k = 3; k < 20; k += 3) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), pearlM);
      p.position.copy(pts[k]).multiplyScalar(1.03); crown.add(p);
    }
  }
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.2, 48, 32), gold);
  orb.position.y = Hh / 2 + 1.42; crown.add(orb);
  const topGem = new THREE.Mesh(cutGem(0.230), mats.gem(0xe0115f));
  topGem.scale.set(0.8, 1.3, 0.8); topGem.position.y = Hh / 2 + 1.78; crown.add(topGem);
  gemMeshes.push(topGem);

  // sparkles that pop on gems
  const sparks = [];
  for (let i = 0; i < 14; i++) {
    const s = sprite(sparkTex, 0xffffff, 0.8, 0); scene.add(s);
    sparks.push({ s, gem: gemMeshes[Math.floor(rand() * gemMeshes.length)], t0: 1.4 + rand() * 3, size: 0.6 + rand() * 0.6 });
  }
  // burst stars when the crown lands
  const burst = [];
  for (let i = 0; i < 28; i++) {
    const s = sprite(sparkTex, i % 3 ? 0xffe28a : 0xffffff, 0.5, 0); scene.add(s);
    const a = rand() * Math.PI * 2, sp = 2.5 + rand() * 2.5;
    burst.push({ s, v: new THREE.Vector3(Math.cos(a) * sp, Math.sin(a) * sp, (rand() - 0.5) * 2) });
  }
  // 3D gold coins raining
  const coinGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 48);
  const coins = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(coinGeo, gold);
    scene.add(m);
    coins.push({ m, x: (rand() - 0.5) * 5, z: -1 - rand() * 3, t0: 1.6 + rand() * 2.6, sp: 2.6 + rand() * 1.6, rx: rand() * 8, rz: rand() * 6 });
  }

  return {
    frames: FR,
    update(t) {
      const fall = easeOut(seg(t, 0, 1.1));
      crown.position.y = 6 * (1 - fall) - 0.3 + Math.sin(Math.max(0, t - 1.1) * 3) * 0.05 * seg(t, 1.1, 1.5);
      const land = backOut(seg(t, 0.9, 1.3));
      crown.scale.setScalar(0.6 + 0.4 * land);
      crown.rotation.y = -Math.PI * 3 * (1 - easeOut(seg(t, 0, 1.4))) + t * 0.55;
      crown.rotation.x = 0.28 + 0.06 * Math.sin(t * 1.3);
      crown.rotation.z = 0.05 * Math.sin(t * 0.9);
      const out = easeInOut(seg(t, 4.4, 5));
      crown.position.y += out * 0.6;
      crown.scale.multiplyScalar(1 - out * 0.4);
      sweep.position.set(Math.cos(t * 1.6) * 4, 1.5 + Math.sin(t * 1.1), 3 + Math.sin(t * 1.6) * 2);

      rays.material.opacity = 0.45 * seg(t, 0.8, 1.4) * (1 - out);
      rays.material.rotation = t * 0.25;
      halo.material.opacity = 0.55 * seg(t, 0.6, 1.3) * (1 - out) * (0.85 + 0.15 * Math.sin(t * 4));
      halo.scale.setScalar(8 + Math.sin(t * 2) * 0.3);

      crown.updateMatrixWorld(true);
      for (const sp of sparks) {
        const k = (t - sp.t0) / 0.5;
        const v = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
        sp.gem.getWorldPosition(sp.s.position);
        sp.s.position.z += 0.4;
        sp.s.material.opacity = v * (1 - out);
        sp.s.material.rotation = k * 1.5;
        sp.s.scale.setScalar(sp.size * (0.4 + v));
      }
      for (const b of burst) {
        const k = seg(t, 1.1, 2.0);
        b.s.position.set(b.v.x * easeOut(k), -0.3 + b.v.y * easeOut(k), b.v.z * k + 1);
        b.s.material.opacity = k > 0 && k < 1 ? 1 - k : 0;
        b.s.material.rotation = k * 3;
      }
      for (const c of coins) {
        const k = t - c.t0;
        c.m.visible = k > 0;
        c.m.position.set(c.x, 5.5 - k * c.sp - 0.5 * k * k, c.z);
        c.m.rotation.set(c.rx + k * 6, 0, c.rz + k * 3);
      }
    },
  };
}
