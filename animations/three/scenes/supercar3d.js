// Supercar: candy-red hypercar with gloss clearcoat paint drives in, spins on a turntable of light, then speeds away.
import { THREE, lights, halo, rays, twinkles, dust, seg, easeOut, easeIn, easeInOut, rng } from '../fx.js';
import { mats, sprite, glowTex } from '../common.js';

export default function build({ scene, camera }) {
  const T = 5;
  camera.position.set(0, 2.6, 15); camera.lookAt(0, -0.2, 0);
  const sweep = lights(scene, { key: 2.8, sweep: 100 });
  const h = halo(scene, 0xff2d55, 10, -3, -0.2);
  const r = rays(scene, 0xffd6e0, 12, -3.5, -0.2);
  const rand = rng(91);
  const paint = new THREE.MeshPhysicalMaterial({ color: 0xc8001a, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x0b0b0d, roughness: 0.35, clearcoat: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x10141c, metalness: 0.3, roughness: 0.02, clearcoat: 1, envMapIntensity: 2 });
  const car = new THREE.Group();
  const side = new THREE.Shape();
  side.moveTo(-2.3, -0.15); side.lineTo(-2.35, 0.25); side.quadraticCurveTo(-2.2, 0.5, -1.6, 0.55);
  side.quadraticCurveTo(-0.9, 0.62, -0.55, 0.95); side.quadraticCurveTo(0.1, 1.12, 0.65, 0.9);
  side.quadraticCurveTo(1.3, 0.62, 2.1, 0.42); side.quadraticCurveTo(2.45, 0.32, 2.45, 0.05); side.lineTo(2.35, -0.15); side.closePath();
  const bodyGeo = new THREE.ExtrudeGeometry(side, { depth: 1.6, bevelEnabled: true, bevelThickness: 0.28, bevelSize: 0.22, bevelSegments: 10, curveSegments: 48 });
  bodyGeo.translate(0, 0, -0.8);
  const bp = bodyGeo.attributes.position;
  for (let i = 0; i < bp.count; i++) { const y = bp.getY(i), z = bp.getZ(i); const pinch = 1 - Math.max(0, y - 0.45) * 0.42; bp.setZ(i, z * pinch); }
  bodyGeo.computeVertexNormals();
  car.add(new THREE.Mesh(bodyGeo, paint));
  const win = new THREE.Shape();
  win.moveTo(-0.95, 0.66); win.quadraticCurveTo(-0.55, 0.98, 0.1, 1.07); win.quadraticCurveTo(0.6, 0.98, 0.95, 0.7); win.closePath();
  const winGeo = new THREE.ExtrudeGeometry(win, { depth: 1.15, bevelEnabled: true, bevelThickness: 0.12, bevelSize: 0.06, bevelSegments: 6 }); winGeo.translate(0, 0.01, -0.575);
  car.add(new THREE.Mesh(winGeo, glass));
  // intakes, lights, spoiler
  for (const s of [-1, 1]) {
    const intake = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 0.05), black); intake.position.set(0.55, 0.2, s * 1.02); intake.rotation.y = 0; car.add(intake);
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xeaf6ff })); hl.position.set(2.42, 0.32, s * 0.62); hl.rotation.y = s * 0.35; car.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.6), new THREE.MeshBasicMaterial({ color: 0xff1030 })); tl.position.set(-2.52, 0.4, s * 0.45); car.add(tl);
    const glowF = sprite(glowTex, 0xdff2ff, 0.9, 0.9); glowF.position.set(2.55, 0.32, s * 0.62); car.add(glowF);
    const glowR = sprite(glowTex, 0xff1030, 0.7, 0.8); glowR.position.set(-2.6, 0.4, s * 0.45); car.add(glowR);
  }
  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 2.0), black); spoiler.position.set(-2.15, 0.85, 0); car.add(spoiler);
  for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.3, 0.05), black); st.position.set(-2.1, 0.68, s * 0.6); car.add(st); }
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 2.0), black); splitter.position.set(2.35, -0.3, 0); car.add(splitter);
  // wheels
  const wheels = [];
  const rimM = mats.platinum();
  for (const [x, z] of [[1.45, 1.05], [1.45, -1.05], [-1.5, 1.05], [-1.5, -1.05]]) {
    const w = new THREE.Group(); w.position.set(x, -0.18, z);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.16, 24, 64), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.8 })); w.add(tire);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 48), new THREE.MeshPhysicalMaterial({ color: 0x222226, metalness: 0.8, roughness: 0.3 })); disc.rotation.x = Math.PI / 2; w.add(disc);
    for (let k = 0; k < 10; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.04), rimM); sp.position.z = Math.sign(z) * 0.06; sp.rotation.z = (k / 10) * Math.PI * 2; sp.position.x = Math.sin(sp.rotation.z) * -0.15; sp.position.y = Math.cos(sp.rotation.z) * 0.15; w.add(sp); }
    const cal = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.06), new THREE.MeshPhysicalMaterial({ color: 0xffc53d, roughness: 0.3 })); cal.position.set(0.22, 0.1, Math.sign(z) * 0.02); w.add(cal);
    car.add(w); wheels.push(w);
  }
  const rig = new THREE.Group(); rig.add(car); rig.scale.setScalar(0.62); scene.add(rig);
  const floorGlow = sprite(glowTex, 0xff2d55, 6, 0); floorGlow.position.set(0, -0.9, 0); floorGlow.scale.set(7, 1.6, 1); rig.add(floorGlow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.75, 96), new THREE.MeshBasicMaterial({ color: 0xffd6e0, transparent: true, opacity: 0, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = -0.62; rig.add(ring);
  const streaks = Array.from({ length: 18 }, () => { const s = new THREE.Mesh(new THREE.PlaneGeometry(1.5 + rand() * 2, 0.04), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })); s.position.set(0, -1 + rand() * 2.5, -1 - rand() * 2); scene.add(s); return { s, sp: 10 + rand() * 8, off: rand() * 10 }; });
  const tw = twinkles(scene, 14, (i, v) => v.set(-1.5 + (i % 5) * 0.8, 0.2 + Math.floor(i / 5) * 0.3, 1.4), { start: 1.4 });
  const d = dust(scene, 26);
  return {
    frames: Math.round(T * 30),
    update(t) {
      sweep(t);
      const inn = easeOut(seg(t, 0, 1.2)), out = easeIn(seg(t, 4.0, 5));
      rig.position.x = -9 * (1 - inn) + out * 11;
      rig.position.y = -0.3;
      const spin = easeInOut(seg(t, 1.2, 3.8));
      rig.rotation.y = -0.55 + spin * Math.PI * 2 * 0.75 + 0.08 * Math.sin(t);
      rig.rotation.x = 0.08;
      car.position.y = -0.03 * Math.sin(t * 12) * (1 - spin) * 0.5;
      const speed = (1 - inn) + out;
      wheels.forEach((w) => { w.rotation.z = -t * (6 + speed * 30); });
      const on = seg(t, 0.8, 1.3) * (1 - seg(t, 4.0, 4.5));
      floorGlow.material.opacity = 0.55 * on;
      ring.material.opacity = 0.5 * on; ring.scale.setScalar(1 + 0.05 * Math.sin(t * 4));
      for (const st of streaks) { const moving = speed > 0.05; st.s.position.x = 6 - ((t * st.sp + st.off) % 12); st.s.material.opacity = moving ? 0.6 * Math.min(1, speed * 2) : 0; }
      h(t, on, 0.45); r(t, on, 0.35); tw(t, on); d(t, on);
    },
  };
}
