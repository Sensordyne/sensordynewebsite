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

function buildCamera() {
  const group = new THREE.Group();

  const graphite = new THREE.MeshStandardMaterial({ color: 0x2e3138, roughness: 0.5, metalness: 0.35 });
  const darkFace = new THREE.MeshStandardMaterial({ color: 0x1b1d22, roughness: 0.35, metalness: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x0a0c12, roughness: 0.08, metalness: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.06,
  });
  const ring = new THREE.MeshStandardMaterial({ color: 0x53565c, roughness: 0.25, metalness: 0.85 });

  // Body
  const body = new THREE.Mesh(new RoundedBoxGeometry(2.6, 1.5, 1.0, 5, 0.18), graphite);
  group.add(body);

  // Front faceplate
  const face = new THREE.Mesh(new RoundedBoxGeometry(2.3, 1.24, 0.14, 4, 0.1), darkFace);
  face.position.z = 0.48;
  group.add(face);

  // Lens ring + barrel + glass
  const lensRing = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.14, 48), ring);
  lensRing.rotation.x = Math.PI / 2;
  lensRing.position.z = 0.6;
  group.add(lensRing);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.22, 48), darkFace);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.68;
  group.add(barrel);

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.4, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2.4), glass);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.7;
  lens.scale.z = 0.55;
  group.add(lens);

  // Inner lens element catches light
  const innerLens = new THREE.Mesh(
    new THREE.CircleGeometry(0.16, 32),
    new THREE.MeshStandardMaterial({ color: 0x27406e, roughness: 0.15, metalness: 0.6 })
  );
  innerLens.position.z = 0.82;
  group.add(innerLens);

  // Status LED
  const led = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 1.6 })
  );
  led.position.set(1.02, 0.5, 0.56);
  group.add(led);

  // Microphone dots
  const micMat = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: 0.6 });
  for (let i = 0; i < 3; i++) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.03, 12), micMat);
    dot.rotation.x = Math.PI / 2;
    dot.position.set(-1.0 + i * 0.12, -0.5, 0.56);
    group.add(dot);
  }

  // Mount stem + base
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.5, 24), ring);
  stem.position.y = -0.98;
  group.add(stem);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.62, 0.1, 40), graphite);
  base.position.y = -1.26;
  group.add(base);

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
