// ROUND 4: the model fixes only (lower helmet casque, shorter blunter jaw, toes closing on the branch), tongue 0.3.
// ROUND 3: lower and closer (az -36, el 5, FOV 40), front 3/4 like the hero; the frame is fitted on the chameleon
// alone at 0.85 of the width (the branch may run out at the sides); head turned a little toward the lens.
// (round 2 is kept in sims/chameleon-still-r2)
// ROUND 2: closer and wider (FOV 38, az -30) so the head reads big as in the hero; bloom threshold 1.4 (no glints).
// (round 1 is kept in sims/chameleon-still-r1)
// ROUND 1: the robotic chameleon's still, posed like 01_hero.png: head left, front 3/4 from a little above the branch,
// mouth open with the glass tongue tip out, the eye turrets looking two ways, four gripping feet on the steel branch,
// the tail in a tight spiral beside it. Mirrored across x so the snout points left. Lights after the alligator r5:
// a cold blue rim from behind, a warm key from the left, bloom 0.15 / threshold 1.2, a floor shadow. The frame is fitted
// so the animal and the branch span FILL of the width.
import * as THREE from 'three';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {PAPER_NIGHT, retint} from '../night/look.js';
import {buildChameleon, FLOOR_Y} from '../chameleon-shared/chameleon.js';
import {createStage, PAPER} from '../shark-shared/stage.js';

Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});
const D2R = Math.PI / 180;
export const HERO_POSE = {
  t: 1,
  gape: 20,
  headUp: 2,
  headYaw: -10,
  eyes: [
    [-25, 8],
    [20, -6],
  ],
  tongue: 0.3,
  droop: 42,
  hang: 32,
  curl: 1,
};
const AZ = -36;
const EL = 5;
const FILL = 0.85;
const FOV = 40;

runSim({duration: 4, fps: 60, hud: {enabled: false}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
  const a = buildChameleon();
  a.root.scale.x = -1;
  a.pose(HERO_POSE);
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.body);
  const c = box.getCenter(new THREE.Vector3());
  const st = createStage({canvas, floorY: FLOOR_Y, span: 2.6});
  st.addBody(a);
  const rim = new THREE.DirectionalLight('#5d9be6', 4.2);
  const cd = new THREE.Vector3(Math.sin(AZ * D2R) * Math.cos(EL * D2R), Math.sin(EL * D2R), Math.cos(AZ * D2R) * Math.cos(EL * D2R));
  rim.position.copy(c).addScaledVector(cd, -8).add(new THREE.Vector3(0, 1.6, 0));
  rim.target.position.copy(c);
  const warm = new THREE.DirectionalLight('#d9894f', 3.4);
  warm.position.set(c.x - 6, c.y + 3, c.z + 5);
  warm.target.position.copy(c);
  st.scene.add(rim, rim.target, warm, warm.target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.15, 0.4, 1.4);
  st.composer.insertPass(bloom, st.composer.passes.length - 1);

  const pts = [];
  a.body.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 40));
    for (let i = 0; i < p.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  st.camera.fov = FOV;
  st.camera.updateProjectionMatrix();
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.05, 80);
  const HERO = {tx: c.x, ty: c.y, tz: c.z, az: AZ * D2R, el: EL * D2R, d: 6, sx: 0, sy: 0};
  const place = () => {
    cam.position.set(HERO.tx + HERO.d * Math.cos(HERO.el) * Math.sin(HERO.az), HERO.ty + HERO.d * Math.sin(HERO.el), HERO.tz + HERO.d * Math.cos(HERO.el) * Math.cos(HERO.az));
    cam.lookAt(HERO.tx, HERO.ty, HERO.tz);
    cam.updateMatrixWorld();
    let x0 = 1e9;
    let x1 = -1e9;
    let y0 = 1e9;
    let y1 = -1e9;
    for (const p of pts) {
      const q = p.clone().project(cam);
      x0 = Math.min(x0, q.x);
      x1 = Math.max(x1, q.x);
      y0 = Math.min(y0, q.y);
      y1 = Math.max(y1, q.y);
    }
    return {x0, x1, y0, y1};
  };
  for (let k = 0; k < 6; k++) {
    const b = place();
    HERO.d *= Math.max((b.x1 - b.x0) / 2 / FILL, (b.y1 - b.y0) / 2 / 0.9);
  }
  const b = place();
  const fit = {cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2};
  window.CHAM = {st, a, HERO, fit, b};
  const resize = () => st.resize(innerWidth, innerHeight, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
  resize();
  return {
    resize,
    render(t) {
      a.pose({...HERO_POSE, t});
      retint(a.root);
      st.frame({...HERO, sx: -fit.cx * innerWidth * 0.5, sy: fit.cy * innerHeight * 0.5}, {guides: 0});
      return {};
    },
  };
});
