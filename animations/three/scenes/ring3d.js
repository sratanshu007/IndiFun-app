// 3D Diamond Ring: white-gold band with pave stones, brilliant-cut diamond in six prongs, sparkle and light sweep.
import * as THREE from 'three';
import { mats, sprite, glowTex, sparkTex, raysTex, rng, seg, easeOut, backOut, easeInOut } from '../common.js';

function brilliant(r = 0.62) {
  // side profile of a round brilliant cut, turned on a lathe with 16 facets
  const k = r / 0.62;
  const pts = [[0.001, -0.62 * k], [r, -0.02 * k], [r, 0.03 * k], [r * 0.62, 0.3 * k], [0.001, 0.3 * k]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 16);
}

export default function build({ scene, camera }) {
  const FR = 140;
  camera.position.set(0, 0.4, 9.5);
  camera.lookAt(0, 0.2, 0);
  const rand = rng(21);
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 2.4); key.position.set(3, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfe3ff, 1.8); rim.position.set(-4, 2, -5); scene.add(rim);
  const sweep = new THREE.PointLight(0xffffff, 80, 10); scene.add(sweep);

  const rays = sprite(raysTex, 0xbfe6ff, 10, 0); rays.position.z = -3; scene.add(rays);
  const halo = sprite(glowTex, 0x9fd8ff, 7, 0); halo.position.z = -2.5; scene.add(halo);
  const pink = sprite(glowTex, 0xff8fc8, 5, 0); pink.position.set(0, -0.6, -2); scene.add(pink);

  const ring = new THREE.Group();
  scene.add(ring);
  const metal = mats.platinum();
  const gold = mats.gold();
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.14, 48, 220), metal);
  ring.add(band);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.145, 24, 220, Math.PI * 0.9), gold);
  inner.rotation.z = Math.PI * 1.05; inner.scale.set(1, 1, 0.55); ring.add(inner);
  // pave diamonds along the upper band
  const small = mats.gem(0xf4fbff);
  for (let i = -7; i <= 7; i++) {
    if (Math.abs(i) < 2) continue;
    const a = Math.PI / 2 + i * 0.13;
    const s = new THREE.Mesh(brilliant(0.065), small);
    s.position.set(Math.cos(a) * 1.15, Math.sin(a) * 1.15, 0.12);
    s.rotation.x = Math.PI / 2;
    ring.add(s);
  }
  // head: basket + six prongs + the big diamond
  const head = new THREE.Group();
  head.position.y = 1.45;
  ring.add(head);
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.18, 0.4, 32, 1, true), Object.assign(gold.clone(), { side: THREE.DoubleSide }));
  basket.position.y = -0.12; head.add(basket);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const pts = [new THREE.Vector3(Math.cos(a) * 0.18, -0.3, Math.sin(a) * 0.18), new THREE.Vector3(Math.cos(a) * 0.6, 0.15, Math.sin(a) * 0.6), new THREE.Vector3(Math.cos(a) * 0.5, 0.42, Math.sin(a) * 0.5)];
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.035, 8), gold));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), gold); tip.position.copy(pts[2]); head.add(tip);
  }
  const dMat = new THREE.MeshPhysicalMaterial({
    color: 0xeef7ff, metalness: 0.65, roughness: 0, flatShading: true, envMapIntensity: 3.2, clearcoat: 1, clearcoatRoughness: 0,
    iridescence: 1, iridescenceIOR: 2.2, iridescenceThicknessRange: [250, 1000], emissive: new THREE.Color(0x9fd8ff).multiplyScalar(0.06),
  });
  const diamond = new THREE.Mesh(brilliant(0.62), dMat);
  diamond.position.y = 0.18; head.add(diamond);

  const sparks = [];
  for (let i = 0; i < 18; i++) {
    const s = sprite(sparkTex, i % 4 ? 0xffffff : 0xbfe6ff, 1, 0); scene.add(s);
    sparks.push({ s, off: new THREE.Vector3((rand() - 0.5) * 1.1, (rand() - 0.2) * 0.6, 0.5), t0: 1.0 + rand() * 3.2, size: 0.7 + rand() * 1.1 });
  }
  const dust = [];
  for (let i = 0; i < 40; i++) {
    const s = sprite(glowTex, rand() > 0.5 ? 0xffffff : 0xffd6ec, 0.12 + rand() * 0.12, 0); scene.add(s);
    dust.push({ s, x: (rand() - 0.5) * 5, y: -3 + rand() * 2, z: -1 + rand() * 2, sp: 0.5 + rand() * 0.8, t0: rand() * 2 });
  }

  return {
    frames: FR,
    update(t) {
      const inn = easeOut(seg(t, 0, 1.2));
      ring.position.y = -5 * (1 - inn) - 0.25 + 0.08 * Math.sin(t * 2);
      ring.rotation.y = -Math.PI * 4 * (1 - easeOut(seg(t, 0, 1.5))) + 0.5 * Math.sin(t * 0.9);
      ring.rotation.x = 0.35 + 0.08 * Math.sin(t * 1.2);
      ring.scale.setScalar(0.5 + 0.5 * backOut(seg(t, 0.2, 1.3)));
      const out = easeInOut(seg(t, 4.0, 4.66));
      ring.scale.multiplyScalar(1 - 0.5 * out);
      ring.position.y += out * 1.5;
      sweep.position.set(Math.cos(t * 2) * 3, 2 + Math.sin(t * 1.5), 3);
      rays.material.opacity = 0.5 * seg(t, 1, 1.6) * (1 - out); rays.material.rotation = -t * 0.2;
      halo.material.opacity = 0.6 * seg(t, 0.8, 1.4) * (1 - out) * (0.85 + 0.15 * Math.sin(t * 5));
      pink.material.opacity = 0.4 * seg(t, 1, 1.6) * (1 - out);
      ring.updateMatrixWorld(true);
      const dp = new THREE.Vector3(); diamond.getWorldPosition(dp);
      halo.position.set(dp.x, dp.y, -2.5);
      for (const sp of sparks) {
        const k = (t - sp.t0) / 0.45;
        const v = k > 0 && k < 1 ? Math.sin(k * Math.PI) : 0;
        sp.s.position.copy(dp).add(sp.off);
        sp.s.material.opacity = v * (1 - out);
        sp.s.material.rotation = k;
        sp.s.scale.setScalar(sp.size * (0.3 + v));
      }
      for (const d of dust) {
        const k = t - d.t0;
        d.s.position.set(d.x + Math.sin(k * 2 + d.x) * 0.2, d.y + k * d.sp, d.z);
        d.s.material.opacity = k > 0 ? Math.min(1, k) * 0.8 * (1 - out) : 0;
      }
    },
  };
}
