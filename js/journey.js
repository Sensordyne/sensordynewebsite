/**
 * SensorDyme scroll journey — an original, procedurally-built 3D experience.
 * A pinned full-viewport scene flies the camera through the device across
 * five scroll chapters (optics → compute → models → boundary → deploy),
 * over a vibrant animated shader background.
 *
 * Loaded as an ES module from a CDN via an import map — no build step.
 * Any failure (no WebGL, CDN blocked, runtime error) leaves the page in its
 * default static layout: stacked, fully-readable panels + CSS aurora.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/* ---------------------------------------------------------------- helpers */

function clamp01(v) { return Math.min(Math.max(v, 0), 1); }
function ramp(p, a, b) { return clamp01((p - a) / (b - a)); }
function smooth(t) { return t * t * (3 - 2 * t); }

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

const C = {
  fog: 0x05060a,
  pcb: 0x0f1722,
  chip: 0x1a2130,
  chipDark: 0x10141d,
  metal: 0x9aa4b2,
  gold: 0xcfa63a,
  accent: 0x2563eb,
  accentBright: 0x6d9bff,
  cyan: 0x22d3ee,
  violet: 0x8b5cf6,
  ink: 0xf2f3f5,
};

function std(opts) {
  const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.6, metalness: 0.25 }, opts));
  if (opts && opts.transparent) m.userData.baseOpacity = opts.opacity != null ? opts.opacity : 1;
  return m;
}

/* Set opacity on every material in a group, scaled by its authored opacity. */
function setGroupOpacity(group, o) {
  group.visible = o > 0.015;
  if (!group.visible) return;
  group.traverse(function (n) {
    if (n.material) {
      const base = n.material.userData.baseOpacity != null ? n.material.userData.baseOpacity : 1;
      n.material.opacity = o * base;
    }
  });
}

/* ------------------------------------------------------- background quad */

