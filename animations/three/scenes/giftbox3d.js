// Gift Box: wrapped box shakes, the lid pops off, light and surprises burst out.
import { THREE, lights, heroMotion, halo, rays, twinkles, burst, confetti, dust, seg, easeOut, backOut, canvasTexture, coinMesh, rng } from '../fx.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeBow } from '../objects.js';
import { mats, sprite, glowTex, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 2.6, 11); camera.lookAt(0, 0.1, 0);
  const sweep = lights(scene, { key: 2.4 });
  const h = halo(scene, 0xb06bff, 9, -3, 0.5);
  const r = rays(scene, 0xffe28a, 12, -3.5, 0.5);
  const rand = rng(14);
  const paper = canvasTexture(512, 512, (g, w, hh) => {
    const gr = g.createLinearGradient(0, 0, w, hh); gr.addColorStop(0, '#6a1bd6'); gr.addColorStop(1, '#3b0a8f');
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    for (let i = 0; i < 70; i++) {
      const x = rand() * w, y = rand() * hh, s = 6 + rand() * 12;
      g.fillStyle = i % 3 ? '#ffd166' : '#ffffff';
      g.beginPath();
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2, rr = k % 2 ? s * 0.45 : s; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.fill();
    }
  });
  const paperM = new THREE.MeshPhysicalMaterial({ map: paper, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2, sheen: 0.3 });
  const ribM = new THREE.MeshPhysicalMaterial({ color: 0xffc53d, metalness: 0.8, roughness: 0.25, sheen: 0.6, clearcoat: 0.5 });
  const hero = new THREE.Group(); scene.add(hero);
  const box = new THREE.Mesh(new RoundedBoxGeometry(2, 1.6, 2, 6, 0.08), paperM); box.position.y = -0.2; hero.add(box);
  for (const [w, d] of [[0.3, 2.04], [2.04, 0.3]]) { const rb = new THREE.Mesh(new THREE.BoxGeometry(w, 1.62, d), ribM); rb.position.y = -0.2; hero.add(rb); }
  const lidG = new THREE.Group(); lidG.position.y = 0.62; hero.add(lidG);
  const lid = new THREE.Mesh(new RoundedBoxGeometry(2.18, 0.42, 2.18, 6, 0.08), paperM); lidG.add(lid);
  for (const [w, d] of [[0.3, 2.22], [2.22, 0.3]]) { const rb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.44, d), ribM); lidG.add(rb); }
  const bow = makeBow(0xffc53d, 1.4); bow.position.set(0, 0.42, 0); bow.rotation.x = -0.25; lidG.add(bow);
  const beam = sprite(glowTex, 0xfff3c4, 3, 0); beam.position.set(0, 1.0, 0); scene.add(beam);
  const beam2 = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 0.8, 4, 48, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff3c4, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam2.position.y = 2.4; scene.add(beam2);
  const gold = mats.gold();
  const gemC = [0xe0115f, 0x1e5bff, 0x00a86b, 0xffb000];
  const b1 = burst(scene, new THREE.Vector3(0, 0.8, 0), 2.1, 22, { make: (i) => (i % 2 ? coinMesh(gold) : new THREE.Mesh(cutGem(0.184), mats.gem(gemC[i % 4]))), speed: [2.5, 4.5], dur: 1.4, seed: 3 });
  const b2 = burst(scene, new THREE.Vector3(0, 0.8, 0), 2.1, 30, { colors: [0xffe28a, 0xffffff, 0xd4a5ff], speed: [3, 6], dur: 1.0, size: 0.6 });
  const c = confetti(scene, 70, { t0: 2.1, t1: 3.9 });
  const tw = twinkles(scene, 10, (i, v) => v.set(Math.cos(i * 2) * 1.4, Math.sin(i * 1.3) * 0.8, 1.6), { start: 1.0 });
  const d = dust(scene, 24, { colors: [0xffffff, 0xd4a5ff] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'drop', spin: 0.25, tiltX: 0.0, idleSpin: 0.3, baseY: -0.6 });
      const shake = seg(t, 1.0, 2.0) * (t < 2.0 ? 1 : 0);
      hero.rotation.z = 0.08 * Math.sin(t * 40) * shake;
      hero.position.x = 0.05 * Math.sin(t * 33) * shake;
      const pop = easeOut(seg(t, 2.0, 2.7));
      lidG.position.y = 0.62 + pop * 3.2 - seg(t, 2.7, 3.4) * 0.6;
      lidG.rotation.set(pop * 0.9, pop * 1.4, pop * 0.4);
      const lightOn = seg(t, 2.0, 2.3) * (1 - seg(t, 4.0, 4.6));
      beam.material.opacity = lightOn * 0.9; beam.scale.setScalar(3 + lightOn * 2);
      beam2.material.opacity = lightOn * 0.25;
      h(t, on, 0.5); r(t, on * seg(t, 2, 2.4), 0.5); b1(t); b2(t); c(t); tw(t, on); d(t, on);
    },
  };
}
