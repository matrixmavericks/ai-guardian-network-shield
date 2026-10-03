import * as THREE from "three";

// Particles that morph between shapes sampled from Higgsfield 3D models.
// Every shape is its own attribute and the blend happens on the GPU, so the
// CPU only updates a handful of uniforms per frame.

export type ParticlesHandle = {
  setMorph: (m: number) => void;
  setPointer: (x: number, y: number, on: boolean) => void;
  setActive: (on: boolean) => void;
  dispose: () => void;
};

const VERT = /* glsl */ `
uniform float uMorph;
uniform float uTime;
uniform float uSize;
uniform float uScatter;
uniform vec3 uMouse;
uniform float uMouseOn;
attribute vec3 aS0;
attribute vec3 aS1;
attribute vec3 aS2;
attribute vec3 aS3;
attribute vec3 aS4;
attribute vec4 aRand;
varying float vAlpha;
varying float vTint;
varying float vGlow;

vec3 shapeAt(float k) {
  if (k < 0.5) return aS0;
  if (k < 1.5) return aS1;
  if (k < 2.5) return aS2;
  if (k < 3.5) return aS3;
  return aS4;
}

void main() {
  float k = floor(uMorph);
  float f = uMorph - k;
  // Each particle leaves a little later than the last, so the change ripples through the shape
  float st = clamp((f - aRand.w * 0.3) / 0.7, 0.0, 1.0);
  float e = st * st * (3.0 - 2.0 * st);
  vec3 p = mix(shapeAt(k), shapeAt(min(k + 1.0, 4.0)), e);
  float burst = sin(e * 3.14159265);
  p += aRand.xyz * burst * uScatter;
  p += 0.014 * vec3(sin(uTime * 1.3 + aRand.w * 40.0), cos(uTime * 1.1 + aRand.x * 30.0), sin(uTime * 0.9 + aRand.y * 20.0));
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // The cursor pushes particles aside
  vec2 d = mv.xy - uMouse.xy;
  float dist = length(d);
  float push = uMouseOn * (1.0 - smoothstep(0.0, 0.55, dist));
  mv.xy += (d / max(dist, 1e-4)) * push * 0.32;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.55 + aRand.w * 0.9) * (1.0 + burst * 0.6) / -mv.z;
  vAlpha = 0.55 + 0.45 * sin(uTime * 2.2 + aRand.w * 60.0);
  vTint = aRand.w;
  vGlow = push + burst * 0.5;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying float vAlpha;
varying float vTint;
varying float vGlow;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float g = pow(smoothstep(0.5, 0.0, r), 1.7);
  vec3 col = mix(uC1, uC2, smoothstep(0.1, 0.9, vTint));
  col = mix(col, uC3, step(0.955, vTint) + vGlow * 0.5);
  gl_FragColor = vec4(col, g * vAlpha);
}
`;

const DUST_VERT = /* glsl */ `
uniform float uTime;
uniform float uSize;
attribute float aSeed;
varying float vA;
void main() {
  vec3 p = position;
  p.y += mod(uTime * 0.04 + aSeed * 10.0, 6.0) - 3.0;
  p.x += sin(uTime * 0.2 + aSeed * 20.0) * 0.1;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.4 + aSeed) / -mv.z;
  vA = 0.25 + 0.25 * sin(uTime + aSeed * 30.0);
}
`;
const DUST_FRAG = /* glsl */ `
varying float vA;
void main() {
  float r = length(gl_PointCoord - 0.5);
  if (r > 0.5) discard;
  gl_FragColor = vec4(0.55, 0.75, 1.0, smoothstep(0.5, 0.0, r) * vA);
}
`;

