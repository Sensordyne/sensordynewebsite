/**
 * SensorDyme homepage scene — a single continuous, scroll-driven journey
 * through five original procedural visualizations: the physical device,
 * a close view of the lens, a push through into an abstract node-graph
 * standing in for "the on-device model," a reframe emphasizing its
 * modularity, and a pull-back reveal of an abstract "works anywhere"
 * globe. No traced, purchased, or copied 3D assets are used anywhere in
 * this file — everything is built from Three.js primitives.
 *
 * Loaded as an ES module directly from a CDN — no bundler, no build step.
 * Any failure (WebGL unsupported, CDN blocked, runtime error) leaves the
 * static SVG fallback in #sceneFallback visible, since that is the default
 * DOM state and this script only hides it after a confirmed successful init.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (e) {
    return false;
  }
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerpVec(a, b, t) {
  return new THREE.Vector3().lerpVectors(a, b, t);
}

/* ---------------------------------------------------------------------
   Geometry builders
   ------------------------------------------------------------------ */

function buildDevice() {
  const group = new THREE.Group();
  const fadeMaterials = [];

  const bodyGeo = new THREE.BoxGeometry(2.4, 1.3, 0.9);
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, transparent: true, opacity: 0.55 });
  group.add(new THREE.Mesh(bodyGeo, fillMat));
  fadeMaterials.push({ mat: fillMat, base: 0.55 });

  const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
  const bodyLineMat = new THREE.LineBasicMaterial({ color: 0x4b5563, transparent: true, opacity: 1 });
  group.add(new THREE.LineSegments(bodyEdges, bodyLineMat));
  fadeMaterials.push({ mat: bodyLineMat, base: 1 });

  const lensGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 32);
  lensGeo.rotateX(Math.PI / 2);
  lensGeo.translate(0, 0, 0.53);
  const lensEdges = new THREE.EdgesGeometry(lensGeo);
  const lensLineMat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 1 });
  group.add(new THREE.LineSegments(lensEdges, lensLineMat));
  fadeMaterials.push({ mat: lensLineMat, base: 1 });

  const lensFillMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.25 });
  group.add(new THREE.Mesh(lensGeo, lensFillMat));
  fadeMaterials.push({ mat: lensFillMat, base: 0.25 });

  const rayMat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.3 });
  const lensTip = new THREE.Vector3(0, 0, 0.62);
  const spread = [
    [-1.15, 0.75], [-0.58, 0.95], [0, 1.05], [0.58, 0.95], [1.15, 0.75],
  ];
  spread.forEach(([x, y]) => {
    const end = new THREE.Vector3(x, y, 3.1);
    const geo = new THREE.BufferGeometry().setFromPoints([lensTip, end]);
    group.add(new THREE.Line(geo, rayMat));
  });
  fadeMaterials.push({ mat: rayMat, base: 0.3 });

  const dotMat = new THREE.MeshBasicMaterial({ color: 0xf2f3f5, transparent: true, opacity: 1 });
  const dotGeo = new THREE.SphereGeometry(0.03, 8, 8);
  spread.forEach(([x, y], i) => {
    if (i === 2) return;
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x * 0.85, y * 0.85, 2.65);
    group.add(dot);
  });
  fadeMaterials.push({ mat: dotMat, base: 1 });

  return { group, fadeMaterials };
}

function buildGrid() {
  const grid = new THREE.GridHelper(24, 48, 0x23272f, 0x14161b);
  grid.position.y = -1.5;
  grid.material.transparent = true;
  grid.material.opacity = 1;
  return grid;
}

function ringPositions(count, radiusX, radiusY, z) {
  const pts = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radiusX, Math.sin(a) * radiusY, z));
  }
  return pts;
}

/**
 * Abstract node-graph standing in for "the on-device model" — a generic
 * layered network illustration (input landmarks -> hidden layers -> output
 * event), not a depiction of any specific published architecture.
 */
