// Shared 3D helpers: renderer, studio lighting, materials, glow/sparkle sprites, easing, seeded random.
import * as THREE from 'three';

// Full HD portrait; ?scale=0.5 renders half size for quick checks.
const SCALE = Number(new URLSearchParams(location.search).get('scale') || 1);
// ultra (default) = HDRI studio + bloom + sharpen; ?q=basic = old fast path
const Q = new URLSearchParams(location.search).get('q') || 'ultra';
export const ULTRA = Q === 'ultra';
export const W = Math.round(1080 * SCALE), H = Math.round(1920 * SCALE), FPS = 30;

export function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const easeOut = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const easeIn = (x) => Math.pow(clamp(x), 3);
export const easeInOut = (x) => { x = clamp(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
export const backOut = (x) => { x = clamp(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
export const seg = (t, a, b) => clamp((t - a) / (b - a)); // 0..1 progress of t inside [a,b]

// ---------- textures drawn on canvas (no image files needed) ----------
function canvasTex(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
export const glowTex = canvasTex(256, (g, s) => {
  const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,0.55)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
});
export const sparkTex = canvasTex(256, (g, s) => {
  const c = s / 2;
  const r = g.createRadialGradient(c, c, 0, c, c, c * 0.35);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r; g.fillRect(0, 0, s, s);
  g.fillStyle = '#fff';
  for (const [w, h] of [[c * 0.06, c * 0.95], [c * 0.95, c * 0.06]]) {
    g.beginPath(); g.ellipse(c, c, w, h, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 0.5;
  for (const [w, h] of [[c * 0.04, c * 0.5], [c * 0.5, c * 0.04]]) {
    g.save(); g.translate(c, c); g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 0, w, h, 0, 0, Math.PI * 2); g.fill(); g.restore();
  }
});
export const raysTex = canvasTex(512, (g, s) => {
  const c = s / 2;
  g.translate(c, c);
  for (let i = 0; i < 28; i++) {
    g.rotate((Math.PI * 2) / 28);
    const gr = g.createLinearGradient(0, 0, 0, -c);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr;
    g.beginPath(); g.moveTo(-c * 0.03, 0); g.lineTo(c * 0.03, 0); g.lineTo(0, -c); g.fill();
  }
});

export function sprite(tex, color, size, opacity = 1) {
  const m = new THREE.SpriteMaterial({ map: tex, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false });
  const s = new THREE.Sprite(m);
  s.scale.setScalar(size);
  return s;
}

// ---------- gems ----------
// Jeweller's light box: black room with many small white panels, so every facet flashes crisply.
let gemEnv = null;
export function setupGemEnv(renderer) {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x030308);
  const r = rng(77);
  for (let i = 0; i < 110; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6 + r() * 1.8, 0.6 + r() * 1.8), new THREE.MeshBasicMaterial({ color: new THREE.Color(r() > 0.8 ? 0xcfe6ff : 0xffffff).multiplyScalar(3 + r() * 7), side: THREE.DoubleSide }));
    const a = r() * Math.PI * 2, e = (r() - 0.3) * 1.8;
    m.position.set(Math.cos(a) * Math.cos(e) * 10, Math.sin(e) * 10, Math.sin(a) * Math.cos(e) * 10); m.lookAt(0, 0, 0); env.add(m);
  }
  gemEnv = new THREE.PMREMGenerator(renderer).fromScene(env, 0.005).texture;
}
// Round brilliant cut (table, two-step crown, girdle, pavilion) with 24 facets; table faces +y.
export function cutGem(r = 0.2) {
  const pts = [[0.001, -0.86], [0.25, -0.62], [0.62, -0.28], [1, -0.02], [1, 0.04], [0.9, 0.14], [0.72, 0.27], [0.56, 0.33], [0.001, 0.33]];
  const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x * r, y * r)), 24).toNonIndexed();
  g.computeVertexNormals();
  return g;
}