export const createParticles = (canvas: HTMLCanvasElement, data: Int16Array, perShape: number, opts: { count: number; reduced: boolean }): ParticlesHandle => {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: "high-performance" });
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  camera.position.set(0, 0, 4.4);

  const shapes = Math.floor(data.length / (perShape * 3));
  const count = Math.min(opts.count, perShape);
  const stride = perShape / count;
  const geo = new THREE.BufferGeometry();
  for (let s = 0; s < 5; s++) {
    const arr = new Float32Array(count * 3);
    const src = Math.min(s, shapes - 1);
    for (let i = 0; i < count; i++) {
      const j = (src * perShape + Math.floor(i * stride)) * 3;
      arr[i * 3] = data[j] / 32767;
      arr[i * 3 + 1] = data[j + 1] / 32767;
      arr[i * 3 + 2] = data[j + 2] / 32767;
    }
    geo.setAttribute(`aS${s}`, new THREE.BufferAttribute(arr, 3));
    if (s === 0) geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
  }
  const rand = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    // A random direction for the burst, and a phase
    const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, m = 0.4 + Math.random() * 0.9;
    const s = Math.sqrt(1 - u * u);
    rand[i * 4] = s * Math.cos(th) * m;
    rand[i * 4 + 1] = s * Math.sin(th) * m;
    rand[i * 4 + 2] = u * m;
    rand[i * 4 + 3] = Math.random();
  }
  geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);

  const uniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: (window.innerWidth < 768 ? 19 : 16) * dpr },
    uScatter: { value: opts.reduced ? 0.15 : 0.75 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseOn: { value: 0 },
    uC1: { value: new THREE.Color("#3B82F6") },
    uC2: { value: new THREE.Color("#3FE9FF") },
    uC3: { value: new THREE.Color("#ffffff") },
  };
  const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  group.add(points);
  scene.add(group);

  // Background dust for depth
  const DN = Math.round(count / 12);
  const dpos = new Float32Array(DN * 3), dseed = new Float32Array(DN);
  for (let i = 0; i < DN; i++) {
    dpos[i * 3] = (Math.random() - 0.5) * 8;
    dpos[i * 3 + 1] = (Math.random() - 0.5) * 6;
    dpos[i * 3 + 2] = -Math.random() * 4 - 0.5;
    dseed[i] = Math.random();
  }
  const dgeo = new THREE.BufferGeometry();
  dgeo.setAttribute("position", new THREE.BufferAttribute(dpos, 3));
  dgeo.setAttribute("aSeed", new THREE.BufferAttribute(dseed, 1));
  const dustU = { uTime: uniforms.uTime, uSize: { value: 10 * dpr } };
  const dust = new THREE.Points(dgeo, new THREE.ShaderMaterial({ vertexShader: DUST_VERT, fragmentShader: DUST_FRAG, uniforms: dustU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  dust.frustumCulled = false;
  scene.add(dust);

  // Size to the canvas box
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the shape a similar size on tall phone screens
    camera.position.z = w / h < 0.8 ? 6.6 : 4.4;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const pointer = { x: 0, y: 0, on: false };
  const ray = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();
  let target = 0, morph = 0, active = true, raf = 0, last = performance.now();
  const tilt = { x: 0, y: 0 };

  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (!active || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    uniforms.uTime.value += dt * (opts.reduced ? 0.2 : 1);
    morph += (target - morph) * Math.min(1, dt * 6);
    uniforms.uMorph.value = morph;
    // Gentle sway, leaning towards the cursor
    tilt.x += ((pointer.on ? pointer.y * 0.25 : 0) - tilt.x) * Math.min(1, dt * 3);
    tilt.y += ((pointer.on ? pointer.x * 0.45 : 0) - tilt.y) * Math.min(1, dt * 3);
    group.rotation.y = Math.sin(uniforms.uTime.value * 0.35) * 0.32 + tilt.y;
    group.rotation.x = Math.sin(uniforms.uTime.value * 0.27) * 0.08 - tilt.x;
    // Cursor position in view space, on the plane through the shape
    if (pointer.on) {
      ray.setFromCamera(new THREE.Vector2(pointer.x, pointer.y), camera);
      if (ray.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit.applyMatrix4(camera.matrixWorldInverse));
    }
    uniforms.uMouseOn.value += ((pointer.on && !opts.reduced ? 1 : 0) - uniforms.uMouseOn.value) * Math.min(1, dt * 5);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    setMorph: (m) => (target = Math.max(0, Math.min(4, m))),
    setPointer: (x, y, on) => Object.assign(pointer, { x, y, on }),
    setActive: (on) => {
      active = on;
      last = performance.now();
    },
    dispose: () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      geo.dispose();
      mat.dispose();
      dgeo.dispose();
      (dust.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
};
