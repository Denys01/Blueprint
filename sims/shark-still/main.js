// The robotic great white's still: the shark alone in the night studio, posed like shark.png (head left, near side to
// the lens, a little from the front, eye level). The body is mirrored across x so the head is on the left.
import {runSim} from '../kit/runtime.js';
import {ORANGE_TO, PAPER_NIGHT, retint, SHELL} from '../night/look.js';
import {D2R, PAL} from '../shark-shared/parts.js';
import {buildShark, FLOOR_Y} from '../shark-shared/shark.js';
import {createStage, PAPER} from '../shark-shared/stage.js';

Object.assign(PAL, {orange: ORANGE_TO, white: SHELL});
Object.assign(PAPER, PAPER_NIGHT);

export const HERO = {tx: 0.48, ty: -0.12, tz: 0, az: -24, el: 3, d: 4.45, sx: 130, sy: 10, roll: 0, yaw: 0, pitch: -1};

runSim({duration: 4, fps: 60, hud: {enabled: false}, director: {enabled: false}, watermark: ''}, async ({canvas, capture}) => {
  const st = createStage({canvas, floorY: FLOOR_Y, span: 3.8});
  const sh = buildShark();
  st.addBody(sh);
  sh.root.rotation.order = 'YXZ';
  sh.root.scale.x = -1;
  window.SHARK = {st, sh};
  const resize = () => st.resize(innerWidth, innerHeight, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
  resize();
  return {
    resize,
    render(t) {
      sh.pose({t, idle: 1, swim: 0.2});
      retint(sh.root);
      const c = HERO;
      sh.root.rotation.set(c.roll * D2R, -c.yaw * D2R, -c.pitch * D2R);
      st.frame({...c, az: c.az * D2R, el: c.el * D2R}, {guides: 0});
      return {};
    },
  };
});
