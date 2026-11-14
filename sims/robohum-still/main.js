// The robotic hummingbird's still: posed like hummingbird.png (beak left, side in front 3/4, the body leaning ~40°,
// wings in a wide V). The body is mirrored across x so the beak is on the left. Round 9: camera 15 % closer, rim straight from behind. Round 8: the lights of the picture
// (a cold blue rim from behind, a warm key from the left, bloom on the glass) and a frame fitted to the bird.
import * as THREE from 'three';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {PAPER_NIGHT, retint} from '../night/look.js';
import {buildBird} from '../robohum-shared/bird.js';
import {createStage, PAPER} from '../wasp-shared/stage.js';

// the floor's bottom stop a touch lighter than the night look's #09090A, so the soft floor shadow reads (still only)
Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});
const D2R = Math.PI / 180;
const POSE = {t: 1, sweepN: -64, sweepF: 64, lift: 15};
const AZ = -15;
const EL = 15; // up 10° from r8: the far wing clears the beak
const FILL = 0.8; // share of the frame's width

runSim({duration: 4, fps: 60, hud: {enabled: false}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
  const b = buildBird();
  b.root.scale.x = -1;
  b.pose(POSE);
  b.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(b.root);
  const c = box.getCenter(new THREE.Vector3());
  const st = createStage({canvas, floorY: box.min.y - 0.1});
  st.addBee(b);
  // the picture's light: a strong cold rim from behind outlining the silhouette, a warm key from the left
  const rim = new THREE.DirectionalLight('#5d9be6', 4.5);
  const cd = new THREE.Vector3(Math.sin(AZ * D2R) * Math.cos(EL * D2R), Math.sin(EL * D2R), Math.cos(AZ * D2R) * Math.cos(EL * D2R));
  rim.position.copy(c).addScaledVector(cd, -8).add(new THREE.Vector3(0, 1.2, 0));
  rim.target.position.copy(c);
  const warm = new THREE.DirectionalLight('#CC774B', 2.2);
  warm.position.set(c.x - 7, c.y + 2, c.z + 3);
  warm.target.position.copy(c);
  st.scene.add(rim, rim.target, warm, warm.target);
  // bloom on the lit glass, before the output pass
  const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.15, 0.4, 1.2);
  st.composer.insertPass(bloom, st.composer.passes.length - 1);
  // the frame: the bird's box at FILL of the width (horizontal half-angle from the 30° vertical fov at 16:9)
  const tanH = Math.tan(15 * D2R) * (16 / 9);
  const HERO = {tx: c.x, ty: c.y, tz: c.z, az: AZ * D2R, el: EL * D2R, d: ((box.max.x - box.min.x) / FILL / (2 * tanH) + (box.max.z - box.min.z) * 0.5) * 0.8925, sx: 0, sy: 0}; // r9 + 5 % back: the right wingtip inside
  window.BIRD = {st, b, HERO};
  const resize = () => st.resize(innerWidth, innerHeight, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
  resize();
  return {
    resize,
    render(t) {
      b.pose({...POSE, t});
      retint(b.root);
      st.frame(HERO, {guides: 0});
      return {};
    },
  };
});
