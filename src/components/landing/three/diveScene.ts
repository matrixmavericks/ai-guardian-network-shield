import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// "Inside a thought", rendered live with bloom. One glowing book (a
// Higgsfield image-to-3D model) opens the story; the camera dives into its
// page, flies down a tunnel of floating books whose neurons fire along the
// links between them, follows a path of light that lights up one step at a
// time, and ends as everything swirls into a galaxy. Scroll progress (0-1)
// drives every act.

export type DiveHandle = { setProgress: (p: number) => void; setActive: (on: boolean) => void; dispose: () => void };

const ss = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const canvasTexture = (size: number, draw: (x: CanvasRenderingContext2D, s: number) => void) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};
const glowTex = (rgb: string, core = 0.25) =>
  canvasTexture(128, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${rgb},1)`);
    g.addColorStop(core, `rgba(${rgb},0.45)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  });
const ringTex = () =>
  canvasTexture(128, (x, s) => {
    const g = x.createRadialGradient(s / 2, s / 2, s * 0.22, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(63,233,255,0)");
    g.addColorStop(0.55, "rgba(160,240,255,1)");
    g.addColorStop(0.7, "rgba(63,233,255,0.5)");
    g.addColorStop(1, "rgba(63,233,255,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
  });
/** Letters and maths symbols, 8 x 8 cells. */
const glyphAtlas = () =>
  canvasTexture(512, (x) => {
    const glyphs = "abcdexyz?!=+-÷×√π∑∫θλΩαβ∞%{}()<>0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ&#@*";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font = "600 40px Georgia, 'Times New Roman', serif";
    x.fillStyle = "#ffffff";
    for (let i = 0; i < 64; i++) x.fillText(glyphs[i % glyphs.length], (i % 8) * 64 + 32, Math.floor(i / 8) * 64 + 34);
  });

const GLYPH_VERT = /* glsl */ `
uniform float uTime; uniform float uSize; uniform float uRise; uniform float uOpacity;
attribute float aGlyph; attribute float aSeed;
varying float vGlyph; varying float vA;
void main() {
  vec3 p = position;
  float h = mod(uTime * (0.12 + aSeed * 0.18) + aSeed * 7.0, 1.0);
  p.y += h * uRise;
  p.x += sin(uTime * 0.7 + aSeed * 30.0) * 0.12 * h;
  p.z += cos(uTime * 0.5 + aSeed * 20.0) * 0.08 * h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.55 + aSeed * 0.6) / -mv.z;
  vGlyph = aGlyph;
  vA = uOpacity * smoothstep(0.0, 0.12, h) * (1.0 - smoothstep(0.6, 1.0, h));
}`;
const GLYPH_FRAG = /* glsl */ `
uniform sampler2D uAtlas; varying float vGlyph; varying float vA;
void main() {
  vec2 cell = vec2(mod(vGlyph, 8.0), floor(vGlyph / 8.0));
  vec2 uv = (cell + gl_PointCoord) / 8.0;
  float a = texture2D(uAtlas, vec2(uv.x, 1.0 - uv.y)).a;
  gl_FragColor = vec4(vec3(0.62, 0.88, 1.0) * 1.15, a * vA);
}`;

const LINK_VERT = /* glsl */ `
attribute float aT; attribute float aSeed; varying float vT; varying float vSeed;
void main() { vT = aT; vSeed = aSeed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const LINK_FRAG = /* glsl */ `
uniform float uTime; uniform float uOpacity; varying float vT; varying float vSeed;
void main() {
  float head = fract(uTime * (0.22 + vSeed * 0.3) + vSeed * 9.0);
  float pulse = exp(-pow((vT - head) * 10.0, 2.0));
  vec3 col = mix(vec3(0.2, 0.45, 0.95), vec3(1.4, 2.0, 2.2), pulse);
  gl_FragColor = vec4(col, (0.22 + pulse) * uOpacity);
}`;

const NODE_VERT = /* glsl */ `
uniform float uSize; uniform float uTime; attribute float aSeed; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float fire = pow(max(0.0, sin(uTime * (0.8 + aSeed) + aSeed * 40.0)), 8.0);
  gl_PointSize = uSize * (0.7 + fire * 1.3) / -mv.z;
  vA = 0.45 + fire * 0.55;
}`;
const NODE_FRAG = /* glsl */ `
uniform sampler2D uMap; uniform float uOpacity; varying float vA;
void main() { vec4 c = texture2D(uMap, gl_PointCoord); gl_FragColor = vec4(c.rgb * 1.5, c.a * vA * uOpacity); }`;

const STAR_VERT = /* glsl */ `
uniform float uSize; uniform float uTime; uniform float uOpacity; attribute vec3 aColor; attribute float aSeed;
varying vec3 vC; varying float vA;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.4 + aSeed) / -mv.z;
  vC = aColor;
  vA = uOpacity * (0.6 + 0.4 * sin(uTime * 1.5 + aSeed * 50.0));
}`;
const STAR_FRAG = /* glsl */ `
varying vec3 vC; varying float vA;
void main() { float r = length(gl_PointCoord - 0.5); if (r > 0.5) discard; gl_FragColor = vec4(vC * 1.4, pow(1.0 - r * 2.0, 1.6) * vA); }`;

const PATH_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const PATH_FRAG = /* glsl */ `
uniform float uTime; uniform float uReveal; uniform float uOpacity; varying vec2 vUv;
void main() {
  float flow = 0.5 + 0.5 * sin(vUv.x * 220.0 - uTime * 4.0);
  float reveal = 1.0 - smoothstep(uReveal, uReveal + 0.05, vUv.x);
  gl_FragColor = vec4(mix(vec3(0.3, 1.2, 1.6), vec3(2.0), flow * 0.35), (0.5 + flow * 0.5) * reveal * uOpacity);
}`;

export const createDive = async (canvas: HTMLCanvasElement, opts: { small: boolean; reduced: boolean }): Promise<DiveHandle> => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(opts.small ? 1.25 : 1.5, window.devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x02040b);
  const fog = new THREE.FogExp2(0x02040b, 0.03);
  scene.fog = fog;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
  scene.add(camera);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.05, 0.55, 0.62);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  scene.add(new THREE.HemisphereLight(0x9ec5ff, 0x050a18, 0.55));
  const key = new THREE.DirectionalLight(0xffe2bd, 1.6);
  key.position.set(-2, 5, 4);
  scene.add(key);
  const camLight = new THREE.PointLight(0x9cc6ff, 2.2, 16, 1.6);
  camera.add(camLight);

  // The book model, normalised to a 1-unit footprint
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync("/media/book.glb");
  gltf.scene.updateMatrixWorld(true);
  let src: THREE.Mesh | undefined;
  gltf.scene.traverse((o) => {
    if (!src && (o as THREE.Mesh).isMesh) src = o as THREE.Mesh;
  });
  if (!src) throw new Error("no mesh");
  const geo = src.geometry.clone().applyMatrix4(src.matrixWorld);
  // Turn it so the pages read left to right with the spine pointing at the viewer
  geo.rotateY(-Math.PI / 2);
  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const centre = bb.getCenter(new THREE.Vector3());
  const span = Math.max(...bb.getSize(new THREE.Vector3()).toArray());
  geo.translate(-centre.x, -centre.y, -centre.z);
  geo.scale(1 / span, 1 / span, 1 / span);
  const bookMat = (src.material as THREE.MeshStandardMaterial).clone();
  bookMat.roughness = 0.8;
  bookMat.metalness = 0;
  bookMat.emissive = new THREE.Color(0x14306a);
  bookMat.emissiveIntensity = 0.55;

  /* ---------- Act 1: the book ---------- */
  const hero = new THREE.Group();
  const heroMat = bookMat.clone();
  heroMat.emissiveIntensity = 0.25;
  const heroBook = new THREE.Mesh(geo, heroMat);
  heroBook.scale.setScalar(2.6);
  hero.add(heroBook);
  const pageGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("90,200,255", 0.18), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.45 }));
  pageGlow.scale.set(3.4, 2, 1);
  pageGlow.position.set(0, 0.42, 0);
  hero.add(pageGlow);
  const heroLight = new THREE.PointLight(0x3fe9ff, 1.4, 5, 1.5);
  heroLight.position.set(0, 0.9, 0.3);
  hero.add(heroLight);
  scene.add(hero);

  const atlas = glyphAtlas();
  const GN = opts.small ? 240 : 460;
  const gpos = new Float32Array(GN * 3), gGlyph = new Float32Array(GN), gSeed = new Float32Array(GN);
  for (let i = 0; i < GN; i++) {
    gpos.set([(Math.random() - 0.5) * 2.4, 0.2, (Math.random() - 0.5) * 1.4], i * 3);
    gGlyph[i] = Math.floor(Math.random() * 64);
    gSeed[i] = Math.random();
  }
  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute("position", new THREE.BufferAttribute(gpos, 3));
  gGeo.setAttribute("aGlyph", new THREE.BufferAttribute(gGlyph, 1));
  gGeo.setAttribute("aSeed", new THREE.BufferAttribute(gSeed, 1));
  const glyphU = { uTime: { value: 0 }, uSize: { value: 64 * renderer.getPixelRatio() }, uRise: { value: 3 }, uOpacity: { value: 1 }, uAtlas: { value: atlas } };
  const glyphs = new THREE.Points(gGeo, new THREE.ShaderMaterial({ uniforms: glyphU, vertexShader: GLYPH_VERT, fragmentShader: GLYPH_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glyphs.frustumCulled = false;
  hero.add(glyphs);

  /* ---------- Acts 2-4: books, links, path, galaxy ---------- */
  const N = opts.small ? 140 : 260;
  const TUNNEL = 100, GAL_Z = -TUNNEL - 40;
  const books = new THREE.InstancedMesh(geo, bookMat, N);
  books.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  books.frustumCulled = false;
  scene.add(books);
  const field: THREE.Vector3[] = [], spiral: THREE.Vector3[] = [], spin: { axis: THREE.Vector3; speed: number; base: THREE.Quaternion; scale: number }[] = [];
  const ARMS = 3;
  const armPoint = (t: number, arm: number, jitter: number) => {
    const ang = t * Math.PI * 3.6 + (arm * Math.PI * 2) / ARMS + jitter;
    const rad = 0.8 + t * 15;
    return new THREE.Vector3(Math.cos(ang) * rad, Math.sin(ang) * rad, 0);
  };
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 2.2 + Math.pow(Math.random(), 0.9) * 8;
    field.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.75, -5 - Math.random() * TUNNEL));
    const t = 0.08 + Math.pow(Math.random(), 0.8) * 0.92;
    spiral.push(armPoint(t, i % ARMS, (Math.random() - 0.5) * 0.35).add(new THREE.Vector3(0, 0, (Math.random() - 0.5) * 0.8)));
    spin.push({
      axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
      speed: 0.12 + Math.random() * 0.3,
      base: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28)),
      scale: 0.6 + Math.random() * 0.7,
    });
  }

  // Neurons on every book, and links to the two nearest
  const nodeTex = glowTex("120,215,255", 0.12);
  const nodePos = new Float32Array(N * 3), nodeSeed = new Float32Array(N).map(() => Math.random());
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(nodePos, 3).setUsage(THREE.DynamicDrawUsage));
  nodeGeo.setAttribute("aSeed", new THREE.BufferAttribute(nodeSeed, 1));
  const nodeU = { uSize: { value: 260 * renderer.getPixelRatio() }, uTime: { value: 0 }, uOpacity: { value: 0 }, uMap: { value: nodeTex } };
  const nodes = new THREE.Points(nodeGeo, new THREE.ShaderMaterial({ uniforms: nodeU, vertexShader: NODE_VERT, fragmentShader: NODE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  nodes.frustumCulled = false;
  scene.add(nodes);

  const pairs: [number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i < N; i++) {
    const near = field
      .map((p, j) => [j, j === i ? Infinity : p.distanceToSquared(field[i])] as [number, number])
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2);
    for (const [j] of near) {
      const k = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(k)) continue;
      seen.add(k);
      pairs.push([i, j]);
    }
  }
  const linkPos = new Float32Array(pairs.length * 6), linkT = new Float32Array(pairs.length * 2), linkSeed = new Float32Array(pairs.length * 2);
  pairs.forEach((_, k) => {
    linkT.set([0, 1], k * 2);
    const s = Math.random();
    linkSeed.set([s, s], k * 2);
  });
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3).setUsage(THREE.DynamicDrawUsage));
  linkGeo.setAttribute("aT", new THREE.BufferAttribute(linkT, 1));
  linkGeo.setAttribute("aSeed", new THREE.BufferAttribute(linkSeed, 1));
  const linkU = { uTime: { value: 0 }, uOpacity: { value: 0 } };
  const links = new THREE.LineSegments(linkGeo, new THREE.ShaderMaterial({ uniforms: linkU, vertexShader: LINK_VERT, fragmentShader: LINK_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  links.frustumCulled = false;
  scene.add(links);

  // Fine dust down the tunnel
  const DN = opts.small ? 500 : 1200;
  const dpos = new Float32Array(DN * 3);
  for (let i = 0; i < DN; i++) {
    const a = Math.random() * 6.28, r = 0.5 + Math.random() * 11;
    dpos.set([Math.cos(a) * r, Math.sin(a) * r * 0.75, -3 - Math.random() * TUNNEL], i * 3);
  }
  const dGeo = new THREE.BufferGeometry();
  dGeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  const dustMat = new THREE.PointsMaterial({ size: 0.05, color: 0xa8d0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(dGeo, dustMat);
  scene.add(dust);

  // The path of light, with rings that light up in turn
  const pathPts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) pathPts.push(new THREE.Vector3(Math.sin(i * 0.8) * 1.2, -0.7 + Math.cos(i * 0.6) * 0.35, -5 - (i / 12) * (TUNNEL - 6)));
  const curve = new THREE.CatmullRomCurve3(pathPts);
  const pathU = { uTime: { value: 0 }, uReveal: { value: 0 }, uOpacity: { value: 0 } };
  const path = new THREE.Mesh(new THREE.TubeGeometry(curve, 700, 0.045, 10, false), new THREE.ShaderMaterial({ uniforms: pathU, vertexShader: PATH_VERT, fragmentShader: PATH_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(path);
  const STEPS = 30;
  const rTex = ringTex();
  const steps: { s: THREE.Sprite; u: number }[] = [];
  for (let i = 0; i < STEPS; i++) {
    const u = (i + 0.6) / STEPS;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: rTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    s.position.copy(curve.getPointAt(u));
    steps.push({ s, u });
    scene.add(s);
  }

  // The galaxy: spiral arms of stars, a bright core, and the books along the arms
  const SN = opts.small ? 1600 : 3200;
  const spos = new Float32Array(SN * 3), scol = new Float32Array(SN * 3), sseed = new Float32Array(SN);
  const cCore = new THREE.Color("#ffffff"), cMid = new THREE.Color("#3fe9ff"), cOut = new THREE.Color("#3b82f6"), cEdge = new THREE.Color("#a78bfa"), cc = new THREE.Color();
  for (let i = 0; i < SN; i++) {
    const t = Math.pow(Math.random(), 1.4);
    const spread = (Math.random() - 0.5) * (0.25 + t * 0.9);
    const pnt = armPoint(t, i % ARMS, spread);
    const scatter = 0.4 + t * 1.6;
    pnt.x += (Math.random() - 0.5) * scatter;
    pnt.y += (Math.random() - 0.5) * scatter;
    pnt.z = (Math.random() - 0.5) * (1.2 - t * 0.8);
    spos.set(pnt.toArray(), i * 3);
    if (t < 0.15) cc.copy(cCore).lerp(cMid, t / 0.15);
    else if (t < 0.55) cc.copy(cMid).lerp(cOut, (t - 0.15) / 0.4);
    else cc.copy(cOut).lerp(cEdge, (t - 0.55) / 0.45);
    scol.set([cc.r, cc.g, cc.b], i * 3);
    sseed[i] = Math.random();
  }
  const sGeo = new THREE.BufferGeometry();
  sGeo.setAttribute("position", new THREE.BufferAttribute(spos, 3));
  sGeo.setAttribute("aColor", new THREE.BufferAttribute(scol, 3));
  sGeo.setAttribute("aSeed", new THREE.BufferAttribute(sseed, 1));
  const starU = { uSize: { value: 90 * renderer.getPixelRatio() }, uTime: { value: 0 }, uOpacity: { value: 0 } };
  const stars = new THREE.Points(sGeo, new THREE.ShaderMaterial({ uniforms: starU, vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  const galaxy = new THREE.Group();
  galaxy.add(stars);
  galaxy.position.set(0, 0, GAL_Z);
  galaxy.quaternion.setFromEuler(new THREE.Euler(-1.05, 0, 0.3));
  scene.add(galaxy);
  const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("235,248,255", 0.1), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  core.scale.set(6, 6, 1);
  galaxy.add(core);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex("59,130,246", 0.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  halo.scale.set(46, 46, 1);
  halo.position.z = -1;
  galaxy.add(halo);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 66 : 48;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Camera rig keyed to progress
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), tmp = new THREE.Vector3();
  const OFF = new THREE.Vector3(0, 1.25, 2.4), LOOK_OFF = new THREE.Vector3(0, 0.2, 0);
  const place = (p: number) => {
    if (p < 0.27) {
      const k = ss(0, 0.2, p), d = ss(0.2, 0.27, p);
      camPos.set(0, lerp(lerp(2.9, 1.9, k), 0.25, d), lerp(lerp(3.6, 2.2, k), 0.15, d));
      look.set(0, lerp(0.05, -0.2, d), lerp(-0.15, -0.5, d));
    } else if (p < 0.8) {
      const u = ss(0.28, 0.8, p) * 0.97;
      camPos.copy(curve.getPointAt(u)).add(OFF);
      look.copy(curve.getPointAt(Math.min(1, u + 0.04))).add(LOOK_OFF);
    } else {
      const k = ss(0.8, 1, p);
      const end = tmp.copy(curve.getPointAt(0.97)).add(OFF);
      camPos.set(lerp(end.x, 0, k), lerp(end.y, 4.5, k), lerp(end.z, GAL_Z + 21, k));
      const endLook = curve.getPointAt(1).add(LOOK_OFF);
      look.set(lerp(endLook.x, 0, k), lerp(endLook.y, -0.5, k), lerp(endLook.z, GAL_Z, k));
    }
  };

  let progress = 0, shown = 0, active = true, raf = 0, last = performance.now(), t = 0;
  const eul = new THREE.Euler(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qs = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const pos: THREE.Vector3[] = field.map((f) => f.clone());

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt * (opts.reduced ? 0.3 : 1);
    shown += (progress - shown) * Math.min(1, dt * 5);
    const p = shown;
    place(p);
    camera.position.copy(camPos);
    camera.lookAt(look);

    // Act 1
    hero.visible = p < 0.275;
    glyphU.uTime.value = t;
    glyphU.uOpacity.value = 1 - ss(0.22, 0.27, p);
    pageGlow.material.opacity = 0.28 + Math.sin(t * 1.3) * 0.06 + ss(0.22, 0.27, p) * 0.7;
    heroBook.rotation.y = Math.sin(t * 0.3) * 0.05;

    // Books: tunnel, then galaxy
    const inside = p > 0.25;
    books.visible = nodes.visible = links.visible = dust.visible = inside;
    const g = ss(0.8, 0.97, p);
    galaxy.rotation.z = 0.3 + t * 0.04;
    galaxy.updateMatrixWorld();
    for (let i = 0; i < N; i++) {
      const sp = spin[i];
      const gi = ss(0, 1, g * 1.3 - (i / N) * 0.3);
      v.copy(spiral[i]).applyMatrix4(galaxy.matrixWorld);
      pos[i].copy(field[i]).lerp(v, gi);
      q.setFromAxisAngle(sp.axis, t * sp.speed).multiply(sp.base);
      qs.setFromEuler(eul.set(-1.1, 0, Math.atan2(spiral[i].y, spiral[i].x) + galaxy.rotation.z));
      q.slerp(qs, gi);
      sc.setScalar(sp.scale * lerp(1, 0.7, gi));
      m4.compose(pos[i], q, sc);
      books.setMatrixAt(i, m4);
      nodePos.set([pos[i].x, pos[i].y, pos[i].z], i * 3);
    }
    books.instanceMatrix.needsUpdate = true;
    nodeGeo.attributes.position.needsUpdate = true;
    pairs.forEach(([a, b], k) => linkPos.set([pos[a].x, pos[a].y, pos[a].z, pos[b].x, pos[b].y, pos[b].z], k * 6));
    linkGeo.attributes.position.needsUpdate = true;
    const tunnelIn = ss(0.27, 0.34, p), tunnelOut = 1 - ss(0.8, 0.88, p);
    linkU.uTime.value = nodeU.uTime.value = t;
    linkU.uOpacity.value = tunnelIn * tunnelOut;
    nodeU.uOpacity.value = tunnelIn * (1 - ss(0.82, 0.9, p) * 0.7);
    dustMat.opacity = 0.7 * tunnelIn * tunnelOut;

    // Path and steps
    const u = ss(0.28, 0.8, p) * 0.97;
    const pathOn = ss(0.44, 0.52, p) * (1 - ss(0.84, 0.92, p));
    pathU.uTime.value = t;
    pathU.uReveal.value = u + 0.05;
    pathU.uOpacity.value = pathOn;
    for (const st of steps) {
      const lit = ss(st.u - 0.025, st.u, u + 0.045);
      st.s.material.opacity = pathOn * (0.12 + lit * 0.88);
      const k = 0.28 + lit * 0.16 + lit * 0.06 * Math.max(0, Math.sin(t * 3 - st.u * 25));
      st.s.scale.set(k, k, 1);
    }

    // Galaxy
    starU.uTime.value = t;
    starU.uOpacity.value = ss(0.82, 0.96, p);
    core.material.opacity = ss(0.84, 0.98, p) * (0.9 + Math.sin(t * 1.1) * 0.1);
    halo.material.opacity = ss(0.84, 0.98, p) * 0.3;
    fog.density = lerp(0.03, 0.006, ss(0.78, 0.9, p));
    bloom.strength = p < 0.27 ? 0.55 + ss(0.22, 0.27, p) * 1.2 : lerp(1.05, 1.25, ss(0.8, 1, p));
    bloom.threshold = p < 0.25 ? 0.82 : 0.62;

    composer.render();
  };
  raf = requestAnimationFrame(frame);

  return {
    setProgress: (p) => (progress = p),
    setActive: (on) => {
      active = on;
      last = performance.now();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => {
          Object.values(mt).forEach((val) => val instanceof THREE.Texture && val.dispose());
          mt.dispose();
        });
      });
      atlas.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
};
