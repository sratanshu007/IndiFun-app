// Rose Bouquet: seven roses in a pink paper wrap with a satin bow and baby's breath.
import { THREE, lights, heroMotion, halo, rays, twinkles, rain, burst, dust, seg, easeOut, petalGeo, lathe, heartGeo } from '../fx.js';
import { makeRose, makeBow } from '../objects.js';

export default function build({ scene, camera }) {
  const T = 4.6;
  camera.position.set(0, 0.6, 13); camera.lookAt(0, 0, 0);
  const sweep = lights(scene, { warm: 0xfff0f3 });
  const h = halo(scene, 0xff4d7d, 8, -2.5, 0.8);
  const r = rays(scene, 0xffc2d1, 11, -3, 0.8);
  const hero = new THREE.Group(); scene.add(hero);
  const roses = [];
  const spots = [[0, 1.75, 0.15], [-0.55, 1.45, 0.25], [0.55, 1.45, 0.25], [-0.3, 1.5, -0.4], [0.32, 1.52, -0.38], [-0.85, 1.05, -0.05], [0.85, 1.05, -0.05]];
  const cols = [0xc0002a, 0xd4103a, 0xb00025, 0xe0204a, 0xc8002e, 0xd9183f, 0xa8001f];
  spots.forEach(([x, y, z], i) => {
    const r0 = makeRose({ color: cols[i], stem: false, size: 0.62, n: 26 });
    r0.group.position.set(x, y, z);
    r0.group.rotation.set(-0.5 + z * 0.4, i, x * -0.5);
    hero.add(r0.group); roses.push(r0);
  });
  const leafM = new THREE.MeshPhysicalMaterial({ color: 0x2f7d32, roughness: 0.5, side: THREE.DoubleSide, sheen: 0.4 });
  for (let i = 0; i < 9; i++) {
    const l = new THREE.Mesh(petalGeo(0.36, 0.85, 0.1, -0.05), leafM);
    const p = new THREE.Group(); p.position.y = 0.9; p.rotation.y = (i / 9) * Math.PI * 2; hero.add(p);
    l.rotation.x = -1.05; l.position.z = 0.55; p.add(l);
  }
  const baby = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, sheen: 1 });
  for (let i = 0; i < 70; i++) {
    const a = i * 2.4, rr = 0.6 + (i % 7) * 0.12;
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), baby);
    s.position.set(Math.cos(a) * rr, 1.0 + (i % 5) * 0.16, Math.sin(a) * rr * 0.6);
    hero.add(s);
  }
  // paper wrap: open cone with folds
  const wrapM = new THREE.MeshPhysicalMaterial({ color: 0xffb3cf, roughness: 0.7, sheen: 1, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide, clearcoat: 0.2 });
  const wrapGeo = lathe([[0.18, -1.6], [0.5, -0.6], [0.95, 0.4], [1.25, 1.25]], 64);
  const p = wrapGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i);
    const a = Math.atan2(z, x), k = 1 + 0.06 * Math.sin(a * 9) * (y + 1.6) / 2.8;
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  wrapGeo.computeVertexNormals();
  const wrap = new THREE.Mesh(wrapGeo, wrapM); hero.add(wrap);
  const wrap2 = new THREE.Mesh(wrapGeo, new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.55 }));
  wrap2.scale.set(1.06, 0.96, 1.06); wrap2.rotation.y = 0.3; hero.add(wrap2);
  const bow = makeBow(0xd61f5a, 0.9); bow.position.set(0, -0.55, 0.62); hero.add(bow);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 12, 64), bow.children[0].material); band.rotation.x = Math.PI / 2; band.position.y = -0.55; band.scale.set(1, 1, 1); hero.add(band);

  const petM = new THREE.MeshPhysicalMaterial({ color: 0xc0002a, roughness: 0.55, sheen: 1, side: THREE.DoubleSide });
  const fall = rain(scene, 26, () => new THREE.Mesh(petalGeo(0.3, 0.36, 0.12, 0.05), petM), { t0: 1.3, t1: 3.9, speed: [1.2, 2], spin: 2.5 });
  const hg = heartGeo(0.16, 0.06, 0.06);
  const hm = new THREE.MeshPhysicalMaterial({ color: 0xff2d6f, roughness: 0.15, clearcoat: 1 });
  const b = burst(scene, new THREE.Vector3(0, 0.8, 0.5), 1.0, 22, { make: () => new THREE.Mesh(hg, hm), speed: [2, 4], dur: 1.2 });
  const tw = twinkles(scene, 14, (i, v) => v.set(Math.cos(i * 2.1) * 1.2, 1.3 + Math.sin(i) * 0.5, 1.5), { colors: [0xffffff, 0xffd6e0] });
  const d = dust(scene, 30, { colors: [0xffffff, 0xffc2d1] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'rise', spin: 0.6, baseY: -0.5, tiltX: 0.12 });
      const bl = 0.3 + 0.7 * easeOut(seg(t, 0.4, 1.8));
      roses.forEach((r0) => r0.setBloom(bl));
      h(t, on, 0.55); r(t, on, 0.35); fall(t); b(t); tw(t, on); d(t, on);
    },
  };
}