function buildNeuralNet() {
  const group = new THREE.Group();
  const nodeMaterials = [];
  const lineMaterials = [];
  const pulsingNodes = [];

  const layerDefs = [
    { z: -1.0, count: 5, rx: 0.55, ry: 0.35 },
    { z: -1.8, count: 8, rx: 0.8, ry: 0.5 },
    { z: -2.6, count: 8, rx: 0.8, ry: 0.5 },
    { z: -3.4, count: 3, rx: 0.4, ry: 0.25 },
  ];
  const layers = layerDefs.map((d) => ringPositions(d.count, d.rx, d.ry, d.z));

  const nodeGeo = new THREE.SphereGeometry(0.05, 10, 10);

  layers.forEach((layer, layerIndex) => {
    layer.forEach((pos) => {
      const mat = new THREE.MeshBasicMaterial({ color: 0x6d9bff, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(nodeGeo, mat);
      mesh.position.copy(pos);
      group.add(mesh);
      nodeMaterials.push(mat);
      pulsingNodes.push({ mesh, layerIndex });
    });
  });

  for (let l = 0; l < layers.length - 1; l++) {
    layers[l].forEach((a) => {
      layers[l + 1].forEach((b) => {
        const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
        const mat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0 });
        group.add(new THREE.Line(geo, mat));
        lineMaterials.push(mat);
      });
    });
  }

  return { group, nodeMaterials, lineMaterials, pulsingNodes };
}

function spherePoint(theta, phi, r) {
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

/**
 * Abstract "works anywhere" globe — arbitrary spherical node placement,
 * not real coordinates. A network motif, not a map: nothing here implies
 * specific customer counts or deployment locations.
 */
function buildGlobe() {
  const group = new THREE.Group();
  const radius = 1.5;
  const fadeMaterials = [];

  const icoGeo = new THREE.IcosahedronGeometry(radius, 3);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2a2f3a, transparent: true, opacity: 0 });
  group.add(new THREE.LineSegments(wireGeo, wireMat));
  fadeMaterials.push({ mat: wireMat, base: 0.7 });

  const coreMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, transparent: true, opacity: 0 });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.985, 32, 32), coreMat));
  fadeMaterials.push({ mat: coreMat, base: 0.5 });

  const nodeAngles = [
    [0.6, 0.9], [2.1, 0.35], [3.4, 1.15], [4.6, 0.55], [5.5, 1.35], [1.4, 1.75], [3.0, 2.05],
  ];
  const nodes = nodeAngles.map(([theta, phi]) => spherePoint(theta, phi, radius));

  const nodeMat = new THREE.MeshBasicMaterial({ color: 0x6d9bff, transparent: true, opacity: 0 });
  const nodeGeo = new THREE.SphereGeometry(0.033, 10, 10);
  nodes.forEach((pos) => {
    const mesh = new THREE.Mesh(nodeGeo, nodeMat);
    mesh.position.copy(pos);
    group.add(mesh);
  });
  fadeMaterials.push({ mat: nodeMat, base: 1 });

  const arcPairs = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 0]];
  const arcMat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0 });
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xbfd2ff, transparent: true, opacity: 0 });
  const pulseGeo = new THREE.SphereGeometry(0.026, 8, 8);
  const pulses = [];

  arcPairs.forEach(([ai, bi], i) => {
    const a = nodes[ai];
    const b = nodes[bi];
    const mid = a.clone().add(b).multiplyScalar(0.5).normalize().multiplyScalar(radius * 1.35);
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
    group.add(new THREE.Line(geo, arcMat));

    const pulse = new THREE.Mesh(pulseGeo, pulseMat);
    group.add(pulse);
    pulses.push({ curve, mesh: pulse, offset: i / arcPairs.length, speed: 0.12 + i * 0.015 });
  });
  fadeMaterials.push({ mat: arcMat, base: 0.55 }, { mat: pulseMat, base: 1 });

  return { group, fadeMaterials, pulses };
}