function buildBackground() {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const material = new THREE.ShaderMaterial({
    depthWrite: false,
    depthTest: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: [
      'varying vec2 vUv;',
      'void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    ].join('\n'),
    fragmentShader: [
      'varying vec2 vUv;',
      'uniform float uTime;',
      'float blob(vec2 uv, vec2 c, float r) {',
      '  float d = length(uv - c);',
      '  return exp(-(d * d) / (r * r));',
      '}',
      'void main() {',
      '  vec2 uv = vUv;',
      '  float t = uTime * 0.12;',
      '  vec3 col = vec3(0.016, 0.02, 0.045);',
      '  vec2 c1 = vec2(0.28 + 0.22 * sin(t * 0.9), 0.62 + 0.18 * cos(t * 0.7));',
      '  vec2 c2 = vec2(0.74 + 0.20 * cos(t * 0.6 + 2.1), 0.30 + 0.22 * sin(t * 0.8 + 1.3));',
      '  vec2 c3 = vec2(0.52 + 0.30 * sin(t * 0.5 + 4.2), 0.80 + 0.14 * cos(t * 1.1 + 0.6));',
      '  vec2 c4 = vec2(0.18 + 0.16 * cos(t * 0.7 + 5.0), 0.18 + 0.16 * sin(t * 0.9 + 2.6));',
      '  col += vec3(0.145, 0.388, 0.922) * 0.34 * blob(uv, c1, 0.34);',
      '  col += vec3(0.545, 0.361, 0.965) * 0.30 * blob(uv, c2, 0.30);',
      '  col += vec3(0.133, 0.827, 0.933) * 0.20 * blob(uv, c3, 0.26);',
      '  col += vec3(0.145, 0.388, 0.922) * 0.18 * blob(uv, c4, 0.28);',
      '  float band = 0.012 * sin(uv.y * 90.0 + uTime * 0.6);',
      '  col += band * vec3(0.3, 0.5, 1.0);',
      '  float vig = smoothstep(1.25, 0.35, length(uv - vec2(0.5, 0.45)));',
      '  col *= mix(0.55, 1.0, vig);',
      '  float grain = fract(sin(dot(uv * 700.0, vec2(12.9898, 78.233))) * 43758.5453);',
      '  col += (grain - 0.5) * 0.012;',
      '  gl_FragColor = vec4(col, 1.0);',
      '}',
    ].join('\n'),
  });
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
  return { scene: scene, camera: camera, material: material };
}

/* ------------------------------------------------------------ the device */

function buildBoard(explodables) {
  const board = new THREE.Group();

  // PCB
  const pcb = new THREE.Mesh(
    new RoundedBoxGeometry(3.2, 0.09, 2.2, 2, 0.04),
    std({ color: C.pcb, roughness: 0.55, metalness: 0.3 })
  );
  board.add(pcb);

  // emissive trace strips across the PCB top
  const traceMat = std({ color: 0x0a1226, emissive: C.accent, emissiveIntensity: 0.9, roughness: 0.4 });
  const traceRuns = [
    [-1.2, 0.05, 1.6], [-0.7, -0.42, 1.1], [0.15, 0.28, 1.9], [0.85, -0.6, 0.9], [1.25, 0.4, 1.2],
  ];
  traceRuns.forEach(function (r) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.012, r[2]), traceMat);
    t.position.set(r[0], 0.052, r[1]);
    board.add(t);
  });
  const crossRuns = [[-0.95, 0.55, 0.9], [0.5, -0.35, 1.3], [-0.2, 0.75, 0.8]];
  crossRuns.forEach(function (r) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(r[2], 0.012, 0.02), traceMat);
    t.position.set(r[0], 0.052, r[1]);
    board.add(t);
  });

  // SoC package
  const soc = new THREE.Group();
  const socBody = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.09, 0.62, 2, 0.02),
    std({ color: C.chipDark, roughness: 0.35, metalness: 0.45 }));
  socBody.position.y = 0.09;
  soc.add(socBody);
  const socDie = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3),
    std({ color: 0x2a3448, emissive: C.accent, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.3 }));
  socDie.position.y = 0.15;
  soc.add(socDie);
  soc.position.set(-0.55, 0, 0.1);
  board.add(soc);
  explodables.push({ obj: soc, dir: new THREE.Vector3(0, 1, 0), dist: 0.34 });

  // finned heatsink above the SoC
  const heatsink = new THREE.Group();
  const hsBase = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 0.72),
    std({ color: C.metal, metalness: 0.9, roughness: 0.32 }));
  heatsink.add(hsBase);
  const finMat = std({ color: C.metal, metalness: 0.9, roughness: 0.35 });
  for (let i = 0; i < 8; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.16, 0.035), finMat);
    fin.position.set(0, 0.1, -0.315 + i * 0.09);
    heatsink.add(fin);
  }
  heatsink.position.set(-0.55, 0.2, 0.1);
  board.add(heatsink);
  explodables.push({ obj: heatsink, dir: new THREE.Vector3(0, 1, 0), dist: 0.72 });

  // RAM + storage + power management chips
  const chipSpecs = [
    { s: [0.5, 0.06, 0.34], p: [0.35, -0.2], d: [0, 1, 0], dist: 0.5 },
    { s: [0.3, 0.05, 0.3], p: [1.0, 0.35], d: [0, 1, 0], dist: 0.42 },
    { s: [0.26, 0.05, 0.2], p: [-1.15, 0.62], d: [0, 1, 0], dist: 0.38 },
    { s: [0.2, 0.04, 0.2], p: [0.9, -0.65], d: [0, 1, 0], dist: 0.3 },
  ];
  chipSpecs.forEach(function (c) {
    const chip = new THREE.Mesh(new RoundedBoxGeometry(c.s[0], c.s[1], c.s[2], 1, 0.012),
      std({ color: C.chip, roughness: 0.4, metalness: 0.5 }));
    chip.position.set(c.p[0], 0.075, c.p[1]);
    board.add(chip);
    explodables.push({ obj: chip, dir: new THREE.Vector3(c.d[0], c.d[1], c.d[2]), dist: c.dist });
  });

  // capacitors — little cylinders scattered near the power chip
  const capMat = std({ color: 0x333c4d, metalness: 0.7, roughness: 0.4 });
  const capTop = std({ color: 0xaab2c0, metalness: 0.85, roughness: 0.3 });
  [[-1.3, 0.25], [-1.18, 0.18], [-1.32, 0.02], [-0.05, -0.75], [0.15, -0.78]].forEach(function (pos) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 12), capMat);
    cap.position.set(pos[0], 0.09, pos[1]);
    board.add(cap);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.012, 12), capTop);
    top.position.set(pos[0], 0.14, pos[1]);
    board.add(top);
  });

  // dual-row GPIO header, gold pins
  const pinGeo = new THREE.BoxGeometry(0.028, 0.16, 0.028);
  const pinMat = std({ color: C.gold, metalness: 0.95, roughness: 0.3 });
  const pins = new THREE.InstancedMesh(pinGeo, pinMat, 40);
  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < 20; i++) {
      dummy.position.set(-1.045 + i * 0.11, 0.12, -0.98 + row * 0.07);
      dummy.updateMatrix();
      pins.setMatrixAt(idx++, dummy.matrix);
    }
  }
  const gpio = new THREE.Group();
  const header = new THREE.Mesh(new THREE.BoxGeometry(2.24, 0.06, 0.18),
    std({ color: 0x0c0f16, roughness: 0.5 }));
  header.position.set(0, 0.07, -0.945);
  gpio.add(header);
  gpio.add(pins);
  board.add(gpio);
  explodables.push({ obj: gpio, dir: new THREE.Vector3(0, 1, 0), dist: 0.24 });

  // ports on the right edge — ethernet + two USB stacks
  const portMat = std({ color: C.metal, metalness: 0.85, roughness: 0.4 });
  const portDark = std({ color: 0x0a0d13, roughness: 0.6 });
  function port(w, h, d, x, z) {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), portMat);
    g.add(shell);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(0.02, h * 0.62, d * 0.68), portDark);
    inner.position.x = w / 2;
    g.add(inner);
    g.position.set(x, h / 2 + 0.045, z);
    return g;
  }
  const eth = port(0.32, 0.26, 0.32, 1.48, 0.62);
  const usb1 = port(0.3, 0.3, 0.28, 1.47, 0.1);
  const usb2 = port(0.3, 0.3, 0.28, 1.47, -0.34);
  [eth, usb1, usb2].forEach(function (p) {
    board.add(p);
    explodables.push({ obj: p, dir: new THREE.Vector3(1, 0, 0), dist: 0.4 });
  });

  // USB-C + micro-HDMI on the front-left edge
  const small1 = port(0.14, 0.08, 0.2, -1.4, 0.98);
  small1.rotation.y = Math.PI / 2;
  small1.position.set(-1.05, 0.09, 1.04);
  board.add(small1);
  const small2 = port(0.16, 0.1, 0.22, 0, 0);
  small2.rotation.y = Math.PI / 2;
  small2.position.set(-0.7, 0.1, 1.04);
  board.add(small2);
  explodables.push({ obj: small1, dir: new THREE.Vector3(0, 0, 1), dist: 0.3 });
  explodables.push({ obj: small2, dir: new THREE.Vector3(0, 0, 1), dist: 0.34 });

  return board;
}

