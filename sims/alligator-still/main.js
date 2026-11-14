// ROUND 3: the camera low and close (front 3/4 from just above the floor, a wider lens so the head reads big), the
// belly low, the legs sprawled, jaws open ~32° with the head raised so the chin clears the floor.
// (round 2 is kept in sims/alligator-still-r2, round 1 in sims/alligator-still-r1)
// The robotic alligator's still, posed like the hero panel of alligator.png: head left, front 3/4 from a little above,
// mouth wide open, the near front foot stepping forward, the tail curving back and down. The body is mirrored across x
// so the snout points left. Lights after the hummingbird's: a cold blue rim from behind, a warm key from the left,
// bloom 0.15 / threshold 1.2, a visible floor shadow. The frame is fitted so the whole animal spans FILL of the width.
import * as THREE from 'three';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {PAPER_NIGHT, retint} from '../night/look.js';
import {buildAlligator, FLOOR_Y, NSEG} from '../alligator-shared/alligator.js';
import {createStage, PAPER} from '../shark-shared/stage.js';

Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});
const D2R = Math.PI / 180;
export const HERO_POSE = {
  t: 1,
  gape: 32,
  headUp: 17,
  headYaw: -5,
  // down at the root to the floor, level through the middle, curling down at the tip; a gentle sweep toward the lens
  tailPitch: [...Array(NSEG).keys()].map((i) => (i < 6 ? 1.6 : i < 13 ? -0.5 : 1.6 + (i - 13) * 1.7)),
  tailYaw: [...Array(NSEG).keys()].map((i) => (i < 3 ? 0.5 * i : i < 10 ? 2.4 : 4.2)),
  feet: [
    [0.92, FLOOR_Y, 0.64],
    [0.76, FLOOR_Y, -0.6],
    [-0.2, FLOOR_Y, 0.66],
    [-0.42, FLOOR_Y, -0.62],
  ],
};
const AZ = -40;
const EL = 6;
const FILL = 0.85;

runSim({duration: 4, fps: 60, hud: {enabled: false}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
  const a = buildAlligator();
  a.root.scale.x = -1;
  a.pose(HERO_POSE);
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.root);
  const c = box.getCenter(new THREE.Vector3());
  const st = createStage({canvas, floorY: FLOOR_Y, span: 3.2});
  st.addBody(a);
  const rim = new THREE.DirectionalLight('#5d9be6', 4.2);
  const cd = new THREE.Vector3(Math.sin(AZ * D2R) * Math.cos(EL * D2R), Math.sin(EL * D2R), Math.cos(AZ * D2R) * Math.cos(EL * D2R));
  rim.position.copy(c).addScaledVector(cd, -8).add(new THREE.Vector3(0, 1.6, 0));
  rim.target.position.copy(c);
  const warm = new THREE.DirectionalLight('#d9894f', 3.6);
  warm.position.set(c.x - 6, c.y + 3, c.z + 5);
  warm.target.position.copy(c);
  st.scene.add(rim, rim.target, warm, warm.target);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.15, 0.4, 1.2);
  st.composer.insertPass(bloom, st.composer.passes.length - 1);

  // fit: sample vertices of every mesh in world space, project, scale the distance and shift so the animal spans FILL
  const pts = [];
  a.root.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    const step = Math.max(1, Math.floor(p.count / 40));
    for (let i = 0; i < p.count; i += step) pts.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld));
  });
  // a wider lens from closer in: the near head grows against the tail, as in the hero panel
  const FOV = 40;
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
    HERO.d *= (b.x1 - b.x0) / 2 / FILL;
  }
  const b = place();
  // centre the box on screen with a view offset (CSS px of a 1600x900 frame, scaled at render)
  const fit = {cx: (b.x0 + b.x1) / 2, cy: (b.y0 + b.y1) / 2 + 0.04};
  window.GATOR = {st, a, HERO, fit};
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
