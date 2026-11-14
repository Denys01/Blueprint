// The alligator's box on the page through the 10-second cut, without a browser: the same model, tour, mirror and
// camera as sim_night.js, projected to page px (with the viewport shift). Prints film time, view, the box, and flags
// any frame where the animal crosses into the right-hand cards (x > 1320) or the title (y < 236).
//   node sims/alligator-shared/frame_check.mjs [step]
import * as THREE from 'three';
import fs from 'node:fs';
import {buildAlligator} from './alligator.js';
import {FRAME, FOV, restFrame, samplePoints} from './fit.js';
import {make10Tour} from './tour_10.js';

const TL = JSON.parse(fs.readFileSync(new URL('../alligator-demo/timeline.json', import.meta.url)));
const SHIFT = [-15, 110];
const D2R = Math.PI / 180;
const a = buildAlligator();
const A = restFrame(a);
const T = make10Tour(TL, A);
a.root.rotation.order = 'YXZ';
a.root.scale.x = -1;
const m = -1;
const SPEED = TL.duration / TL.film;
const step = Number(process.argv[2] ?? 0.25);
console.log('D0', A.D0.toFixed(2), 'fit', A.fit.map((v) => v.toFixed(0)).join(','));
const cam = new THREE.PerspectiveCamera(FOV, FRAME.w / FRAME.h, 0.05, 80);
for (let tf = 0; tf <= TL.film + 1e-6; tf += step) {
  const t = tf * SPEED;
  const s = T.stateAt(t);
  a.pose(s);
  a.root.position.set(m * s.flight.pos.x, 0, s.flight.pos.z);
  a.root.rotation.set(0, m * s.flight.yaw * D2R, 0);
  const pts = samplePoints(a.root, 24);
  const c = s.cam;
  const az = m * c.az * D2R;
  const el = c.el * D2R;
  const tx = m * c.tx;
  cam.position.set(tx + c.d * Math.cos(el) * Math.sin(az), c.ty + c.d * Math.sin(el), c.tz + c.d * Math.cos(el) * Math.cos(az));
  cam.lookAt(tx, c.ty, c.tz);
  cam.updateMatrixWorld();
  const sx = m * c.sx + SHIFT[0];
  const sy = c.sy + SHIFT[1];
  let [x0, x1, y0, y1] = [1e9, -1e9, 1e9, -1e9];
  const q = new THREE.Vector3();
  for (const p of pts) {
    q.copy(p).project(cam);
    if (q.z > 1) continue;
    const px = (q.x * 0.5 + 0.5) * FRAME.w + sx;
    const py = (-q.y * 0.5 + 0.5) * FRAME.h + sy;
    x0 = Math.min(x0, px);
    x1 = Math.max(x1, px);
    y0 = Math.min(y0, py);
    y1 = Math.max(y1, py);
  }
  const flags = [x1 > 1320 ? 'CARDS' : '', x0 < 250 ? 'left' : '', y0 < 236 ? 'TITLE' : '', y1 > 836 ? 'bottom' : ''].filter(Boolean).join(' ');
  console.log(`${tf.toFixed(2).padStart(5)} ${s.view.padEnd(8)} x ${x0.toFixed(0).padStart(5)}..${x1.toFixed(0).padStart(5)}  y ${y0.toFixed(0).padStart(4)}..${y1.toFixed(0).padStart(4)}  w ${(x1 - x0).toFixed(0).padStart(4)}  ${flags}`);
}