// ---------- materials ----------
export const mats = {
  gold: () => new THREE.MeshPhysicalMaterial({ color: 0xf5c04a, metalness: 1, roughness: 0.14, clearcoat: 0.5, clearcoatRoughness: 0.08, envMapIntensity: 1.5 }),
  roseGold: () => new THREE.MeshPhysicalMaterial({ color: 0xf4b3a0, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 }),
  platinum: () => new THREE.MeshPhysicalMaterial({ color: 0xe8edf5, metalness: 1, roughness: 0.12, envMapIntensity: 1.7 }),
  gem: (color) => ULTRA
    ? new THREE.MeshPhysicalMaterial({ color, envMap: gemEnv, metalness: 0.85, roughness: 0, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.6, flatShading: true, emissive: new THREE.Color(color).multiplyScalar(0.22), specularIntensity: 1, iridescence: 0.25 })
    : new THREE.MeshPhysicalMaterial({ color, metalness: 0.1, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 2.5, flatShading: true, emissive: new THREE.Color(color).multiplyScalar(0.35), iridescence: 0.3 }),
  diamond: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0, transmission: 1, thickness: 0.6, ior: 2.42, dispersion: 4, envMapIntensity: 3.5, flatShading: true, specularIntensity: 1 }),
  pearl: () => new THREE.MeshPhysicalMaterial({ color: ULTRA ? 0xe9dccb : 0xfff6ea, roughness: 0.22, metalness: 0, iridescence: 0.7, iridescenceIOR: 1.6, sheen: 0.5, sheenColor: new THREE.Color(0xffd6e8), envMapIntensity: ULTRA ? 0.5 : 1.2 }),
  velvet: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.9, sheen: ULTRA ? 0.35 : 0.6, sheenRoughness: 0.5, sheenColor: ULTRA ? new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35) : new THREE.Color(0xff3060), envMapIntensity: ULTRA ? 0.25 : 0.4 }),
  marble: () => new THREE.MeshPhysicalMaterial({ color: 0xf6f3ee, roughness: 0.32, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.9 }),
  candy: (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.12, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.4, envMapIntensity: 1.3 }),
};

// Photo-studio environment: dark room with bright softboxes, so metal and gems get crisp highlights.
export function studioEnv() {
  const env = new THREE.Scene();
  env.background = new THREE.Color(0x0a0a10);
  const room = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), new THREE.MeshBasicMaterial({ color: 0x8a7a66, side: THREE.BackSide }));
  env.add(room);
  const box = (w, h, x, y, z, color, intensity) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    env.add(m);
  };
  box(14, 5, 0, 12, 4, 0xffffff, 6);      // top strip
  box(6, 14, -12, 2, 4, 0xfff0d8, 4);     // warm left softbox
  box(6, 14, 12, 1, 2, 0xdfe9ff, 4);      // cool right softbox
  box(8, 2, 0, -2, 13, 0xffffff, 3);      // front fill
  box(14, 2, 0, 3, -13, 0xffe2b0, 2.5);   // warm back rim
  box(2, 2, 6, 8, 8, 0xffffff, 10);       // small hot spot for sparkle
  box(2, 2, -7, 7, 9, 0xffffff, 8);
  return env;
}

// Ultra mode (default): a real photographed studio HDRI mixed with the softboxes for true-to-life
// reflections, multisampled HDR rendering, highlight bloom so metal and gems "glint", and a
// final crisp sharpen. ?q=basic keeps the old fast path for quick checks.
const P = new URLSearchParams(location.search); const num = (k, d) => (P.has(k) ? Number(P.get(k)) : d);

async function hdriEnvScene(name) {
  const { EXRLoader } = await import('three/addons/loaders/EXRLoader.js');
  const url = (await import(`/node_modules/@pmndrs/assets/hdri/${name}.exr.js`)).default;
  const tex = await new EXRLoader().loadAsync(url);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  const env = studioEnv();
  env.remove(env.children[0]);          // drop the flat room, the photo replaces it
  env.background = tex;
  env.backgroundIntensity = num('hdriI', 1.6);
  return env;
}

