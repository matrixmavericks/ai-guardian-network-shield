import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

// The floating island, a Higgsfield image-to-3D model (Tripo H3.1), lit and
// staged above a sea of clouds. Drag to turn it; the landmarks carry hotspots
// whose screen positions are handed back every frame.

export type HotspotPos = { id: string; at: [number, number, number] };
export type ScreenSpot = { x: number; y: number; visible: boolean };
export type IslandHandle = {
  setActive: (on: boolean) => void;
  setEntry: (p: number) => void;
  focus: (id: string | null) => void;
  dispose: () => void;
  /** Debug: turn to a fixed angle */
  setAngle: (a: number) => void;
  /** Debug: model-space point under the cursor */
  pick: (x: number, y: number) => [number, number, number] | null;
};

const softTexture = (inner: string, outer: string, size = 128) => {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  x.fillStyle = g;
  x.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

/** A soft, lumpy cloud drawn from overlapping puffs. */
const cloudTexture = (seed: number) => {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const x = c.getContext("2d")!;
  let s = seed;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14; i++) {
    const cx = 40 + r() * 176, cy = 64 + (r() - 0.5) * 30, rad = 18 + r() * 34;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, "rgba(220,232,255,0.55)");
    g.addColorStop(1, "rgba(220,232,255,0)");
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rad, 0, Math.PI * 2);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const createIsland = async (
  canvas: HTMLCanvasElement,
  url: string,
  spots: HotspotPos[],
  onFrame: (screen: Record<string, ScreenSpot>, angle: number) => void,
  opts: { reduced: boolean; angle?: number },
): Promise<IslandHandle> => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = env;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0.9, 8.2);
  camera.lookAt(0, 0.05, 0);

  scene.add(new THREE.HemisphereLight(0xbfdcff, 0x0a1430, 0.9));
  const key = new THREE.DirectionalLight(0xfff1dc, 2.4);
  key.position.set(-4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3fe9ff, 2.2);
  rim.position.set(5, 2, -6);
  scene.add(rim);
  const under = new THREE.PointLight(0x3fe9ff, 6, 4, 2);
  under.position.set(0, -1.1, 0.4);
  scene.add(under);

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const model = gltf.scene;
  // Centre it and make it 2.2 units tall
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const scale = 2.2 / size.y;
  model.position.sub(centre).multiplyScalar(scale);
  model.scale.setScalar(scale);
  model.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
    if (m && "envMapIntensity" in m) {
      m.envMapIntensity = 1;
      // The textures already carry the colour; keep the surfaces from reading as polished metal
      if (m.metalnessMap) m.metalness = 0.6;
    }
  });

  const pivot = new THREE.Group();
  pivot.add(model);
  const lift = new THREE.Group();
  lift.add(pivot);
  scene.add(lift);

  // A glow under the island and a soft halo behind it
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture("rgba(63,233,255,0.55)", "rgba(63,233,255,0)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.set(3.2, 3.2, 1);
  glow.position.set(0, -1.05, -0.2);
  lift.add(glow);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture("rgba(59,130,246,0.35)", "rgba(59,130,246,0)"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  halo.scale.set(7, 7, 1);
  halo.position.set(0, 0.2, -2.5);
  lift.add(halo);

  // Fireflies and drifting clouds
  const MOTES = 220;
  const mpos = new Float32Array(MOTES * 3), mseed = new Float32Array(MOTES);
  for (let i = 0; i < MOTES; i++) {
    const a = Math.random() * Math.PI * 2, r = 1.1 + Math.random() * 1.8;
    mpos.set([Math.cos(a) * r, -1.4 + Math.random() * 3.2, Math.sin(a) * r], i * 3);
    mseed[i] = Math.random();
  }
  const mgeo = new THREE.BufferGeometry();
  mgeo.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
  mgeo.setAttribute("aSeed", new THREE.BufferAttribute(mseed, 1));
  const moteU = { uTime: { value: 0 }, uSize: { value: 26 * renderer.getPixelRatio() } };
  const motes = new THREE.Points(
    mgeo,
    new THREE.ShaderMaterial({
      uniforms: moteU,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uSize; attribute float aSeed; varying float vA;
        void main(){ vec3 p = position; p.y += sin(uTime*0.6 + aSeed*20.0)*0.12; p.x += cos(uTime*0.4 + aSeed*12.0)*0.08;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = uSize*(0.3+aSeed*0.7)/-mv.z;
        vA = pow(max(0.0, sin(uTime*(0.8+aSeed) + aSeed*40.0)), 3.0); }`,
      fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord-0.5); if (r>0.5) discard;
        gl_FragColor = vec4(0.75,0.95,1.0, smoothstep(0.5,0.0,r)*vA); }`,
    }),
  );
  pivot.add(motes);

  const clouds: { s: THREE.Sprite; speed: number; base: number }[] = [];
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(i * 977 + 13), transparent: true, depthWrite: false, opacity: 0.5 }));
    const front = i % 3 === 0;
    const w = front ? 2.6 + Math.random() * 1.6 : 2 + Math.random() * 2;
    s.scale.set(w, w / 2, 1);
    const base = -1.4 + Math.random() * 0.9;
    s.position.set((Math.random() - 0.5) * 14, base, front ? 1.6 + Math.random() : -1 - Math.random() * 2);
    scene.add(s);
    clouds.push({ s, speed: 0.08 + Math.random() * 0.12, base });
  }

  // Where the island sits: right of the copy on wide screens, lower down on tall ones
  let baseX = 0, baseY = 0, spanX = 5.5;
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.position.z = aspect < 0.9 ? 11.2 : 6.4;
    camera.updateProjectionMatrix();
    const halfH = camera.position.z * Math.tan((camera.fov * Math.PI) / 360), halfW = halfH * aspect;
    baseX = aspect > 1.15 ? halfW * 0.4 : 0;
    baseY = aspect > 1.15 ? -0.05 : -halfH * 0.12;
    spanX = halfW + 2;
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Dragging with inertia
  let angle = opts.angle ?? -0.35, vel = 0, dragging = false, lastX = 0, idle = 0, focusAngle: number | null = null, entry = 0, active = true;
  const down = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    focusAngle = null;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    vel = dx * 0.006;
    angle += vel;
    idle = 0;
  };
  const up = () => (dragging = false);
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);

  const tmp = new THREE.Vector3();
  const camFlat = new THREE.Vector3();
  const screen: Record<string, ScreenSpot> = {};
  let raf = 0, last = performance.now(), t = 0;

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;
    idle += dt;
    if (focusAngle !== null) {
      // Turn the shortest way round to the chosen landmark
      let d = focusAngle - angle;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      angle += d * Math.min(1, dt * 3.5);
      vel = 0;
    } else if (!dragging) {
      vel *= Math.pow(0.04, dt);
      angle += vel;
      if (idle > 2.5 && !opts.reduced) angle += dt * 0.12;
    }
    pivot.rotation.y = angle;
    const bob = opts.reduced ? 0 : Math.sin(t * 0.8) * 0.06;
    lift.position.x = baseX;
    lift.position.y = baseY + bob - (1 - entry) * 1.6;
    lift.rotation.z = opts.reduced ? 0 : Math.sin(t * 0.5) * 0.02;
    glow.material.opacity = 0.7 + Math.sin(t * 1.3) * 0.15;
    moteU.uTime.value = t;
    for (const c of clouds) {
      c.s.position.x += c.speed * dt * (opts.reduced ? 0 : 1);
      if (c.s.position.x > spanX) c.s.position.x = -spanX;
      c.s.position.y = c.base + Math.sin(t * 0.3 + c.speed * 40) * 0.05 - (1 - entry) * 0.6;
    }
    renderer.render(scene, camera);

    // Where each hotspot is on screen, and whether it faces us
    const w = canvas.clientWidth, h = canvas.clientHeight;
    camFlat.set(camera.position.x, 0, camera.position.z).normalize();
    for (const s of spots) {
      tmp.set(...s.at);
      pivot.localToWorld(tmp);
      const flat = new THREE.Vector3(tmp.x - lift.position.x, 0, tmp.z);
      const facing = flat.length() < 0.25 || flat.normalize().dot(camFlat) > -0.05;
      tmp.project(camera);
      screen[s.id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, visible: facing && entry > 0.6 };
    }
    onFrame(screen, angle);
  };
  raf = requestAnimationFrame(frame);

  const raycaster = new THREE.Raycaster();
  return {
    setActive: (on) => {
      active = on;
      last = performance.now();
    },
    setEntry: (p) => (entry = Math.max(0, Math.min(1, p))),
    setAngle: (a) => {
      angle = a;
      vel = 0;
      focusAngle = null;
    },
    focus: (id) => {
      if (!id) return (focusAngle = null);
      const s = spots.find((x) => x.id === id);
      if (!s) return;
      // Angle that brings the landmark round to face the camera
      focusAngle = -Math.atan2(s.at[0], s.at[2]);
      idle = 0;
    },
    pick: (x, y) => {
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const hit = raycaster.intersectObject(model, true)[0];
      if (!hit) return null;
      const p = pivot.worldToLocal(hit.point.clone());
      return [+p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3)];
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
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
