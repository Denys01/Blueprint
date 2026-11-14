// FIX PASS (after beats.png): the eye shot pulled back so the body stays off the cards; the tongue from low on the near
// side so it shoots left across the viewport, not under the cards; the casque shot wider and lower; the tail uncoils
// to a long arc that stays in frame, shot wider from behind; the exit closer, the head raised so the tongue comes at
// the lens.
// CHROMIRA CM-1, the robotic chameleon's 10-second cut, its own script (12.4 s of scene in 10 s of film, the alligator
// cut's speed). The chameleon holds its grip on the branch the whole time; what moves is its parts. Beats, each from
// its own side and distance:
//   intro    front 3/4 like the hero still, big in the viewport, the eye turrets already wandering
//   eye      close on the near side of the head: the turret swings round on its ball, the lens rings unscrew
//   tongue   low on the far side, ahead of the mouth: the launcher fires the glass tongue straight out and pulls it back
//   casque   high behind the head: the glass helmet lifts off over the gears under it, then seats
//   tail     low behind, on the far side: the spiral uncoils almost straight and coils back up
//   teardown wide and high on the near side, the camera swinging round while the layers part (crest, back rows and
//            casque, flank plates and windows, head parts, legs and tail) and snap back
//   exit     in front of the head: it turns to the lens and fires the tongue at it, ending on the chameleon
// World: the chameleon's own (snout +x, near side +z); the sim mirrors it across x as the still was shot.
// A camera is [az, el, d, tx, ty, tz, sx, sy]: az from +z (the near flank) toward +x (the snout), d in units of D0.
import * as THREE from 'three';
import {FEET_HOME, NSEG} from './chameleon.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;

// the still's pose (round 4)
export const REST = {gape: 20, headUp: 2, headYaw: -10, tongue: 0.3, droop: 42, hang: 32, curl: 1, feet: FEET_HOME};

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

/** The rest pose's middle, the hero distance D0 (whole animal and branch across `fill` of the viewport) and the
 *  screen shift that centres it there, plus the points the cameras aim at. */
export function restFrame(a, {az = 34, el = 7, fill = 0.9} = {}) {
  a.root.scale.x = 1;
  a.root.position.set(0, 0, 0);
  a.root.rotation.set(0, 0, 0);
  a.pose(REST);
  a.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(a.root);
  const C = box.getCenter(new THREE.Vector3()).toArray();
  const W = (k) => {
    const A = a.anchors[k];
    return A.obj.localToWorld(A.at.clone()).toArray();
  };
  const pts = samplePoints(a.root);
  const half = ((FRAME.vp.x1 - FRAME.vp.x0) / FRAME.w) * fill;
  const halfY = ((FRAME.vp.y1 - FRAME.vp.y0) / FRAME.h) * 0.92;
  let d = 6;
  let b;
  for (let k = 0; k < 8; k++) {
    b = project(pts, {az, el, d, tx: C[0], ty: C[1], tz: C[2]});
    d *= Math.max((b.x1 - b.x0) / 2 / half, (b.y1 - b.y0) / 2 / halfY);
  }
  b = project(pts, {az, el, d, tx: C[0], ty: C[1], tz: C[2]});
  const fit = [(-(b.x0 + b.x1) / 2) * (FRAME.w / 2), ((b.y0 + b.y1) / 2) * (FRAME.h / 2)];
  const head = a.skull.localToWorld(new THREE.Vector3(0.6, 0.05, 0)).toArray();
  return {C, D0: d, fit, head, eye: W('eye'), lens: W('lens'), casque: W('casque'), launcher: W('launcher'), tail: W('tail'), window: W('window')};
}

const ACT = {
  eye: {open: [0.35, 1.2], close: [1.5, 1.9]},
  tongue: {open: [0.35, 0.62], close: [1.05, 1.55]},
  casque: {open: [0.3, 1.1], close: [1.35, 1.75]},
  tail: {open: [0.2, 1.0], close: [1.1, 1.72]},
};