/* ---------------------------------------------------------------------
   Journey keyframes — five phases, each mapped to a real, already-
   established product fact (see the matching captions in index.html).
   ------------------------------------------------------------------ */

const KEYFRAMES = [
  { p: 0.00, pos: [4.4, 2.5, 5.4], look: [0, 0, 0], dev: 1, net: 0, globe: 0 },     // 1. The device
  { p: 0.20, pos: [1.5, 0.85, 2.6], look: [0, 0, 0.5], dev: 1, net: 0, globe: 0 },  // 1 -> 2
  { p: 0.40, pos: [1.5, 0.85, 2.6], look: [0, 0, 0.5], dev: 1, net: 0, globe: 0 },  // 2. Real-time (hold on lens)
  { p: 0.60, pos: [0.7, 0.75, 0.9], look: [0, 0, -1.9], dev: 0, net: 1, globe: 0 }, // 3. Privacy (push through)
  { p: 0.80, pos: [-0.9, 0.9, -1.0], look: [0, 0, -2.6], dev: 0, net: 1, globe: 0 },// 4. Modularity (reframe)
  { p: 1.00, pos: [0.3, 1.0, 1.8], look: [0, 0, -2.2], dev: 0, net: 0, globe: 1 },  // 5. Reach (pull back to globe)
];

function getJourneyState(p) {
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    const a = KEYFRAMES[i];
    const b = KEYFRAMES[i + 1];
    if (p >= a.p && p <= b.p) {
      const span = b.p - a.p || 1;
      const local = (p - a.p) / span;
      const eased = easeInOutCubic(local);
      return {
        pos: lerpVec(new THREE.Vector3(...a.pos), new THREE.Vector3(...b.pos), eased),
        look: lerpVec(new THREE.Vector3(...a.look), new THREE.Vector3(...b.look), local),
        dev: a.dev + (b.dev - a.dev) * local,
        net: a.net + (b.net - a.net) * local,
        globe: a.globe + (b.globe - a.globe) * local,
      };
    }
  }
  const last = KEYFRAMES[KEYFRAMES.length - 1];
  return {
    pos: new THREE.Vector3(...last.pos), look: new THREE.Vector3(...last.look),
    dev: last.dev, net: last.net, globe: last.globe,
  };
}

// One caption per journey segment. Each holds full opacity across the
// middle of its 0.2-wide segment and crossfades only at the boundaries —
// the first caption is fully visible from p=0, the last stays fully
// visible through p=1, so the journey both opens and lands on a readable
// caption rather than a mid-fade.
const CAPTION_SEGMENTS = [
  [0.00, 0.20], [0.20, 0.40], [0.40, 0.60], [0.60, 0.80], [0.80, 1.00],
];
const CAPTION_FADE = 0.06;

function clamp01(x) { return Math.min(1, Math.max(0, x)); }

function captionOpacity(i, p) {
  const [start, end] = CAPTION_SEGMENTS[i];
  const isFirst = i === 0;
  const isLast = i === CAPTION_SEGMENTS.length - 1;
  const fadeInEnd = start + CAPTION_FADE;
  const fadeOutStart = end - CAPTION_FADE;

  if (p < fadeInEnd) {
    if (isFirst) return 1;
    return clamp01((p - (start - CAPTION_FADE)) / (2 * CAPTION_FADE));
  }
  if (p > fadeOutStart) {
    if (isLast) return 1;
    return clamp01(((end + CAPTION_FADE) - p) / (2 * CAPTION_FADE));
  }
  return 1;
}

