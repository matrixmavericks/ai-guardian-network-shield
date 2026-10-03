import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// A student's own floating island. Each subject is a building (Higgsfield
// image-to-3D models): the part you've mastered is solid, the rest is still a
// glowing blueprint, with a bright seam where it's being built. Fireflies
// count your streak. Drag to turn it; hover or tap a building to open it.

export type WorldBuilding = { slug: string; model: string; progress: number; accent: string };
export type ScreenLabel = { x: number; y: number; visible: boolean; front: number };
export type WorldHandle = {
  update: (buildings: WorldBuilding[], streak: number) => void;
  setActive: (on: boolean) => void;
  focus: (slug: string | null) => void;
  dispose: () => void;
};

const HOLO_VERT = /* glsl */ `
varying float vLocalY; varying vec3 vN; varying vec3 vView;
void main() {
  vLocalY = position.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const HOLO_FRAG = /* glsl */ `
uniform float uReveal; uniform float uMinY; uniform float uMaxY; uniform float uTime; uniform vec3 uColor; uniform float uHover;
varying float vLocalY; varying vec3 vN; varying vec3 vView;
void main() {
  float h = (vLocalY - uMinY) / (uMaxY - uMinY);
  if (h < uReveal) discard;
  float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vView))), 2.0);
  float scan = 0.5 + 0.5 * sin(h * 140.0 - uTime * 3.0);
  float flicker = 0.88 + 0.12 * sin(uTime * 11.0 + h * 6.0);
  float a = (0.06 + fres * 0.55 + scan * 0.07) * flicker * (1.0 + uHover * 0.6);
  gl_FragColor = vec4(uColor * (0.7 + fres * 0.8), a);
}`;

type Built = {
  slug: string;
  group: THREE.Group;
  solid: THREE.Mesh;
  uniforms: { uReveal: { value: number }; uMinY: { value: number }; uMaxY: { value: number }; uTime: { value: number }; uColor: { value: THREE.Color }; uHover: { value: number }; uEdge: { value: THREE.Color } };
  target: number;
  top: THREE.Vector3;
  angle: number;
  sparkle: THREE.Points;
};

const softTex = (rgb: string) => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, `rgba(${rgb},1)`);
  g.addColorStop(0.3, `rgba(${rgb},0.4)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const createWorld = async (
  canvas: HTMLCanvasElement,
  initial: WorldBuilding[],
  streakDays: number,
  hooks: { onLabels: (labels: Record<string, ScreenLabel>) => void; onHover: (slug: string | null) => void; onOpen: (slug: string) => void },
  opts: { reduced: boolean; small: boolean },
): Promise<WorldHandle> => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(opts.small ? 1.5 : 1.75, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b1630, 0.85));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.3);
  key.position.set(-4, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3fe9ff, 1.8);
  rim.position.set(5, 3, -6);
  scene.add(rim);
  const under = new THREE.PointLight(0x3fe9ff, 5, 4, 2);
  under.position.set(0, -1.2, 0.3);
  scene.add(under);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const firstMesh = (root: THREE.Object3D) => {
    let m: THREE.Mesh | undefined;
    root.updateMatrixWorld(true);
    root.traverse((o) => {
      if (!m && (o as THREE.Mesh).isMesh) m = o as THREE.Mesh;
    });
    return m;
  };

  // The island
  const baseG = await loader.loadAsync("/media/world/base.glb");
  const island = baseG.scene;
  const ib = new THREE.Box3().setFromObject(island);
  const isize = ib.getSize(new THREE.Vector3());
  const iscale = 2.6 / isize.y;
  island.scale.setScalar(iscale);
  island.position.sub(ib.getCenter(new THREE.Vector3()).multiplyScalar(iscale));
  const pivot = new THREE.Group();
  pivot.add(island);
  const lift = new THREE.Group();
  lift.add(pivot);
  scene.add(lift);
  island.updateMatrixWorld(true);

  // Find the plateau: its height at the centre, and how far it reaches
  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const surfaceAt = (x: number, z: number) => {
    ray.set(new THREE.Vector3(x, 5, z), down);
    const hit = ray.intersectObject(island, true)[0];
    return hit ? hit.point.y : null;
  };
  const topY = surfaceAt(0, 0) ?? 0.6;
  // The plateau is the widest part of the island
  const fit = new THREE.Box3().setFromObject(island).getSize(new THREE.Vector3());
  const reach = (Math.min(fit.x, fit.z) / 2) * 0.82;

  // Glow under the island, a halo behind it
  const glowS = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex("63,233,255"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }));
  glowS.scale.set(3, 3, 1);
  glowS.position.set(0, -1.15, 0);
  lift.add(glowS);

  // Fireflies: one cluster per streak day (with a few always there)
  const FF = 140;
  const fpos = new Float32Array(FF * 3), fseed = new Float32Array(FF);
  for (let i = 0; i < FF; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.5 + Math.random() * reach * 1.6;
    fpos.set([Math.cos(a) * r, topY + 0.15 + Math.random() * 1.2, Math.sin(a) * r], i * 3);
    fseed[i] = Math.random();
  }
  const fgeo = new THREE.BufferGeometry();
  fgeo.setAttribute("position", new THREE.BufferAttribute(fpos, 3));
  fgeo.setAttribute("aSeed", new THREE.BufferAttribute(fseed, 1));
  const fireU = { uTime: { value: 0 }, uCount: { value: 0 }, uSize: { value: 30 * renderer.getPixelRatio() } };
  const fireflies = new THREE.Points(
    fgeo,
    new THREE.ShaderMaterial({
      uniforms: fireU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uCount; uniform float uSize; attribute float aSeed; varying float vA;
        void main(){ vec3 p = position; p.y += sin(uTime*0.7 + aSeed*20.0)*0.1; p.x += cos(uTime*0.5 + aSeed*12.0)*0.08;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(0.35+aSeed*0.6)/-mv.z;
        vA = step(aSeed, uCount) * pow(max(0.0, sin(uTime*(0.9+aSeed) + aSeed*40.0)), 3.0); }`,
      fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord-0.5); if (r>0.5) discard; gl_FragColor = vec4(1.0,0.92,0.6, smoothstep(0.5,0.0,r)*vA); }`,
    }),
  );
  pivot.add(fireflies);

  // Buildings
  const sparkTex = softTex("255,220,140");
  const built: Built[] = [];
  const loadBuilding = async (b: WorldBuilding, i: number, n: number) => {
    const g = await loader.loadAsync(b.model);
    const mesh = firstMesh(g.scene);
    if (!mesh) return;
    const geo = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const c = bb.getCenter(new THREE.Vector3());
    geo.translate(-c.x, -bb.min.y, -c.z);
    geo.computeBoundingBox();
    const height = geo.boundingBox!.max.y;
    const uniforms = {
      uReveal: { value: 0.05 },
      uMinY: { value: 0 },
      uMaxY: { value: height },
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(b.accent).lerp(new THREE.Color("#3fe9ff"), 0.5) },
      uHover: { value: 0 },
      uEdge: { value: new THREE.Color("#7ff3ff") },
    };
    const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, { uReveal: uniforms.uReveal, uMinY: uniforms.uMinY, uMaxY: uniforms.uMaxY, uEdge: uniforms.uEdge, uHover: uniforms.uHover });
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying float vLocalY;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvLocalY = position.y;");
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nvarying float vLocalY;\nuniform float uReveal; uniform float uMinY; uniform float uMaxY; uniform vec3 uEdge; uniform float uHover;")
        .replace("#include <clipping_planes_fragment>", "#include <clipping_planes_fragment>\nfloat hN = (vLocalY - uMinY) / (uMaxY - uMinY);\nif (hN > uReveal) discard;")
        .replace(
          "#include <emissivemap_fragment>",
          "#include <emissivemap_fragment>\ntotalEmissiveRadiance += uEdge * (1.0 - smoothstep(0.0, 0.035, uReveal - hN)) * step(uReveal, 0.995) * 2.2;\ntotalEmissiveRadiance += vec3(0.12, 0.2, 0.3) * uHover;",
        );
    };
    const solid = new THREE.Mesh(geo, mat);
    const holo = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms, vertexShader: HOLO_VERT, fragmentShader: HOLO_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const group = new THREE.Group();
    group.add(solid, holo);
    const scale = (reach * 0.78) / Math.max(height, 0.001);
    group.scale.setScalar(scale * (n > 5 ? 0.9 : 1.05));
    const angle = (i / n) * Math.PI * 2 + 0.3;
    const r = reach * (n > 4 ? 0.68 : 0.58);
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    group.position.set(x, (surfaceAt(x, z) ?? topY) - 0.01, z);
    group.rotation.y = -angle + Math.PI / 2;
    island.parent!.add(group);
    // Sparkles over a finished building
    const SP = 24;
    const sp = new Float32Array(SP * 3);
    for (let k = 0; k < SP; k++) sp.set([(Math.random() - 0.5) * 0.5, 0.2 + Math.random() * 0.9, (Math.random() - 0.5) * 0.5], k * 3);
    const sgeo = new THREE.BufferGeometry();
    sgeo.setAttribute("position", new THREE.BufferAttribute(sp, 3));
    const sparkle = new THREE.Points(sgeo, new THREE.PointsMaterial({ map: sparkTex, size: 0.09, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
    sparkle.position.copy(group.position);
    island.parent!.add(sparkle);
    const top = new THREE.Vector3(x, group.position.y + height * group.scale.y + 0.12, z);
    built.push({ slug: b.slug, group, solid, uniforms, target: Math.max(0.05, b.progress / 100), top, angle, sparkle });
  };
  await Promise.all(initial.map((b, i) => loadBuilding(b, i, initial.length)));

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const narrow = w / h < 0.9;
    camera.position.set(0, narrow ? 4 : 3.1, narrow ? 8.6 : 5.6);
    camera.lookAt(0, 0.5, 0);
    // Sit right of the copy on wide panels
    const halfW = camera.position.z * Math.tan((camera.fov * Math.PI) / 360) * (w / h);
    lift.position.x = w / h > 1.4 ? halfW * 0.32 : 0;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Pointer: drag to turn, hover and tap buildings
  let angle = -0.4, vel = 0, dragging = false, moved = 0, lastX = 0, idle = 0, hovered: string | null = null, focusAngle: number | null = null;
  const ndc = new THREE.Vector2();
  const pick = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(built.map((b) => b.group), true)[0];
    if (!hit) return null;
    return built.find((b) => b.group === hit.object.parent || b.group === hit.object)?.slug ?? null;
  };
  const downH = (e: PointerEvent) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    focusAngle = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const moveH = (e: PointerEvent) => {
    if (dragging) {
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      moved += Math.abs(dx);
      vel = dx * 0.006;
      angle += vel;
      idle = 0;
      return;
    }
    if (e.pointerType !== "mouse") return;
    const s = pick(e);
    if (s !== hovered) {
      hovered = s;
      canvas.style.cursor = s ? "pointer" : "grab";
      hooks.onHover(s);
    }
  };
  const upH = (e: PointerEvent) => {
    if (dragging && moved < 6) {
      const s = pick(e);
      if (s) hooks.onOpen(s);
    }
    dragging = false;
  };
  canvas.addEventListener("pointerdown", downH);
  canvas.addEventListener("pointermove", moveH);
  canvas.addEventListener("pointerup", upH);
  canvas.addEventListener("pointercancel", () => (dragging = false));

  let active = true, raf = 0, last = performance.now(), t = 0;
  const tmp = new THREE.Vector3(), camFlat = new THREE.Vector3();
  const labels: Record<string, ScreenLabel> = {};
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    idle += dt;
    if (focusAngle !== null) {
      let d = focusAngle - angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      angle += d * Math.min(1, dt * 3);
    } else if (!dragging) {
      vel *= Math.pow(0.05, dt);
      angle += vel;
      if (idle > 3 && !opts.reduced && !hovered) angle += dt * 0.08;
    }
    pivot.rotation.y = angle;
    lift.position.y = (opts.reduced ? 0 : Math.sin(t * 0.7) * 0.05) - 0.32;
    fireU.uTime.value = t;
    glowS.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.1;
    for (const b of built) {
      // Grow towards the real progress (a little build-up animation on load)
      b.uniforms.uReveal.value += (b.target - b.uniforms.uReveal.value) * Math.min(1, dt * 1.2);
      b.uniforms.uTime.value = t;
      b.uniforms.uHover.value += ((hovered === b.slug ? 1 : 0) - b.uniforms.uHover.value) * Math.min(1, dt * 8);
      const done = b.target >= 0.995;
      (b.sparkle.material as THREE.PointsMaterial).opacity = done ? 0.6 + Math.sin(t * 2 + b.angle) * 0.3 : 0;
      b.sparkle.rotation.y = t * 0.4;
    }
    renderer.render(scene, camera);

    const w = canvas.clientWidth, h = canvas.clientHeight;
    camFlat.set(camera.position.x, 0, camera.position.z).normalize();
    for (const b of built) {
      tmp.copy(b.top);
      pivot.localToWorld(tmp);
      const flat = new THREE.Vector3(tmp.x - lift.position.x, 0, tmp.z).normalize();
      const front = flat.dot(camFlat);
      tmp.project(camera);
      labels[b.slug] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, visible: front > -0.35, front };
    }
    hooks.onLabels(labels);
  };
  raf = requestAnimationFrame(frame);

  return {
    update: (buildings, streak) => {
      for (const nb of buildings) {
        const b = built.find((x) => x.slug === nb.slug);
        if (b) b.target = Math.max(0.05, nb.progress / 100);
      }
      fireU.uCount.value = Math.min(1, 0.08 + streak * 0.07);
    },
    setActive: (on) => {
      active = on;
      last = performance.now();
    },
    focus: (slug) => {
      const b = built.find((x) => x.slug === slug);
      // Turn the island so this building faces the camera
      focusAngle = b ? -Math.atan2(Math.cos(b.angle), Math.sin(b.angle)) : null;
      idle = 0;
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", downH);
      canvas.removeEventListener("pointermove", moveH);
      canvas.removeEventListener("pointerup", upH);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => {
          Object.values(mt).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mt.dispose();
        });
      });
      env.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
};
