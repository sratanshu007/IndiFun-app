// Red Rose that blooms open, with falling petals.
import { THREE, lights, heroMotion, halo, rays, twinkles, rain, dust, seg, easeOut, petalGeo } from '../fx.js';
import { makeRose } from '../objects.js';

export default function build({ scene, camera }) {
  const T = 4.5;
  camera.position.set(0, 0.8, 12); camera.lookAt(0, -0.4, 0);
  const sweep = lights(scene, { warm: 0xfff0e6 });
  const h = halo(scene, 0xff2d55, 7, -2.5, 0.3);
  const h2 = halo(scene, 0xffc2d1, 3.5, -1.5, 0.6);
  const r = rays(scene, 0xffb3c6, 10, -3, 0.4);
  const hero = new THREE.Group(); scene.add(hero);
  const rose = makeRose({ size: 1.35 });
  rose.group.position.y = 0.4;
  rose.head.rotation.x = 0.62;
  hero.add(rose.group);
  const petM = new THREE.MeshPhysicalMaterial({ color: 0xc0002a, roughness: 0.55, sheen: 1, sheenColor: new THREE.Color(0xff6b8a), side: THREE.DoubleSide });
  const pg = petalGeo(0.3, 0.36, 0.12, 0.05);
  const fall = rain(scene, 26, () => new THREE.Mesh(pg, petM), { t0: 1.3, t1: 3.8, speed: [1.2, 2], spin: 2.5 });
  const tw = twinkles(scene, 14, (i, p) => { p.set(Math.cos(i * 2.1) * 1.1, 0.9 + Math.sin(i * 1.3) * 0.7, 1.2); }, { colors: [0xffffff, 0xffd6e0] });
  const d = dust(scene, 30, { colors: [0xffffff, 0xffc2d1] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.5, tiltX: 0.05, idleSpin: 0.35 });
      rose.setBloom(0.15 + 0.85 * easeOut(seg(t, 0.3, 1.9)));
      h(t, on, 0.55); h2(t, on, 0.5); r(t, on, 0.35); fall(t); tw(t, on); d(t, on);
    },
  };
}
