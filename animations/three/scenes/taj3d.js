// 3D Taj Mahal by moonlight: marble monument rises, camera glides around it, reflection pool, fireworks and lanterns.
import * as THREE from 'three';
import { mats, sprite, glowTex, sparkTex, rng, seg, easeOut, easeInOut } from '../common.js';

function smoothProfile(pts, n = 48) {
  const curve = new THREE.SplineCurve(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  return curve.getPoints(n);
}
const onionPts = (s) => smoothProfile([[0.62, 0], [0.78, 0.25], [0.84, 0.55], [0.77, 0.86], [0.58, 1.1], [0.33, 1.32], [0.13, 1.48], [0.04, 1.58], [0.001, 1.63]].map(([x, y]) => [x * s, y * s]));

function archShape(w, h) {
  const s = new THREE.Shape();
  const hw = w / 2;
  s.moveTo(-hw, 0); s.lineTo(-hw, h - hw * 1.1);
  s.quadraticCurveTo(-hw, h - hw * 0.15, 0, h);
  s.quadraticCurveTo(hw, h - hw * 0.15, hw, h - hw * 1.1);
  s.lineTo(hw, 0); s.lineTo(-hw, 0);
  return s;
}

export default function build({ scene, camera }) {
  const FR = 180;
  const rand = rng(41);
  scene.add(new THREE.AmbientLight(0x8fa6ff, 0.35));
  const moon = new THREE.DirectionalLight(0xc9d8ff, 2.2); moon.position.set(5, 8, -3); scene.add(moon);
  const front = new THREE.DirectionalLight(0xf4f6ff, 1.2); front.position.set(-2, 4, 8); scene.add(front);
  const warmL = new THREE.PointLight(0xffb066, 14, 9); warmL.position.set(-2.6, 0.4, 3); scene.add(warmL);
  const warmR = new THREE.PointLight(0xffb066, 14, 9); warmR.position.set(2.6, 0.4, 3); scene.add(warmR);
  const sweep = new THREE.PointLight(0xffffff, 30, 6); scene.add(sweep);

  // sky dressing (sprites, always face camera)
  const sky = new THREE.Group(); scene.add(sky);
  const moonGlow = sprite(glowTex, 0xfff1c8, 3.2, 0); moonGlow.position.set(3.2, 6.5, -8); sky.add(moonGlow);
  const moonDisc = sprite(glowTex, 0xffffff, 1.1, 0); moonDisc.position.copy(moonGlow.position); sky.add(moonDisc);
  const stars = [];
  for (let i = 0; i < 70; i++) {
    const s = sprite(sparkTex, 0xffffff, 0.12 + rand() * 0.18, 0);
    s.position.set((rand() - 0.5) * 22, 2.5 + rand() * 8, -9 - rand() * 4); sky.add(s);
    stars.push({ s, ph: rand() * 6 });
  }
  const aura = sprite(glowTex, 0xffd9a0, 9, 0); aura.position.set(0, 2.3, -3); scene.add(aura);

  const taj = new THREE.Group(); scene.add(taj);
  const marble = mats.marble();
  const shade = new THREE.MeshStandardMaterial({ color: 0x7e8bb0, roughness: 0.6 });
  const deep = new THREE.MeshStandardMaterial({ color: 0x2a2f4f, roughness: 0.8 });
  const inlay = mats.gold();

  // plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.3, 4.8), marble); plinth.position.y = -0.15; taj.add(plinth);
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(); g.rotation.y = (k * Math.PI) / 2; taj.add(g);
    for (let i = -7; i <= 7; i++) {
      const a = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.2, 0.22)), shade);
      a.position.set(i * 0.3, -0.27, 2.401); g.add(a);
    }
  }
  // chamfered square hall
  const S = 1.2, C = 0.42;
  const hs = new THREE.Shape();
  hs.moveTo(-S + C, -S); hs.lineTo(S - C, -S); hs.lineTo(S, -S + C); hs.lineTo(S, S - C); hs.lineTo(S - C, S); hs.lineTo(-S + C, S); hs.lineTo(-S, S - C); hs.lineTo(-S, -S + C); hs.closePath();
  const hallGeo = new THREE.ExtrudeGeometry(hs, { depth: 1.55, bevelEnabled: false });
  hallGeo.rotateX(-Math.PI / 2);
  const hall = new THREE.Mesh(hallGeo, marble); taj.add(hall);
  const roofRim = new THREE.Mesh(new THREE.ExtrudeGeometry(hs, { depth: 0.06, bevelEnabled: false }).rotateX(-Math.PI / 2), marble);
  roofRim.scale.set(1.03, 1, 1.03); roofRim.position.y = 1.55; taj.add(roofRim);
  // facades on the four main faces
  for (let k = 0; k < 4; k++) {
    const g = new THREE.Group(); g.rotation.y = (k * Math.PI) / 2; taj.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.5, 0.08), marble); frame.position.set(0, 0.78, S + 0.03); g.add(frame);
    const border = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.52, 0.02), inlay); border.position.set(0, 0.78, S + 0.005); g.add(border);
    const iwan = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.66, 1.18)), shade); iwan.position.set(0, 0.08, S + 0.075); g.add(iwan);
    const door = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.3, 0.5)), deep); door.position.set(0, 0.08, S + 0.077); g.add(door);
    const win = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.34, 0.34)), deep); win.position.set(0, 0.68, S + 0.077); g.add(win);
    for (const x of [-0.82, 0.82]) {
      for (const [y, h] of [[0.08, 0.6], [0.8, 0.55]]) {
        const a = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.3, h)), shade); a.position.set(x, y, S + 0.002); g.add(a);
        const d = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.16, h * 0.55)), deep); d.position.set(x, y, S + 0.004); g.add(d);
      }
    }
    // chamfer face (45 degrees)
    const cg = new THREE.Group(); cg.rotation.y = (k * Math.PI) / 2 + Math.PI / 4; taj.add(cg);
    const dist = Math.SQRT2 * (S - C / 2) + 0.002;
    for (const [y, h] of [[0.08, 0.6], [0.8, 0.55]]) {
      const a = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.34, h)), shade); a.position.set(0, y, dist); cg.add(a);
      const d = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.18, h * 0.55)), deep); d.position.set(0, y, dist + 0.002); cg.add(d);
    }
  }
  // drum, onion dome, lotus ring, gold finial
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.4, 64), marble); drum.position.y = 1.81; taj.add(drum);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.ShapeGeometry(archShape(0.12, 0.22)), shade);
    w.position.set(Math.sin(a) * 0.685, 1.7, Math.cos(a) * 0.685); w.rotation.y = a; taj.add(w);
  }
  const dome = new THREE.Mesh(new THREE.LatheGeometry(onionPts(1.0), 128), marble); dome.position.y = 2.0; taj.add(dome);
  const lotus = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.035, 12, 96), marble); lotus.rotation.x = Math.PI / 2; lotus.position.y = 2.02; taj.add(lotus);
  const finPts = smoothProfile([[0.001, 0], [0.08, 0.02], [0.1, 0.08], [0.04, 0.14], [0.07, 0.2], [0.035, 0.27], [0.05, 0.32], [0.015, 0.42], [0.001, 0.6]], 40);
  const finial = new THREE.Mesh(new THREE.LatheGeometry(finPts, 32), inlay); finial.position.y = 3.6; taj.add(finial);
  // four chhatris on the roof
  for (const [x, z] of [[-0.82, -0.82], [0.82, -0.82], [-0.82, 0.82], [0.82, 0.82]]) {
    const g = new THREE.Group(); g.position.set(x, 1.58, z); taj.add(g);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.08, 8), marble); base.position.y = 0.04; g.add(base);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.26, 8), marble); col.position.set(Math.cos(a) * 0.19, 0.21, Math.sin(a) * 0.19); g.add(col);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.06, 8), marble); cap.position.y = 0.36; g.add(cap);
    const d = new THREE.Mesh(new THREE.LatheGeometry(onionPts(0.3), 48), marble); d.position.y = 0.38; g.add(d);
    const f = new THREE.Mesh(new THREE.LatheGeometry(finPts, 16), inlay); f.scale.setScalar(0.35); f.position.y = 0.86; g.add(f);
  }
  // four minarets
  for (const [x, z] of [[-2.15, -2.15], [2.15, -2.15], [-2.15, 2.15], [2.15, 2.15]]) {
    const g = new THREE.Group(); g.position.set(x, 0, z); taj.add(g);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 2.7, 24), marble); shaft.position.y = 1.35; g.add(shaft);
    for (const y of [0.9, 1.8, 2.7]) {
      const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.17, 0.07, 24), marble); bal.position.y = y; g.add(bal);
      const rail = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.012, 6, 32), inlay); rail.rotation.x = Math.PI / 2; rail.position.y = y + 0.06; g.add(rail);
    }
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 6), marble); col.position.set(Math.cos(a) * 0.13, 2.84, Math.sin(a) * 0.13); g.add(col);
    }
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.05, 12), marble); cap.position.y = 2.96; g.add(cap);
    const d = new THREE.Mesh(new THREE.LatheGeometry(onionPts(0.2), 32), marble); d.position.y = 2.97; g.add(d);
    const f = new THREE.Mesh(new THREE.LatheGeometry(finPts, 12), inlay); f.scale.setScalar(0.25); f.position.y = 3.3; g.add(f);
  }
  // reflection pool in front
  const water = new THREE.MeshPhysicalMaterial({ color: 0x1b2a5c, metalness: 0.85, roughness: 0.08, envMapIntensity: 1.2, clearcoat: 1 });
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 6), water);
  pool.rotation.x = -Math.PI / 2; pool.position.set(0, -0.28, 5.5);
  const poolEdge = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 6.2), marble); poolEdge.position.set(0, -0.32, 5.5);
  const lawn = new THREE.MeshStandardMaterial({ color: 0x1f5a3a, roughness: 0.9 });
  for (const x of [-1.6, 1.6]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.04, 6.2), lawn); l.position.set(x, -0.34, 5.5); taj.add(l);
    for (let z = 3.2; z < 8.6; z += 0.9) {
      const tree = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.8, 12), new THREE.MeshStandardMaterial({ color: 0x14432a, roughness: 0.8 }));
      tree.position.set(x * 0.6, 0.06, z); taj.add(tree);
    }
  }
  const poolGroup = new THREE.Group(); poolGroup.add(poolEdge, pool); taj.add(poolGroup);

  // fireworks + lanterns
  const fw = [];
  const fwCols = [0xffd166, 0xff4d6d, 0x4cc9f0, 0xff9933, 0xc77dff, 0x7CFC00];
  for (let b = 0; b < 7; b++) {
    const c = new THREE.Vector3((rand() - 0.5) * 9, 5 + rand() * 3, -6 - rand() * 3);
    const t0 = 1.8 + b * 0.55 + rand() * 0.3;
    const col = fwCols[b % fwCols.length];
    const flash = sprite(glowTex, col, 3, 0); flash.position.copy(c); scene.add(flash);
    const parts = [];
    for (let i = 0; i < 40; i++) {
      const s = sprite(i % 3 ? glowTex : sparkTex, i % 4 ? col : 0xffffff, 0.22, 0); scene.add(s);
      const a = rand() * Math.PI * 2, e = Math.acos(2 * rand() - 1);
      parts.push({ s, v: new THREE.Vector3(Math.sin(e) * Math.cos(a), Math.cos(e), Math.sin(e) * Math.sin(a)).multiplyScalar(2 + rand() * 0.6) });
    }
    fw.push({ c, t0, flash, parts });
  }
  const lanterns = [];
  for (let i = 0; i < 12; i++) {
    const s = sprite(glowTex, 0xffa940, 0.5, 0); scene.add(s);
    const core = sprite(glowTex, 0xfff1c8, 0.18, 0); scene.add(core);
    lanterns.push({ s, core, x: (rand() - 0.5) * 9, z: -1 - rand() * 5, t0: 1.2 + rand() * 3, sp: 0.5 + rand() * 0.5 });
  }

  return {
    frames: FR,
    update(t) {
      const rise = easeOut(seg(t, 0.2, 1.9));
      taj.position.y = -6 * (1 - rise) - 0.6;
      const out = easeInOut(seg(t, 5.4, 6));
      taj.position.y -= out * 7;
      const ang = THREE.MathUtils.degToRad(-32 + 50 * easeInOut(seg(t, 0, 6)));
      const dist = 21 - 1.5 * easeOut(seg(t, 0, 3));
      camera.position.set(Math.sin(ang) * dist, 3.2 + 0.8 * easeOut(seg(t, 0, 2.5)), Math.cos(ang) * dist);
      camera.lookAt(0, 0.9, 0);
      sky.quaternion.copy(camera.quaternion);
      sky.position.set(0, 0, 0);
      sweep.position.set(Math.cos(t * 1.4) * 2.2, 2.2, Math.sin(t * 1.4) * 2.2 + 1);
      const skyOn = seg(t, 0, 0.8) * (1 - out);
      moonGlow.material.opacity = 0.7 * skyOn; moonDisc.material.opacity = skyOn;
      aura.material.opacity = 0.35 * seg(t, 1.2, 2.2) * (1 - out);
      for (const s of stars) s.s.material.opacity = skyOn * (0.45 + 0.55 * Math.abs(Math.sin(t * 2 + s.ph)));
      for (const f of fw) {
        const k = seg(t, f.t0, f.t0 + 1.3);
        const on = t > f.t0 && k < 1;
        f.flash.material.opacity = on ? Math.max(0, 0.9 - k * 2.5) : 0;
        for (const p of f.parts) {
          p.s.position.copy(f.c).addScaledVector(p.v, easeOut(k)); p.s.position.y -= k * k * 1.2;
          p.s.material.opacity = on ? (1 - k) : 0;
        }
      }
      for (const l of lanterns) {
        const k = t - l.t0;
        const y = -1 + k * l.sp;
        const o = k > 0 ? Math.min(1, k) * (1 - out) * 0.9 : 0;
        l.s.position.set(l.x + Math.sin(k + l.x) * 0.3, y, l.z); l.core.position.copy(l.s.position);
        l.s.material.opacity = o; l.core.material.opacity = o;
      }
    },
  };
}
