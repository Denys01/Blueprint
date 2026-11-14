// FIX PASS: the eye from the side of the head (the far side, so the body trails away from the cards) with its rings
// unscrewing toward the lens; the jaws from a low front three-quarter, not head-on; the explode in layers, closer, on a
// slow 180° turntable; the reassembly shot replaced by a beat on the glass flank window (the dome lifts off, the gears
// keep turning); after the turntable the cameras ride with the alligator. The only head-on open mouth is the lunge.
// The robotic alligator's 10-second cut on the shark's choreography (shark-demo, shark-shared/tour_bee.js), scaled to
// the alligator: the same beats in the same order and timing (12.2 s of scene in 10 s of film), the shark's swim-in
// turned into a walk-in on the four-leg trot (gait.js), its eye and jaw beats onto the alligator's eye (the hood lifts,
// the lens screws out) and jaws (the jaw drops off its hinge, the glass teeth fly out), the explode on a turntable
// (eye, jaws and teeth, the glass flank domes over their gears, the front legs joint by joint, the tail segment by
// segment) with the fast snap back, and the exit a wind-up and a lunge at the lens with the jaws open that stops on the
// alligator, big in frame.
// The world here is the alligator's own (snout +x, near side +z); the sim mirrors it across x as the still was shot.
// Cameras: [az, el, d, tx, ty, tz, sx, sy]; az from +z (the near flank) toward +x (the snout); d in units of D0, the
// distance at which the whole alligator spans the page's viewport in the hero view. Everything is a pure function of t.
import * as THREE from 'three';
import {buildGait} from './gait.js';
import {FOOT_HOME, FLOOR_Y, NSEG} from './alligator.js';

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const D2R = Math.PI / 180;

// the still's resting pose (round 3/5): tail down at the root, level, curling at the tip; mouth open
export const REST = {
  gape: 32,
  headUp: 17,
  headYaw: -5,
  tailPitch: [...Array(NSEG).keys()].map((i) => (i < 6 ? 1.6 : i < 13 ? -0.5 : 1.6 + (i - 13) * 1.7)),
  tailYaw: [...Array(NSEG).keys()].map((i) => (i < 3 ? 0.5 * i : i < 10 ? 2.4 : 4.2)),
};
// each act's own clock (seconds after its button), the shark's
const ACT = {
  eye: {open: [0.35, 1.5], close: [2.0, 2.4]},
  jaw: {open: [0.3, 1.3], close: [1.85, 2.3]},
  window: {open: [0.6, 1.2], close: [1.55, 1.85]},
};
const TEETH = {open: [0.6, 1.4], close: [1.55, 2.0]};
// the jaw snaps shut once at the end of the walk-in; the lunge leaves 1.0 s after HERO
const SNAP_IN = 2.3;
const DEP = 0.85;
const LUNGE = 1.55;

