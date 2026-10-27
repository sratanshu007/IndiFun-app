// Gold Rain: a giant gold coin spins over stacked gold bars while coins pour down.
import { THREE, lights, heroMotion, halo, rays, twinkles, rain, dust, seg, easeOut, canvasTexture, coinMesh } from '../fx.js';
import { mats } from '../common.js';

export default function build({ scene, camera }) {
  const T = 4.8;
  camera.position.set(0, 1.2, 12); camera.lookAt(0, 0.2, 0);
  const sweep = lights(scene, { key: 2.6, sweep: 90 });
  const h = halo(scene, 0xffb300, 10, -3, 0.5);
  const r = rays(scene, 0xffe066, 12, -3.5, 0.5);
  const gold = mats.gold();
  const face = canvasTexture(512, 512, (g, w, hh) => {
    const gr = g.createRadialGradient(w / 2, hh / 2, 20, w / 2, hh / 2, w / 2); gr.addColorStop(0, '#ffe58a'); gr.addColorStop(1, '#c9890d');
    g.fillStyle = gr; g.fillRect(0, 0, w, hh);
    g.strokeStyle = '#8a5a00'; g.lineWidth = 14; g.beginPath(); g.arc(w / 2, hh / 2, w / 2 - 40, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#9a6500'; g.font = 'bold 280px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('₹', w / 2, hh / 2 + 12);
  });
  const faceM = new THREE.MeshPhysicalMaterial({ map: face, metalness: 1, roughness: 0.2, color: 0xffd36b, clearcoat: 0.5 });
  const hero = new THREE.Group(); scene.add(hero);
  const big = new THREE.Group(); big.position.y = 1.1; hero.add(big);
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.18, 96, 1, true), gold); edge.rotation.x = Math.PI / 2; big.add(edge);
  for (const s of [-1, 1]) {
    const f = new THREE.Mesh(new THREE.CircleGeometry(1.15, 96), faceM); f.position.z = s * 0.09; if (s < 0) f.rotation.y = Math.PI; big.add(f);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.06, 16, 96), gold); rim.position.z = s * 0.09; big.add(rim);
  }
  // stacked gold bars
  const barShape = new THREE.Shape(); barShape.moveTo(-0.55, 0); barShape.lineTo(0.55, 0); barShape.lineTo(0.45, 0.28); barShape.lineTo(-0.45, 0.28); barShape.closePath();
  const barGeo = new THREE.ExtrudeGeometry(barShape, { depth: 0.38, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3 }); barGeo.translate(0, 0, -0.19);
  const stack = [[-1.15, 0, 0], [0, 0, 0], [1.15, 0, 0], [-0.58, 0.3, 0], [0.58, 0.3, 0], [0, 0.6, 0], [-0.6, 0, 0.6], [0.6, 0, 0.6]];
  for (const [x, y, z] of stack) { const b = new THREE.Mesh(barGeo, gold); b.position.set(x, y - 1.3, z); hero.add(b); }
  const pour = rain(scene, 60, () => coinMesh(gold), { t0: 0.6, t1: 4.0, speed: [3, 5], spin: 8, xr: 6 });
  const tw = twinkles(scene, 20, (i, v) => v.set(Math.cos(i * 2.4) * 1.3, 0.3 + Math.sin(i * 1.3) * 1.2, 1.5), { start: 0.8, size: [0.6, 1.4] });
  const d = dust(scene, 30, { colors: [0xffffff, 0xffe28a] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'zoom', spin: 0.2, tiltX: 0.08, idleSpin: 0.2, baseY: -0.2 });
      big.rotation.y = t * 3.2;
      big.position.y = 1.1 + 0.12 * Math.sin(t * 2.5);
      h(t, on, 0.55); r(t, on, 0.45); pour(t); tw(t, on); d(t, on);
    },
  };
}