function initScene() {
  const sceneEl = document.getElementById('deviceScene');
  const canvas = document.getElementById('sceneCanvas');
  const fallback = document.getElementById('sceneFallback');
  if (!sceneEl || !canvas || !fallback) return;

  const captionEls = CAPTION_SEGMENTS.map((_, i) => document.getElementById('sceneCaption' + i));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.innerWidth >= 700;
  const enableScrollPin = isDesktop && !reduceMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const { group: deviceGroup, fadeMaterials: deviceFadeMats } = buildDevice();
  deviceGroup.rotation.y = -0.4;
  scene.add(deviceGroup);

  const grid = buildGrid();
  scene.add(grid);

  const { group: netGroup, nodeMaterials, lineMaterials, pulsingNodes } = buildNeuralNet();
  scene.add(netGroup);

  const { group: globeGroup, fadeMaterials: globeFadeMats, pulses: globePulses } = buildGlobe();
  globeGroup.position.set(0, 0, -2.2);
  globeGroup.rotation.x = 0.15;
  scene.add(globeGroup);

  const camIdle = new THREE.Vector3(3.6, 1.9, 4.6);

  function resize() {
    const rect = sceneEl.getBoundingClientRect();
    const stage = sceneEl.querySelector('.scene__stage');
    const height = (stage ? stage.getBoundingClientRect().height : rect.height) || window.innerHeight;
    const width = rect.width || window.innerWidth;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Reveal the canvas only once everything above succeeded.
  fallback.hidden = true;
  canvas.hidden = false;

  function applyOpacity(devO, netO, globeO) {
    deviceFadeMats.forEach(({ mat, base }) => { mat.opacity = base * devO; });
    grid.material.opacity = devO;
    nodeMaterials.forEach((m) => { m.opacity = netO; });
    lineMaterials.forEach((m) => { m.opacity = netO * 0.35; });
    globeFadeMats.forEach(({ mat, base }) => { mat.opacity = base * globeO; });
  }

  function updateCaptions(p) {
    CAPTION_SEGMENTS.forEach((_, i) => {
      const el = captionEls[i];
      if (!el) return;
      el.style.opacity = String(captionOpacity(i, p));
    });
  }

  if (reduceMotion) {
    camera.position.copy(camIdle);
    camera.lookAt(0, 0, 0.2);
    applyOpacity(1, 0, 0);
    if (captionEls[0]) captionEls[0].style.opacity = '1';
    renderer.render(scene, camera);
    return;
  }

  if (enableScrollPin) {
    sceneEl.classList.add('scene--pinned');
    resize();

    let targetProgress = 0;
    let smoothProgress = 0;

    function getProgress() {
      const rect = sceneEl.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      if (total <= 0) return 0;
      return Math.min(Math.max(-rect.top / total, 0), 1);
    }

    window.addEventListener('scroll', () => { targetProgress = getProgress(); }, { passive: true });
    targetProgress = getProgress();

    (function animate() {
      smoothProgress += (targetProgress - smoothProgress) * 0.08;
      const p = smoothProgress;
      const t = performance.now() * 0.001;
      const state = getJourneyState(p);

      camera.position.copy(state.pos);
      camera.lookAt(state.look);
      applyOpacity(state.dev, state.net, state.globe);
      updateCaptions(p);

      pulsingNodes.forEach(({ mesh, layerIndex }) => {
        const phase = (t - layerIndex * 0.3) % 2;
        const pulse = Math.max(0, 1 - Math.abs(phase - 0.3) * 3);
        mesh.scale.setScalar(1 + pulse * 0.7);
      });

      globePulses.forEach((pulse) => {
        const along = (t * pulse.speed + pulse.offset) % 1;
        pulse.mesh.position.copy(pulse.curve.getPoint(along)).add(globeGroup.position);
      });

      deviceGroup.rotation.y += 0.0012;
      netGroup.rotation.y += 0.0008;
      globeGroup.rotation.y += 0.0009;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  } else {
    if (captionEls[0]) captionEls[0].style.opacity = '1';
    (function animate() {
      camera.position.copy(camIdle);
      camera.lookAt(0, 0, 0.25);
      applyOpacity(1, 0, 0);
      deviceGroup.rotation.y += 0.0035;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  }
}

try {
  if (supportsWebGL()) {
    initScene();
  }
} catch (err) {
  console.error('SensorDyme scene failed to initialize; showing static fallback.', err);
}
