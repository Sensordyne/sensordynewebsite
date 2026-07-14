/**
 * SensorDyme device scene — an original procedural visualization: a
 * wireframe device (box body + lens + field-of-view rays) that the camera
 * approaches, then a scroll-driven push through the lens into an abstract
 * node-graph representing the on-device model. No traced or purchased 3D
 * assets are used anywhere in this file.
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

function initDeviceScene() {
  const sceneEl = document.getElementById('deviceScene');
  const canvas = document.getElementById('sceneCanvas');
  const fallback = document.getElementById('sceneFallback');
  const hudOuter = document.getElementById('sceneHudOuter');
  const hudInner = document.getElementById('sceneHudInner');
  if (!sceneEl || !canvas || !fallback) return;

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

  const camStart = new THREE.Vector3(4.4, 2.5, 5.4);
  const camLens = new THREE.Vector3(1.5, 0.85, 2.6);
  const camInside = new THREE.Vector3(0.7, 0.75, 0.9);
  const camIdle = new THREE.Vector3(3.6, 1.9, 4.6);
  const lookStart = new THREE.Vector3(0, 0, 0);
  const lookLens = new THREE.Vector3(0, 0, 0.5);
  const lookInside = new THREE.Vector3(0, 0, -1.9);

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

  function applyFade(deviceOpacity, netOpacity) {
    deviceFadeMats.forEach(({ mat, base }) => { mat.opacity = base * deviceOpacity; });
    grid.material.opacity = deviceOpacity;
    nodeMaterials.forEach((m) => { m.opacity = netOpacity; });
    lineMaterials.forEach((m) => { m.opacity = netOpacity * 0.35; });
    if (hudOuter) hudOuter.style.opacity = String(deviceOpacity);
    if (hudInner) hudInner.style.opacity = String(netOpacity);
  }

  if (reduceMotion) {
    camera.position.copy(camIdle);
    camera.lookAt(0, 0, 0.2);
    applyFade(1, 0);
    renderer.render(scene, camera);
    return;
  }

  const SPLIT = 0.6; // fraction of the journey spent outside before pushing "inside"

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

      if (p <= SPLIT) {
        const local = p / SPLIT;
        const eased = easeInOutCubic(local);
        camera.position.copy(lerpVec(camStart, camLens, eased));
        camera.lookAt(lerpVec(lookStart, lookLens, local));
        applyFade(1, 0);
      } else {
        const local = (p - SPLIT) / (1 - SPLIT);
        const eased = easeInOutCubic(local);
        camera.position.copy(lerpVec(camLens, camInside, eased));
        camera.lookAt(lerpVec(lookLens, lookInside, local));
        applyFade(1 - local, local);
      }

      pulsingNodes.forEach(({ mesh, layerIndex }) => {
        const phase = (t - layerIndex * 0.3) % 2;
        const pulse = Math.max(0, 1 - Math.abs(phase - 0.3) * 3);
        mesh.scale.setScalar(1 + pulse * 0.7);
      });

      deviceGroup.rotation.y += 0.0012;
      netGroup.rotation.y += 0.0008;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  } else {
    (function animate() {
      camera.position.copy(camIdle);
      camera.lookAt(0, 0, 0.25);
      applyFade(1, 0);
      deviceGroup.rotation.y += 0.0035;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  }
}

try {
  if (supportsWebGL()) {
    initDeviceScene();
  }
} catch (err) {
  console.error('SensorDyme device scene failed to initialize; showing static fallback.', err);
}
