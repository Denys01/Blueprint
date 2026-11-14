// TROCHION TR-4, the robotic hummingbird's 10-second cut (entry robohum-demo): the wasp's 10-second demo
// (wasp-shared/tour_10.js) carried over 1:1, the same beats, moves and timing, scaled to the bird by K (every camera
// distance, every path offset) and aimed at the bird's own parts (G.C its centre, G.WING the pulled-out wing).
// What it runs: the swoop in from high on the left; the WING pulled off its shoulder and turned over in the air;
// the explode in slow motion with the low pass and the 360 deg turntable; and its own exit: the bird turns toward the
// lens and rises gently while the camera rises with it, so the last frame is the bird, never an empty frame.
// Wing beats are visible strokes (2.2 Hz, the brief's 1.5-2.5 Hz), never a blur.
import * as THREE from 'three';
export const FLAP_HZ = 2.2;
export const AMP = 55;
const ASSEMBLY_LABEL = {wing: 'WING', optics: 'EYE', thorax: 'TURBINE', abdomen: 'TAIL FAN'};

const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
const ss = (a, b, t) => smoother((t - a) / (b - a));
const lerp = (a, b, k) => a + (b - a) * k;
const bump = (a, b, c, d, t) => ss(a, b, t) * (1 - ss(c, d, t));
const D2R = Math.PI / 180;
const MM = 80;
const S = 1.15;

// each act's own clock in scene seconds after its click, a beat every 2.2 s
export const ACT_R = {
  optics: {open: [0.25, 1.05], close: [1.55, 1.9], stop: false},
  wing: {open: [0.2, 0.75], close: [1.6, 1.95], stop: true},
  thorax: {open: [0.25, 1.0], close: [1.5, 1.9], stop: true},
  abdomen: {open: [0.25, 1.0], close: [1.55, 1.95], stop: true},
};
// the pulled wing turns over once while it hangs out of its hinge
export const WING_FLIP = [0.45, 1.45];
// the ramp in film seconds after the EXPLODED click: down to 0.4x as the parts start to leave, held while they drift
// apart, back up as the turntable takes over
export const RAMP = {a: [0.35, 0.55], b: [1.9, 2.1], low: 0.4};
// the climb starts this long after HERO (scene seconds)
export const DEP = 0.75;
// the hero camera, low on the front-right so the climb reads against the paper above
const HERO_AZ = 32;
const HERO_EL = 4;
const HERO_D = 7.8;

export function makeWarp(tRamp, dur) {
  const rate = (t) => 1 - (1 - RAMP.low) * bump(tRamp + RAMP.a[0], tRamp + RAMP.a[1], tRamp + RAMP.b[0], tRamp + RAMP.b[1], t);
  const DT = 1 / 480;
  const TAU = [0];
  for (let i = 1; i * DT <= dur + 2; i++) TAU.push(TAU[i - 1] + rate((i - 0.5) * DT) * DT);
  const tauAt = (t) => {
    if (t <= 0) return t;
    const u = Math.min(TAU.length - 2, t / DT);
    const i = Math.floor(u);
    return TAU[i] + (TAU[i + 1] - TAU[i]) * (u - i);
  };
  return {rate, tauAt};
}