export function make10Tour(TL, A) {
  const SCRIPT = [...TL.script].sort((a, b) => a.t - b.t);
  const DURATION = TL.duration;
  const AT = {};
  for (const e of SCRIPT) (AT[e.act] ??= []).push(e.t);
  const at = (act) => AT[act] ?? [];
  const T_EXP = at('exploded')[0] ?? 999;
  const T_ASM = at('assemble')[0] ?? 999;
  const T_END = at('hero')[0] ?? 999;
  const T_LUNGE = T_END + DEP;
  const win = (act, W, t) => {
    let v = 0;
    for (const t0 of at(act)) v = Math.max(v, ss(t0 + W.open[0], t0 + W.open[1], t) * (1 - ss(t0 + W.close[0], t0 + W.close[1], t)));
    return v;
  };
  const openOf = (act, t) => win(act, ACT[act], t);
  const explodeAt = (t) => ss(T_EXP + 0.2, T_EXP + 1.4, t) * (1 - ss(T_ASM, T_ASM + 1.0, t));
  // the turntable: a slow half turn from the explode to just after it is whole again; the cameras after it ride along
  const TT = [T_EXP + 0.2, T_ASM + 0.9];
  const TURN = 180;
  const turnAt = (t) => {
    const [a, b] = TT;
    if (t <= a) return 0;
    const R = 0.6;
    const span = b - a;
    const v = TURN / (span - R);
    const x = Math.min(t, b) - a;
    if (x < R) return (v * x * x) / (2 * R);
    if (x < span - R) return v * (x - R / 2);
    const y = x - (span - R);
    return v * (span - 1.5 * R) + v * y - (v * y * y) / (2 * R);
  };
  const activity = (t) => Math.max(openOf('eye', t), openOf('jaw', t), openOf('window', t), explodeAt(t));
  const DT = 1 / 240;
  const SPIN = [0];
  for (let i = 1; i * DT <= DURATION + 1; i++) SPIN.push(SPIN[i - 1] + (1 + 4 * activity((i - 0.5) * DT)) * DT);
  const spinAt = (t) => {
    if (t < 0) return t;
    const u = Math.min(SPIN.length - 2, t / DT);
    const i = Math.floor(u);
    return SPIN[i] + (SPIN[i + 1] - SPIN[i]) * (u - i);
  };

  // the walk-in: a trot in a gentle curve that ends standing at the origin, facing +x, at 2.8 s
  const G = buildGait({
    keys: [[-1.5, 0.7, 7], [1.7, 0.7, 7], [2.7, 0, 0]],
    duration: DURATION,
    homes: FOOT_HOME,
    floorY: FLOOR_Y,
    tRef: 2.8,
    t0: -1.5,
  });
  const walkAt = (t) => Math.min(1, G.rateAt(t) / 1.4);

  // the lunge: a wind-up (it draws back and turns its head toward the lens, the jaws open wide), then a dash along its
  // new heading toward the camera that eases to a stop with the jaws still open
  const flightAt = (t) => {
    const p = G.pathAt(t);
    const pos = new THREE.Vector3(p.x, 0, p.z);
    let yaw = p.yaw / D2R;
    yaw += turnAt(t);
    const wind = ss(T_END + 0.1, T_END + 0.9, t);
    const lk = ss(T_LUNGE, T_LUNGE + 1.1, t);
    yaw -= 16 * wind + 20 * lk;
    const h = new THREE.Vector3(Math.cos(yaw * D2R), 0, -Math.sin(yaw * D2R));
    pos.addScaledVector(h, -0.22 * wind * (1 - ss(T_LUNGE, T_LUNGE + 0.25, t)) + LUNGE * lk);
    const path = pos.clone();
    return {pos, path, yaw, wind, lk};
  };

  // the feet: the gait's while it walks; in the lunge the front feet reach forward and lift, the hind ones push back
  const feetAt = (t, f, body) => {
    const out = [];
    for (let l = 0; l < 4; l++) {
      const g = G.footLocal(l, t, body);
      const h = FOOT_HOME(l);
      const front = l < 2;
      const k = ss(T_LUNGE - 0.05, T_LUNGE + 0.3, t) * (1 - 0.6 * ss(T_LUNGE + 0.9, T_LUNGE + 1.5, t));
      const wk = f.wind * (1 - ss(T_LUNGE - 0.05, T_LUNGE + 0.3, t));
      out.push([g[0] + (front ? 0.2 : -0.22) * k - 0.08 * wk * (front ? 1 : 0), g[1] + (front ? 0.06 : 0) * k, g[2] * (1 + 0.06 * k), g[3]]);
      void h;
    }
    return out;
  };

  const snap = (t, t0) => ss(t0, t0 + 0.12, t) * (1 - ss(t0 + 0.2, t0 + 0.6, t));
  const gapeAt = (t) => REST.gape - 2 + 4 * Math.sin(t * 1.3) * (1 - ss(T_END, T_END + 0.4, t)) - 26 * snap(t, SNAP_IN) + 12 * ss(T_END + 0.15, T_END + 0.85, t);
  // the head lifts as the jaw opens so the chin keeps off the floor
  const headUpAt = (t) => REST.headUp + 2 * Math.sin(t * 0.9) * (1 - ss(T_END, T_END + 0.4, t)) + 10 * ss(T_END + 0.15, T_END + 0.85, t);

  // ------------------------------------------------------------ cameras
  // a camera is [az, el, d, tx, ty, tz, sx, sy, rel]: rel = 1 rides with the alligator (az and target turn with its
  // heading and the turntable), rel = 0 stays in the world (the walk-in and the turntable itself)
  const C = A.C;
  const P = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const eyeT = P(A.eyeF, A.headC, 0.45);
  const jawT = P(A.jaw, A.headC, 0.5).map((v, i) => (i === 1 ? v + 0.02 : v));
  const winT = P(A.window, C, 0.15);
  const push = (a, b, u) => lerp(a, b, ss(0, 2.5, u));
  const CAM = {
    // frame 0: the whole alligator walking in, front three-quarter, big in the viewport
    intro: (u) => {
      const k = ss(0, 3.0, u);
      return [lerp(20, 42, k), lerp(11, 8, k), lerp(1.04, 0.98, k), ...C, ...A.fit, 0];
    },
    // the eye: on the side of the head, close, at eye height; the whole head in frame, the lens rings come at the lens
    eye: (u) => [174 - 4 * u, lerp(6, 9, ss(0, 2.5, u)), push(0.46, 0.41, u), ...eyeT, 0, 20, 1],
    // the jaws from a low front three-quarter on the far side, pushing in on the lit mouth
    jaw: (u) => [128 - 5 * u, lerp(3, 6, ss(0, 2.5, u)), push(0.52, 0.46, u), ...jawT, 110, 30, 1],
    // the explode: closer, rising a little while the layers part and the turntable turns slowly under it
    exploded: (u) => {
      const go = ss(0.0, 1.5, u);
      return [150 + 14 * go, lerp(10, 17, go), lerp(0.94, 1.02, go), ...C, 70, 30, 0];
    },
    // the glass flank window: close on the near side, a little above, as the dome lifts off the turning gears
    window: (u) => [30 + 4 * u, lerp(12, 9, ss(0, 2.0, u)), push(0.46, 0.4, u), ...winT, 140, 0, 1],
    hero: (u) => {
      const lk = ss(DEP, DEP + 1.1, u);
      return [44 + 3 * u, 7 - 2 * lk, 0.98 - 0.04 * ss(1.0, 2.6, u), C[0], C[1] - 0.05 * lk, C[2], ...A.fit, 1];
    },
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
  // the alligator's heading for the cameras: the walk's and the turntable's, not the wind-up's or the lunge's
  const headingAt = (t) => G.pathAt(t).yaw / D2R + turnAt(t);
  // a camera spec in world terms: az and target turned by the heading when it rides along
  const world = (o, t) => {
    if (!o[8]) return o.slice(0, 8);
    const h = headingAt(t);
    const c = Math.cos(h * D2R);
    const sn = Math.sin(h * D2R);
    return [o[0] + h, o[1], o[2], o[3] * c + o[5] * sn, o[4], -o[3] * sn + o[5] * c, o[6], o[7]];
  };
  const BLEND = {eye: 1.25, window: 1.1};
  const camFn = (V, t) => world(CAM[V.key](t - (V.key === 'intro' ? 0 : V.t)), t);
  const camAt = (t) => {
    const i = viewIdx(t);
    let o = camFn(runOf(i), t);
    if (i > 0 && runOf(i) === VIEWS[i]) {
      const k = ss(VIEWS[i].t, VIEWS[i].t + (BLEND[VIEWS[i].key] ?? 0.85), t);
      if (k < 1) {
        const a = camFn(runOf(i - 1), t);
        const dAz = ((o[0] - a[0] + 540) % 360) - 180;
        o = o.map((v, j) => lerp(a[j], v, k));
        o[0] = a[0] + dAz * k;
        o[2] += 0.06 * Math.sin(Math.PI * k);
      }
    }
    const f = flightAt(t);
    const pth = G.pathAt(t);
    // the camera follows the walk most of the way and only part of the lunge, so it comes at the lens
    const track = 0.82 - 0.62 * ss(T_LUNGE, T_LUNGE + 1.0, t);
    const lx = f.path.x - pth.x;
    const lz = f.path.z - pth.z;
    return {az: o[0], el: o[1], d: o[2] * A.D0, tx: o[3] + pth.x * 0.82 + lx * track, ty: o[4], tz: o[5] + pth.z * 0.82 + lz * track, sx: o[6], sy: o[7]};
  };
  const viewAt = (t) => VIEWS[viewIdx(t)].key;

  const stateAt = (t) => {
    const ex = explodeAt(t);
    const f = flightAt(t);
    const walk = walkAt(t);
    const calm = 1 - Math.min(1, ex * 2.5);
    const ph = G.phaseAt(t) * 2 * Math.PI;
    const body = {y: 0.012 * walk * Math.abs(Math.sin(ph)) + 0.004 * Math.sin(t * 1.7) * calm, pitch: 5 * f.lk * (1 - ss(T_LUNGE + 0.9, T_LUNGE + 1.6, t)) - 2 * f.wind * (1 - f.lk), roll: 1.6 * walk * Math.sin(ph)};
    const feet = feetAt(t, f, {y: body.y, pitch: body.pitch * D2R, roll: body.roll * D2R});
    return {
      t,
      spinT: spinAt(t),
      explode: ex,
      eye: openOf('eye', t),
      drop: openOf('jaw', t),
      teethOut: win('jaw', TEETH, t),
      winOpen: openOf('window', t),
      gape: gapeAt(t),
      headUp: headUpAt(t),
      headYaw: REST.headYaw + 4 * walk * Math.sin(ph) - 6 * f.wind,
      tailPitch: REST.tailPitch,
      tailYaw: REST.tailYaw.map((v, i) => v * (1 - 0.5 * walk) - 4 * f.lk * (i / NSEG)),
      tailWave: (1.2 + 4 * walk + 3 * f.lk) * calm,
      bodyY: body.y,
      bodyPitch: body.pitch,
      bodyRoll: body.roll,
      feet: feet.map((q) => q.slice(0, 3)),
      lifts: feet.map((q) => q[3]),
      flight: f,
      walk,
      cam: camAt(t),
      view: viewAt(t),
      open: {eye: openOf('eye', t), jaw: openOf('jaw', t), window: openOf('window', t)},
      turn: turnAt(t),
      guides: 0.45 + 0.55 * Math.min(1, ex * 2.5 + activity(t)),
    };
  };

  const LABELS = {
    eye: [['lensF', 'OPTIC LENS', 'BLACK GLASS · UNSCREWS'], ['ringF', 'AMBER RING', 'THREADED'], ['hoodF', 'BROW HOOD', 'RIVETED · LIFTS BACK']],
    jaw: [['teethF', 'GLASS TEETH', '16 + 14 A SIDE · INTERLOCKING'], ['palate', 'PALATE PLATES', 'SEAMED · RIVETED'], ['piston', 'JAW PISTONS', '2 · TELESCOPING']],
    window: [['dome', 'GLASS DOME', 'LIFTS OFF'], ['gears', 'BRASS GEARS', 'KEEP TURNING']],
    exploded: [['scutes', 'BACK SCUTES', '11 ROWS · LIFTED'], ['headPlates', 'HEAD PLATES', 'OFF THE SKULL'], ['jawPlates', 'JAWS', 'GLASS TEETH'], ['dome', 'FLANK WINDOW', 'GLASS DOME · BRASS GEARS'], ['foot', 'FRONT LEG', '3 JOINTS · WEBBED FOOT'], ['glassTail', 'TAIL', '20 SEGMENTS · GLASS CREST']],
  };
  const labelAt = (t, v) => {
    if (ACT[v]) {
      const t0 = at(v).filter((x) => x <= t).pop();
      const W = ACT[v];
      return {set: LABELS[v], o: ss(t0 + W.open[0] + 0.1, t0 + W.open[0] + 0.45, t) * (1 - ss(t0 + W.close[0] - 0.25, t0 + W.close[0], t))};
    }
    if (v === 'exploded') return {set: LABELS.exploded, o: ss(T_EXP + 0.8, T_EXP + 1.15, t) * (1 - ss(T_ASM - 0.25, T_ASM, t))};
    return {set: [], o: 0};
  };

  const telemetry = (t, s) => {
    const v = s.view;
    const opening = ACT[v] ? s.open[v] : 0;
    let status = t < 2.75 ? 'WALKING' : 'STANDING';
    if (ACT[v] && opening > 0.05) status = {eye: 'EYE OPEN', jaw: 'JAW DROPPED', window: 'WINDOW OPEN'}[v];
    if (v === 'exploded') status = t < T_ASM ? 'TEARDOWN' : s.explode > 0.04 ? 'REASSEMBLY' : 'STANDING';
    if (t > T_END + 0.1 && t <= T_LUNGE) status = 'WIND-UP';
    if (t > T_LUNGE) status = t < T_LUNGE + 1.1 ? 'LUNGE' : 'JAWS OPEN';
    // the gait trace: near-front minus far-front foot lift over the last 3 s
    const wave = [];
    for (let i = 0; i <= 90; i++) {
      const tt = t - 3 + (i / 90) * 3;
      wave.push(G.lifted(0, tt) - G.lifted(1, tt));
    }
    const hz = G.rateAt(t) + 2.2 * s.flight.lk * (1 - ss(T_LUNGE + 0.8, T_LUNGE + 1.3, t));
    // the bite force the jaw actuators hold: a low idle, the snap, the wind-up loading the jaw
    const bite = 1.4 + 0.4 * Math.sin(t * 2.1) + 11.6 * snap(t, SNAP_IN) + 7.5 * ss(T_END + 0.15, T_END + 0.85, t) * (1 - 0.4 * ss(T_LUNGE + 1.2, T_LUNGE + 2, t)) - 1.4 * Math.max(s.drop, s.explode);
    return {status, freq: hz, wave, bite: Math.max(0, bite), battery: 0.874 - 0.0023 * t, labelSet: labelAt(t, v)};
  };

  return {SCRIPT, DURATION, stateAt, telemetry, camAt, flightAt, gait: G, T_LUNGE};
}