function buildCameraModule() {
  const cam = new THREE.Group();

  const mount = new THREE.Mesh(new RoundedBoxGeometry(0.56, 0.5, 0.14, 2, 0.03),
    std({ color: 0x131a26, roughness: 0.45, metalness: 0.4 }));
  mount.position.set(0, 0.3, 0.96);
  cam.add(mount);

  const barrelMat = std({ color: 0x0c1018, metalness: 0.7, roughness: 0.35 });
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 40), barrelMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.32, 1.14);
  cam.add(barrel);

  // knurled focus rings
  const ringMat = std({ color: 0x2a3242, metalness: 0.8, roughness: 0.3 });
  [1.06, 1.16, 1.24].forEach(function (z) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.175, 0.012, 10, 48), ringMat);
    ring.position.set(0, 0.32, z);
    cam.add(ring);
  });

  // glowing aperture ring + lens glass
  const glowRing = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.012, 10, 48),
    std({ color: C.accent, emissive: C.accentBright, emissiveIntensity: 1.6, transparent: true, opacity: 1 }));
  glowRing.position.set(0, 0.32, 1.295);
  cam.add(glowRing);

  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.125, 40),
    std({ color: 0x08122e, emissive: C.accent, emissiveIntensity: 0.5, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.92 }));
  glass.position.set(0, 0.32, 1.3);
  cam.add(glass);

  const innerLens = new THREE.Mesh(new THREE.SphereGeometry(0.07, 24, 24),
    std({ color: 0x050a1c, emissive: C.cyan, emissiveIntensity: 0.7, roughness: 0.1 }));
  innerLens.position.set(0, 0.32, 1.26);
  cam.add(innerLens);

  return cam;
}

