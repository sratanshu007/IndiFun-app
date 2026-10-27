// Shared 3D object builders used by several gifts.
import * as THREE from 'three';
import { petalGeo, lathe, heartGeo, canvasTexture } from './fx.js';

const petalCache = new Map();
function petal(i, n) {
  const k = `${i}/${n}`;
  if (!petalCache.has(k)) {
    const t = i / n;
    petalCache.set(k, petalGeo(0.36 + 0.55 * t, 0.5 + 0.72 * t, 0.24 + 0.24 * t, 0.06 + 0.2 * t));
  }
  return petalCache.get(k);
}

// Rose with petals that can bloom (setBloom 0..1). Returns { group, setBloom, petals }.
export function makeRose({ color = 0xc0002a, sheen = 0xff6b8a, stem = true, size = 1, n = 30 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.MeshPhysicalMaterial({ color, roughness: 0.5, sheen: 1, sheenColor: new THREE.Color(sheen), sheenRoughness: 0.4,
    side: THREE.DoubleSide, vertexColors: true, emissive: new THREE.Color(color).multiplyScalar(0.06), clearcoat: 0.2, clearcoatRoughness: 0.4 });
  const inner = mat.clone(); inner.color = new THREE.Color(color).multiplyScalar(0.75);
  const petals = [];
  const head = new THREE.Group();
  group.add(head);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const pivot = new THREE.Group();
    pivot.rotation.y = i * 2.39996; // golden angle
    const tilt = new THREE.Group();
    tilt.position.z = 0.02 + 0.13 * t;
    const m = new THREE.Mesh(petal(i, n), t < 0.3 ? inner : mat);
    m.rotation.y = Math.PI;
    tilt.add(m); pivot.add(tilt); head.add(pivot);
    petals.push({ tilt, t });
  }
  const setBloom = (b) => {
    for (const p of petals) {
      const open = 0.05 + (0.1 + 1.05 * Math.pow(p.t, 2.2)) * b;
      p.tilt.rotation.x = open;
      p.tilt.position.y = -0.12 * p.t;
    }
  };
  setBloom(1);
  // sepals and receptacle
  const green = new THREE.MeshPhysicalMaterial({ color: 0x2f7d32, roughness: 0.5, sheen: 0.5, sheenColor: new THREE.Color(0x9be29e), side: THREE.DoubleSide });
  const rec = new THREE.Mesh(new THREE.SphereGeometry(0.16, 24, 16), green); rec.scale.y = 0.8; rec.position.y = -0.18; head.add(rec);
  for (let i = 0; i < 5; i++) {
    const sp = new THREE.Mesh(petalGeo(0.12, 0.42, 0.05, -0.1), green);
    const piv = new THREE.Group(); piv.rotation.y = (i / 5) * Math.PI * 2; head.add(piv);
    sp.position.set(0, -0.2, 0.08); sp.rotation.x = Math.PI * 0.75; piv.add(sp);
  }
  // a few dew drops
  const dropM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, metalness: 0, transmission: 0.0, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 3 });
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (i % 3) * 0.008, 16, 12), dropM);
    const a = i * 1.7;
    d.position.set(Math.cos(a) * (0.35 + (i % 2) * 0.12), 0.1 + (i % 3) * 0.06, Math.sin(a) * (0.35 + (i % 2) * 0.12));
    head.add(d);
  }
  if (stem) {
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, -0.2, 0), new THREE.Vector3(0.05, -1.2, 0.02), new THREE.Vector3(-0.04, -2.4, 0), new THREE.Vector3(0.02, -3.4, 0)]);
    const st = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.045, 12), green); group.add(st);
    for (const [y, side] of [[-1.3, 1], [-2.1, -1]]) {
      const leaf = new THREE.Mesh(petalGeo(0.4, 0.75, 0.1, 0.05), green);
      const piv = new THREE.Group(); piv.position.set(0.03, y, 0); piv.rotation.z = side * -1.0; piv.rotation.y = side > 0 ? 0.4 : 2.6;
      piv.add(leaf); group.add(piv);
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 8), green); thorn.position.set(0.05 * side, y + 0.35, 0); thorn.rotation.z = -side * 1.2; group.add(thorn);
    }
  }
  group.scale.setScalar(size);
  return { group, setBloom, head };
}

export function makeBow(color = 0xd4af37, size = 1) {
  const g = new THREE.Group();
  const m = new THREE.MeshPhysicalMaterial({ color, metalness: 0.6, roughness: 0.25, sheen: 0.6, clearcoat: 0.6 });
  for (const s of [-1, 1]) {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.07, 16, 48), m);
    loop.scale.set(1, 0.55, 0.5); loop.position.x = s * 0.27; loop.rotation.z = s * 0.25; g.add(loop);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.02), m);
    tail.position.set(s * 0.12, -0.3, 0); tail.rotation.z = s * 0.35; g.add(tail);
  }
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), m); knot.scale.set(1, 0.9, 0.7); g.add(knot);
  g.scale.setScalar(size);
  return g;
}

export function makeFlame(scale = 1) {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(lathe([[0, 0], [0.06, 0.05], [0.07, 0.12], [0.04, 0.22], [0.001, 0.32]], 24),
    new THREE.MeshBasicMaterial({ color: 0xffa31a, transparent: true, opacity: 0.9 }));
  const inner = new THREE.Mesh(lathe([[0, 0.01], [0.03, 0.05], [0.035, 0.1], [0.02, 0.16], [0.001, 0.22]], 24),
    new THREE.MeshBasicMaterial({ color: 0xfff6c8 }));
  g.add(outer, inner);
  g.scale.setScalar(scale);
  g.userData.flicker = (t, seed = 0) => {
    const f = 1 + 0.12 * Math.sin(t * 23 + seed) + 0.08 * Math.sin(t * 37 + seed * 2);
    g.scale.set(scale * (2 - f) * 0.9 + scale * 0.1, scale * f, scale * (2 - f) * 0.9 + scale * 0.1);
    g.rotation.z = 0.06 * Math.sin(t * 9 + seed);
  };
  return g;
}

export function textPlate(text, { w = 512, h = 160, bg = '#ffffff', color = '#d6336c', font = 'bold 72px sans-serif' } = {}) {
  return canvasTexture(w, h, (g) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.fillStyle = color; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, h / 2);
  });
}

export { heartGeo };
