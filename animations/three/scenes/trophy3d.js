// Gold Trophy: champion cup on a black marble base with a star, spotlights and confetti.
import { THREE, lights, heroMotion, halo, rays, twinkles, confetti, dust, seg, easeOut, lathe, canvasTexture } from '../fx.js';
import { mats, sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 0.8, 12.5); camera.lookAt(0, 0.4, 0);
  const sweep = lights(scene, { key: 2.6, sweep: 80 });
  const h = halo(scene, 0xffb300, 9, -3, 0.8);
  const r = rays(scene, 0xffe066, 12, -3.5, 0.8);
  const gold = mats.gold();
  const hero = new THREE.Group(); scene.add(hero);
  const cup = new THREE.Mesh(lathe([[0.001, 1.1], [0.35, 1.12], [0.85, 1.35], [1.05, 1.75], [1.1, 2.35], [1.06, 2.4], [0.95, 2.38], [0.98, 1.8], [0.001, 1.45]], 128), Object.assign(gold.clone(), { side: THREE.DoubleSide }));
  hero.add(cup);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.05, 16, 128), gold); rim.rotation.x = Math.PI / 2; rim.position.y = 2.38; hero.add(rim);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.04, 12, 128), gold); band.rotation.x = Math.PI / 2; band.position.y = 1.72; hero.add(band);
  for (const s of [-1, 1]) {
    const pts = [new THREE.Vector3(s * 1.0, 2.15, 0), new THREE.Vector3(s * 1.65, 2.2, 0), new THREE.Vector3(s * 1.7, 1.7, 0), new THREE.Vector3(s * 1.2, 1.35, 0), new THREE.Vector3(s * 0.75, 1.3, 0)];
    hero.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 64, 0.08, 16), gold));
  }
  const stem = new THREE.Mesh(lathe([[0.32, 0.25], [0.14, 0.45], [0.1, 0.8], [0.22, 0.95], [0.12, 1.05], [0.32, 1.13]], 96), gold); hero.add(stem);
  const foot = new THREE.Mesh(lathe([[0.75, -0.05], [0.72, 0.05], [0.45, 0.15], [0.32, 0.26]], 96), gold); hero.add(foot);
  const marble = canvasTexture(256, 256, (g, w, hh) => { g.fillStyle = '#111'; g.fillRect(0, 0, w, hh); g.strokeStyle = 'rgba(255,255,255,0.15)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.moveTo(Math.random() * w, 0); g.bezierCurveTo(Math.random() * w, hh / 3, Math.random() * w, hh * 2 / 3, Math.random() * w, hh); g.stroke(); } });
  const baseM = new THREE.MeshPhysicalMaterial({ map: marble, roughness: 0.15, clearcoat: 1 });
  const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 1.8), baseM); b1.position.y = -0.3; hero.add(b1);
  const b2 = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 2.2), baseM); b2.position.y = -0.72; hero.add(b2);
  const plaqueTex = canvasTexture(512, 128, (g, w, hh) => { const gr = g.createLinearGradient(0, 0, 0, hh); gr.addColorStop(0, '#ffe58a'); gr.addColorStop(1, '#b8860b'); g.fillStyle = gr; g.fillRect(0, 0, w, hh); g.fillStyle = '#5a3b00'; g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('CHAMPION', w / 2, hh / 2 + 4); });
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.3), new THREE.MeshPhysicalMaterial({ map: plaqueTex, metalness: 0.8, roughness: 0.3 })); plaque.position.set(0, -0.72, 1.105); hero.add(plaque);
  const starShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? 0.17 : 0.4; starShape[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.04, bevelSegments: 4 }), gold);
  star.geometry.center(); star.position.y = 2.95; hero.add(star);
  const sg = sprite(glowTex, 0xfff3c4, 1.6, 0); sg.position.set(0, 2.95, 0.3); hero.add(sg);
  const c = confetti(scene, 70, { t0: 1.0, t1: 3.8, colors: [0xffd166, 0xffffff, 0xffb000, 0xff4d6d, 0x4cc9f0] });
  const tw = twinkles(scene, 16, (i, v) => v.set(Math.cos(i * 2.3) * 1.0, 1.4 + Math.sin(i * 1.7) * 0.8, 1.6), { start: 1.0 });
  const d = dust(scene, 30, { colors: [0xffffff, 0xffe28a] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'rise', spin: 1, tiltX: 0.08, idleSpin: 0.35, baseY: -1.1, baseScale: 0.95 });
      star.rotation.y = t * 2.5;
      sg.material.opacity = on * (0.6 + 0.3 * Math.sin(t * 6));
      h(t, on, 0.55); r(t, on, 0.45); c(t); tw(t, on); d(t, on);
    },
  };
}
