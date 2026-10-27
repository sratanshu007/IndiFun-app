// Reusable effects and motion for 3D gifts, so each scene only has to build its hero object.
import * as THREE from 'three';
import { sprite, glowTex, sparkTex, raysTex, rng, seg, easeOut, easeIn, backOut, easeInOut, clamp } from './common.js';

export { THREE, rng, seg, easeOut, easeIn, backOut, easeInOut, clamp };

export function lights(scene, { warm = 0xfff1d6, cool = 0xcfe3ff, key = 2.4, rim = 1.6, sweep = 60 } = {}) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const k = new THREE.DirectionalLight(warm, key); k.position.set(3, 5, 6); scene.add(k);
  const r = new THREE.DirectionalLight(cool, rim); r.position.set(-5, 3, -4); scene.add(r);
  const s = new THREE.PointLight(0xffffff, sweep, 12); scene.add(s);
  return (t) => s.position.set(Math.cos(t * 1.7) * 4, 1.5 + Math.sin(t * 1.1), 3 + Math.sin(t * 1.7) * 2);
}

// Enter / idle / exit envelope. Returns how "on" the scene is (0..1) for fading effects.
export function heroMotion(obj, t, T, { enter = 'zoom', spin = 1, baseY = 0, baseScale = 1, tiltX = 0.2, idleSpin = 0.4, exitAt = T - 0.6 } = {}) {
  const a = seg(t, 0, 1.1);
  const out = easeInOut(seg(t, exitAt, T));
  let y = baseY, s = baseScale;
  if (enter === 'drop') y += 6 * (1 - easeOut(a));
  if (enter === 'rise') y -= 6 * (1 - easeOut(a));
  if (enter === 'zoom') s *= 0.15 + 0.85 * backOut(a);
  else s *= 0.6 + 0.4 * backOut(seg(t, 0.6, 1.2));
  obj.position.y = y + 0.07 * Math.sin(t * 2.2) * seg(t, 1, 1.4) + out * 0.8;
  obj.scale.setScalar(s * (1 - 0.6 * out));
  obj.rotation.y = -Math.PI * 2 * spin * (1 - easeOut(seg(t, 0, 1.5))) + Math.sin(t * idleSpin * 2) * 0.35;
  obj.rotation.x = tiltX + 0.05 * Math.sin(t * 1.3);
  return clamp(seg(t, 0.4, 1.0) * (1 - out));
}

export function halo(scene, color, size, z = -2.5, y = 0) {
  const h = sprite(glowTex, color, size, 0); h.position.set(0, y, z); scene.add(h);
  return (t, on, k = 0.6) => { h.material.opacity = k * on * (0.85 + 0.15 * Math.sin(t * 4)); h.scale.setScalar(size * (1 + 0.04 * Math.sin(t * 2))); };
}
export function rays(scene, color, size, z = -3, y = 0, speed = 0.25) {
  const r = sprite(raysTex, color, size, 0); r.position.set(0, y, z); scene.add(r);
  return (t, on, k = 0.45) => { r.material.opacity = k * on; r.material.rotation = t * speed; };
}

// Sparkles popping at points given by getPoint(i) (world space).
export function twinkles(scene, n, getPoint, { seed = 1, start = 1.2, end = 4.4, colors = [0xffffff], size = [0.6, 1.3] } = {}) {
  const rand = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = sprite(sparkTex, colors[i % colors.length], 1, 0); scene.add(s);
    list.push({ s, i, t0: start + rand() * (end - start), size: size[0] + rand() * (size[1] - size[0]) });
  }
  const p = new THREE.Vector3();
  return (t, on) => {
    for (const k of list) {
      const u = (t - k.t0) / 0.5;
      const v = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
      getPoint(k.i, p); k.s.position.copy(p);
      k.s.material.opacity = v * on; k.s.material.rotation = u * 1.5; k.s.scale.setScalar(k.size * (0.3 + v));
    }
  };
}

// Radial burst of sprites or meshes.
export function burst(scene, at, t0, n, { seed = 2, colors = [0xffe28a, 0xffffff], speed = [2.5, 5], dur = 0.9, make, size = 0.5 } = {}) {
  const rand = rng(seed);
  const parts = [];
  for (let i = 0; i < n; i++) {
    const o = make ? make(i) : sprite(i % 3 ? glowTex : sparkTex, colors[i % colors.length], size, 0);
    scene.add(o);
    const a = rand() * Math.PI * 2, e = (rand() - 0.5) * 1.4, sp = speed[0] + rand() * (speed[1] - speed[0]);
    parts.push({ o, v: new THREE.Vector3(Math.cos(a) * Math.cos(e), Math.sin(a) * Math.cos(e), Math.sin(e)).multiplyScalar(sp), r: rand() * 6 });
  }
  return (t) => {
    const k = seg(t, t0, t0 + dur);
    for (const p of parts) {
      const on = t > t0 && k < 1;
      p.o.visible = on;
      p.o.position.copy(at).addScaledVector(p.v, easeOut(k)); p.o.position.y -= k * k * 0.8;
      if (p.o.isSprite) { p.o.material.opacity = 1 - k; p.o.material.rotation = k * 3; } else { p.o.scale.setScalar(1 - k * 0.7); p.o.rotation.set(p.r + k * 5, p.r + k * 7, 0); }
    }
  };
}

