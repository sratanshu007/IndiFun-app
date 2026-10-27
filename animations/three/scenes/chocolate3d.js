// Chocolate Box: heart-shaped box opens to show truffles in gold cups.
import { THREE, lights, heroMotion, halo, rays, twinkles, burst, dust, seg, easeOut, easeInOut, heartShape, heartGeo, lathe, rng } from '../fx.js';
import { makeBow } from '../objects.js';
import { mats } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 3.4, 10.5); camera.lookAt(0, 0, 0);
  const sweep = lights(scene, { key: 2.4 });
  const h = halo(scene, 0xff4d7d, 8, -3, 0.5);
  const r = rays(scene, 0xffd1dc, 11, -3.5, 0.5);
  const rand = rng(9);
  const hero = new THREE.Group(); scene.add(hero);
  const boxM = new THREE.MeshPhysicalMaterial({ color: 0xc8102e, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.5 });
  const shape = heartShape(1.15);
  const base = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.55, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 64 }), boxM);
  base.rotation.x = -Math.PI / 2; base.position.y = -0.55; hero.add(base);
  const innerM = new THREE.MeshStandardMaterial({ color: 0x3a0a0f, roughness: 0.8 });
  const inner = new THREE.Mesh(new THREE.ShapeGeometry(shape, 64), innerM); inner.rotation.x = -Math.PI / 2; inner.scale.set(0.94, 0.94, 1); inner.position.y = 0.005; hero.add(inner);
  // truffles
  const choc = new THREE.MeshPhysicalMaterial({ color: 0x3b1f12, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  const milk = new THREE.MeshPhysicalMaterial({ color: 0x7a4a2a, roughness: 0.4, clearcoat: 0.5 });
  const white = new THREE.MeshPhysicalMaterial({ color: 0xf4e7d3, roughness: 0.45, clearcoat: 0.4 });
  const pink = new THREE.MeshPhysicalMaterial({ color: 0xff8fb1, roughness: 0.3, clearcoat: 0.7 });
  const cupM = mats.gold();
  const cupGeo = lathe([[0.001, 0], [0.22, 0.01], [0.27, 0.18]], 18);
  const spots = [[0, -0.75], [-0.5, -0.25], [0.5, -0.25], [-0.85, 0.35], [0.85, 0.35], [0, 0.05], [-0.45, 0.55], [0.45, 0.55], [-0.3, -0.6], [0.3, -0.6]];
  const truffles = [];
  spots.forEach(([x, z], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z * -1 + 0.05); hero.add(g);
    const cup = new THREE.Mesh(cupGeo, cupM); g.add(cup);
    const kind = i % 4;
    const m = [choc, milk, white, pink][kind];
    const tr = kind === 3 ? new THREE.Mesh(heartGeo(0.17, 0.12, 0.08), m) : new THREE.Mesh(new THREE.SphereGeometry(0.21, 40, 28), m);
    if (kind === 3) { tr.rotation.x = -Math.PI / 2; tr.position.y = 0.2; } else { tr.position.y = 0.22; tr.scale.y = 0.9; }
    g.add(tr);
    if (kind !== 3) {
      const dr = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.018, 8, 40), kind === 2 ? choc : white);
      dr.rotation.x = Math.PI / 2 + 0.3; dr.position.y = 0.33; g.add(dr);
    }
    truffles.push(g);
  });
  // lid on a hinge at the back
  const hinge = new THREE.Group(); hinge.position.set(0, 0.04, -1.1); hero.add(hinge);
  const lid = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.06, bevelSegments: 4, curveSegments: 64 }), boxM);
  lid.rotation.x = -Math.PI / 2; lid.position.set(0, 0, 1.1); lid.scale.set(1.04, 1.04, 1); hinge.add(lid);
  const ribM = new THREE.MeshPhysicalMaterial({ color: 0xffc53d, metalness: 0.7, roughness: 0.25, sheen: 0.5 });
  const rib1 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 2.3), ribM); rib1.position.set(0, 0.25, 1.05); hinge.add(rib1);
  const rib2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.03, 0.2), ribM); rib2.position.set(0, 0.25, 1.35); hinge.add(rib2);
  const bow = makeBow(0xffc53d, 0.8); bow.rotation.x = -Math.PI / 2; bow.position.set(0, 0.32, 1.3); hinge.add(bow);
  const hm = new THREE.MeshPhysicalMaterial({ color: 0xff2d6f, roughness: 0.15, clearcoat: 1 });
  const b = burst(scene, new THREE.Vector3(0, 0.6, 0), 2.0, 22, { make: () => new THREE.Mesh(heartGeo(0.12, 0.05, 0.05), hm), speed: [2, 3.5], dur: 1.3 });
  const tw = twinkles(scene, 14, (i, v) => { truffles[i % truffles.length].getWorldPosition(v); v.y += 0.35; v.z += 0.2; }, { start: 2.0 });
  const d = dust(scene, 24, { colors: [0xffffff, 0xffd1dc] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'drop', spin: 0.5, tiltX: 0.0, idleSpin: 0.3, baseY: -0.3 });
      hinge.rotation.x = -1.95 * easeOut(seg(t, 1.3, 2.1));
      truffles.forEach((g, i) => { g.position.y = 0.04 * Math.max(0, Math.sin(t * 3 + i)) * seg(t, 2, 2.4); });
      h(t, on, 0.5); r(t, on, 0.3); b(t); tw(t, on); d(t, on);
    },
  };
}