function buildRays() {
  const rays = new THREE.Group();
  const tip = new THREE.Vector3(0, 0.32, 1.32);
  const rayMat = new THREE.LineBasicMaterial({
    color: C.accentBright, transparent: true, opacity: 0.3,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  rayMat.userData.baseOpacity = 0.3;
  const spread = [[-1.5, 0.95], [-0.75, 1.25], [0, 1.4], [0.75, 1.25], [1.5, 0.95]];
  spread.forEach(function (s) {
    const end = new THREE.Vector3(s[0], s[1], 4.4);
    const geo = new THREE.BufferGeometry().setFromPoints([tip, end]);
    rays.add(new THREE.Line(geo, rayMat));
  });
  const dotMat = std({ color: C.ink, emissive: C.ink, emissiveIntensity: 0.6, transparent: true, opacity: 1 });
  spread.forEach(function (s, i) {
    if (i === 2) return;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), dotMat);
    dot.position.set(s[0] * 0.82, s[1] * 0.82, 3.7);
    rays.add(dot);
  });
  return rays;
}

function buildShell() {
  const shellMat = std({
    color: 0x0e1420, metalness: 0.3, roughness: 0.15,
    transparent: true, opacity: 0.34, depthWrite: false,
  });
  const rimMat = std({
    color: C.accent, emissive: C.accent, emissiveIntensity: 0.8,
    transparent: true, opacity: 0.55, depthWrite: false,
  });

  const tray = new THREE.Group();
  const trayMesh = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.5, 2.7, 3, 0.12), shellMat);
  trayMesh.position.y = -0.12;
  trayMesh.renderOrder = 3;
  tray.add(trayMesh);

  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(new RoundedBoxGeometry(3.7, 0.55, 2.7, 3, 0.12), shellMat);
  lidMesh.position.y = 0.42;
  lidMesh.renderOrder = 3;
  lid.add(lidMesh);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(3.72, 0.016, 2.72), rimMat);
  rim.position.y = 0.15;
  rim.renderOrder = 4;
  lid.add(rim);

  const group = new THREE.Group();
  group.add(tray);
  group.add(lid);
  return { group: group, lid: lid };
}

