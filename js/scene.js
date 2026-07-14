/**
 * SensorDyme device scene — an original procedural wireframe visualization
 * (box body + lens + field-of-view rays), not a traced or copied 3D asset.
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

function buildDevice() {
  const group = new THREE.Group();

  const bodyGeo = new THREE.BoxGeometry(2.4, 1.3, 0.9);
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, transparent: true, opacity: 0.55 });
  group.add(new THREE.Mesh(bodyGeo, fillMat));

  const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
  const bodyLines = new THREE.LineSegments(bodyEdges, new THREE.LineBasicMaterial({ color: 0x4b5563 }));
  group.add(bodyLines);

  const lensGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 32);
  lensGeo.rotateX(Math.PI / 2);
  lensGeo.translate(0, 0, 0.53);
  const lensEdges = new THREE.EdgesGeometry(lensGeo);
  const lensLines = new THREE.LineSegments(lensEdges, new THREE.LineBasicMaterial({ color: 0x2563eb }));
  group.add(lensLines);

  const lensFillMat = new THREE.MeshBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.25 });
  group.add(new THREE.Mesh(lensGeo, lensFillMat));

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

  const dotMat = new THREE.MeshBasicMaterial({ color: 0xf2f3f5 });
  const dotGeo = new THREE.SphereGeometry(0.03, 8, 8);
  spread.forEach(([x, y], i) => {
    if (i === 2) return;
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.set(x * 0.85, y * 0.85, 2.65);
    group.add(dot);
  });

  return group;
}

function buildGrid() {
  const grid = new THREE.GridHelper(24, 48, 0x23272f, 0x14161b);
  grid.position.y = -1.5;
  return grid;
}

function init() {
  const sceneEl = document.getElementById('deviceScene');
  const canvas = document.getElementById('sceneCanvas');
  const fallback = document.getElementById('sceneFallback');
  if (!sceneEl || !canvas || !fallback) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isDesktop = window.innerWidth >= 700;
  const enableScrollPin = isDesktop && !reduceMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);

  const deviceGroup = buildDevice();
  deviceGroup.rotation.y = -0.4;
  scene.add(deviceGroup);
  scene.add(buildGrid());

  const camStart = new THREE.Vector3(4.4, 2.5, 5.4);
  const camEnd = new THREE.Vector3(1.5, 0.85, 2.6);
  const camIdle = new THREE.Vector3(3.6, 1.9, 4.6);
  const lookStart = new THREE.Vector3(0, 0, 0);
  const lookEnd = new THREE.Vector3(0, 0, 0.5);

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

  if (reduceMotion) {
    camera.position.copy(camIdle);
    camera.lookAt(0, 0, 0.2);
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
      const eased = easeInOutCubic(smoothProgress);
      camera.position.lerpVectors(camStart, camEnd, eased);
      const look = new THREE.Vector3().lerpVectors(lookStart, lookEnd, smoothProgress);
      camera.lookAt(look);
      deviceGroup.rotation.y += 0.0016;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  } else {
    (function animate() {
      camera.position.copy(camIdle);
      camera.lookAt(0, 0, 0.25);
      deviceGroup.rotation.y += 0.0035;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    })();
  }
}

try {
  if (supportsWebGL()) {
    init();
  }
} catch (err) {
  console.error('SensorDyme device scene failed to initialize; showing static fallback.', err);
}