// Objects falling from the top with spin (coins, petals, notes...).
export function rain(scene, n, make, { seed = 3, t0 = 1.2, t1 = 4.0, xr = 5, z = [-3, 1], speed = [2.5, 4], spin = 6 } = {}) {
  const rand = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const m = make(i); scene.add(m);
    list.push({ m, x: (rand() - 0.5) * xr, z: z[0] + rand() * (z[1] - z[0]), t: t0 + rand() * (t1 - t0), sp: speed[0] + rand() * (speed[1] - speed[0]), r: rand() * 6 });
  }
  return (t) => {
    for (const c of list) {
      const k = t - c.t;
      c.m.visible = k > 0;
      c.m.position.set(c.x + Math.sin(k * 2 + c.r) * 0.3, 6 - k * c.sp - 0.4 * k * k, c.z);
      c.m.rotation.set(c.r + k * spin, c.r, c.r + k * spin * 0.5);
    }
  };
}

// Paper confetti that flutters.
export function confetti(scene, n, { seed = 4, t0 = 1.0, t1 = 3.5, colors = [0xff4d6d, 0xffd166, 0x06d6a0, 0x4cc9f0, 0xc77dff, 0xffffff] } = {}) {
  const geo = new THREE.PlaneGeometry(0.14, 0.07);
  return rain(scene, n, (i) => new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: colors[i % colors.length], side: THREE.DoubleSide, metalness: 0.3, roughness: 0.4 })),
    { seed, t0, t1, xr: 6, speed: [1.5, 2.6], spin: 9 });
}

// Glowing dust rising slowly.
export function dust(scene, n, { seed = 5, colors = [0xffffff, 0xffe9b0], area = 5 } = {}) {
  const rand = rng(seed);
  const list = [];
  for (let i = 0; i < n; i++) {
    const s = sprite(glowTex, colors[i % colors.length], 0.1 + rand() * 0.14, 0); scene.add(s);
    list.push({ s, x: (rand() - 0.5) * area, y: -3.5 + rand() * 3, z: -1.5 + rand() * 2.5, sp: 0.4 + rand() * 0.8, t0: rand() * 1.5 });
  }
  return (t, on) => {
    for (const d of list) {
      const k = t - d.t0;
      d.s.position.set(d.x + Math.sin(k * 1.7 + d.x) * 0.25, d.y + k * d.sp, d.z);
      d.s.material.opacity = k > 0 ? Math.min(1, k) * 0.85 * on : 0;
    }
  };
}

export function coinMesh(gold) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.045, 48), gold);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 48), gold);
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.024;
  g.add(body, rim);
  return g;
}

export function lathe(points, segments = 96) {
  const curve = new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(Math.max(0.0005, x), y)));
  return new THREE.LatheGeometry(curve.getPoints(Math.max(24, points.length * 8)), segments);
}

export function heartShape(size = 1) {
  const s = new THREE.Shape();
  const k = size;
  s.moveTo(0, 0.5 * k);
  s.bezierCurveTo(0, 0.75 * k, -0.3 * k, 1.0 * k, -0.62 * k, 1.0 * k);
  s.bezierCurveTo(-1.1 * k, 1.0 * k, -1.1 * k, 0.4 * k, -1.1 * k, 0.4 * k);
  s.bezierCurveTo(-1.1 * k, 0.05 * k, -0.75 * k, -0.45 * k, 0, -0.9 * k);
  s.bezierCurveTo(0.75 * k, -0.45 * k, 1.1 * k, 0.05 * k, 1.1 * k, 0.4 * k);
  s.bezierCurveTo(1.1 * k, 0.4 * k, 1.1 * k, 1.0 * k, 0.62 * k, 1.0 * k);
  s.bezierCurveTo(0.3 * k, 1.0 * k, 0, 0.75 * k, 0, 0.5 * k);
  return s;
}
export function heartGeo(size, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(heartShape(size), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.9, bevelSegments: 12, curveSegments: 48 });
  g.center();
  return g;
}

// A curved rose petal (cupped plane) - used by rose, bouquet and lotus.
export function petalGeo(w = 0.6, h = 0.8, cup = 0.35, curl = 0.15) {
  const g = new THREE.PlaneGeometry(w, h, 20, 20);
  const p = g.attributes.position;
  const col = [];
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const u = x / (w / 2), v = (y + h / 2) / h;
    // rounded top, narrow base (real petal outline)
    const width = v < 0.62 ? 0.22 + 0.78 * Math.sin((v / 0.62) * Math.PI / 2) : Math.sqrt(Math.max(0, 1 - ((v - 0.62) / 0.4) ** 2));
    p.setX(i, x * width);
    p.setY(i, y + (v > 0.62 ? -0.04 * h * u * u : 0));
    p.setZ(i, cup * u * u * (0.35 + v) * width - curl * v * v * v + 0.02 * Math.sin(u * 5 + v * 7) * v);
    const c = 0.55 + 0.45 * Math.min(1, v * 1.4);
    col.push(c, c, c);
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.translate(0, h / 2, 0);
  return g;
}

// Canvas texture helper for printed details (stripes, labels...).
export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
