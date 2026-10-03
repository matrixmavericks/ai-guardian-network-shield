import * as THREE from "three";

// A teacher's classes as a small galaxy. Each class is a planet (textures
// generated with Higgsfield) sized by class size, with a ring whose lit arc is
// the hand-in rate. Students orbit as moons: green on track, amber worth a
// look, red needs a check-in; brighter when they've handed something in lately.

export type GalaxyMoon = { id: string; name: string; status: "ok" | "watch" | "risk"; activity: number; note: string };
export type GalaxyPlanet = { id: string; name: string; subject: string; handIn: number | null; toMark: number; moons: GalaxyMoon[] };
export type GalaxyHover = { kind: "planet"; planet: GalaxyPlanet } | { kind: "moon"; moon: GalaxyMoon; planet: GalaxyPlanet } | null;
export type GalaxyLabel = { x: number; y: number; r: number };
export type GalaxyHandle = { setActive: (on: boolean) => void; dispose: () => void };

const TEXTURES = ["ocean", "gas", "desert", "jungle", "ice", "storm"];
const ATMOS = ["#3fe9ff", "#c4b5fd", "#fdba74", "#86efac", "#f9a8d4", "#5eead4"];
const STATUS: Record<GalaxyMoon["status"], string> = { ok: "#34d399", watch: "#fbbf24", risk: "#f2706a" };

