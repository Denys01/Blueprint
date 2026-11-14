// ROUND 4 (round 3 kept in chameleon_r3.js): the casque ~40% lower, a curved glass helmet sweeping back over the skull
// into the spine crest; the snout and jaw ~20% shorter and blunter; the toe bundles closing on the branch from both
// sides (tips at 150 deg, never below it). FILM: a mechanism under the casque, the teardown in staggered layers.
// ROUND 3 (round 2 kept in chameleon_r2.js): crouched low on the branch (the branch raised to the belly, short thick
// legs bent hard at elbow and knee), toe bundles wrapping round the branch from both sides, the head 15% bigger and
// blunter, a taller casque sweeping back like a helmet, bigger layered eye cones, mouth 20 deg with a drooping glass
// tongue ending in a droplet, a thicker tail in a larger, lower spiral beside the branch.
// ROUND 2 (round 1 kept in chameleon_r1.js): eye turrets bulge out as cones (no flat gear disc), feet twice the
// size on a thicker branch, 13 big crest spikes instead of a fine saw, a deeper torso, a taller casque, a shorter
// branch, softer speculars (no sparkle glints).
// ROBOTIC CHAMELEON, built from code after the chameleon sheet's panels (blueprint-out/Хамелеон/chameleon-ref/*).
// Base: the alligator r5 build (alligator-shared/alligator.js): its swept-surface plates, rivets, kitbash, joint balls,
// armoured limbs and materials (bright steel and brass marked keep). New: eye turrets that turn on their own ball
// joints with lens rings that unscrew, a glass casque on a riveted frame, a tongue launcher (barrel, spring, glass
// tongue), a spiral tail as a chain of plated segments that uncoils, gripping feet (two opposed glass toe bundles)
// on a steel branch.
// Body frame: +x toward the snout, y up, +z the near side. B = snout tip → tail root = 2 (snout x = 1.0, root x = -0.98).
// Measured once on 02_side / 03_top / 04_front / 05_back (shares of B): head + casque 0.37, casque peak 0.24 above the
// back line's front, body height 0.31 (0.36 with the crest), width 0.21, leg shoulder → grip 0.31, tail uncurled 1.45,
// spiral diameter 0.25, eye turret diameter 0.11.
// pose({t, gape, headUp, headYaw, eyes: [[yaw, pitch], [yaw, pitch]], lensOut: [k, k], tongue, curl, casque, feet,
// explode, spinT}) sets one moment; head, jaw, casque, eye turrets, tongue, tail segments and legs are their own groups.
import * as THREE from 'three';
import {V3, D2R, gearGeo, rbox, cylX, tube, put, aimX, ring, dome, coil} from '../wasp-shared/parts.js';
import {rng, clamp, lerp, ss, table, makeSurf, patchGeo, makeMaterials, makeBuilder} from './kit.js';

export const B = 2;
export const FLOOR_Y = -1.0;
export const BR_Y = -0.62;
export const BR_R = 0.074;
export const BR_X = [-1.88, 1.05];
export const NECK = new V3(0.42, -0.04, 0);
export const HINGE = new V3(0.45, -0.15, 0);

const TORSO = table([
  [-1.02, {cy: 0.0, ryT: 0.115, ryB: 0.115, rz: 0.1}],
  [-0.85, {cy: 0.04, ryT: 0.24, ryB: 0.22, rz: 0.155}],
  [-0.6, {cy: 0.04, ryT: 0.33, ryB: 0.31, rz: 0.195}],
  [-0.3, {cy: 0.03, ryT: 0.35, ryB: 0.33, rz: 0.21}],
  [0.0, {cy: 0.0, ryT: 0.32, ryB: 0.3, rz: 0.205}],
  [0.25, {cy: -0.03, ryT: 0.26, ryB: 0.24, rz: 0.185}],
  [0.5, {cy: -0.05, ryT: 0.18, ryB: 0.17, rz: 0.155}],
]);
const cap = (x, x0, x1) => (x <= x0 ? 1 : Math.sqrt(Math.max(0.0004, 1 - ((x - x0) / (x1 - x0)) ** 2)));
const SKULL0 = table([
  [0.34, {cy: -0.02, ryT: 0.22, ryB: 0.13, rz: 0.165}],
  [0.5, {cy: -0.01, ryT: 0.21, ryB: 0.14, rz: 0.18}],
  [0.65, {cy: -0.025, ryT: 0.17, ryB: 0.125, rz: 0.172}],
  [0.8, {cy: -0.05, ryT: 0.13, ryB: 0.1, rz: 0.145}],
  [0.9, {cy: -0.07, ryT: 0.1, ryB: 0.08, rz: 0.115}],
  [0.96, {cy: -0.08, ryT: 0.08, ryB: 0.065, rz: 0.095}],
]);
const XS1 = 1.0;
const SKULL = (x) => {
  const q = SKULL0(Math.min(x, 0.96));
  const k = cap(x, 0.88, XS1);
  const ky = Math.pow(k, 0.6);
  return {cy: q.cy, ryT: q.ryT * ky, ryB: q.ryB * ky, rz: q.rz * k};
};
const JAW0 = table([
  [0.4, {cy: -0.15, ryB: 0.17, rz: 0.155}],
  [0.55, {cy: -0.15, ryB: 0.15, rz: 0.165}],
  [0.7, {cy: -0.15, ryB: 0.11, rz: 0.14}],
  [0.85, {cy: -0.15, ryB: 0.085, rz: 0.12}],
  [0.95, {cy: -0.15, ryB: 0.065, rz: 0.09}],
]);
const XJ1 = 0.99;
const JAW = (x) => {
  const q = JAW0(Math.min(x, 0.95));
  const k = cap(x, 0.88, XJ1);
  return {cy: q.cy, ryT: 0, ryB: q.ryB * Math.pow(k, 0.6), rz: q.rz * k};
};

// ---------------------------------------------------------------- the tail: a plane curve, then a chain of segments
// a straight-ish root bending into a log spiral (pitch 0.45 r), uncurled length 1.45 B, ~3 turns, diameter 0.25 B
export const TAIL_ROOT = new V3(-0.97, 0.0, 0);
export const TAIL = (() => {
  const R0 = 0.33;
  const k = 0.0947;
  const RE = 0.07;
  const LR = 0.7;
  const K0 = 0.8;
  const kap = (s) => (s < LR * 0.45 ? K0 : s < LR ? K0 + (1 / R0 - K0) * (0.5 - 0.5 * Math.cos((Math.PI * (s - LR * 0.45)) / (LR * 0.55))) : 1 / (R0 - k * (s - LR)));
  const LT = LR + (R0 - RE) / k;
  const rad = (s) => (s < LR ? lerp(0.15, 0.21 * R0, ss(s / LR)) : 0.21 * (R0 - k * (s - LR)));
  const segs = [];
  let s = 0;
  while (s < LT - 0.005) {
    const l = Math.min(clamp(1.5 * rad(s), 0.022, 0.17), LT - s);
    segs.push({s, l, r0: rad(s), r1: rad(s + l)});
    s += l;
  }
  // the heading at each segment's middle; a segment's bend is the change from the one before
  const th = (S) => {
    let a = 0;
    const n = 200;
    for (let i = 0; i < n; i++) a += kap((S * (i + 0.5)) / n) * (S / n);
    return a;
  };
  segs.forEach((g, i) => {
    g.th = th(g.s + g.l / 2);
    g.bend = i ? (g.th - segs[i - 1].th) / D2R : g.th / D2R;
  });
  return {segs, LT};
})();
export const NSEG = TAIL.segs.length;

// legs: 0 near front, 1 far front, 2 near hind, 3 far hind; feet are x positions along the branch
export const LEG = [
  {x: 0.16, side: 1, front: true},
  {x: 0.16, side: -1, front: true},
  {x: -0.76, side: 1, front: false},
  {x: -0.76, side: -1, front: false},
];
export const FEET_HOME = [0.4, 0.08, -0.52, -0.95];
const L1 = 0.3;
const L2 = 0.28;
const ANK = 0.08;

