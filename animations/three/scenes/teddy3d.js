// Teddy Bear (plush toy) hugging a heart, waves hello.
import { THREE, lights, heroMotion, halo, rays, twinkles, burst, dust, seg, easeOut, heartGeo, canvasTexture, rng } from '../fx.js';
import { makeBow } from '../objects.js';

export default function build({ scene, camera }) {
  const T = 4.6;
  camera.position.set(0, 0.4, 12); camera.lookAt(0, 0.2, 0);
  const sweep = lights(scene, { warm: 0xfff1e0, key: 2.2 });
  const h = halo(scene, 0xffb36b, 8, -2.5, 0.4);
  const r = rays(scene, 0xffd9a8, 10, -3, 0.4);
  const rand = rng(5);
  const furTex = canvasTexture(512, 512, (g, w, hh) => {
    g.fillStyle = '#808080'; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 26000; i++) {
      const v = 90 + Math.floor(rand() * 120);
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = 1;
      const x = rand() * w, y = rand() * hh, a = rand() * Math.PI * 2, l = 2 + rand() * 4;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
  });
  furTex.wrapS = furTex.wrapT = THREE.RepeatWrapping; furTex.repeat.set(3, 3); furTex.colorSpace = THREE.NoColorSpace;
  const fur = new THREE.MeshPhysicalMaterial({ color: 0xb9814f, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0xffe2bf), sheenRoughness: 0.7, bumpMap: furTex, bumpScale: 2.5, envMapIntensity: 0.6 });
  const light = fur.clone(); light.color = new THREE.Color(0xf0d2ab);
  const black = new THREE.MeshPhysicalMaterial({ color: 0x120a06, roughness: 0.12, clearcoat: 1 });
  const hero = new THREE.Group(); scene.add(hero);
  const S = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); hero.add(o); return o; };
  S(0.95, fur, 0, -0.55, 0, 1, 1.08, 0.9);            // body
  S(0.62, light, 0, -0.45, 0.55, 1, 1.15, 0.5);       // tummy
  const head = new THREE.Group(); head.position.y = 0.95; hero.add(head);
  const H = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); head.add(o); return o; };
  H(0.82, fur, 0, 0, 0, 1.05, 0.95, 0.95);
  for (const s of [-1, 1]) { H(0.3, fur, s * 0.62, 0.55, -0.05, 1, 1, 0.6); H(0.18, light, s * 0.62, 0.55, 0.06, 1, 1, 0.4); }
  H(0.36, light, 0, -0.2, 0.68, 1.2, 0.85, 0.75);
  H(0.12, black, 0, -0.05, 0.98, 1.3, 0.9, 0.8);
  const eyes = [];
  for (const s of [-1, 1]) {
    eyes.push(H(0.1, black, s * 0.3, 0.16, 0.72));
    H(0.03, new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.3 + 0.03, 0.2, 0.81);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 32, Math.PI), black); mouth.position.set(0, -0.3, 0.93); mouth.rotation.z = Math.PI; head.add(mouth);
  const blush = new THREE.MeshBasicMaterial({ color: 0xff8fa3, transparent: true, opacity: 0.45 });
  for (const s of [-1, 1]) H(0.1, blush, s * 0.5, -0.15, 0.68, 1.2, 0.7, 0.3);
  // legs
  for (const s of [-1, 1]) { S(0.36, fur, s * 0.55, -1.35, 0.35, 1, 0.9, 1.15); S(0.2, light, s * 0.55, -1.38, 0.72, 1, 1.1, 0.4); }
  // arms: left waves, right holds the heart
  const armL = new THREE.Group(); armL.position.set(-0.85, -0.1, 0.1); hero.add(armL);
  const aL = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.55, 12, 24), fur); aL.position.y = 0.35; armL.add(aL);
  const armR = new THREE.Group(); armR.position.set(0.8, -0.2, 0.25); armR.rotation.set(-0.9, 0, 0.6); hero.add(armR);
  const aR = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 12, 24), fur); aR.position.y = -0.3; armR.add(aR);
  const bow = makeBow(0xd61f3a, 0.75); bow.position.set(0, 0.27, 0.55); bow.rotation.x = -0.2; hero.add(bow);
  const heart = new THREE.Mesh(heartGeo(0.42, 0.18, 0.18), new THREE.MeshPhysicalMaterial({ color: 0xe0003c, roughness: 0.15, clearcoat: 1, emissive: 0x3a0010 }));
  heart.position.set(0.2, -0.55, 0.95); hero.add(heart);
  const hm = heart.material;
  const b = burst(scene, new THREE.Vector3(0.2, -0.3, 1.2), 2.2, 20, { make: () => new THREE.Mesh(heartGeo(0.12, 0.05, 0.05), hm), speed: [2, 3.6], dur: 1.2 });
  const tw = twinkles(scene, 10, (i, v) => v.set(Math.cos(i * 2) * 1.4, 0.6 + Math.sin(i * 1.7) * 0.9, 1.5));
  const d = dust(scene, 26, { colors: [0xffffff, 0xffe2bf] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.25, tiltX: 0.05, idleSpin: 0.3, baseY: -0.1 });
      armL.rotation.z = -2.3 + 0.45 * Math.sin(t * 9) * seg(t, 1.0, 1.3) * (1 - seg(t, 2.6, 3));
      head.rotation.z = 0.12 * Math.sin(t * 2.2);
      const blink = t % 2.2 > 2.08 ? 0.15 : 1;
      eyes.forEach((e) => { e.scale.y = blink; });
      const beat = 1 + 0.12 * Math.max(0, Math.sin(t * 7));
      heart.scale.setScalar(beat);
      h(t, on, 0.5); r(t, on, 0.3); b(t); tw(t, on); d(t, on);
    },
  };
}
