/**
 * SensorDyme hero — a floating, slowly rotating stylized camera rendered
 * with Three.js on a white stage. Built entirely from primitives (no
 * external 3D assets); intended as a stand-in until final product renders
 * of the real hardware are dropped in.
 *
 * Loaded as an ES module from a CDN — no build step. Any failure (no
 * WebGL, CDN blocked, runtime error) leaves the static SVG fallback
 * visible, since this script only hides it after a successful init.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

/**
 * Modeled on the official SensorDyme hardware photos: a wide, softly rounded
 * matte-graphite body with a dark pill-shaped lens recess, a row of mic
 * holes above it, and a thin light bar below it. Sits flat (no stand).
 */
function buildCamera() {
  const group = new THREE.Group();

  const graphite = new THREE.MeshStandardMaterial({ color: 0x3a3d43, roughness: 0.55, metalness: 0.25 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x1b1d21, roughness: 0.4, metalness: 0.3 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x07080b, roughness: 0.08, metalness: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.06,
  });

  // Body — wide and softly rounded like the official unit
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.7, 1.35, 1.05, 6, 0.3), graphite);
  group.add(body);

  // Pill-shaped front recess (extruded capsule outline)
  const pillShape = new THREE.Shape();
  const pw = 0.72, ph = 0.36; // half-width / half-height of the pill
  pillShape.absarc(-pw + ph, 0, ph, Math.PI / 2, Math.PI * 1.5, false);
  pillShape.lineTo(pw - ph, -ph);
  pillShape.absarc(pw - ph, 0, ph, Math.PI * 1.5, Math.PI / 2, false);
  pillShape.lineTo(-pw + ph, ph);
  const pill = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pillShape, { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3, curveSegments: 32 }),
    recess
  );
  pill.position.set(0, 0.02, 0.47);
  group.add(pill);

  // Lens: dark ring + glass dome + inner element
  const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 48), recess);
  lensRing.rotation.x = Math.PI / 2;
  lensRing.position.set(0, 0.02, 0.58);
  group.add(lensRing);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.26, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.4), glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.02, 0.58);
  lens.scale.z = 0.5;
  group.add(lens);

  const innerLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 32),
    new THREE.MeshStandardMaterial({ color: 0x233a63, roughness: 0.15, metalness: 0.6 })
  );
  innerLens.position.set(0, 0.02, 0.66);
  group.add(innerLens);

  // Mic holes above the recess
  const micMat = new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.6 });
  for (let i = 0; i < 5; i++) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 12), micMat);
    dot.rotation.x = Math.PI / 2;
    dot.position.set(-0.28 + i * 0.14, 0.5, 0.52);
    group.add(dot);
  }

  // Small side dots (sensors) at the outer edges
  [-1.02, 1.02].forEach((x) => {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 16), micMat);
    dot.rotation.x = Math.PI / 2;
    dot.position.set(x, 0.28, 0.5);
    group.add(dot);
  });

  // Thin light bar below the recess
  const bar = new THREE.Mesh(
    new RoundedBoxGeometry(0.42, 0.045, 0.03, 2, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xb9bec6, emissive: 0x9aa3ad, emissiveIntensity: 0.35, roughness: 0.35 })
  );
  bar.position.set(0, -0.52, 0.52);
  group.add(bar);

  return group;
}

function init() {
  const canvas = document.getElementById('heroCanvas');
  const fallback = document.getElementById('heroFallback');
  const stage = canvas ? canvas.parentElement : null;
  if (!canvas || !fallback || !stage) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 50);
  camera.position.set(0.4, 0.55, 6.2);
  camera.lookAt(0, -0.1, 0);

  // Bright studio lighting for a white stage
  scene.add(new THREE.HemisphereLight(0xffffff, 0xdfe3ea, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 5);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdbe4ff, 0.7);
  fill.position.set(-5, 2, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(0, 3, -6);
  scene.add(rim);

  const device = buildCamera();
  device.rotation.set(0.08, -0.5, 0);
  device.scale.setScalar(1.12);
  scene.add(device);

  function resize() {
    const rect = stage.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize, { passive: true });
  resize();

  // Reveal the canvas only once everything above succeeded.
  fallback.style.display = 'none';
  canvas.hidden = false;

  if (reduceMotion) {
    renderer.render(scene, camera);
    return;
  }

  let visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }, { threshold: 0 })
      .observe(stage);
  }

  (function animate() {
    requestAnimationFrame(animate);
    if (!visible) return;
    const t = performance.now() * 0.001;
    device.rotation.y = -0.5 + t * 0.25;
    device.position.y = Math.sin(t * 0.9) * 0.045;
    device.rotation.x = 0.08 + Math.sin(t * 0.6) * 0.02;
    renderer.render(scene, camera);
  })();
}

try {
  if (supportsWebGL()) init();
} catch (err) {
  console.error('SensorDyme hero scene failed to initialize; showing static fallback.', err);
}