export function make10Tour(TL, G) {
  const K = G.K;
  const FLOOR_Y = G.FLOOR;
  const C = G.C;
  const SCRIPT = [...TL.script].sort((a, b) => a.t - b.t);
  const DURATION = TL.duration;
  const EVENTS = SCRIPT.map((e) => e.t);
  const tfOf = (act) => (SCRIPT.find((e) => e.act === act) ?? {t: 999}).t;
  const tfExp = tfOf('exploded');
  const tfAsm = tfOf('assemble');
  const {rate, tauAt} = makeWarp(tfExp, DURATION);
  const AT = {};
  for (const e of SCRIPT) (AT[e.act] ??= []).push(tauAt(e.t));
  const at = (act) => AT[act] ?? [];
  const T_EXP = at('exploded')[0] ?? 999;
  const T_ASM = at('assemble')[0] ?? 999;
  const T_END = at('hero')[0] ?? 999;
  const T_FIRST = Math.min(...Object.keys(ACT_R).flatMap((a) => at(a)), 999);

  const openOf = (act, x) => {
    let v = 0;
    for (const t0 of at(act)) {
      const A2 = ACT_R[act];
      v = Math.max(v, bump(t0 + A2.open[0], t0 + A2.open[1], t0 + A2.close[0], t0 + A2.close[1], x));
    }
    return v;
  };
  const explodeAt = (x) => ss(T_EXP + 0.2, T_EXP + 1.5, x) * (1 - ss(T_ASM, T_ASM + 0.8, x));
  // the turntable: a full +360 deg from the explode to just after the bee is whole again
  const TT = [T_EXP + 0.2, T_ASM + 1.2];
  const turnAt = (x) => {
    const [a, b] = TT;
    if (x <= a) return 0;
    const R = 0.5;
    const span = b - a;
    const v = 360 / (span - R);
    const y0 = Math.min(x, b) - a;
    if (y0 < R) return (v * y0 * y0) / (2 * R);
    if (y0 < span - R) return v * (y0 - R / 2);
    const y = y0 - (span - R);
    return v * (span - 1.5 * R) + v * y - (v * y * y) / (2 * R);
  };
  // the wings park for the acts that need still wings and for the explode; when the next act parks them too they stay
  // parked across the cut instead of spinning up for a moment between
  const STOPS = [];
  SCRIPT.forEach((e, n) => {
    const A2 = ACT_R[e.act];
    if (!A2?.stop) return;
    const t0 = tauAt(e.t);
    const nx = SCRIPT[n + 1];
    const hold = nx && (ACT_R[nx.act]?.stop || nx.act === 'exploded') ? tauAt(nx.t) - t0 + 0.4 : A2.close[1];
    STOPS.push([t0, t0 + 0.35, t0 + hold, t0 + hold + 0.45]);
  });
  STOPS.push([T_EXP, T_EXP + 0.4, T_ASM + 0.7, T_ASM + 1.2]);
  const stopAt = (x) => Math.max(0, ...STOPS.map((w) => bump(w[0], w[1], w[2], w[3], x)));
  const activity = (x) => Math.max(...Object.keys(ACT_R).map((a) => openOf(a, x)), explodeAt(x));
  const DT = 1 / 240;
  const SPIN = [0];
  for (let i = 1; i * DT <= DURATION + 1; i++) SPIN.push(SPIN[i - 1] + (1 + 5 * activity((i - 0.5) * DT)) * DT);
  const look = (A2, x) => {
    const u = Math.max(0, Math.min(A2.length - 2, x / DT));
    const i = Math.floor(u);
    return A2[i] + (A2[i + 1] - A2[i]) * (u - i);
  };
  const spinAt = (x) => (x < 0 ? x : look(SPIN, x));

  // the bee: dives in from high on the left banking, flares nose-up and hovers through the teardowns, turns on the
  // explode turntable, turns a little toward the lens on HERO and climbs out of the top of the frame
  const flightAt = (x) => {
    const kIn = ss(-0.9, 1.6, x);
    const ex = explodeAt(x);
    const calm = 1 - Math.min(1, ex * 2.5);
    const path = new THREE.Vector3(lerp(-0.8 * S * K, 0, kIn), lerp(1.0 * S * K, 0, kIn), lerp(0.45 * S * K, 0, kIn));
    let yaw = lerp(-24, 0, kIn);
    let roll = 28 * Math.sin(Math.PI * Math.min(1, kIn * 1.05)) - 7 * Math.sin(2 * Math.PI * kIn) * kIn + 1.7 * Math.sin(x * 1.3 + 1.1) * calm;
    let pitch = -16 * (1 - kIn) + 10 * Math.sin(Math.PI * ss(0.55, 1.0, kIn)) + 1.4 * Math.sin(x * 1.9 + 0.6) * calm;
    yaw += turnAt(x);
    // HERO: the wasp turns a little toward the lens and lifts its nose, then climbs straight up out of the frame,
    // pitching up into the climb with one roll
    const kH = ss(T_END, T_END + 0.8, x);
    yaw -= 22 * kH;
    pitch += 8 * kH;
    roll += 10 * Math.sin(Math.PI * kH);
    if (x > T_END + DEP) {
      const u = x - T_END - DEP;
      const k = ss(0, 0.6, u);
      pitch += 10 * k;
      roll -= 8 * Math.sin(Math.PI * ss(0, 1.3, u));
      path.y += K * (0.18 * u + 0.12 * u * u);
      path.x += K * 0.08 * u * u;
    }
    const pos = path.clone().add(new THREE.Vector3(0, 0.05 * K * Math.sin(x * 2.6) * calm, 0));
    return {pos, path, yaw, roll, pitch, calm};
  };

  // ------------------------------------------------------------ cameras: [az, el, d, tx, ty, tz, sx, sy]
  // az from the right flank (0) toward the face (90); the hero side is about 20-40. The teardown targets and drift
  // rates are the second cut's.
  const macro = (act, u, depth = 0.12) => {
    const A2 = ACT_R[act];
    return 1 - depth * bump(A2.open[1] - 0.35, A2.open[1] + 0.1, A2.close[0] - 0.1, A2.close[1], u);
  };
  const push = (a, b, u, end = 1.9) => lerp(a, b, ss(0, end, u));
  const EXP_SPAN_F = tfAsm - tfExp;
  const CAM = {
    // the dive: the camera comes down from above with the bee, pushing in
    intro: (u) => {
      const k = ss(0, 2.0, u);
      return [lerp(42, 34, k), lerp(14, 10, k), K * lerp(9.6, 8.4, k), C[0], C[1] - 0.2 * K, C[2] + 0.25 * K, -20, -14];
    },
    // the lens from the face side, so the barrel unscrews sideways across the frame
    optics: (u) => [90 - 9 * u, 6, K * push(4.9, 4.3, u) * macro('optics', u, 0.07), C[0], C[1], C[2], 0, -14],
    // the wing from the hero side, rising with it as it leaves the hinge and turns over
    wing: (u) => {
      const k = ss(0, 1.9, u);
      return [38 + 9 * k, lerp(12, 22, k), K * push(11.8, 10.8, u), lerp(C[0], G.WING[0], 0.6), lerp(C[1], G.WING[1], 0.6), lerp(C[2], G.WING[2], 0.6), -200, -14];
    },
    // the thorax from high over the near flank
    thorax: (u) => [6 + 10 * u, 34, K * push(6.9, 6.0, u) * macro('thorax', u), C[0], C[1], C[2], 0, -14],
    // the abdomen from behind the near flank as it telescopes out
    abdomen: (u) => [-32 + 10 * u, 14, K * push(6.8, 5.9, u) * macro('abdomen', u, 0.08), C[0], C[1], C[2], 0, -14],
    // the explode, on FILM time (u = film seconds since the click): while the ramp holds the parts at 0.4x the camera
    // keeps its own speed and swings round low under them looking up, then rises over the turntable and pushes in for
    // the reassembly
    exploded: (u) => {
      const arc = ss(0.45, 2.0, u);
      const rise = ss(1.9, 2.9, u);
      const near = ss(EXP_SPAN_F - 0.3, EXP_SPAN_F + 0.9, u);
      return [24 + 32 * arc - 14 * rise, lerp(10, -2, arc) + 20 * rise, K * (lerp(11.4, 12.0, arc) - 3.6 * near), C[0], C[1] + K * (lerp(-0.15, 0.05, arc) * (1 - rise) - 0.15 * rise), C[2], -10, -14];
    },
    // HERO: low on the front-right, holding still while the wasp turns and climbs out
    hero: (u) => {
      const k = ss(0, 0.9, u);
      return [lerp(42, HERO_AZ, k), lerp(18, HERO_EL, k), K * lerp(8.4, HERO_D, k), C[0], C[1] - 0.15 * K, C[2] + 0.25 * K, -14, -14];
    },
  };

  const VIEWS = [{t: -1, tf: -1, key: 'intro'}, ...SCRIPT.map((e) => ({t: tauAt(e.t), tf: e.t, key: e.act === 'assemble' ? 'exploded' : e.act}))];
  const viewIdx = (x) => {
    let i = 0;
    while (i < VIEWS.length - 1 && VIEWS[i + 1].t <= x) i++;
    return i;
  };
  // ASSEMBLE runs on the EXPLODED view's clock, so both read as one continuous shot (and HERO blends out of it)
  const resolve = (i) => (VIEWS[i].key === 'exploded' && i > 0 && VIEWS[i - 1].key === 'exploded' ? VIEWS[i - 1] : VIEWS[i]);
  const camFn = (V, x, t) => CAM[V.key](V.key === 'intro' ? x : V.key === 'exploded' ? t - V.tf : x - V.t);
  const camAt = (x, t) => {
    const i = viewIdx(x);
    let o = camFn(resolve(i), x, t);
    if (i > 0 && resolve(i) === VIEWS[i]) {
      const k = ss(VIEWS[i].t, VIEWS[i].t + 0.7, x);
      if (k < 1) {
        const a = camFn(resolve(i - 1), x, t);
        const dAz = ((o[0] - a[0] + 540) % 360) - 180;
        const b = o.map((v, j) => lerp(a[j], v, k));
        b[0] = a[0] + dAz * k;
        b[2] += 0.5 * Math.sin(Math.PI * k);
        o = b;
      }
    }
    const f = flightAt(x);
    // the camera follows the wasp's path, and on the climb lets go sideways and follows the rise a third of the way
    const kOut = 0;
    const kIn = 1 - ss(0.2, 1.9, x);
    const tr = (0.85 + 0.15 * kIn) * (1 - kOut);
    const trY = (0.85 + 0.15 * kIn) * (1 - 0.65 * kOut);
    return {az: o[0], el: o[1], d: o[2], tx: o[3] + f.path.x * tr, ty: o[4] + f.path.y * trY, tz: o[5] + f.path.z * tr, sx: o[6], sy: o[7]};
  };
  const actAt = (x) => VIEWS[viewIdx(x)].key;

  const stateAt = (t) => {
    const x = tauAt(t);
    const ex = explodeAt(x);
    const amp = AMP * (1 - stopAt(x));
    const f = flightAt(x);
    const open = Object.fromEntries(Object.keys(ACT_R).map((a) => [a, openOf(a, x)]));
    let wingFlip = 0;
    for (const t0 of at('wing')) wingFlip = Math.max(wingFlip, ss(t0 + WING_FLIP[0], t0 + WING_FLIP[1], x));
    if (wingFlip >= 1) wingFlip = 0;
    // the sting: out of its collar once the abdomen hangs open, back in before it closes
    let stingK = 0;
    for (const t0 of at('abdomen')) stingK = Math.max(stingK, ss(t0 + 0.75, t0 + 1.15, x) * (1 - ss(t0 + 1.4, t0 + 1.6, x)));
    return {
      t,
      tau: x,
      rate: rate(t),
      spinT: spinAt(x),
      explode: ex,
      amp,
      flap: Math.PI * 2 * FLAP_HZ * x - Math.PI / 2,
      display: 1 - amp / AMP,
      blur: 1,
      sub: {thorax: open.thorax, abdomen: open.abdomen},
      eye: open.optics,
      wingOut: open.wing,
      wingFlip,
      stingK,
      legK: 0,
      open,
      flight: f,
      cam: camAt(x, t),
      view: actAt(x),
      guides: 0.45 + 0.55 * Math.min(1, ex * 2.5 + activity(x)),
      turn: turnAt(x),
    };
  };

  // labels: on while the act's parts are moving apart and while they hang open, gone before they close
  const LABELS = {
    optics: [['eye', 'OPTIC EYE', 'Ø 20 MM · AMBER BEZEL']],
    wing: [['wing', 'WING BLADES', '8 GLASS FEATHERS'], ['arm', 'WING ARM', '3 JOINTS · 2 PISTONS'], ['shoulder', 'SHOULDER BALL', 'QUICK RELEASE']],
    thorax: [['turbine', 'CHEST TURBINE', '20 BLADES']],
    abdomen: [['tail', 'TAIL FAN', '9 GLASS FEATHERS']],
    exploded: [['eye', 'OPTIC EYE', 'Ø 20 MM'], ['beak', 'BEAK', 'STEEL NEEDLE'], ['turbine', 'CHEST TURBINE', '20 BLADES'], ['wing', 'WING', '8 GLASS BLADES'], ['tail', 'TAIL FAN', '9 GLASS FEATHERS']],
  };
  const labelAt = (x, s) => {
    const v = s.view;
    if (ACT_R[v]) {
      const t0 = at(v).filter((y) => y <= x).pop();
      const A2 = ACT_R[v];
      return {set: LABELS[v], o: bump(t0 + A2.open[0] + 0.1, t0 + A2.open[0] + 0.4, t0 + A2.close[0] - 0.25, t0 + A2.close[0], x)};
    }
    if (v === 'exploded') return {set: LABELS.exploded, o: bump(T_EXP + 0.4, T_EXP + 0.8, T_EXP + 1.6, T_EXP + 1.9, x)};
    return {set: [], o: 0};
  };

  const telemetry = (t, s) => {
    const x = s.tau;
    const f = s.flight;
    const stroke = [];
    for (let i = 0; i <= 90; i++) {
      const tt = x - 1.2 + (i / 90) * 1.2;
      const a = AMP * (1 - stopAt(tt));
      const ph = Math.PI * 2 * FLAP_HZ * tt;
      stroke.push([a * Math.sin(ph), a * Math.sin(ph + 0.7)]);
    }
    const ex = s.explode > 0.04;
    const acc = -Math.sin(x * 2.6);
    const free = [0, 1, 2, 3, 4, 5].map(() => ex);
    const servos = [0.44, 0.58, 0.49, 0.4, 0.53, 0.46].map((b, i) => (free[i] ? 0 : Math.max(0, Math.min(1, b * (1 + 0.32 * acc) + 0.12 * Math.abs(f.roll) / 30 + 0.03 * Math.sin(x * 7 + i)))));
    const v = s.view;
    const opening = ACT_R[v] ? s.open[v] : 0;
    const NAME = {optics: 'EYE OPEN', wing: 'WING OFF', thorax: 'TURBINE OPEN', abdomen: 'TAIL OPEN'};
    const dartU = x - T_END - DEP;
    const darting = dartU > 0;
    let status = 'HOVER';
    let kind = 'ok';
    if (x < T_FIRST) status = 'DIVING';
    if (ACT_R[v] && opening > 0.05) [status, kind] = [NAME[v], 'warn'];
    if (v === 'exploded') [status, kind] = s.rate < 0.9 ? ['SLOW-MO', 'warn'] : x < T_ASM ? ['TEARDOWN', 'warn'] : s.explode > 0.04 ? ['REASSEMBLY', 'warn'] : ['HOVER', 'ok'];
    if (darting) status = 'RISING';
    const ROW = {optics: 0, thorax: 2, wing: 3, leg: 4, abdomen: 5};
    const sub = (i) => {
      if (ex) return ['warn', 'DETACHED'];
      if (ROW[v] === i && opening > 0.05) return ['warn', i === 3 ? 'DETACHED' : 'OPEN'];
      if (i === 3) return s.amp > 1 ? ['ok', `${FLAP_HZ} HZ`] : ['idle', 'PARKED'];
      if (i === 2) return s.amp > 1 ? ['ok', 'RUNNING'] : ['idle', 'STOPPED'];
      return ['ok', ['TRACKING', 'LOCKED', '', '', 'HOLDING', 'SEALED'][i]];
    };
    const last = SCRIPT.filter((e) => e.t <= t).pop();
    const say = (e) => (e.act === 'exploded' ? 'EXPLODED ON' : e.act === 'assemble' ? 'EXPLODED OFF · REASSEMBLE' : e.act === 'hero' ? 'HERO · CLIMB-OUT' : `ISOLATE ${ASSEMBLY_LABEL[e.act]}`);
    const sp = darting ? 0.4 + 1.2 * (1.2 + 3 * dartU) : f.pos.length() > 0.05 ? 0.4 + 0.2 * Math.abs(Math.sin(x)) : 0.004;
    const labels = labelAt(x, s);
    return {
      time: t,
      dur: DURATION,
      lift: Math.max(0, (s.amp / AMP) * (0.68 + 0.02 * Math.sin(s.flap)) + 0.12 * Math.abs(f.roll) / 30),
      status,
      statusKind: kind,
      freq: FLAP_HZ * ss(0.5, 6, s.amp),
      amp: s.amp,
      stroke,
      playback: s.rate,
      blur: 1,
      battery: 0.842 - 0.0022 * t,
      power: 4.2 + 31 * Math.pow(s.amp / AMP, 1.5) * (1 + 0.04 * Math.sin(s.flap)) + 3 * Math.abs(f.roll) / 30 + (darting ? 9 * ss(0, 0.5, dartU) : 0),
      volt: 3.92 - 0.006 * 36,
      motorT: 34 + 0.35 * t,
      servos,
      legsFree: ex,
      legFreeEach: free,
      airborne: true,
      alt: (f.pos.y - FLOOR_Y) * MM,
      vs: x < T_FIRST ? -MM * S * (ss(-0.9, 1.6, x + 0.05) - ss(-0.9, 1.6, x - 0.05)) * 10 : MM * 0.05 * 2.6 * Math.cos(x * 2.6) * f.calm,
      pitch: f.pitch,
      roll: f.roll,
      airspeed: sp,
      view: v === 'intro' ? 'hero' : v === 'exploded' ? null : v,
      display: {labels: labels.o > 0.5, exploded: x >= T_EXP && x < T_ASM, blur: s.amp > 3, turntable: s.turn > 0.5 && x < TT[1]},
      subs: [0, 1, 2, 3, 4, 5].map(sub),
      focus: ROW[v] ?? (v === 'exploded' ? 1 : -1),
      events: EVENTS,
      next: `${EVENTS.length} OPERATOR ACTIONS`,
      log: last ? `OPERATOR · ${say(last)}` : 'INBOUND · SWOOPING IN · BANK LEFT',
      turbine: 0.35 + 0.65 * Math.min(1, s.amp / AMP) * (0.92 + 0.08 * Math.sin(x * 3.1)) + (darting ? 0.2 * ss(0, 0.5, dartU) : 0),
      mode: status,
      modeSub:
        status === 'DIVING'
          ? `BANK ${f.roll.toFixed(0)}° · DIVING IN`
          : status === 'SLOW-MO'
            ? `PLAYBACK ${s.rate.toFixed(2)}× · ${Math.round(s.explode * 100)}% APART`
            : status === 'TEARDOWN' || status === 'REASSEMBLY'
              ? `TURNTABLE ${Math.round(s.turn)}° CW · ${Math.round(s.explode * 100)}% APART`
              : status === 'RISING'
                ? `CLIMBING · ${sp.toFixed(1)} M/S`
                : ACT_R[v]
                  ? `${ASSEMBLY_LABEL[v]} · ${Math.round(opening * 100)}% APART`
                  : `STATION KEEPING · ${((f.pos.y - FLOOR_Y) * MM).toFixed(0)} MM AGL`,
      viewNote: `ISOLATE · ${v === 'intro' || v === 'hero' ? 'HERO' : v === 'exploded' ? 'ALL' : ASSEMBLY_LABEL[v]}`,
      labelSet: labels,
    };
  };

  return {SCRIPT, DURATION, stateAt, telemetry, camAt, flightAt, tauAt};
}