export function buildChameleon({seed = 7} = {}) {
  const M = makeMaterials();
  M.rimHot.emissiveIntensity = 0.85;
  M.chrome.roughness = 0.3;
  M.dome.clearcoat = 0.08;
  M.glass.clearcoat = 0.15;
  M.veinT = new THREE.MeshStandardMaterial({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 0.55, roughness: 0.25, metalness: 0});
  M.branch = new THREE.MeshPhysicalMaterial({color: '#6a7077', roughness: 0.42, metalness: 0.85, clearcoat: 0});
  M.coreDark = new THREE.MeshStandardMaterial({color: '#3a3f46', roughness: 0.45, metalness: 0.7});
  M.toe = new THREE.MeshPhysicalMaterial({color: '#9CC9FF', emissive: '#5b93d6', emissiveIntensity: 0.32, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.42, depthWrite: false, clearcoat: 0.6, clearcoatRoughness: 0.06, envMapIntensity: 0.6});
  for (const k of ['branch', 'coreDark']) M[k].userData.keep = true;
  const R = rng(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const K = makeBuilder(M, R, body);
  const {clear, anchors, anchor, grp, glassy, edge, rivet, plate, deg, face, finGeo, placeOn, kitPart, kitOn, hoop} = K;
  const spin = [];

  // ================================================================ the branch (not part of the body: it stays put)
  const branch = grp(root);
  {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const x = lerp(BR_X[0], BR_X[1], i / 24);
      pts.push(new V3(x, BR_Y + 0.006 * Math.sin(x * 2.3), 0.008 * Math.sin(x * 1.7)));
    }
    put(branch, tube(pts, BR_R, 160, 24), M.branch);
    // cut ends: a steel cap with a thin amber rim
    for (const [x, sg] of [
      [BR_X[0], -1],
      [BR_X[1], 1],
    ]) {
      put(branch, cylX(BR_R * 0.92, BR_R * 0.92, 0.012, 32), M.steel, x + sg * 0.004, BR_Y + 0.006 * Math.sin(x * 2.3), 0);
      put(branch, new THREE.TorusGeometry(BR_R * 0.98, 0.004, 8, 40).rotateY(Math.PI / 2), M.amber, x + sg * 0.008, BR_Y + 0.006 * Math.sin(x * 2.3), 0);
    }
    // a side twig under the front end, as in the hero panel
    {
      const a = new V3(0.98, BR_Y - 0.02, 0.02);
      const b = new V3(1.1, BR_Y - 0.1, 0.1);
      put(branch, tube([a, a.clone().lerp(b, 0.5).add(new V3(0, 0.02, 0)), b], BR_R * 0.55, 30, 16), M.branch);
      put(branch, new THREE.SphereGeometry(BR_R * 0.55, 16, 10), M.steel).position.copy(b);
    }
    // welded bands
    for (const x of [-1.62, -0.24, 0.78]) put(branch, ring(-0.012, 0.012, BR_R * 0.9, BR_R * 1.12, 0.004), M.brass, x, BR_Y + 0.006 * Math.sin(x * 2.3), 0);
  }

  // ================================================================ the torso
  const TS = makeSurf(TORSO, 2.2);
  const torso = grp(body);
  put(
    torso,
    patchGeo(140, 64, (u, v) => {
      const x = lerp(-1.02, 0.5, u);
      const a = -Math.PI + 2 * Math.PI * v;
      return {p: TS.P(x, a, 0.88), n: TS.N(x, a)};
    }),
    M.core,
  );
  const NROW = 12;
  const XB = [];
  for (let i = 0; i <= NROW; i++) XB.push(lerp(-0.98, 0.44, i / NROW));
  const GAP = 0.009;
  const WIN = {xc: -0.33, rx: 0.27, ac: deg(70), ra: deg(25)};
  const inWin = (x0, x1) => x1 > WIN.xc - WIN.rx * 0.85 && x0 < WIN.xc + WIN.rx * 0.85;
  const atLeg = (x0, x1) => LEG.some((g) => x1 > g.x - 0.11 && x0 < g.x + 0.11);
  const MECH = {x0: -0.12, x1: 0.42};
  const inMech = (x0, x1) => x1 > MECH.x0 && x0 < MECH.x1;
  const rows = [];
  const FL = {1: grp(torso), [-1]: grp(torso)};
  for (let r = 0; r < NROW; r++) {
    const rowG = grp(torso);
    rows.push(rowG);
    const x0 = XB[r] + GAP;
    const x1 = XB[r + 1] - GAP;
    for (const sg of [1, -1]) {
      const A = (d) => deg(d) * sg;
      // the back: two rows of keeled plates either side of the crest, rear edge raised over the next
      const extra = (u, v) => 0.012 * (1 - u) + 0.01 * Math.sin(Math.PI * v);
      plate(TS, x0 - 0.02, x1, A(3), A(27), {parent: rowG, lift: 0.014, t: 0.026, extra, res: 0.012, bev: 0.006, edges: ['x0']});
      plate(TS, x0 - 0.015, x1, A(29), A(48), {parent: rowG, lift: 0.012, t: 0.024, extra, res: 0.012, bev: 0.006});
      if (inWin(x0, x1)) {
        plate(TS, x0, x1, A(104), A(128), {parent: FL[sg], t: 0.022});
      } else if (inMech(x0, x1)) {
        plate(TS, x0, x1, A(51), A(84), {parent: FL[sg], t: 0.024, edges: ['a1']});
      } else {
        plate(TS, x0, x1, A(51), A(84), {parent: FL[sg], t: 0.024});
        if (!atLeg(x0, x1)) plate(TS, x0, x1, A(87), A(126), {parent: FL[sg], t: 0.024, edges: r % 3 === 1 ? ['a0'] : []});
        else plate(TS, x0, x1, A(87), A(104), {parent: FL[sg], t: 0.024});
      }
      if (!inMech(x0, x1) || x1 < MECH.x0 + 0.1) plate(TS, x0, x1, A(130), A(154), {parent: FL[sg], t: 0.02});
      plate(TS, x0, x1, A(157), A(179), {parent: FL[sg], t: 0.02});
    }
    hoop(TS, torso, XB[r], deg(2), deg(50), 0.965, 0.011, r % 2 ? M.brass : M.steel);
    hoop(TS, torso, XB[r], deg(86), deg(150), 0.96, 0.01, r % 2 ? M.steel : M.brass);
  }
  hoop(TS, torso, XB[NROW], deg(2), deg(150), 0.965, 0.012, M.steel);
  // the crest: brass spikes down the spine, tallest over the middle of the back, leaning back
  const crest = grp(torso);
  for (let i = 0; i <= 12; i++) {
    const x = lerp(-0.9, 0.05, i / 12);
    const u = clamp((x + 0.98) / 1.42, 0, 1);
    const h = 0.05 + 0.075 * Math.sin(Math.PI * Math.pow(u, 0.8));
    const f = put(crest, finGeo(0.07, h, 0.018, 0.85), M.brass);
    placeOn(f, TS.P(x, 0, 1.0).add(new V3(0, 0.02, 0)), TS.N(x, 0));
  }
  // rods along the long gaps
  for (const sg of [1, -1]) {
    for (const [a, k, r, mat] of [
      [28, 0.975, 0.01, M.steel],
      [49.5, 0.97, 0.011, M.hose],
      [128, 0.96, 0.01, M.steel],
    ]) {
      const pts = [];
      for (let i = 0; i <= 30; i++) pts.push(TS.P(lerp(-0.96, 0.46, i / 30), deg(a) * sg, k));
      put(torso, tube(pts, r, 90, 8), mat);
    }
  }
  // the open mechanism behind the shoulder: a gear train, a long piston to the neck, hoses, packed small parts
  for (const sg of [1, -1]) {
    const gears = [
      [0.02, 106, 0.06, 18, M.brass],
      [-0.06, 130, 0.042, 12, M.steel],
      [0.32, 108, 0.05, 14, M.brass],
      [0.36, 136, 0.034, 10, M.steel],
    ];
    for (const [x, a, r, n, mat] of gears) {
      const nn = TS.N(x, deg(a) * sg);
      const gm = put(torso, gearGeo(n, r, r * 0.86, 0.018, r * 0.28, n > 12 ? 5 : 0), mat);
      gm.position.copy(TS.P(x, deg(a) * sg, 0.99));
      face(gm, nn);
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: (n % 4 ? -1 : 1) * (0.06 / r)});
      const hub = put(torso, cylX(r * 0.3, r * 0.3, 0.045, 16), mat === M.brass ? M.steel : M.brass);
      hub.position.copy(gm.position);
      aimX(hub, nn);
    }
    const p0 = TS.P(-0.1, deg(92) * sg, 1.0);
    const p1 = TS.P(0.48, deg(96) * sg, 0.98);
    const c = put(torso, cylX(0.022, 0.022, p0.distanceTo(p1) * 0.55, 20), M.steel);
    c.position.copy(p0).lerp(p1, 0.28);
    aimX(c, p1.clone().sub(p0));
    const rd = put(torso, cylX(0.01, 0.01, p0.distanceTo(p1) * 0.5, 12), M.chrome);
    rd.position.copy(p0).lerp(p1, 0.72);
    aimX(rd, p1.clone().sub(p0));
    for (const q of [0.06, 0.5]) {
      const cc = put(torso, cylX(0.03, 0.03, 0.012, 20), M.brass);
      cc.position.copy(p0).lerp(p1, q);
      aimX(cc, p1.clone().sub(p0));
    }
    for (const a of [114, 142]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) pts.push(TS.P(lerp(-0.14, 0.46, i / 10), deg(a + 6 * Math.sin(i * 1.3)) * sg, 0.985));
      put(torso, tube(pts, 0.009, 40, 8), M.hose);
    }
    for (let i = 0; i < 70; i++) {
      const x = lerp(MECH.x0, MECH.x1, R());
      const a = sg * deg(lerp(88, 152, R()));
      kitPart(torso, TS.P(x, a, lerp(0.93, 0.98, R())), TS.N(x, a), new V3(1, 0, 0), 0.95);
    }
  }
  kitOn(TS, torso, 300, [-0.96, 0.46], [deg(4), deg(176)], [0.92, 0.99], 1.0);
  // the neck: ribbed rings and gears in the short gap under the casque's back edge
  for (let i = 0; i < 3; i++) {
    const x = 0.38 + i * 0.035;
    const q = TORSO(x);
    const m = put(torso, new THREE.TorusGeometry(1, 0.06, 8, 40), i % 2 ? M.steel : M.brass);
    m.position.set(x, q.cy, 0);
    m.rotation.y = Math.PI / 2;
    m.scale.set(q.rz * 0.97, q.ryT * 0.95, q.rz * 0.16);
  }

  // ---------------------------------------------------------------- the glass flank window over brass gears
  const winParts = [];
  for (const sg of [1, -1]) {
    const w = grp(torso);
    const at = (r, th) => {
      const c = Math.cos(th);
      const x = WIN.xc + WIN.rx * (c > 0 ? 1.06 : 0.94) * r * c;
      const a = sg * (WIN.ac + WIN.ra * r * Math.sin(th));
      return [x, a];
    };
    const lift = (r) => 0.016 + 0.07 * Math.pow(Math.max(0, 1 - r * r), 0.6);
    glassy(
      put(
        w,
        patchGeo(24, 64, (u, v) => {
          const r = Math.max(0.002, u);
          const [x, a] = at(r, v * Math.PI * 2);
          const n = TS.N(x, a);
          return {p: TS.P(x, a).addScaledVector(n, lift(r)), n};
        }),
        M.dome,
      ),
    );
    const ring0 = [];
    const ring1 = [];
    for (let i = 0; i <= 96; i++) {
      const [x, a] = at(1, (i / 96) * Math.PI * 2);
      const n = TS.N(x, a);
      ring0.push(TS.P(x, a).addScaledVector(n, 0.018));
      ring1.push(TS.P(x, a).addScaledVector(n, 0.03));
      if (i % 8 === 0 && i < 96) rivet(w, TS.P(x, a).addScaledVector(n, 0.032), n);
    }
    put(w, tube(ring0, 0.018, 240, 8, true), M.shell);
    put(w, tube(ring1, 0.004, 240, 6, true), M.rimHot);
    // two struts across the pane, as in the hero's window frame
    for (const th of [0.5, 2.6]) {
      const pts = [];
      for (let i = 0; i <= 10; i++) {
        const [x, a] = at(lerp(-1, 1, i / 10), th);
        pts.push(TS.P(x, a).addScaledVector(TS.N(x, a), lift(Math.abs(lerp(-1, 1, i / 10))) + 0.004));
      }
      put(w, tube(pts, 0.004, 30, 6), M.steel);
    }
    const mech = grp(torso);
    for (const [x, a, r, tth] of [
      [-0.2, 66, 0.095, 22],
      [-0.4, 80, 0.075, 18],
      [-0.5, 58, 0.05, 12],
      [-0.27, 90, 0.04, 10],
      [-0.12, 82, 0.045, 12],
    ]) {
      const n = TS.N(x, deg(a) * sg);
      const gm = put(mech, gearGeo(tth, r, r * 0.86, 0.02, r * 0.22, 6), M.brass);
      gm.position.copy(TS.P(x, deg(a) * sg, 1.0));
      face(gm, n);
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: (tth % 4 ? -1 : 1) * (0.07 / r)});
      const hub = put(mech, cylX(r * 0.28, r * 0.28, 0.05, 16), M.steel);
      hub.position.copy(gm.position);
      aimX(hub, n);
    }
    {
      const p0 = TS.P(-0.58, deg(92) * sg, 0.99);
      const p1 = TS.P(-0.08, deg(96) * sg, 0.99);
      const c = put(mech, cylX(0.024, 0.024, p0.distanceTo(p1), 24), M.steel);
      c.position.copy(p0).lerp(p1, 0.5);
      aimX(c, p1.clone().sub(p0));
      for (let i = 0; i < 5; i++) {
        const rr = put(mech, cylX(0.032, 0.032, 0.01, 20), M.brass);
        rr.position.copy(p0).lerp(p1, 0.1 + i * 0.2);
        aimX(rr, p1.clone().sub(p0));
      }
    }
    for (let i = 0; i < 36; i++) {
      const [x, a] = at(Math.sqrt(R()) * 0.9, R() * Math.PI * 2);
      kitPart(mech, TS.P(x, a, 0.95), TS.N(x, a), new V3(1, 0, 0), 1.0);
    }
    const lamp = new THREE.PointLight('#ffb27a', 0.06, 0.5, 2);
    lamp.position.copy(TS.P(WIN.xc, WIN.ac * sg)).addScaledVector(TS.N(WIN.xc, WIN.ac * sg), 0.06);
    w.add(lamp);
    winParts.push({w, mech, n: TS.N(WIN.xc, WIN.ac * sg)});
  }

  // ================================================================ the head (pivots at the neck) and the skull
  const head = grp(body, NECK.x, NECK.y, NECK.z);
  head.scale.setScalar(1.15);
  const skull = grp(head, -NECK.x, -NECK.y, -NECK.z);
  const SS = makeSurf(SKULL, 2.4);
  put(
    skull,
    patchGeo(90, 56, (u, v) => {
      const x = lerp(0.34, XS1, u);
      const a = -Math.PI + 2 * Math.PI * v;
      return {p: SS.P(x, a, 0.97), n: SS.N(x, a)};
    }),
    M.core,
  );
  const skullPl = grp(skull);
  // flat satin panels with fine seams and corner rivets; amber on the lip line and one seam behind the eye
  const HX = [0.36, 0.5, 0.6, 0.74, 0.86, 0.94, 0.995];
  for (let i = 0; i < HX.length - 1; i++) {
    const x0 = HX[i] + 0.006;
    const x1 = HX[i + 1] - 0.006;
    for (const sg of [1, -1]) {
      const A = (d) => deg(d) * sg;
      plate(SS, x0, x1, A(2), A(46), {parent: skullPl, lift: 0.008, t: 0.02, bev: 0.005, res: 0.012});
      plate(SS, x0, x1, A(49), A(100), {parent: skullPl, lift: 0.008, t: 0.02, bev: 0.005, res: 0.012, edges: i === 1 ? ['x1'] : []});
      plate(SS, x0, x1, A(103), A(146), {parent: skullPl, lift: 0.008, t: 0.02, bev: 0.005, res: 0.012, edges: ['a1']});
    }
  }
  kitOn(SS, skull, 50, [0.38, 0.9], [deg(4), deg(150)], [0.95, 1.0], 0.8);
  // the brow: a raised shell ridge from the snout over each eye to the casque
  for (const sg of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const x = lerp(0.95, 0.5, i / 14);
      const a = deg(lerp(30, 42, i / 14) + 14 * Math.sin((Math.PI * i) / 14)) * sg;
      pts.push(SS.P(x, a).addScaledVector(SS.N(x, a), 0.022));
    }
    put(skullPl, tube(pts, 0.014, 50, 8), M.shell);
    put(skullPl, tube(pts.map((p) => p.clone().add(new V3(0, 0.012, 0))), 0.0035, 50, 6), M.amber);
  }
  // nostrils
  for (const sg of [1, -1]) {
    const x = 0.95;
    const a = deg(62) * sg;
    const m = put(skullPl, cylX(0.011, 0.014, 0.012, 16), M.lining);
    m.position.copy(SS.P(x, a).addScaledVector(SS.N(x, a), 0.008));
    aimX(m, SS.N(x, a));
    const rr = put(skullPl, new THREE.TorusGeometry(0.013, 0.0025, 6, 20), M.amber);
    rr.position.copy(m.position).addScaledVector(SS.N(x, a), 0.006);
    face(rr, SS.N(x, a));
  }
  // the upper lip line and the small glass teeth along it
  const teeth = [];
  for (const sg of [1, -1]) {
    const lip = [];
    for (let i = 0; i <= 30; i++) {
      const x = lerp(0.47, 1.0, i / 30);
      lip.push(SS.P(x, deg(150) * sg, 1.0).addScaledVector(SS.N(x, deg(150) * sg), 0.01));
    }
    edge(skullPl, lip, 0.005);
    for (let i = 0; i < 16; i++) {
      const x = lerp(0.52, 0.97, i / 15);
      const p = SS.P(x, deg(166) * sg, 0.98);
      const tt = put(skull, new THREE.ConeGeometry(0.008, 0.026, 8).rotateX(Math.PI), M.tooth, p.x, p.y - 0.008, p.z);
      teeth.push(tt);
    }
  }

  // ---------------------------------------------------------------- the eye turrets (each its own ball joint)
  const EYE_X = 0.665;
  const EYE_A = 74;
  const eyeParts = [];
  for (const sg of [1, -1]) {
    const p = SS.P(EYE_X, deg(EYE_A) * sg);
    const n = SS.N(EYE_X, deg(EYE_A) * sg);
    // the socket's frame: x the turret's rest axis (out, a little forward and up), y up across it
    const X = n.clone().add(new V3(0.18, 0.12, 0)).normalize();
    const Y = new V3(0, 1, 0).addScaledVector(X, -X.y).normalize();
    const Z = new V3().crossVectors(X, Y);
    const e = grp(skull);
    e.position.copy(p).addScaledVector(n, 0.005);
    e.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    // the socket: a shell collar with a brass gear ring and an amber rim, set into the head plates
    put(e, ring(-0.03, 0.016, 0.11, 0.136, 0.005, {segs: 56}), M.shell);
    put(e, gearGeo(32, 0.118, 0.108, 0.01, 0.1, 0).rotateY(Math.PI / 2), M.brass, 0.01);
    put(e, new THREE.TorusGeometry(0.135, 0.0032, 6, 64).rotateY(Math.PI / 2), M.amber, 0.018);
    for (let i = 0; i < 10; i++) {
      const aa = (i / 10) * Math.PI * 2;
      const nn = new V3(0.6, Math.cos(aa) * 0.8, Math.sin(aa) * 0.8).normalize();
      rivet(e, new V3(0.016, Math.cos(aa) * 0.124, Math.sin(aa) * 0.124), nn);
    }
    // the ball: a dark steel core under two rings of petal plates; it turns about its centre, inside the collar
    const ball = grp(e, 0.032, 0, 0);
    ball.scale.set(1.45, 1, 1);
    put(ball, new THREE.SphereGeometry(0.106, 40, 24), M.coreDark);
    // three layered bands, each stepping in toward the lens: a cone of overlapping plates
    for (const [p0, p1, nP, off, RB] of [
      [17, 38, 8, 0, 0.106],
      [36, 63, 10, 0.5, 0.113],
      [61, 92, 12, 0, 0.118],
    ]) {
      for (let i = 0; i < nP; i++) {
        const a0 = ((i + off) / nP) * Math.PI * 2 + 0.04;
        const a1 = ((i + 1 + off) / nP) * Math.PI * 2 - 0.04;
        put(ball, dome(RB, 0.013, deg(p0), deg(p1), {a0, a1, segs: 10}), M.shell);
        // amber on the inner rim of the band nearest the lens only
        if (p0 === 17) put(ball, dome(RB + 0.0015, 0.004, deg(p0), deg(p0 + 2.5), {a0, a1, segs: 10}), M.amber);
        const am = (a0 + a1) / 2;
        const pm = deg((p0 + p1) / 2);
        const nn = new V3(Math.cos(pm), Math.sin(pm) * Math.cos(am), Math.sin(pm) * Math.sin(am));
        rivet(ball, nn.clone().multiplyScalar(RB + 0.001), nn);
      }
    }
    // the iris stack on the apex: steel collar, steel bezel, amber ring, glossy black lens; each unscrews along x
    const lensG = grp(ball);
    put(lensG, ring(0.08, 0.108, 0.03, 0.05, 0.004, {segs: 48}), M.steel);
    const rings = [
      put(lensG, ring(0.104, 0.118, 0.033, 0.05, 0.003, {segs: 48}), M.chrome),
      put(lensG, ring(0.114, 0.126, 0.028, 0.041, 0.002, {segs: 48}), M.amber),
      put(lensG, new THREE.SphereGeometry(0.036, 32, 20), M.lens, 0.114),
    ];
    rings[2].scale.set(0.62, 1, 1);
    eyeParts.push({e, ball, lensG, rings, ring0: rings.map((o) => o.position.x), sg});
  }
  anchor('eye', eyeParts[0].ball, 0.11, 0, 0);
  anchor('lens', eyeParts[0].rings[2], 0.03, 0, 0);

  // ---------------------------------------------------------------- the casque: a glass tent on a riveted frame
  const casque = grp(skull);
  {
    const crv = (pts) => new THREE.CatmullRomCurve3(pts.map(([x, y]) => new V3(x, y, 0)), false, 'catmullrom', 0.5);
    const ridge = crv([
      [0.8, 0.075],
      [0.72, 0.19],
      [0.62, 0.31],
      [0.5, 0.405],
      [0.39, 0.46],
      [0.3, 0.465],
      [0.22, 0.43],
      [0.165, 0.35],
      [0.13, 0.255],
    ]);
    const base = crv([
      [0.8, 0.075],
      [0.68, 0.135],
      [0.55, 0.19],
      [0.43, 0.205],
      [0.33, 0.21],
      [0.22, 0.232],
      [0.13, 0.255],
    ]);
    const wb = (u) => 0.11 * Math.pow(Math.sin(Math.PI * u), 0.5);
    const S = (u, v, sg, off = 0) => {
      const b = base.getPoint(u);
      const r = ridge.getPoint(u);
      b.z = sg * wb(u);
      const p = b.lerp(r, v);
      p.z += sg * (0.034 * Math.sin(Math.PI * v) * Math.sin(Math.PI * u) + off);
      return p;
    };
    for (const sg of [1, -1]) {
      glassy(put(casque, patchGeo(40, 18, (u, v) => ({p: S(u, v, sg), n: new V3(0, 0.3, sg)})), M.glass));
      // veins: a jittered net of cells on the pane, slightly proud
      const NU = 9;
      const NV = 5;
      const G = [];
      for (let i = 0; i <= NU; i++)
        for (let j = 0; j <= NV; j++) {
          const ju = i > 0 && i < NU ? (R() - 0.5) * 0.5 : 0;
          const jv = j > 0 && j < NV ? (R() - 0.5) * 0.5 : 0;
          G.push([(i + ju) / NU, (j + jv) / NV]);
        }
      const g = (i, j) => G[i * (NV + 1) + j];
      const vein = (a, b) => {
        const pts = [];
        for (let q = 0; q <= 5; q++) {
          const u = lerp(a[0], b[0], q / 5);
          const v = lerp(a[1], b[1], q / 5);
          pts.push(S(clamp(u, 0.01, 0.99), clamp(v, 0, 1), sg, 0.0025));
        }
        put(casque, tube(pts, 0.0024, 10, 4), M.veinT).castShadow = false;
      };
      for (let i = 1; i < NU; i++) for (let j = 0; j < NV; j++) vein(g(i, j), g(i, j + 1));
      for (let i = 0; i < NU; i++) for (let j = 1; j < NV; j++) if ((i + j) % 4 !== 0) vein(g(i, j), g(i + 1, j));
      // the base rail: steel with rivets
      const rail = [];
      for (let i = 0; i <= 30; i++) rail.push(S(i / 30, 0, sg, 0.004));
      put(casque, tube(rail, 0.011, 80, 8), M.shell);
      for (let i = 1; i < 12; i++) {
        const p = S(i / 12, 0, sg, 0.014);
        rivet(casque, p, new V3(0, 0.4, sg).normalize());
      }
      // ribs from base to ridge
      for (const u of [0.22, 0.42, 0.62, 0.8]) {
        const pts = [];
        for (let j = 0; j <= 8; j++) pts.push(S(u, j / 8, sg, 0.003));
        put(casque, tube(pts, 0.0045, 20, 6), M.steel);
      }
    }
    // the ridge: shell blocks along it, an amber edge on top, rivets
    const RN = 32;
    for (let i = 0; i < RN; i++) {
      const u0 = (i + 0.08) / RN;
      const u1 = (i + 0.92) / RN;
      const a = ridge.getPoint(u0);
      const b = ridge.getPoint(u1);
      const m = put(casque, rbox(a.distanceTo(b), 0.026, 0.026, 0.006), M.shell);
      m.position.copy(a).lerp(b, 0.5);
      aimX(m, b.clone().sub(a));
      if (i % 2 === 0) rivet(casque, m.position.clone().add(new V3(0, 0, 0.014)), new V3(0, 0, 1));
      if (i % 2 === 0) rivet(casque, m.position.clone().add(new V3(0, 0, -0.014)), new V3(0, 0, -1));
    }
    const top = [];
    for (let i = 0; i <= 60; i++) {
      const u = i / 60;
      const p = ridge.getPoint(u);
      const t = ridge.getTangent(u);
      top.push(p.add(new V3(-t.y, t.x, 0).multiplyScalar(0.014)));
    }
    edge(casque, top, 0.0042);
  }
  anchor('casque', casque, 0.42, 0.36, 0.05);
  // under the casque: a spine of brass gears on the skull top, two lift pistons, a steel rail
  const casqueMech = grp(skull);
  {
    for (const [x, r, n] of [
      [0.62, 0.045, 14],
      [0.52, 0.06, 18],
      [0.4, 0.05, 16],
      [0.3, 0.04, 12],
    ]) {
      const q = SKULL(x);
      const gm = put(casqueMech, gearGeo(n, r, r * 0.86, 0.016, r * 0.3, n > 14 ? 5 : 0), M.brass, x, q.cy + q.ryT * 0.98 + r * 0.55, 0);
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: (n % 4 ? -1 : 1) * (0.05 / r)});
      put(casqueMech, cylX(r * 0.3, r * 0.3, 0.04, 14).rotateY(Math.PI / 2), M.steel, x, q.cy + q.ryT * 0.98 + r * 0.55, 0);
    }
    for (const sg of [1, -1]) {
      const a = new V3(0.6, SKULL(0.6).cy + SKULL(0.6).ryT * 0.9, sg * 0.05);
      const b = new V3(0.42, 0.21, sg * 0.06);
      const c = put(casqueMech, cylX(0.014, 0.014, a.distanceTo(b) * 0.6, 12), M.steel);
      c.position.copy(a).lerp(b, 0.3);
      aimX(c, b.clone().sub(a));
      const rd = put(casqueMech, cylX(0.007, 0.007, a.distanceTo(b) * 0.5, 10), M.chrome);
      rd.position.copy(a).lerp(b, 0.72);
      aimX(rd, b.clone().sub(a));
    }
    const rail = [];
    for (let i = 0; i <= 12; i++) {
      const x = lerp(0.72, 0.26, i / 12);
      const q = SKULL(x);
      rail.push(new V3(x, q.cy + q.ryT + 0.012, 0));
    }
    put(casqueMech, tube(rail, 0.008, 40, 8), M.hose);
  }
  anchor('casqueMech', casqueMech, 0.52, 0.27, 0.0);

  // ---------------------------------------------------------------- the tongue launcher (rides in the skull)
  const tongueAxis = new V3(1, -0.12, 0).normalize();
  const launcher = grp(skull, 0.42, -0.175, 0);
  aimX(launcher, tongueAxis);
  put(launcher, cylX(0.036, 0.04, 0.16, 28), M.steel, 0.08);
  put(launcher, ring(0.0, 0.02, 0.03, 0.046, 0.003, {segs: 32}), M.brass, 0.015);
  put(launcher, ring(0.0, 0.016, 0.03, 0.044, 0.003, {segs: 32}), M.brass, 0.15);
  const spring = put(launcher, coil(0.026, 0.0045, 9, 0.16, 300), M.chrome, 0.17);
  put(launcher, cylX(0.011, 0.011, 0.24, 12), M.chrome, 0.27);
  const muzzle = put(launcher, ring(0.0, 0.026, 0.017, 0.034, 0.004, {segs: 32}), M.steel, 0.33);
  put(launcher, new THREE.TorusGeometry(0.033, 0.003, 6, 32).rotateY(Math.PI / 2), M.amber, 0.358);
  // mouth lining below the launcher
  const tongue = grp(launcher, 0.35, 0, 0);
  const TN = 7;
  const tSegs = [];
  {
    let par = tongue;
    for (let i = 0; i < TN; i++) {
      const g = grp(par);
      const r0 = 0.016 - 0.0005 * i;
      const m = glassy(put(g, cylX(r0, r0 - 0.0005, 1, 18).translate(0.5, 0, 0), M.glassThick));
      tSegs.push({g, m});
      par = g;
    }
  }
  // the droplet: a narrow neck on the stem, a full round bulb hanging off the end
  const tTip = grp(tSegs[TN - 1].g);
  {
    const H = 0.11;
    const RD = 0.04;
    const pr = [];
    for (let i = 0; i <= 32; i++) {
      const t = i / 32;
      const r = t < 0.62 ? lerp(0.0125, RD, Math.pow(ss(t / 0.62), 0.9)) : RD * Math.sqrt(Math.max(0, 1 - ((t - 0.62) / 0.38) ** 2));
      pr.push(new THREE.Vector2(Math.max(r, 1e-4), t * H));
    }
    glassy(put(tTip, new THREE.LatheGeometry(pr, 28).rotateZ(-Math.PI / 2), M.glassThick));
  }
  anchor('tongue', tongue, 0.1, 0, 0);

  // ================================================================ the lower jaw, hung on the hinge
  const jaw = grp(head, HINGE.x - NECK.x, HINGE.y - NECK.y, 0);
  const jawIn = grp(jaw, -HINGE.x, -HINGE.y, 0);
  const JS = makeSurf(JAW, 2.4);
  put(
    jawIn,
    patchGeo(80, 48, (u, v) => {
      const x = lerp(0.4, XJ1, u);
      const a = -Math.PI + 2 * Math.PI * v;
      return {p: JS.P(x, a, 0.97), n: JS.N(x, a)};
    }),
    M.core,
  );
  // the inside of the mouth: a dark trough
  put(
    jawIn,
    patchGeo(40, 16, (u, v) => {
      const x = lerp(0.45, 0.97, u);
      const q = JAW(x);
      const z = lerp(-1, 1, v) * q.rz * 0.82;
      return {p: new V3(x, q.cy + 0.003 - 0.03 * Math.cos((Math.PI * lerp(-1, 1, v)) / 2) * (1 - u * 0.6), z), n: new V3(0, 1, 0)};
    }),
    M.mouthDark,
  );
  const jawPl = grp(jawIn);
  const JX = [0.42, 0.56, 0.7, 0.84, 0.93, 0.985];
  for (let i = 0; i < JX.length - 1; i++) {
    for (const sg of [1, -1]) {
      const A = (d) => deg(d) * sg;
      plate(JS, JX[i] + 0.006, JX[i + 1] - 0.006, A(92), A(130), {parent: jawPl, lift: 0.008, t: 0.02, bev: 0.005, res: 0.012, edges: ['a0']});
      plate(JS, JX[i] + 0.006, JX[i + 1] - 0.006, A(133), A(178), {parent: jawPl, lift: 0.008, t: 0.02, bev: 0.005, res: 0.012});
    }
  }
  for (const sg of [1, -1]) {
    for (let i = 0; i < 14; i++) {
      const x = lerp(0.54, 0.95, i / 13);
      const q = JAW(x);
      put(jawIn, new THREE.ConeGeometry(0.0075, 0.022, 8), M.tooth, x, q.cy + 0.008, sg * q.rz * 0.9);
    }
    // the hinge: brass gear, steel hub, amber ring
    const hz = sg * 0.16;
    put(jawIn, gearGeo(16, 0.05, 0.043, 0.016, 0.014, 5), M.brass, HINGE.x, HINGE.y, hz);
    put(jawIn, cylX(0.02, 0.02, 0.04, 16).rotateY(Math.PI / 2), M.steel, HINGE.x, HINGE.y, hz);
    put(jawIn, new THREE.TorusGeometry(0.03, 0.003, 6, 24), M.amber, HINGE.x, HINGE.y, hz + sg * 0.01);
  }

  // ================================================================ the tail: a chain of plated segments
  const tailRoot = grp(body, TAIL_ROOT.x, TAIL_ROOT.y, TAIL_ROOT.z);
  const tailSegs = [];
  {
    let parent = tailRoot;
    TAIL.segs.forEach((S, i) => {
      const g = grp(parent);
      const {l, r0, r1} = S;
      const taper = (m) => {
        const p = m.geometry.attributes.position;
        for (let q = 0; q < p.count; q++) {
          const k = lerp(1, r1 / r0, clamp(-p.getX(q) / l, 0, 1));
          p.setY(q, p.getY(q) * k);
          p.setZ(q, p.getZ(q) * k);
        }
        m.geometry.computeVertexNormals();
        return m;
      };
      // the core: steel vertebra and a brass collar at the joint (shows on the inside of the curl)
      put(g, cylX(r1 * 0.6, r0 * 0.6, l, 14), M.steel, -l / 2);
      put(g, ring(-0.004 - l * 0.08, 0.004, r0 * 0.5, r0 * 0.74, 0.002, {segs: 20}), i % 2 ? M.brass : M.steel);
      // the armour: an outer plate over the back and two side plates, the inside of the curl left open
      const x0 = -l * 0.96;
      const x1 = -l * 0.04;
      taper(put(g, ring(x0, x1, r0 * 0.8, r0, Math.min(0.006, r0 * 0.08), {a0: deg(-50), a1: deg(50), segs: 14}), M.shell));
      taper(put(g, ring(x0, x1, r0 * 0.78, r0 * 0.97, Math.min(0.006, r0 * 0.08), {a0: deg(54), a1: deg(128), segs: 12}), M.shell));
      taper(put(g, ring(x0, x1, r0 * 0.78, r0 * 0.97, Math.min(0.006, r0 * 0.08), {a0: deg(-128), a1: deg(-54), segs: 12}), M.shell));
      // amber on the front rim of the back plate only
      if (r0 > 0.022) put(g, ring(x1 - 0.004, x1, r0 * 0.98, r0 * 1.02, 0.0015, {a0: deg(-48), a1: deg(48), segs: 14}), M.amber);
      if (r0 > 0.03) {
        for (const a of [-30, 30]) {
          const n = new V3(0, Math.cos(deg(a)), Math.sin(deg(a)));
          rivet(g, new V3(-l * 0.5, 0, 0).addScaledVector(n, lerp(r0, r1, 0.5) + 0.001), n);
        }
      }
      // the crest carries on over the first segments
      if (i < 6) {
        const h = 0.035 - i * 0.004;
        const f = put(g, finGeo(0.04, h, 0.01, 0.7), M.brass);
        f.position.set(-l * 0.5, r0 * 0.97, 0);
      }
      tailSegs.push({g, ...S});
      parent = g;
    });
  }
  anchor('tail', tailSegs[Math.floor(NSEG * 0.45)].g, 0, 0, 0.05);

  // ================================================================ the legs
  const bone = (parent, len, r0, r1) => {
    const g = grp(parent);
    put(g, cylX(r0 * 0.6, r1 * 0.6, len * 0.92, 16), M.steel, len / 2);
    const taper = (m) => {
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = lerp(1, r1 / r0, clamp(p.getX(i) / len, 0, 1));
        p.setY(i, p.getY(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      m.geometry.computeVertexNormals();
      return m;
    };
    for (const [a0, a1] of [
      [-70, 70],
      [110, 250],
    ])
      taper(put(g, ring(len * 0.1, len * 0.86, r0 * 0.78, r0, 0.006, {a0: deg(a0), a1: deg(a1), segs: 24}), M.shell));
    taper(put(g, ring(len * 0.14, len * 0.8, r0 * 0.98, r0 * 1.14, 0.006, {a0: deg(-30), a1: deg(120), segs: 24}), M.shell));
    for (const xx of [0.22, 0.72]) for (const aa of [0, 90]) {
      const n = new V3(0, Math.cos(deg(aa)), Math.sin(deg(aa)));
      rivet(g, new V3(len * xx, 0, 0).addScaledVector(n, r0 * 1.15 * lerp(1, r1 / r0, xx)), n);
    }
    put(g, ring(len * 0.86, len * 0.9, r1 * 0.7, r1 * 1.03, 0.002), M.amber);
    put(g, ring(len * 0.1, len * 0.15, r0 * 0.7, r0 * 1.05, 0.003), M.steel);
    put(g, ring(len * 0.46, len * 0.5, r0 * 0.7, r0 * 1.02, 0.003), M.brass);
    put(g, tube([[len * 0.1, -r0 * 0.95, 0], [len * 0.5, -r0 * 1.15, r0 * 0.3], [len * 0.9, -r1 * 0.95, 0]], 0.007, 20, 6), M.hose);
    for (const sg of [1, -1]) {
      put(g, cylX(0.008, 0.008, len * 0.7, 10), M.chrome, len * 0.5, 0, sg * r0 * 0.86);
      put(g, cylX(0.013, 0.013, len * 0.3, 12), M.steel, len * 0.3, 0, sg * r0 * 0.86);
    }
    return g;
  };
  const jointBall = (parent, r, ringR, gear = false) => {
    const g = grp(parent);
    put(g, new THREE.SphereGeometry(r, 24, 16), M.steel);
    if (gear) put(g, gearGeo(14, r * 1.35, r * 1.18, r * 0.5, r * 0.3, 5), M.brass);
    put(g, new THREE.TorusGeometry(ringR, r * 0.12, 8, 32), M.amber, 0, 0, r * 0.35);
    put(g, cylX(r * 0.45, r * 0.45, r * 0.5, 16).rotateY(Math.PI / 2), M.chrome, 0, 0, r * 0.75);
    return g;
  };
  const legs = [];
  LEG.forEach((Lg, l) => {
    const sg = Lg.side;
    const a = deg(118) * sg;
    const S = TS.P(Lg.x, a, 0.97);
    const nS = TS.N(Lg.x, a);
    const legG = grp(body);
    const sh = grp(legG);
    sh.position.copy(S);
    face(sh, nS);
    put(sh, gearGeo(18, 0.085, 0.074, 0.024, 0.024, 6), M.brass);
    put(sh, cylX(0.036, 0.036, 0.06, 20).rotateY(Math.PI / 2), M.steel, 0, 0, 0.025);
    put(sh, new THREE.TorusGeometry(0.06, 0.005, 8, 40), M.amber, 0, 0, 0.018);
    const capM = put(sh, new THREE.SphereGeometry(0.12, 32, 16, -Math.PI * 0.5, Math.PI, 0, Math.PI * 0.32), M.shell);
    capM.rotation.x = Math.PI / 2 - 0.2;
    capM.position.set(0, 0.045, -0.045);
    capM.scale.set(1.3, 1, 0.95);
    for (let i = 0; i < 8; i++) {
      const aa = (i / 8) * Math.PI * 2;
      put(sh, cylX(0.006, 0.006, 0.016, 8).rotateY(Math.PI / 2), M.chrome, Math.cos(aa) * 0.052, Math.sin(aa) * 0.052, 0.035);
    }
    const upper = bone(legG, L1, 0.088, 0.074);
    const knee = jointBall(legG, 0.072, 0.062, true);
    const lower = bone(legG, L2, 0.076, 0.06);
    const ankle = jointBall(legG, 0.058, 0.05);
    // the gripping foot (round 3): a wrist hub over the branch; the two opposed bundles split from it and wrap round
    // the branch from both sides, their glass tips curling in under it (08_gripping_foot)
    const foot = grp(legG);
    put(foot, new THREE.SphereGeometry(0.04, 18, 12), M.steel, 0, BR_R + 0.055, 0);
    put(foot, cylX(0.022, 0.022, 0.15, 14), M.brass, 0, BR_R + 0.045, 0);
    const lateral = Lg.front ? 2 : 3;
    for (const zs of [1, -1]) {
      const n = zs === sg ? lateral : 5 - lateral;
      // the bundle's shell cuff over the root bars, on its own side of the branch
      const cuff = put(foot, rbox(0.07 * n + 0.02, 0.03, 0.05, 0.01), M.shell, 0, Math.cos(deg(30)) * (BR_R + 0.045), zs * Math.sin(deg(30)) * (BR_R + 0.045));
      cuff.rotation.x = zs * deg(30);
      for (let k = 0; k < n; k++) {
        const dx = (k - (n - 1) / 2) * 0.068;
        const FR = 0.033;
        const RF = BR_R + FR * 0.82;
        const KN = [22, 56, 90, 122, 150].map((d) => deg(d));
        const P = (phi, i) => new V3(dx * (1 + 0.05 * i), Math.cos(phi) * RF, zs * Math.sin(phi) * RF);
        // the root bar from the wrist hub to the first knuckle
        const p0 = new V3(dx * 0.4, BR_R + 0.05, zs * 0.012);
        const pk = P(KN[0], 0);
        const bar = put(foot, cylX(0.019, 0.019, p0.distanceTo(pk), 10), M.steel);
        bar.position.copy(p0).lerp(pk, 0.5);
        aimX(bar, pk.clone().sub(p0));
        for (let i = 0; i < KN.length - 1; i++) {
          const a0 = P(KN[i], i);
          const a1 = P(KN[i + 1], i + 1);
          const r = FR - i * 0.0022;
          const seg = put(foot, cylX(r, r * 0.95, a0.distanceTo(a1) * 0.88, 16), M.toe);
          glassy(seg);
          seg.position.copy(a0).lerp(a1, 0.5);
          aimX(seg, a1.clone().sub(a0));
          // a shell armour strip along the outside of the first two segments
          if (i < 2) {
            const sp = put(foot, ring(-a0.distanceTo(a1) * 0.36, a0.distanceTo(a1) * 0.36, r * 1.02, r * 1.2, 0.003, {a0: deg(-60), a1: deg(60), segs: 12}), M.shell);
            sp.position.copy(a0).lerp(a1, 0.5);
            const ax = a1.clone().sub(a0).normalize();
            const out = sp.position.clone().setX(0).normalize();
            const yy = out.addScaledVector(ax, -out.dot(ax)).normalize();
            sp.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ax, yy, new V3().crossVectors(ax, yy)));
          }
          // the brass knuckle collar
          const kc = put(foot, ring(-0.006, 0.006, r * 0.9, r * 1.22, 0.002, {segs: 16}), M.brass);
          kc.position.copy(a0);
          aimX(kc, a1.clone().sub(a0));
        }
        const tip = glassy(put(foot, new THREE.SphereGeometry(0.026, 14, 10), M.toe));
        tip.position.copy(P(KN[KN.length - 1], KN.length - 1));
      }
    }
    legs.push({g: legG, S, nS, sh, upper, knee, lower, ankle, foot, ...Lg, l});
  });
  anchor('foot', legs[0].foot, 0, BR_R + 0.03, 0.06);
  anchor('leg', legs[0].knee, 0, 0, 0.05);
  K.rivetMeshes();

  // ROUND 4: the snout and the jaw ~20% shorter and blunter: everything on the skull and the jaw ahead of x = 0.7 is
  // drawn back toward it (x' = 0.7 + 0.67 (x - 0.7)); the eye turrets and the tongue launcher keep their shapes
  {
    const X0 = 0.7;
    const KX = 0.67;
    root.updateMatrixWorld(true);
    const skip = new Set([launcher, ...eyeParts.map((E) => E.e)]);
    const inSkip = (o) => {
      for (let q = o; q; q = q.parent) if (skip.has(q)) return true;
      return false;
    };
    const v = new V3();
    const n = new V3();
    const warpGroup = (G) => {
      const Ginv = G.matrixWorld.clone().invert();
      G.traverse((o) => {
        if (!o.isMesh || inSkip(o)) return;
        const Mrel = Ginv.clone().multiply(o.matrixWorld);
        const Minv = Mrel.clone().invert();
        if (o.isInstancedMesh) {
          const m = new THREE.Matrix4();
          for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, m);
            m.premultiply(Mrel);
            if (m.elements[12] > X0) m.elements[12] = X0 + (m.elements[12] - X0) * KX;
            m.premultiply(Minv);
            o.setMatrixAt(i, m);
          }
          o.instanceMatrix.needsUpdate = true;
          return;
        }
        o.geometry = o.geometry.clone();
        const P = o.geometry.attributes.position;
        const N = o.geometry.attributes.normal;
        const nm = new THREE.Matrix3().getNormalMatrix(Mrel);
        const nmi = new THREE.Matrix3().getNormalMatrix(Minv);
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(Mrel);
          if (v.x > X0) {
            v.x = X0 + (v.x - X0) * KX;
            if (N) {
              n.fromBufferAttribute(N, i).applyMatrix3(nm);
              n.x /= KX;
              n.normalize().applyMatrix3(nmi).normalize();
              N.setXYZ(i, n.x, n.y, n.z);
            }
          }
          v.applyMatrix4(Minv);
          P.setXYZ(i, v.x, v.y, v.z);
        }
        o.geometry.computeBoundingSphere();
        o.geometry.computeBoundingBox();
      });
    };
    warpGroup(skull);
    warpGroup(jawIn);
  }

  // ================================================================ pose
  const orient = (obj, from, to, up) => {
    const x = to.clone().sub(from).normalize();
    const z = new V3().crossVectors(x, up).normalize();
    const y = new V3().crossVectors(z, x);
    obj.position.copy(from);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const setLeg = (lg, fx) => {
    // the ankle above the branch top at the foot's x; the elbow points back and out, the knee forward and out
    const A = new V3(fx, BR_Y + BR_R + ANK, 0);
    // the body may be moved: work in body space
    const inv = body.matrix.clone().invert();
    const Ab = A.clone().applyMatrix4(inv);
    const S = lg.S;
    let d = Ab.distanceTo(S);
    const dir = Ab.clone().sub(S).normalize();
    d = Math.min(d, (L1 + L2) * 0.985);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    const pole = new V3(lg.front ? -0.55 : 0.55, 0.45, lg.side * 0.9);
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const Kn = S.clone().addScaledVector(dir, a).addScaledVector(pole, h);
    const A2 = S.clone().addScaledVector(dir, d);
    const up = new V3(0, 1, 0);
    orient(lg.upper, S, Kn, up);
    orient(lg.lower, Kn, A2, up);
    lg.knee.position.copy(Kn);
    lg.knee.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(0, 0, lg.side));
    lg.ankle.position.copy(A2);
    lg.ankle.quaternion.copy(lg.knee.quaternion);
    // the foot sits on the branch in root space: put it back into body space
    const F = new V3(fx, BR_Y, 0).applyMatrix4(inv);
    lg.foot.position.copy(F);
    lg.foot.quaternion.copy(body.quaternion).invert();
  };
  const qz = new THREE.Quaternion();
  const ZA = new V3(0, 0, 1);
  const pose = (st = {}) => {
    const {t = 0, gape = 20, headUp = 0, headYaw = 0, eyes = [[0, 0], [0, 0]], lensOut = [0, 0], tongue: tOut = 0.22, droop = 40, hang = 30, curl = 1} = st;
    const {casqueLift = 0, feet = FEET_HOME, explode = 0, spinT = t, bodyY = 0, bodyPitch = 0, tailYaw = 24, tail0 = 2} = st;
    const ex = explode;
    // the teardown in layers: crest first, then the back rows and the casque, the flank plates and windows, the head
    // parts and eyes, last the legs and the tail
    const L = (k) => clamp(ex * 1.7 - k * 0.175, 0, 1);
    const e0 = L(0);
    const e1 = L(1);
    const e2 = L(2);
    const e3 = L(3);
    const e4 = L(4);
    body.position.set(0, bodyY, 0);
    body.rotation.set(0, 0, bodyPitch * D2R);
    body.updateMatrix();
    head.position.set(NECK.x + 0.34 * e3, NECK.y + 0.1 * e3, NECK.z);
    head.rotation.set(0, headYaw * D2R, headUp * D2R);
    jaw.position.set(HINGE.x - NECK.x + 0.03 * e3, HINGE.y - NECK.y - 0.16 * e3, 0);
    jaw.rotation.set(0, 0, -gape * D2R);
    skullPl.position.set(0, 0.1 * e3, 0);
    jawPl.position.set(0, -0.08 * e3, 0);
    launcher.position.set(0.42 + 0.22 * e3, -0.175 - 0.02 * e3, 0);
    // the casque lifts straight up and tips back a little
    casque.position.set(-0.03 * casqueLift, 0.24 * casqueLift + 0.42 * e1, 0);
    casque.rotation.set(0, 0, 0.12 * casqueLift);
    // the eye turrets: each ball turns on its own (yaw about the socket's y, pitch about its z); the rings unscrew
    eyeParts.forEach((E, i) => {
      const [yw, pt] = eyes[i] ?? [0, 0];
      E.ball.rotation.set(0, yw * D2R, pt * D2R, 'YZX');
      E.e.position.copy(E.e.userData.home ?? (E.e.userData.home = E.e.position.clone()));
      E.e.position.addScaledVector(new V3(0, 0, E.sg), 0.16 * e3);
      const lo = Math.max(lensOut[i] ?? 0, ex * 0.6);
      E.rings.forEach((o, k) => {
        const kk = clamp(lo * 1.5 - k * 0.25, 0, 1);
        o.position.x = E.ring0[k] + [0.05, 0.1, 0.16][k] * kk;
        if (k < 2) o.rotation.x = kk * (1.4 + 0.6 * k) * Math.PI;
      });
    });
    // the tongue: the stem stretches out of the muzzle, the bulb rides on its end; the spring compresses as it fires
    const len = Math.max(0.001, tOut);
    const sl = len / TN;
    tSegs.forEach((T, i) => {
      T.m.scale.set(sl * 1.04, 1, 1);
      if (i > 0) T.g.position.set(sl, 0, 0);
      T.g.rotation.z = (-droop * D2R) / TN;
    });
    tTip.position.set(sl, 0, 0);
    tTip.rotation.z = -hang * D2R;
    tongue.visible = tOut > 0.005;
    spring.scale.set(1 - 0.45 * clamp(tOut / 1.2, 0, 1), 1, 1);
    // flank windows lift off, gears turn
    for (const W of winParts) {
      W.w.position.copy(W.n).multiplyScalar(0.34 * e2);
      W.mech.position.copy(W.n).multiplyScalar(0.12 * e2);
    }
    for (const S of spin) S.m.quaternion.copy(S.q0).multiply(qz.setFromAxisAngle(ZA, spinT * S.rate));
    rows.forEach((g, r) => g.position.set((r - (rows.length - 1) / 2) * 0.03 * e1, 0.3 * e1, 0));
    crest.position.set(0, 0.5 * e0, 0);
    FL[1].position.set(0, -0.02 * e2, 0.2 * e2);
    FL[-1].position.set(0, -0.02 * e2, -0.2 * e2);
    // the tail: curl 1 = the tight spiral, 0 = nearly straight; the whole plane yawed toward the near side
    tailRoot.position.set(TAIL_ROOT.x - 0.14 * e4, TAIL_ROOT.y, TAIL_ROOT.z);
    tailRoot.rotation.set(0, tailYaw * D2R, 0);
    tailSegs.forEach((S, i) => {
      const bend = i === 0 ? lerp(8, tail0, curl) : S.bend * curl + (1 - curl) * 1.2;
      S.g.rotation.set(0, 0, bend * D2R);
      if (i > 0) S.g.position.set(-TAIL.segs[i - 1].l - 0.022 * e4, 0, 0);
    });
    legs.forEach((lg, l) => {
      setLeg(lg, feet[l]);
      lg.g.position.set(0, -0.04 * e4, lg.side * 0.3 * e4);
    });
  };
  pose();
  anchor('launcher', launcher, 0.2, 0.03, 0.03);
  anchor('tongueTip', tTip, 0.06, 0, 0);
  anchor('lensF', eyeParts[1].rings[2], 0.03, 0, 0);
  anchor('eyeF', eyeParts[1].ball, 0.11, 0, 0);
  anchor('crest', crest, -0.4, 0.42, 0);
  anchor('window', winParts[0].w, -0.33, 0.12, 0.3);
  anchor('tailTip', tailSegs[NSEG - 6].g, 0, 0, 0.03);
  anchor('headPl', skullPl, 0.7, 0.12, 0.12);
  return {root, body, branch, M, clear, anchors, pose, head, jaw, skull, casque, eyeParts, tongue, launcher, tailSegs, legs, winParts};
}
