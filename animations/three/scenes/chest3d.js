// Treasure Chest: wooden chest with gold bands opens; coins and gems glow and burst out.
import { THREE, lights, heroMotion, halo, rays, twinkles, burst, dust, seg, easeOut, canvasTexture, coinMesh, rng } from '../fx.js';
import { mats, sprite, glowTex, cutGem } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 2.6, 11); camera.lookAt(0, 0.2, 0);
  const sweep = lights(scene, { warm: 0xffe7c4, key: 2.4 });
  const h = halo(scene, 0xffb300, 9, -3, 0.6);
  const r = rays(scene, 0xffe066, 12, -3.5, 0.8);
  const rand = rng(21);
  const wood = canvasTexture(512, 512, (g, w, hh) => {
    for (let y = 0; y < hh; y += 64) {
      const gr = g.createLinearGradient(0, y, 0, y + 64); gr.addColorStop(0, '#7a4a24'); gr.addColorStop(0.5, '#5a3216'); gr.addColorStop(1, '#3e220e');
      g.fillStyle = gr; g.fillRect(0, y, w, 64);
      g.strokeStyle = 'rgba(30,15,5,0.5)'; g.lineWidth = 2;
      for (let k = 0; k < 6; k++) { g.beginPath(); g.moveTo(0, y + 8 + k * 9 + rand() * 4); g.bezierCurveTo(w / 3, y + rand() * 64, w * 2 / 3, y + rand() * 64, w, y + 8 + k * 9); g.stroke(); }
      g.fillStyle = '#1e1007'; g.fillRect(0, y + 62, w, 3);
    }
  });
  const woodM = new THREE.MeshPhysicalMaterial({ map: wood, roughness: 0.6, clearcoat: 0.3 });
  const gold = mats.gold();
  const hero = new THREE.Group(); scene.add(hero);
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 1.6), woodM); body.position.y = -0.35; hero.add(body);
  for (const x of [-1.05, 0, 1.05]) { const bnd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.34, 1.64), gold); bnd.position.set(x, -0.35, 0); hero.add(bnd); }
  const rimB = new THREE.Mesh(new THREE.BoxGeometry(2.66, 0.1, 1.66), gold); rimB.position.y = 0.28; hero.add(rimB);
  for (const [x, z] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.36, 0.16), gold); c.position.set(x, -0.35, z); hero.add(c); }
  const lock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.45, 0.1), gold); lock.position.set(0, 0.0, 0.85); hero.add(lock);
  const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.06, 24), new THREE.MeshBasicMaterial({ color: 0x110800 })); keyhole.position.set(0, 0.02, 0.905); hero.add(keyhole);
  // coin pile inside
  const pile = new THREE.Group(); hero.add(pile);
  for (let i = 0; i < 70; i++) {
    const c = coinMesh(gold); c.scale.setScalar(0.8);
    c.position.set((rand() - 0.5) * 2.3, 0.2 + rand() * 0.35 * (1 - Math.abs(rand() - 0.5)), (rand() - 0.5) * 1.3);
    c.rotation.set(rand() * 0.8, rand() * 6, rand() * 0.8); pile.add(c);
  }
  const gemC = [0xe0115f, 0x1e5bff, 0x00a86b, 0x8a2be2];
  for (let i = 0; i < 12; i++) { const g = new THREE.Mesh(cutGem(0.161), mats.gem(gemC[i % 4])); g.position.set((rand() - 0.5) * 2, 0.5 + rand() * 0.15, (rand() - 0.5) * 1.1); g.rotation.set(rand(), rand(), rand()); pile.add(g); }
  const glowIn = sprite(glowTex, 0xffd36b, 3.5, 0); glowIn.position.set(0, 0.8, 0.2); hero.add(glowIn);
  // lid: half-cylinder hinged at the back
  const hinge = new THREE.Group(); hinge.position.set(0, 0.33, -0.8); hero.add(hinge);
  const lidGeo = new THREE.CylinderGeometry(0.8, 0.8, 2.6, 48, 1, false, 0, Math.PI); lidGeo.rotateZ(Math.PI / 2); lidGeo.rotateX(-Math.PI / 2);
  const lid = new THREE.Mesh(lidGeo, woodM); lid.position.z = 0.8; lid.scale.y = 0.75; hinge.add(lid);
  for (const x of [-1.05, 0, 1.05]) { const bnd = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 0.16, 48, 1, true, 0, Math.PI), Object.assign(gold.clone(), { side: THREE.DoubleSide })); bnd.rotation.set(0, 0, Math.PI / 2); bnd.geometry.rotateX(-Math.PI / 2); bnd.position.set(x, 0, 0.8); bnd.scale.set(1, 0.76, 1); hinge.add(bnd); }
  const b1 = burst(scene, new THREE.Vector3(0, 0.9, 0), 2.0, 26, { make: (i) => (i % 3 ? coinMesh(gold) : new THREE.Mesh(cutGem(0.172), mats.gem(gemC[i % 4]))), speed: [2.5, 4.6], dur: 1.4, seed: 5 });
  const b2 = burst(scene, new THREE.Vector3(0, 0.9, 0), 2.0, 26, { colors: [0xffe28a, 0xffffff], speed: [3, 6], dur: 1.0, size: 0.55 });
  const tw = twinkles(scene, 18, (i, v) => { pile.children[i % pile.children.length].getWorldPosition(v); v.y += 0.15; v.z += 0.3; }, { start: 2.0, size: [0.5, 1.1] });
  const d = dust(scene, 30, { colors: [0xffffff, 0xffe28a] });
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const on = heroMotion(hero, t, T, { enter: 'drop', spin: 0.25, tiltX: 0.0, idleSpin: 0.25, baseY: -0.6 });
      hinge.rotation.x = -1.9 * easeOut(seg(t, 1.4, 2.2));
      glowIn.material.opacity = seg(t, 1.5, 2.1) * on * (0.8 + 0.2 * Math.sin(t * 6));
      h(t, on, 0.5); r(t, on * seg(t, 1.8, 2.3), 0.5); b1(t); b2(t); tw(t, on); d(t, on);
    },
  };
}