// Unsharp-mask + alpha-safe output: keeps edges and facets razor sharp after bloom.
const SharpenShader = {
  uniforms: { tDiffuse: { value: null }, texel: { value: new THREE.Vector2() }, amount: { value: 0.35 } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform vec2 texel; uniform float amount; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv);
      vec4 b = (texture2D(tDiffuse, vUv + vec2(texel.x,0.)) + texture2D(tDiffuse, vUv - vec2(texel.x,0.)) + texture2D(tDiffuse, vUv + vec2(0.,texel.y)) + texture2D(tDiffuse, vUv - vec2(0.,texel.y))) * 0.25;
      vec3 s = c.rgb + (c.rgb - b.rgb) * amount;
      gl_FragColor = vec4(max(s, 0.0), c.a); }`,
};

// ---------- boot: renderer + studio + frame stepping ----------
export async function boot(build) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, premultipliedAlpha: false });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const camera = new THREE.PerspectiveCamera(32, W / H, 0.1, 200);
  camera.position.set(0, 0, 14);
  setupGemEnv(renderer);
  const ctx = { THREE, scene, camera, renderer, ULTRA };
  const api = await build(ctx);
  if (!scene.environment) scene.environment = pmrem.fromScene(ULTRA ? await hdriEnvScene(api.hdri || 'studio') : studioEnv(), 0.015).texture;
  window.FRAMES = api.frames;
  let draw = () => renderer.render(scene, camera);
  if (ULTRA) {
    const { EffectComposer } = await import('three/addons/postprocessing/EffectComposer.js');
    const { RenderPass } = await import('three/addons/postprocessing/RenderPass.js');
    const { UnrealBloomPass } = await import('three/addons/postprocessing/UnrealBloomPass.js');
    const { OutputPass } = await import('three/addons/postprocessing/OutputPass.js');
    const { ShaderPass } = await import('three/addons/postprocessing/ShaderPass.js');
    const rt = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 });
    const composer = new EffectComposer(renderer, rt);
    const rp = new RenderPass(scene, camera); composer.addPass(rp);
    // keep the clean render so bloom can't fill the transparent background
    const { SavePass } = await import('three/addons/postprocessing/SavePass.js');
    const save = new SavePass(new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType })); composer.addPass(save);
    const b = api.bloom || {};
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), num('bs', b.strength ?? 0.12), num('br', b.radius ?? 0.15), num('bt', b.threshold ?? 2.5)));
    const fix = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, tBase: { value: save.renderTarget.texture } },
      vertexShader: SharpenShader.vertexShader,
      fragmentShader: `uniform sampler2D tDiffuse; uniform sampler2D tBase; varying vec2 vUv;
        void main(){ vec4 c = texture2D(tDiffuse, vUv); vec4 o = texture2D(tBase, vUv);
          vec3 glow = max(c.rgb - o.rgb, 0.0);
          float a = clamp(max(o.a, max(glow.r, max(glow.g, glow.b))), 0.0, 1.0);
          vec3 rgb = o.a > 0.99 ? c.rgb : (o.rgb * o.a + glow) / max(a, 1e-4);
          gl_FragColor = vec4(rgb, a); }`,
    });
    composer.addPass(fix);
    composer.addPass(new OutputPass());
    const sh = new ShaderPass(SharpenShader); sh.uniforms.texel.value.set(1 / W, 1 / H); composer.addPass(sh);
    draw = () => composer.render();
  }
  const iconMode = P.get('icon') === '1';
  window.renderFrame = (f) => {
    api.update(f / FPS, f);
    // icon mode: only the gift itself (no glow, rays, sparkles or particles) for a clean gift-panel icon
    if (iconMode) scene.traverse((o) => { if (o.isSprite || o.isPoints || (o.isMesh && o.material?.isMeshBasicMaterial && o.material.transparent)) o.visible = false; });
    draw();
    return renderer.domElement.toDataURL('image/png');
  };
}
