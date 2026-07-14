/**
 * Abstract "runs anywhere" globe — a generic wireframe sphere with a
 * handful of arbitrarily-placed nodes and connecting arcs. This is a
 * conceptual motif (network/reach), not a map: node positions are picked
 * from arbitrary spherical angles, not real coordinates, and nothing here
 * claims specific customer counts or deployment locations — see the
 * section copy in index.html for the actual (honest) claim being made.
 *
 * Loaded as an ES module directly from a CDN — no bundler, no build step.
 * Same fallback contract as js/scene.js: the static SVG in #globeFallback
 * is the default DOM state and is only hidden after a confirmed successful
 * WebGL init.
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

function spherePoint(theta, phi, r) {
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

function buildGlobe() {
  const group = new THREE.Group();
  const radius = 1.6;

  const icoGeo = new THREE.IcosahedronGeometry(radius, 3);
  const wireGeo = new THREE.WireframeGeometry(icoGeo);
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2a2f3a, transparent: true, opacity: 0.7 });
  group.add(new THREE.LineSegments(wireGeo, wireMat));

  const coreMat = new THREE.MeshBasicMaterial({ color: 0x0d0f14, transparent: true, opacity: 0.5 });
  group.add(new THREE.Mesh(new THREE.SphereGeometry(radius * 0.985, 32, 32), coreMat));

  // Arbitrary angles — a generic network motif, not a map of real locations.
  const nodeAngles = [
    [0.6, 0.9], [2.1, 0.35], [3.4, 1.15], [4.6, 0.55], [5.5, 1.35], [1.4, 1.75], [3.0, 2.05],
  ];
  const nodes = nodeAngles.map(([theta, phi]) => spherePoint(theta, phi, radius));

  const nodeMat = new THREE.MeshBasicMaterial({ color: 0x6d9bff });
  const nodeGeo = new THREE.SphereGeometry(0.035, 10, 10);
  nodes.forEach((pos) => {
    const mesh = new THREE.Mesh(nodeGeo, nodeMat);
    mesh.position.copy(pos);
    group.add(mesh);
  });

  const arcPairs = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 0]];
  const arcMat = new THREE.LineBasicMaterial({ color: 0x2563eb, transparent: true, opacity: 0.55 });
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xbfd2ff });
  const pulseGeo = new THREE.SphereGeometry(0.028, 8, 8);
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

  return { group, pulses };
}

function initGlobeScene() {
  const sectionEl = document.getElementById('globeScene');
  const stageEl = sectionEl ? sectionEl.querySelector('.globe__stage') : null;
  const canvas = document.getElementById('globeCanvas');
  const fallback = document.getElementById('globeFallback');
  if (!sectionEl || !stageEl || !canvas || !fallback) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.9, 4.4);
  camera.lookAt(0, 0, 0);

  const { group: globeGroup, pulses } = buildGlobe();
  globeGroup.rotation.x = 0.15;
  scene.add(globeGroup);

  function resize() {
    const rect = stageEl.getBoundingClientRect();
    const width = rect.width || window.innerWidth;
    const height = rect.height || 480;
    renderer.setSize(width, height, false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  fallback.hidden = true;
  canvas.hidden = false;

  if (reduceMotion) {
    renderer.render(scene, camera);
    return;
  }

  (function animate() {
    const t = performance.now() * 0.001;
    globeGroup.rotation.y += 0.0009;

    pulses.forEach((p) => {
      const along = (t * p.speed + p.offset) % 1;
      p.mesh.position.copy(p.curve.getPoint(along));
    });

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  })();
}

try {
  if (supportsWebGL()) {
    initGlobeScene();
  }
} catch (err) {
  console.error('SensorDyme globe scene failed to initialize; showing static fallback.', err);
}