export function make10Tour(TL, A) {
  const SCRIPT = [...TL.script].sort((a, b) => a.t - b.t);
  const DURATION = TL.duration;
  const AT = {};
  for (const e of SCRIPT) (AT[e.act] ??= []).push(e.t);
  const at = (act) => AT[act] ?? [];
  const T_EXP = at('exploded')[0] ?? 999;
  const T_ASM = at('assemble')[0] ?? 999;
  const T_END = at('hero')[0] ?? 999;
  const T_FIRE = T_END + 0.72;
  const win = (act, W, t) => {
    let v = 0;
    for (const t0 of at(act)) v = Math.max(v, ss(t0 + W.open[0], t0 + W.open[1], t) * (1 - ss(t0 + W.close[0], t0 + W.close[1], t)));
    return v;
  };
  const openOf = (act, t) => win(act, ACT[act], t);
  const explodeAt = (t) => ss(T_EXP + 0.15, T_EXP + 1.15, t) * (1 - ss(T_ASM, T_ASM + 0.6, t));
  const activity = (t) => Math.max(openOf('eye', t), openOf('casque', t), explodeAt(t));
  // the gears: a slow idle, faster while something is open
  const DT = 1 / 240;
  const SPIN = [0];
  for (let i = 1; i * DT <= DURATION + 1; i++) SPIN.push(SPIN[i - 1] + (1 + 4 * activity((i - 0.5) * DT)) * DT);
  const spinAt = (t) => {
    if (t < 0) return t;
    const u = Math.min(SPIN.length - 2, t / DT);
    const i = Math.floor(u);
    return SPIN[i] + (SPIN[i + 1] - SPIN[i]) * (u - i);
  };

  // the exit: the head turns toward the lens, then the tongue fires at it, holds, and comes back with its droplet
  const strikeTurn = (t) => ss(T_END + 0.08, T_END + 0.6, t);
  const strikeOut = (t) => ss(T_FIRE, T_FIRE + 0.2, t) * (1 - ss(T_FIRE + 0.6, T_FIRE + 1.05, t));
  // the tongue: length and droop; the beat fires it 1.4, the exit 1.75 toward the lens
  const tongueAt = (t) => {
    const k = openOf('tongue', t);
    const s = strikeOut(t);
    const len = REST.tongue + 1.1 * k + 1.45 * s;
    const straight = Math.max(ss(0, 0.25, k), ss(0, 0.2, s));
    return {len, droop: REST.droop * (1 - straight), hang: REST.hang * (1 - straight)};
  };
  // the eyes wander on their own; the eye beat swings the near turret right round and unscrews its lens
  const eyesAt = (t) => {
    const calm = 1 - strikeTurn(t);
    const e0 = at('eye')[0] ?? 999;
    const swing = ss(e0 + 0.15, e0 + 0.9, t) * (1 - ss(e0 + 1.45, e0 + 1.95, t));
    const y0 = (-25 + 14 * Math.sin(t * 0.9)) * (1 - swing) + (38 + 10 * Math.sin((t - e0) * 2.2)) * swing;
    const p0 = 8 + 6 * Math.sin(t * 0.6 + 0.4) - 10 * swing;
    const y1 = 20 + 18 * Math.sin(t * 0.7 + 1.1);
    const p1 = -6 + 7 * Math.sin(t * 1.1 + 2);
    // at the exit both turrets lock on the lens
    return [
      [lerp(y0, 34, 1 - calm), lerp(p0, 4, 1 - calm)],
      [lerp(y1, -30, 1 - calm), lerp(p1, 2, 1 - calm)],
    ];
  };

  // ------------------------------------------------------------ cameras
  const C = A.C;
  const P = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const headT = A.head;
  const eyeT = P(A.eye, A.head, 0.35);
  const mouthT = [A.launcher[0] + 0.62, A.launcher[1] - 0.08, A.launcher[2] + 0.12];
  const casqT = P(A.casque, A.head, 0.5);
  const tailT = A.tail;
  const push = (a, b, u, d = 1.8) => lerp(a, b, ss(0, d, u));
  const CAM = {
    // frame 0: the whole animal and its branch, front three-quarter, big in the viewport, drifting
    intro: (u) => [34 - 5 * ss(0, 2, u), 7 + 2 * ss(0, 2, u), 1.0 - 0.03 * ss(0, 2, u), ...C, ...A.fit],
    // the eye: close on the near side of the head, a little in front, at eye height
    eye: (u) => [16 + 6 * u, lerp(10, 6, ss(0, 2, u)), push(0.45, 0.4, u), ...eyeT, 40, 20],
    // the tongue: low on the far side, ahead of the mouth, the launcher and the whole shot in frame
    tongue: (u) => [54 - 5 * u, lerp(-4, 0, ss(0, 2, u)), push(0.64, 0.6, u), ...mouthT, 0, 10],
    // the casque: high behind the head on the near side, looking down on the helmet as it lifts
    casque: (u) => [-38 + 6 * u, lerp(32, 27, ss(0, 2, u)), push(0.6, 0.54, u), ...casqT, 20, 10],
    // the tail: low behind, on the far side, the whole spiral and its uncoiled length in frame
    tail: (u) => [-122 + 6 * u, lerp(12, 15, ss(0, 2, u)), push(0.9, 0.84, u), tailT[0] - 0.55, tailT[1] - 0.1, tailT[2] + 0.1, 0, 10],
    // the teardown: wide and high on the near side, swinging round in front while the layers part
    exploded: (u) => {
      const go = ss(0, 2.2, u);
      return [-12 + 58 * go, lerp(20, 14, go), lerp(1.18, 1.1, go), C[0], C[1] + 0.12, C[2], ...A.fit.map((v) => v * 0.6)];
    },
    // the exit: in front of the head and a little to the near side, at its height; the tongue comes at the lens
    hero: (u) => [62 - 4 * ss(0, 1.8, u), 2, lerp(0.5, 0.43, ss(0, 1.9, u)), headT[0] + 0.2, headT[1] - 0.02, headT[2] + 0.05, 0, 20],
  };
  const VIEWS = [{t: -1, key: 'intro'}, ...SCRIPT.map((e) => ({t: e.t, key: e.act === 'assemble' ? 'exploded' : e.act}))];
  const viewIdx = (t) => {
    let i = 0;
    while (i < VIEWS.length - 1 && VIEWS[i + 1].t <= t) i++;
    return i;
  };
  const runOf = (j) => {
    while (j > 0 && VIEWS[j].key === 'exploded' && VIEWS[j - 1].key === 'exploded') j--;
    return VIEWS[j];
  };
  const BLEND = {eye: 0.75, tongue: 0.6, casque: 0.7, tail: 0.65, exploded: 0.6, hero: 0.5};
  const camFn = (V, t) => CAM[V.key](t - (V.key === 'intro' ? 0 : V.t));
  const camAt = (t) => {
    const i = viewIdx(t);
    let o = camFn(runOf(i), t);
    if (i > 0 && runOf(i) === VIEWS[i]) {
      const k = ss(VIEWS[i].t, VIEWS[i].t + (BLEND[VIEWS[i].key] ?? 0.7), t);
      if (k < 1) {
        const a = camFn(runOf(i - 1), t);
        const dAz = ((o[0] - a[0] + 540) % 360) - 180;
        o = o.map((v, j) => lerp(a[j], v, k));
        o[0] = a[0] + dAz * k;
      }
    }
    return {az: o[0], el: o[1], d: o[2] * A.D0, tx: o[3], ty: o[4], tz: o[5], sx: o[6], sy: o[7]};
  };
  const viewAt = (t) => VIEWS[viewIdx(t)].key;

  const stateAt = (t) => {
    const ex = explodeAt(t);
    const calm = 1 - Math.min(1, ex * 2.5);
    const tg = tongueAt(t);
    const turn = strikeTurn(t);
    const tl = openOf('tail', t);
    const cq = openOf('casque', t);
    const ey = openOf('eye', t);
    return {
      t,
      spinT: spinAt(t),
      explode: ex,
      gape: REST.gape + 2 * Math.sin(t * 1.1) * calm + 10 * Math.max(ss(0, 0.3, openOf('tongue', t)), turn),
      headUp: REST.headUp + 1.5 * Math.sin(t * 0.8) * calm + 13 * turn,
      headYaw: REST.headYaw + 3 * Math.sin(t * 0.5) * calm - 14 * turn,
      eyes: eyesAt(t),
      lensOut: [ey, 0],
      tongue: tg.len,
      droop: tg.droop,
      hang: tg.hang,
      casqueLift: cq,
      curl: 1 - 0.72 * tl,
      tailYaw: 24 - 8 * tl,
      bodyY: 0.006 * Math.sin(t * 1.6) * calm,
      bodyPitch: 0.6 * Math.sin(t * 0.8) * calm,
      cam: camAt(t),
      view: viewAt(t),
      open: {eye: ey, tongue: openOf('tongue', t), casque: cq, tail: tl},
      guides: 0.45 + 0.55 * Math.min(1, ex * 2.5 + activity(t)),
    };
  };

  const LABELS = {
    eye: [['lens', 'OPTIC LENS', 'BLACK GLASS · UNSCREWS'], ['eye', 'EYE TURRET', 'BALL JOINT · TURNS ON ITS OWN'], ['headPl', 'HEAD PLATES', 'RIVETED SATIN']],
    tongue: [['tongueTip', 'GLASS TONGUE', 'DROPLET TIP · 1.4 BODY LENGTHS'], ['launcher', 'LAUNCHER', 'COIL SPRING · STEEL BARREL']],
    casque: [['casque', 'GLASS CASQUE', 'LIFTS OFF'], ['casqueMech', 'HEAD GEARS', 'UNDER THE HELMET']],
    tail: [['tail', 'SPIRAL TAIL', `${NSEG} SEGMENTS · UNCOILS`], ['tailTip', 'TAIL TIP', 'GRIPS · COILS BACK']],
    exploded: [['crest', 'CREST', '13 BRASS SPIKES'], ['casque', 'CASQUE', 'GLASS HELMET'], ['window', 'FLANK WINDOW', 'GLASS · BRASS GEARS'], ['eye', 'EYE TURRET', 'LAYERED PLATES'], ['foot', 'GRIPPING FOOT', '2 + 3 GLASS TOES'], ['tail', 'TAIL', `${NSEG} SEGMENTS`]],
  };
  const labelAt = (t, v) => {
    if (ACT[v]) {
      const t0 = at(v).filter((x) => x <= t).pop();
      const W = ACT[v];
      const o0 = v === 'tongue' ? 0.4 : W.open[0] + 0.1;
      return {set: LABELS[v], o: ss(t0 + o0, t0 + o0 + 0.3, t) * (1 - ss(t0 + W.close[0] - 0.2, t0 + W.close[0], t))};
    }
    if (v === 'exploded') return {set: LABELS.exploded, o: ss(T_EXP + 0.8, T_EXP + 1.1, t) * (1 - ss(T_ASM - 0.2, T_ASM, t))};
    return {set: [], o: 0};
  };

  const telemetry = (t, s) => {
    const v = s.view;
    let status = 'GRIPPING';
    if (ACT[v] && s.open[v] > 0.05) status = {eye: 'EYE TURNING', tongue: 'TONGUE FIRED', casque: 'CASQUE OPEN', tail: 'TAIL UNCOILED'}[v];
    if (v === 'exploded') status = t < T_ASM ? 'TEARDOWN' : s.explode > 0.04 ? 'REASSEMBLY' : 'GRIPPING';
    if (t > T_END + 0.05) status = t < T_FIRE ? 'LOCKING ON' : t < T_FIRE + 1.05 ? 'STRIKE' : 'GRIPPING';
    // the near turret's turn over the last 3 s, and its angle now
    const wave = [];
    for (let i = 0; i <= 90; i++) wave.push(eyesAt(t - 3 + (i / 90) * 3)[0][0] / 45);
    // the tongue's speed: its length's rate of change, at the scale of a 0.4 m body (B = 2 units)
    const e = 1 / 120;
    const sp = Math.abs(tongueAt(t + e).len - tongueAt(t - e).len) / (2 * e) * 0.2;
    return {status, eye: s.eyes[0][0], wave, speed: sp, battery: 0.912 - 0.0021 * t - 0.012 * strikeOut(t) - 0.006 * openOf('tongue', t), labelSet: labelAt(t, v)};
  };

  return {SCRIPT, DURATION, stateAt, telemetry, camAt, T_FIRE};
}