function buildNeural() {
  const g = new THREE.Group();
  const layers = [
    { x: -0.95, n: 5 }, { x: 0, n: 7 }, { x: 0.95, n: 4 },
  ];
  const nodeMats = [
    std({ color: C.accent, emissive: C.accentBright, emissiveIntensity: 1.4, transparent: true, opacity: 1 }),
    std({ color: C.violet, emissive: C.violet, emissiveIntensity: 1.4, transparent: true, opacity: 1 }),
    std({ color: C.cyan, emissive: C.cyan, emissiveIntensity: 1.4, transparent: true, opacity: 1 }),
  ];
  const nodeGeo = new THREE.SphereGeometry(0.05, 14, 14);
  const positions = [];
  const nodes = [];
  layers.forEach(function (layer, li) {
    const pts = [];
    for (let i = 0; i < layer.n; i++) {
      const y = (i - (layer.n - 1) / 2) * 0.32;
      const z = Math.sin(i * 2.1 + li) * 0.14;
      const node = new THREE.Mesh(nodeGeo, nodeMats[li]);
      node.position.set(layer.x, y, z);
      g.add(node);
      nodes.push(node);
      pts.push(node.position.clone());
    }
    positions.push(pts);
  });
  const linkMat = new THREE.LineBasicMaterial({
    color: C.accentBright, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  linkMat.userData.baseOpacity = 0.16;
  for (let l = 0; l < positions.length - 1; l++) {
    positions[l].forEach(function (a) {
      positions[l + 1].forEach(function (b) {
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        g.add(new THREE.Line(geo, linkMat));
      });
    });
  }
  g.position.set(0, 1.5, 0);
  g.userData.nodes = nodes;
  return g;
}

function buildShield() {
  const g = new THREE.Group();
  const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(4.6, 2.3, 3.5));
  const edgeMat = new THREE.LineBasicMaterial({
    color: C.cyan, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  edgeMat.userData.baseOpacity = 0.55;
  const frame = new THREE.LineSegments(edges, edgeMat);
  frame.position.y = 0.5;
  g.add(frame);

  // event packets escaping the boundary — data out, never frames
  const dots = [];
  for (let i = 0; i < 3; i++) {
    const mat = std({
      color: C.cyan, emissive: C.cyan, emissiveIntensity: 2,
      transparent: true, opacity: 1,
    });
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), mat);
    dot.position.set(-0.5 + i * 0.5, 0.5, 1.8);
    g.add(dot);
    dots.push(dot);
  }
  g.userData.dots = dots;
  return g;
}

function buildParticles() {
  const count = 750;
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 9 + Math.random() * 15;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: C.accentBright, size: 0.05, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

/* ---------------------------------------------------------- scroll drama */

const CAM_KEYS = [
  { p: 0.00, pos: [5.8, 3.1, 7.4], look: [0, 0.2, 0], ry: -0.5 },
  { p: 0.11, pos: [3.2, 1.7, 4.8], look: [0, 0.25, 0.4], ry: -0.35 },
  { p: 0.22, pos: [0.7, 0.72, 3.35], look: [0, 0.3, 1.05], ry: -0.1 },
  { p: 0.33, pos: [-2.0, 1.8, 2.8], look: [-0.4, 0.35, 0], ry: 0.16 },
  { p: 0.45, pos: [-1.45, 1.25, 1.6], look: [-0.5, 0.42, 0.05], ry: 0.3 },
  { p: 0.57, pos: [1.7, 2.1, 3.1], look: [0, 0.95, 0], ry: 0.1 },
  { p: 0.69, pos: [0.0, 1.7, 4.7], look: [0, 0.9, 0], ry: 0.0 },
  { p: 0.81, pos: [3.7, 2.4, 5.5], look: [0, 0.5, 0], ry: -0.2 },
  { p: 1.00, pos: [5.6, 3.0, 7.6], look: [0, 0.3, 0], ry: -0.55 },
];

const PANEL_WINDOWS = [
  { id: 'panelHero', a: 0.0, b: 0.09 },
  { id: 'panel1', a: 0.125, b: 0.305 },
  { id: 'panel2', a: 0.365, b: 0.535 },
  { id: 'panel3', a: 0.59, b: 0.755 },
  { id: 'panel4', a: 0.79, b: 0.9 },
  { id: 'panel5', a: 0.935, b: 1.01 },
];

/* ------------------------------------------------------------------ init */

function init() {
  const journeyEl = document.querySelector('[data-journey]');
  const canvas = document.getElementById('journeyCanvas');
  if (!journeyEl || !canvas) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.innerWidth >= 860;

  if (!supportsWebGL()) {
    journeyEl.classList.add('journey--no-webgl');
    return;
  }

  // Scroll-scrubbed animation is user-initiated, so it stays available under
  // prefers-reduced-motion; only ambient autoplay motion is frozen below.
  const pinned = isDesktop;

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.autoClear = false;

  const bg = buildBackground();

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(C.fog, 0.032);
  const camera = new THREE.PerspectiveCamera(44, 1, 0.1, 120);

  // lighting — key light + colored fills for vibrancy
  scene.add(new THREE.AmbientLight(0x4a5570, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.6);
  key.position.set(4, 7, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb2ff, 1.1);
  rim.position.set(-5, 3, -6);
  scene.add(rim);
  const fillBlue = new THREE.PointLight(C.accent, 46, 40);
  fillBlue.position.set(-4.5, 2.5, 4.5);
  scene.add(fillBlue);
  const fillViolet = new THREE.PointLight(C.violet, 34, 40);
  fillViolet.position.set(4.5, 1.5, -4);
  scene.add(fillViolet);
  const fillCyan = new THREE.PointLight(C.cyan, 18, 26);
  fillCyan.position.set(0, -2.5, 3);
  scene.add(fillCyan);

  // world
  const deviceGroup = new THREE.Group();
  const explodables = [];
  const board = buildBoard(explodables);
  deviceGroup.add(board);
  deviceGroup.add(buildCameraModule());
  const rays = buildRays();
  deviceGroup.add(rays);
  const shell = buildShell();
  deviceGroup.add(shell.group);
  const neural = buildNeural();
  deviceGroup.add(neural);
  const shield = buildShield();
  deviceGroup.add(shield);
  scene.add(deviceGroup);

  explodables.forEach(function (e) { e.base = e.obj.position.clone(); });

  const grid = new THREE.GridHelper(34, 68, 0x232c3d, 0x121722);
  grid.position.y = -1.05;
  grid.material.transparent = true;
  grid.material.opacity = 0.5;
  scene.add(grid);

  scene.add(buildParticles());

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize, { passive: true });

  const clock = new THREE.Clock();
  const lookTarget = new THREE.Vector3();
  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();

  function sampleCamera(p) {
    let i = 0;
    while (i < CAM_KEYS.length - 2 && p > CAM_KEYS[i + 1].p) i++;
    const a = CAM_KEYS[i];
    const b = CAM_KEYS[i + 1];
    const t = smooth(clamp01((p - a.p) / (b.p - a.p)));
    va.fromArray(a.pos); vb.fromArray(b.pos);
    camera.position.lerpVectors(va, vb, t);
    va.fromArray(a.look); vb.fromArray(b.look);
    lookTarget.lerpVectors(va, vb, t);
    camera.lookAt(lookTarget);
    return a.ry + (b.ry - a.ry) * t;
  }

  function applyDeviceState(p, time) {
    // enclosure lid lifts away as we go inside, returns at the end
    const open = clamp01(ramp(p, 0.1, 0.2) - ramp(p, 0.87, 0.96));
    const o = smooth(open);
    shell.lid.position.y = o * 1.7;
    shell.lid.position.z = -o * 1.0;
    shell.lid.rotation.x = -o * 0.55;

    // the whole shell fades while we tour the board, returns for the finale
    const shellFade = clamp01(1 - ramp(p, 0.3, 0.42) + ramp(p, 0.86, 0.96));
    setGroupOpacity(shell.group, shellFade);

    // components lift apart for the compute chapter
    const explode = smooth(clamp01(ramp(p, 0.34, 0.45) - ramp(p, 0.55, 0.64)));
    explodables.forEach(function (e) {
      e.obj.position.copy(e.base).addScaledVector(e.dir, e.dist * explode);
    });

    // model visualization above the board
    const neuralO = clamp01(ramp(p, 0.55, 0.65) - ramp(p, 0.775, 0.84));
    setGroupOpacity(neural, neuralO);
    if (neuralO > 0.015) {
      neural.userData.nodes.forEach(function (n, i) {
        n.scale.setScalar(1 + 0.3 * Math.sin(time * 3 + i * 1.7));
      });
      neural.rotation.y = Math.sin(time * 0.4) * 0.12;
    }

    // privacy boundary + escaping event packets
    const shieldO = clamp01(ramp(p, 0.775, 0.84) - ramp(p, 0.915, 0.975));
    setGroupOpacity(shield, shieldO);
    if (shieldO > 0.015) {
      shield.userData.dots.forEach(function (d, i) {
        const cycle = (time * 0.7 + i * 0.45) % 1;
        d.position.z = 1.75 + cycle * 3.2;
        d.material.opacity = shieldO * (1 - cycle);
      });
    }

    // field-of-view rays — hero and finale only
    const raysO = clamp01(1 - ramp(p, 0.09, 0.17) + ramp(p, 0.9, 0.985));
    setGroupOpacity(rays, raysO);

    deviceGroup.position.y = Math.sin(time * 0.6) * 0.035;
  }

  const panels = PANEL_WINDOWS.map(function (w) {
    return { el: document.getElementById(w.id), a: w.a, b: w.b };
  }).filter(function (w) { return !!w.el; });

  const railDots = Array.prototype.slice.call(document.querySelectorAll('.journey__rail button'));
  const prompt = document.querySelector('.journey__prompt');

  function updateOverlays(p) {
    let activeIdx = 0;
    let best = -1;
    panels.forEach(function (w, i) {
      const fadeIn = w.a <= 0 ? 1 : ramp(p, w.a, w.a + 0.04);
      const fadeOut = 1 - ramp(p, w.b - 0.045, w.b);
      const o = clamp01(Math.min(fadeIn, fadeOut));
      w.el.style.opacity = o.toFixed(3);
      w.el.style.transform = 'translateY(' + ((1 - o) * 26).toFixed(1) + 'px)';
      w.el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
      if (o > best) { best = o; activeIdx = i; }
    });
    railDots.forEach(function (d, i) {
      d.classList.toggle('is-active', i === activeIdx);
    });
    if (prompt) prompt.style.opacity = String(clamp01(1 - ramp(p, 0.02, 0.07)));
  }

  resize();

  if (pinned) {
    journeyEl.classList.add('journey--pinned');
    resize();

    let targetP = 0;
    let smoothP = 0;

    function getProgress() {
      const rect = journeyEl.getBoundingClientRect();
      const total = journeyEl.offsetHeight - window.innerHeight;
      if (total <= 0) return 0;
      return clamp01(-rect.top / total);
    }

    railDots.forEach(function (d, i) {
      d.addEventListener('click', function () {
        const rect = journeyEl.getBoundingClientRect();
        const top = window.scrollY + rect.top;
        const total = journeyEl.offsetHeight - window.innerHeight;
        const midpoints = panels.map(function (w) { return w.a <= 0 ? 0 : (w.a + w.b) / 2; });
        window.scrollTo({ top: top + (midpoints[i] || 0) * total, behavior: 'smooth' });
      });
    });

    window.addEventListener('scroll', function () { targetP = getProgress(); }, { passive: true });
    targetP = getProgress();
    smoothP = targetP;

    (function loop() {
      const time = reduceMotion ? 1.5 : clock.getElapsedTime();
      smoothP += (targetP - smoothP) * 0.08;
      bg.material.uniforms.uTime.value = time;
      const ry = sampleCamera(smoothP);
      deviceGroup.rotation.y = ry + Math.sin(time * 0.25) * 0.03;
      applyDeviceState(smoothP, time);
      updateOverlays(smoothP);
      renderer.clear();
      renderer.render(bg.scene, bg.camera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    })();
  } else {
    // static / mobile / reduced-motion: idle device render behind stacked panels
    journeyEl.classList.add('journey--static');
    resize();
    setGroupOpacity(neural, 0);
    setGroupOpacity(shield, 0);
    camera.position.set(4.8, 2.5, 6.2);
    camera.lookAt(0, 0.3, 0);

    if (reduceMotion) {
      const time = 1;
      bg.material.uniforms.uTime.value = time;
      deviceGroup.rotation.y = -0.45;
      renderer.clear();
      renderer.render(bg.scene, bg.camera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      return;
    }

    (function loop() {
      const time = clock.getElapsedTime();
      bg.material.uniforms.uTime.value = time;
      deviceGroup.rotation.y = -0.45 + time * 0.06;
      deviceGroup.position.y = Math.sin(time * 0.6) * 0.035;
      renderer.clear();
      renderer.render(bg.scene, bg.camera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      requestAnimationFrame(loop);
    })();
  }
}

try {
  init();
} catch (err) {
  console.error('SensorDyme journey failed to initialize; static layout remains.', err);
  const el = document.querySelector('[data-journey]');
  if (el) {
    el.classList.remove('journey--pinned');
    el.classList.add('journey--no-webgl');
  }
}
