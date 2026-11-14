// The alligator at rest in its own world (snout +x, near side +z, not mirrored): its middle, the parts the cameras aim
// at, and D0, the hero-view distance at which the whole animal spans FILL of the page's 3D viewport, with the screen
// shift that centres it there. Shared by the film (sim_night.js) and the frame check (frame_check.mjs).
import * as THREE from 'three';
import {FOOT_HOME} from './alligator.js';
import {REST} from './tour_10.js';

// the page: a 1600 x 900 frame whose 3D viewport is x 250-1320, y 236-836 (night/console.js)
export const FRAME = {w: 1600, h: 900, vp: {x0: 250, x1: 1320, y0: 236, y1: 836}};
export const FOV = 30;
const D2R = Math.PI / 180;

export function samplePoints(root, per = 40) {
  const pts = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / per));
    for (let i = 0; i < p.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  return pts;
}

/** Where a camera {az, el, d, tx, ty, tz} (degrees, world as given) puts the points: the box in NDC. */
export function project(pts, cam, fov = FOV) {
  const c = new THREE.PerspectiveCamera(fov, FRAME.w / FRAME.h, 0.05, 80);
  const az = cam.az * D2R;
  const el = cam.el * D2R;
  c.position.set(cam.tx + cam.d * Math.cos(el) * Math.sin(az), cam.ty + cam.d * Math.sin(el), cam.tz + cam.d * Math.cos(el) * Math.cos(az));
  c.lookAt(cam.tx, cam.ty, cam.tz);
  c.updateMatrixWorld();
  c.updateProjectionMatrix();
  let x0 = 1e9;
  let x1 = -1e9;
  let y0 = 1e9;
  let y1 = -1e9;
  const q = new THREE.Vector3();
  for (const p of pts) {
    q.copy(p).project(c);
    if (q.z > 1) continue;
    x0 = Math.min(x0, q.x);
    x1 = Math.max(x1, q.x);
    y0 = Math.min(y0, q.y);
    y1 = Math.max(y1, q.y);
  }
  return {x0, x1, y0, y1};
}

export function restFrame(a, {az = 44, el = 8, fill = 0.86} = {}) {
  a.root.scale.x = 1;
  a.root.position.set(0, 0, 0);
  a.root.rotation.set(0, 0, 0);
  a.pose({...REST, feet: [0, 1, 2, 3].map(FOOT_HOME)});
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.root);
  const C = box.getCenter(new THREE.Vector3()).toArray();
  const W = (k) => {
    const A = a.anchors[k];
    return A.obj.localToWorld(A.at.clone()).toArray();
  };
  const pts = samplePoints(a.root);
  // the viewport's share of the frame's width, as a half-width in NDC
  const half = ((FRAME.vp.x1 - FRAME.vp.x0) / FRAME.w) * fill;
  let d = 6;
  let b;
  for (let k = 0; k < 8; k++) {
    b = project(pts, {az, el, d, tx: C[0], ty: C[1], tz: C[2]});
    d *= (b.x1 - b.x0) / 2 / half;
  }
  b = project(pts, {az, el, d, tx: C[0], ty: C[1], tz: C[2]});
  const fit = [(-(b.x0 + b.x1) / 2) * (FRAME.w / 2), ((b.y0 + b.y1) / 2) * (FRAME.h / 2)];
  const headC = a.skull.localToWorld(new THREE.Vector3(1.42, -0.04, 0)).toArray();
  return {C, D0: d, fit, eye: W('lens'), eyeF: W('lensF'), headC, jaw: W('jaw'), window: W('dome'), leg: W('foot'), tail: W('glassTail')};
}