const ATM_VERT = /* glsl */ `varying vec3 vN; varying vec3 vV;
void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
const ATM_FRAG = /* glsl */ `uniform vec3 uColor; uniform float uHover; varying vec3 vN; varying vec3 vV;
void main(){ float f = pow(clamp(0.8 - dot(normalize(vN), normalize(vV)), 0.0, 1.0), 3.4); gl_FragColor = vec4(uColor, f * (0.75 + uHover * 1.2)); }`;

const glowTex = () => {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d")!;
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.25, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

export const createGalaxy = (
  canvas: HTMLCanvasElement,
  planets: GalaxyPlanet[],
  hooks: { onHover: (h: GalaxyHover, x: number, y: number) => void; onOpen: (h: GalaxyHover) => void; onLabels: (l: Record<string, GalaxyLabel>) => void },
  opts: { reduced: boolean; small: boolean },
): GalaxyHandle => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(opts.small ? 1.5 : 1.75, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);

  scene.add(new THREE.AmbientLight(0x6b7fa8, 0.55));
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
  sun.position.set(-6, 4, 6);
  scene.add(sun);

  // Stars
  const SN = 1400;
  const sp = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) sp.set([(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 50, -10 - Math.random() * 40], i * 3);
  const sg = new THREE.BufferGeometry();
  sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ size: 0.09, color: 0xcfe0ff, transparent: true, opacity: 0.8, depthWrite: false });
  scene.add(new THREE.Points(sg, starMat));
  const gtex = glowTex();
  for (const [x, y, s, col] of [[-12, 4, 26, "#3b82f6"], [10, -3, 22, "#7c3aed"], [2, 6, 18, "#0891b2"]] as [number, number, number, string][]) {
    const n = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: col, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
    n.position.set(x, y, -25);
    n.scale.set(s, s, 1);
    scene.add(n);
  }

  const loader = new THREE.TextureLoader();
  const n = planets.length;
  const spacing = 3.4;
  type P = { data: GalaxyPlanet; body: THREE.Mesh; atm: THREE.Mesh; atmU: { uColor: { value: THREE.Color }; uHover: { value: number } }; group: THREE.Group; r: number; moons: { data: GalaxyMoon; mesh: THREE.Mesh; glow: THREE.Sprite; radius: number; speed: number; phase: number; tilt: THREE.Quaternion }[] };
  const ps: P[] = [];
  planets.forEach((pl, i) => {
    const r = Math.min(1.15, 0.62 + pl.moons.length * 0.022);
    const group = new THREE.Group();
    scene.add(group);
    const tex = loader.load(`/media/planets/${TEXTURES[i % TEXTURES.length]}.webp`);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const body = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 }));
    body.rotation.z = 0.25;
    group.add(body);
    const atmU = { uColor: { value: new THREE.Color(ATMOS[i % ATMOS.length]) }, uHover: { value: 0 } };
    const atm = new THREE.Mesh(new THREE.SphereGeometry(r * 1.15, 48, 32), new THREE.ShaderMaterial({ uniforms: atmU, vertexShader: ATM_VERT, fragmentShader: ATM_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.BackSide }));
    group.add(atm);
    // Hand-in ring: faint full ring, bright arc for the rate
    const ringTilt = new THREE.Euler(Math.PI / 2 - 0.35, 0.15, 0);
    const ringR = r * 1.55;
    const back = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.012, 6, 160), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12 }));
    back.rotation.copy(ringTilt);
    group.add(back);
    if (pl.handIn !== null && pl.handIn > 0) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.028, 8, 160, (Math.PI * 2 * Math.min(100, pl.handIn)) / 100), new THREE.MeshBasicMaterial({ color: 0x7ff3ff, transparent: true, opacity: 0.85 }));
      arc.rotation.copy(ringTilt);
      group.add(arc);
    }
    // Moons
    const moons: P["moons"] = pl.moons.map((m, k) => {
      const col = new THREE.Color(STATUS[m.status]);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07 + m.activity * 0.03, 16, 12), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.4 + m.activity * 0.9, roughness: 0.6 }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: gtex, color: col, transparent: true, opacity: 0.35 + m.activity * 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.set(0.38, 0.38, 1);
      group.add(mesh, glow);
      return {
        data: m,
        mesh,
        glow,
        radius: r * (1.95 + (k % 3) * 0.32) + Math.random() * 0.15,
        speed: (0.12 + Math.random() * 0.18) * (k % 2 ? 1 : -1),
        phase: Math.random() * Math.PI * 2,
        tilt: new THREE.Quaternion().setFromEuler(new THREE.Euler((Math.random() - 0.5) * 0.9, 0, (Math.random() - 0.5) * 0.6)),
      };
    });
    ps.push({ data: pl, body, atm, atmU, group, r, moons });
  });

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // A row of planets on wide screens; on narrow ones a column that fits under the header
    const tall = camera.aspect < 1;
    const half = Math.tan((camera.fov * Math.PI) / 360);
    if (tall) {
      const view = ((Math.max(1, n) - 1) * 3.1 + 3) / 0.72;
      const dist = view / 2 / half;
      ps.forEach((p, i) => p.group.position.set(i % 2 ? 0.7 : -0.7, ((n - 1) / 2 - i) * 3.1 - view * 0.13, 0));
      camera.position.set(0, 0, dist);
      camera.lookAt(0, 0, 0);
    } else {
      ps.forEach((p, i) => p.group.position.set((i - (n - 1) / 2) * spacing, Math.sin(i * 1.7) * 0.45, (i % 2) * -1.4));
      const dist = Math.max(8.5, (Math.max(1, n) * spacing + 2.5) / 2 / half / camera.aspect);
      camera.position.set(0, dist * 0.32, dist);
      camera.lookAt(0, 0.55, -0.5);
    }
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Hover and click
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hover: GalaxyHover = null;
  const find = (e: PointerEvent): GalaxyHover => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    // Moons are small: test them with a generous radius first
    let best: { d: number; h: GalaxyHover } | null = null;
    for (const p of ps)
      for (const m of p.moons) {
        const wp = m.mesh.getWorldPosition(new THREE.Vector3());
        const d = ray.ray.distanceToPoint(wp);
        if (d < 0.22 && (!best || d < best.d)) best = { d, h: { kind: "moon", moon: m.data, planet: p.data } };
      }
    if (best) return best.h;
    const hit = ray.intersectObjects(ps.map((p) => p.body))[0];
    const p = hit && ps.find((x) => x.body === hit.object);
    return p ? { kind: "planet", planet: p.data } : null;
  };
  const move = (e: PointerEvent) => {
    hover = find(e);
    canvas.style.cursor = hover ? "pointer" : "default";
    const r = canvas.getBoundingClientRect();
    hooks.onHover(hover, e.clientX - r.left, e.clientY - r.top);
  };
  const click = (e: PointerEvent) => {
    const h = find(e);
    if (h) hooks.onOpen(h);
  };
  const leave = () => {
    hover = null;
    hooks.onHover(null, 0, 0);
  };
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", click);
  canvas.addEventListener("pointerleave", leave);

  let active = true, raf = 0, last = performance.now(), t = 0;
  const tmp = new THREE.Vector3(), labels: Record<string, GalaxyLabel> = {};
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt * (opts.reduced ? 0.15 : 1);
    for (const p of ps) {
      p.body.rotation.y = t * 0.08;
      const isHover = hover && hover.kind === "planet" && hover.planet.id === p.data.id ? 1 : 0;
      p.atmU.uHover.value += (isHover - p.atmU.uHover.value) * Math.min(1, dt * 8);
      p.group.position.y += Math.sin(t * 0.6 + p.r * 10) * 0.0008;
      for (const m of p.moons) {
        const a = m.phase + t * m.speed;
        tmp.set(Math.cos(a) * m.radius, 0, Math.sin(a) * m.radius).applyQuaternion(m.tilt);
        m.mesh.position.copy(tmp);
        m.glow.position.copy(tmp);
        const hovered = hover && hover.kind === "moon" && hover.moon.id === m.data.id;
        const s = hovered ? 0.8 : 0.38;
        m.glow.scale.set(s, s, 1);
      }
    }
    renderer.render(scene, camera);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    for (const p of ps) {
      tmp.set(0, p.r * 1.25, 0);
      p.group.localToWorld(tmp);
      tmp.project(camera);
      labels[p.data.id] = { x: (tmp.x * 0.5 + 0.5) * w, y: (-tmp.y * 0.5 + 0.5) * h, r: p.r };
    }
    hooks.onLabels(labels);
  };
  raf = requestAnimationFrame(frame);

  return {
    setActive: (on) => {
      active = on;
      last = performance.now();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", click);
      canvas.removeEventListener("pointerleave", leave);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        mats.forEach((mt) => {
          Object.values(mt).forEach((v) => v instanceof THREE.Texture && v.dispose());
          mt.dispose();
        });
      });
      renderer.dispose();
    },
  };
};
