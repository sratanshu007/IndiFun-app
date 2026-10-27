// Heart Balloons: shiny foil hearts and latex balloons floating up with curly ribbons.
import { THREE, lights, heroMotion, halo, twinkles, confetti, dust, seg, easeOut, easeInOut, heartGeo, rng } from '../fx.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 0, 13); camera.lookAt(0, 0.3, 0);
  const sweep = lights(scene, { key: 2.6 });
  const h = halo(scene, 0xff6fa5, 9, -3, 0.8);
  const rand = rng(77);
  const foil = (c) => new THREE.MeshPhysicalMaterial({ color: c, metalness: 1, roughness: 0.18, clearcoat: 1, envMapIntensity: 1.6 });
  const latex = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, transparent: true, opacity: 0.95 });
  const hearts = heartGeo(0.55, 0.12, 0.32);
  const sphere = new THREE.SphereGeometry(0.55, 64, 48);
  const knot = new THREE.ConeGeometry(0.07, 0.14, 16);
  const items = [];
  const specs = [
    [0, 1.9, 0.4, 'h', foil(0xff2d55)], [-1.05, 1.5, -0.2, 'h', foil(0xffc53d)], [1.05, 1.55, -0.1, 'h', foil(0xff7ab6)],
    [-0.55, 2.7, -0.6, 'b', latex(0xff4d6d)], [0.6, 2.75, -0.5, 'b', latex(0xffffff)], [-1.5, 2.4, -0.9, 'b', latex(0xffb3c6)],
    [1.5, 2.45, -0.9, 'h', foil(0xd4a5ff)], [0.05, 3.15, -1.1, 'b', latex(0xff2d55)], [-0.45, 0.9, 0.6, 'h', foil(0xff9ec4)], [0.55, 0.95, 0.5, 'b', latex(0xffd6e0)],
  ];
  const ribbonM = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
  const cluster = new THREE.Group(); scene.add(cluster);
  for (const [x, y, z, kind, m] of specs) {
    const g = new THREE.Group(); g.position.set(x, y, z);
    const body = new THREE.Mesh(kind === 'h' ? hearts : sphere, m);
    if (kind === 'b') body.scale.set(1, 1.18, 1);
    g.add(body);
    const k = new THREE.Mesh(knot, m); k.position.y = kind === 'h' ? -0.62 : -0.68; k.rotation.x = Math.PI; g.add(k);
    // curly ribbon down to the tie point
    const pts = [];
    const end = new THREE.Vector3(-x, -3.4 - y, -z);
    for (let i = 0; i <= 40; i++) {
      const u = i / 40;
      pts.push(new THREE.Vector3(end.x * u + Math.sin(u * 18) * 0.08 * (1 - u), k.position.y - 0.05 + (end.y - k.position.y) * u, end.z * u + Math.cos(u * 18) * 0.08 * (1 - u)));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.012, 6), ribbonM));
    cluster.add(g);
    items.push({ g, ph: rand() * 6, x, y });
  }
  const weight = new THREE.Mesh(new THREE.SphereGeometry(0.12, 24, 16), foil(0xffc53d)); weight.position.set(0, -1.5, 0); cluster.add(weight);
  const c = confetti(scene, 50, { t0: 1.2, t1: 3.8 });
  const tw = twinkles(scene, 16, (i, v) => { const it = items[i % items.length]; it.g.getWorldPosition(v); v.x += 0.2; v.y += 0.25; v.z += 0.6; }, { colors: [0xffffff] });
  const d = dust(scene, 30);
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const up = easeOut(seg(t, 0, 1.6));
      const out = easeInOut(seg(t, 4.2, 5));
      cluster.position.y = -7 * (1 - up) - 1.2 + out * 9;
      cluster.rotation.y = 0.25 * Math.sin(t * 0.8);
      for (const it of items) {
        it.g.rotation.z = 0.12 * Math.sin(t * 1.6 + it.ph);
        it.g.rotation.y = 0.5 * Math.sin(t * 0.9 + it.ph);
        it.g.position.y = it.y + 0.08 * Math.sin(t * 2 + it.ph);
      }
      const on = seg(t, 0.6, 1.2) * (1 - out);
      h(t, on, 0.5); c(t); tw(t, on); d(t, on);
    },
  };
}
