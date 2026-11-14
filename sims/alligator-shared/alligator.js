// FILM FIX: a lit mouth (seamed palate plates, a segmented tongue plate, the hinge gears and two telescoping pistons
// at the back), the explode in layers (scute rows up, flank bands out, head plates up, jaw plates down), the lens rings
// unscrewing one by one, winOpen (the flank dome lifting off its turning gears).
// FILM (round 5 kept as approved): pose() also takes the film's moves: eye (the hood lifts, the lens screws out),
// drop and teethOut (the jaw drops, the glass teeth fly out), explode (head, jaw, teeth, eyes, flank domes over their
// gears, legs joint by joint, tail segment by segment), spinT (the gears turn), bodyY/bodyPitch/bodyRoll.
// ROUND 5 (on round 3; round 4 is kept in alligator_r4.js): only the eyes changed: smaller lenses at 0.75 of the
// head length from the tip, in raised hooded sockets on the upper sides, looking sideways.
// ROUND 3: a broad U-shaped snout, shorter, with a deep lower jaw; the eye on a raised brow ridge; flat satin head
// panels with seams and rivets; a deeper trunk with the belly just above the floor; thick sprawled legs; a bulging
// glass dome over brass gears; an open mechanism strip along the flank under the back plates; keeled back scutes laid
// like roof tiles; one tall crest of glass fins down the tail; no bump texture.
// (round 2 is kept in alligator_r2.js, round 1 in alligator_r1.js)
// ROBOTIC ALLIGATOR, built from code after alligator.png (a reference sheet; the hero is its top-left panel).
// Body frame: +x toward the snout, y up, +z the near side; L = snout tip → tail tip = 4 (snout x = 2, tail tip x ≈ -2
// when straight). Measured off the sheet's side and top views (shares of L): head 0.24, jaw 0.18, eye 0.16 back,
// shoulder 0.33, hip 0.57, body height 0.12 (0.145 with scutes), width 0.16, leg shoulder → floor 0.09, tail 0.41.
// Base: the shark's jaws, glass teeth and segmented stalk (shark-shared/shark.js), the tarantula's gait (gait.js).
// pose({t, gape, headUp, headYaw, tailPitch, tailYaw, tailWave, feet, body}) sets one moment; every part that comes
// apart is its own group (head, jaw, eyes, window, legs[], tail segments) with a named anchor.
import * as THREE from 'three';
import {V3, D2R, gearGeo, rbox, cylX, tube, put, aimX, ring, solid, dome} from '../wasp-shared/parts.js';

export const L = 4;
export const FLOOR_Y = -0.33;
export const NECK = new V3(0.98, 0.0, 0);
export const HINGE = new V3(1.06, -0.075, 0);

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const ss = (x) => {
  const u = clamp(x, 0, 1);
  return u * u * (3 - 2 * u);
};

// a profile table [[x, {fields}], ...] (x ascending) read by Catmull-Rom per field
function table(rows) {
  const keys = Object.keys(rows[0][1]);
  return (x) => {
    const n = rows.length;
    let i = 0;
    while (i < n - 2 && x > rows[i + 1][0]) i++;
    const x0 = rows[i][0];
    const x1 = rows[i + 1][0];
    const u = clamp((x - x0) / (x1 - x0), 0, 1);
    const o = {};
    for (const k of keys) {
      const p0 = rows[Math.max(0, i - 1)][1][k];
      const p1 = rows[i][1][k];
      const p2 = rows[i + 1][1][k];
      const p3 = rows[Math.min(n - 1, i + 2)][1][k];
      o[k] = 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
    }
    return o;
  };
}
// a super-ellipse section: angle a from +y (0 = top, 90° = +z side, 180° = bottom)
const se = (a, ryT, ryB, rz, n) => {
  const c = Math.cos(a);
  const s = Math.sin(a);
  const p = 2 / n;
  return [(c >= 0 ? ryT : ryB) * Math.sign(c) * Math.pow(Math.abs(c), p), rz * Math.sign(s) * Math.pow(Math.abs(s), p)];
};
// a surface swept along x: prof(x) -> {cy, ryT, ryB, rz}; P(x, a, k) a point (k scales the section), N(x, a) outward
function makeSurf(prof, n) {
  const P = (x, a, k = 1) => {
    const q = prof(x);
    const [y, z] = se(a, q.ryT * k, q.ryB * k, q.rz * k, n);
    return new V3(x, q.cy + y, z);
  };
  const N = (x, a) => {
    const e = 1e-3;
    const dx = P(x + e, a).sub(P(x - e, a));
    const da = P(x, a + e).sub(P(x, a - e));
    const nn = new V3().crossVectors(da, dx).normalize();
    const out = P(x, a).sub(new V3(x, prof(x).cy, 0));
    if (nn.dot(out) < 0) nn.negate();
    return nn;
  };
  return {P, N, prof};
}

// a patch: fn(u, v) -> {p, n} the outer surface (n a hint for the outside); with t > 0 a slab with walls. Normals of
// the outer face come from the grid itself, so a bulge or a bevel shades.
function patchGeo(nu, nv, fn, t = 0, uvs = [1, 1]) {
  const P = [];
  const H = [];
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const r = fn(i / nu, j / nv);
      P.push(r.p);
      H.push(r.n);
    }
  const id = (i, j) => i * (nv + 1) + j;
  const NN = [];
  for (let i = 0; i <= nu; i++)
    for (let j = 0; j <= nv; j++) {
      const a = P[id(Math.min(i + 1, nu), j)].clone().sub(P[id(Math.max(i - 1, 0), j)]);
      const b = P[id(i, Math.min(j + 1, nv))].clone().sub(P[id(i, Math.max(j - 1, 0))]);
      const n = new V3().crossVectors(a, b);
      if (n.lengthSq() < 1e-14) n.copy(H[id(i, j)]);
      n.normalize();
      if (n.dot(H[id(i, j)]) < 0) n.negate();
      NN.push(n);
    }
  const pos = [];
  const nor = [];
  const uv = [];
  const UV = (q) => [Math.floor(q / (nv + 1)) / nu * uvs[0], (q % (nv + 1)) / nv * uvs[1]];
  const tri = (a, b, c, na, nb, nc, ua = [0, 0], ub = [0, 0], uc = [0, 0]) => {
    const f = new V3().crossVectors(b.clone().sub(a), c.clone().sub(a));
    const ref = na.clone().add(nb).add(nc);
    if (f.dot(ref) < 0) [b, c, nb, nc, ub, uc] = [c, b, nc, nb, uc, ub];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    nor.push(na.x, na.y, na.z, nb.x, nb.y, nb.z, nc.x, nc.y, nc.z);
    uv.push(...ua, ...ub, ...uc);
  };
  const quad = (Pa, Na, flip) => {
    for (let i = 0; i < nu; i++)
      for (let j = 0; j < nv; j++) {
        const k = [id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)];
        const n = k.map((q) => (flip ? Na[q].clone().negate() : Na[q]));
        const u = k.map(UV);
        tri(Pa[k[0]], Pa[k[1]], Pa[k[2]], n[0], n[1], n[2], u[0], u[1], u[2]);
        tri(Pa[k[0]], Pa[k[2]], Pa[k[3]], n[0], n[2], n[3], u[0], u[2], u[3]);
      }
  };
  quad(P, NN, false);
  if (t > 0) {
    const I = P.map((p, q) => p.clone().addScaledVector(H[q], -t));
    quad(I, NN, true);
    const wall = (list) => {
      for (let k = 0; k < list.length - 1; k++) {
        const a = list[k];
        const b = list[k + 1];
        const e = P[b].clone().sub(P[a]);
        const wn = new V3().crossVectors(e, H[a]).normalize();
        // the wall faces away from the patch's middle
        const mid = P[id(nu >> 1, nv >> 1)];
        if (wn.dot(P[a].clone().sub(mid)) < 0) wn.negate();
        tri(P[a], P[b], I[b], wn, wn, wn);
        tri(P[a], I[b], I[a], wn, wn, wn);
      }
    };
    const R = (n) => [...Array(n + 1).keys()];
    wall(R(nu).map((i) => id(i, 0)));
    wall(R(nu).map((i) => id(i, nv)));
    wall(R(nv).map((j) => id(0, j)));
    wall(R(nv).map((j) => id(nu, j)));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

export function makeMaterials() {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const M = {
    shell: phys({color: '#1A1C21', roughness: 0.4, metalness: 0.7, clearcoat: 0.06, clearcoatRoughness: 0.4}),
    mouthPlate: std({color: '#2b2f36', roughness: 0.45, metalness: 0.5, side: THREE.DoubleSide}),
    mouthDark: std({color: '#16181d', roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide}),
    rivet: std({color: '#6f767e', roughness: 0.32, metalness: 0.85}),
    core: std({color: '#111216', roughness: 0.62, metalness: 0.35, side: THREE.DoubleSide}),
    lining: std({color: '#0b0c0f', roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide}),
    steel: std({color: '#8c939b', roughness: 0.3, metalness: 0.8}),
    chrome: std({color: '#b9c0c8', roughness: 0.18, metalness: 0.95}),
    brass: std({color: '#B08A5A', roughness: 0.34, metalness: 0.8}),
    hose: std({color: '#4a5058', roughness: 0.55, metalness: 0.3}),
    amber: std({color: '#D78453', emissive: '#CC774B', emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.6}),
    lens: phys({color: '#020203', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4}),
    glass: phys({color: '#9CC9FF', emissive: '#4f86c9', emissiveIntensity: 0.25, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.24, depthWrite: false, side: THREE.DoubleSide, clearcoat: 0.5, clearcoatRoughness: 0.08, envMapIntensity: 0.5}),
    glassThick: phys({color: '#9CC9FF', emissive: '#5b93d6', emissiveIntensity: 0.4, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, clearcoat: 0.5, clearcoatRoughness: 0.08, envMapIntensity: 0.5}),
    dome: phys({color: '#9CC9FF', emissive: '#4f86c9', emissiveIntensity: 0.14, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.13, depthWrite: false, side: THREE.DoubleSide, clearcoat: 0.3, clearcoatRoughness: 0.05, envMapIntensity: 0.4}),
    tooth: phys({color: '#9CC9FF', emissive: '#5b93d6', emissiveIntensity: 0.75, roughness: 0.22, metalness: 0, transparent: true, opacity: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.1, envMapIntensity: 0.4}),
    rimHot: std({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 1.2, roughness: 0.2, metalness: 0}),
    vein: new THREE.LineBasicMaterial({color: new THREE.Color('#9CC9FF').multiplyScalar(1.35), transparent: true, opacity: 0.7, depthWrite: false}),
  };
  for (const k of ['steel', 'chrome', 'brass', 'hose', 'rivet']) M[k].userData.keep = true;
  return M;
}

// profiles (body coordinates, the head closed)
const TORSO = table([
  [-0.5, {cy: -0.01, ryT: 0.215, ryB: 0.2, rz: 0.26}],
  [-0.28, {cy: 0.0, ryT: 0.25, ryB: 0.225, rz: 0.31}],
  [-0.05, {cy: 0.01, ryT: 0.275, ryB: 0.245, rz: 0.345}],
  [0.3, {cy: 0.01, ryT: 0.28, ryB: 0.245, rz: 0.35}],
  [0.68, {cy: 0.0, ryT: 0.255, ryB: 0.225, rz: 0.315}],
  [0.95, {cy: -0.01, ryT: 0.2, ryB: 0.175, rz: 0.255}],
  [1.12, {cy: -0.01, ryT: 0.175, ryB: 0.145, rz: 0.225}],
]);
const SKULL0 = table([
  [0.96, {cy: 0.03, ryT: 0.17, ryB: 0.12, rz: 0.225}],
  [1.1, {cy: 0.035, ryT: 0.165, ryB: 0.1, rz: 0.25}],
  [1.25, {cy: 0.03, ryT: 0.145, ryB: 0.075, rz: 0.245}],
  [1.4, {cy: 0.018, ryT: 0.112, ryB: 0.062, rz: 0.21}],
  [1.55, {cy: 0.008, ryT: 0.092, ryB: 0.056, rz: 0.185}],
  [1.7, {cy: 0.004, ryT: 0.084, ryB: 0.055, rz: 0.172}],
  [1.8, {cy: 0.004, ryT: 0.088, ryB: 0.055, rz: 0.168}],
]);
// the snout ends in a broad U: a near half-circle in plan, a blunt rounded nose in profile
const XS1 = 1.9;
const cap = (x, x0, x1) => (x <= x0 ? 1 : Math.sqrt(Math.max(0.0004, 1 - ((x - x0) / (x1 - x0)) ** 2)));
const SKULL = (x) => {
  const q = SKULL0(Math.min(x, 1.8));
  const k = cap(x, 1.755, XS1);
  const ky = Math.pow(k, 0.55);
  return {cy: q.cy, ryT: q.ryT * ky, ryB: q.ryB * ky, rz: q.rz * k};
};
const JAW0 = table([
  [0.98, {cy: -0.075, ryT: 0.0, ryB: 0.2, rz: 0.215}],
  [1.15, {cy: -0.07, ryT: 0.0, ryB: 0.168, rz: 0.238}],
  [1.35, {cy: -0.06, ryT: 0.0, ryB: 0.128, rz: 0.215}],
  [1.55, {cy: -0.058, ryT: 0.0, ryB: 0.102, rz: 0.182}],
  [1.72, {cy: -0.058, ryT: 0.0, ryB: 0.09, rz: 0.166}],
  [1.8, {cy: -0.058, ryT: 0.0, ryB: 0.087, rz: 0.162}],
]);
const XJ1 = 1.885;
const JAW = (x) => {
  const q = JAW0(Math.min(x, 1.8));
  const k = cap(x, 1.745, XJ1);
  return {cy: q.cy, ryT: 0, ryB: q.ryB * Math.pow(k, 0.55), rz: q.rz * k};
};
// tail: 20 segments from x = -0.48, total 1.52, each a little shorter than the one before
const TAIL_X0 = -0.48;
const TAIL_LEN = 1.52;
export const NSEG = 20;
const SEG_L = (() => {
  const r = 0.962;
  const raw = [...Array(NSEG).keys()].map((i) => Math.pow(r, i));
  const s = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => (v * TAIL_LEN) / s);
})();
const tailR = (s) => {
  const ry = 0.21 * Math.pow(Math.max(0, 1 - s), 0.95) + 0.012;
  return {ry, rz: ry * (1.22 - 0.42 * s)};
};
export const GLASS_FROM = 13; // the last third of the tail scutes are glass

// legs: 0 near front, 1 far front, 2 near hind, 3 far hind
export const LEG = [
  {x: 0.7, side: 1, front: true},
  {x: 0.7, side: -1, front: true},
  {x: -0.28, side: 1, front: false},
  {x: -0.28, side: -1, front: false},
];
export const FOOT_HOME = (l) => {
  const g = LEG[l];
  return [g.x + (g.front ? 0.1 : -0.06), FLOOR_Y, g.side * (g.front ? 0.6 : 0.62)];
};

export function buildAlligator({seed = 11} = {}) {
  const M = makeMaterials();
  const R = rng(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const clear = [];
  const anchors = {};
  const anchor = (key, obj, x, y, z) => (anchors[key] = {obj, at: new V3(x, y, z)});
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const glassy = (m) => {
    m.castShadow = false;
    m.renderOrder = 2;
    clear.push(m);
    return m;
  };
  const lines = (parent, segs, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs.flat(), 3));
    const l = new THREE.LineSegments(g, mat);
    parent.add(l);
    clear.push(l);
    return l;
  };
  const edge = (parent, pts, r = 0.0055, mat = M.amber) => put(parent, tube(pts, r, Math.max(8, pts.length * 3), 6), mat);
  const cosU = (u) => 0.5 - 0.5 * Math.cos(Math.PI * u);
  // rivets: collected per parent, drawn as one instanced mesh each at the end
  const RIV = new Map();
  const rivet = (parent, p, n) => {
    if (!RIV.has(parent)) RIV.set(parent, []);
    RIV.get(parent).push(new THREE.Matrix4().compose(p, new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), n), new V3(1, 1, 1)));
  };
  // a plate cut from a surface between x0..x1 and a0..a1 (radians): lifted, bulged both ways, bevelled at its rim
  const plate = (S, x0, x1, a0, a1, o = {}) => {
    const {lift = 0.012, t = 0.024, bulge = 0, mat = M.shell, parent = body, k = 1, bev = 0.004, edges = [], edgeMat = M.amber, extra = null, res = 0.018, rivets = mat === M.shell} = o;
    const lenX = Math.abs(x1 - x0);
    const xm = (x0 + x1) / 2;
    const arc = S.P(xm, a0, k).distanceTo(S.P(xm, a1, k)) + 1e-4;
    const nu = Math.max(5, Math.ceil(lenX / res));
    const nv = Math.max(5, Math.ceil(arc / res));
    const eu = Math.min(0.45, bev / lenX);
    const ev = Math.min(0.45, bev / arc);
    const d = (u, v) => {
      const e = Math.min(u / eu, (1 - u) / eu, v / ev, (1 - v) / ev, 1);
      return lift + bulge * Math.sin(Math.PI * u) * Math.sin(Math.PI * v) + (extra ? extra(u, v) : 0) - t * 0.4 * (1 - Math.sqrt(Math.max(0, 1 - (1 - e) ** 2)));
    };
    const fn = (u0, v0) => {
      const u = cosU(u0);
      const v = cosU(v0);
      const x = lerp(x0, x1, u);
      const a = lerp(a0, a1, v);
      const n = S.N(x, a);
      return {p: S.P(x, a, k).addScaledVector(n, d(u, v)), n};
    };
    const m = put(parent, patchGeo(nu, nv, fn, t, [lenX / 0.22, arc / 0.22]), mat);
    if (mat === M.glass || mat === M.glassThick) glassy(m);
    // small rivets near the corners (two on a narrow plate)
    if (rivets && lenX > 0.035 && arc > 0.035) {
      const iu = Math.min(0.3, 0.016 / lenX);
      const iv = Math.min(0.3, 0.016 / arc);
      const spots = arc > 0.09 ? [[iu, iv], [iu, 1 - iv], [1 - iu, iv], [1 - iu, 1 - iv]] : [[iu, 0.5], [1 - iu, 0.5]];
      for (const [u, v] of spots) {
        const x = lerp(x0, x1, u);
        const a = lerp(a0, a1, v);
        const n = S.N(x, a);
        rivet(parent, S.P(x, a, k).addScaledVector(n, d(u, v) + 0.001), n);
      }
    }
    // trim lines along chosen edges, a hair inside the rim
    for (const e of edges) {
      const pts = [];
      for (let i = 0; i <= 16; i++) {
        const w = 0.04 + (0.92 * i) / 16;
        const [u, v] = {x0: [0.05, w], x1: [0.95, w], a0: [w, 0.05], a1: [w, 0.95]}[e];
        const x = lerp(x0, x1, u);
        const a = lerp(a0, a1, v);
        const n = S.N(x, a);
        pts.push(S.P(x, a, k).addScaledVector(n, d(u, v) + 0.004));
      }
      edge(parent, pts, 0.0045, edgeMat);
    }
    return m;
  };
  const deg = (a) => a * D2R;
  const face = (obj, n) => obj.quaternion.setFromUnitVectors(new V3(0, 0, 1), n.clone().normalize());
  // a fin (a scute keel) standing on a point: base length b along -x, height h, apex leaning back, thickness w
  const finGeo = (b, h, w, lean = 0.55) => {
    const s = new THREE.Shape();
    s.moveTo(b * 0.5, 0);
    s.quadraticCurveTo(b * 0.32, h * 0.55, -b * lean + b * 0.1, h);
    s.lineTo(-b * lean, h * 0.97);
    s.quadraticCurveTo(-b * 0.42, h * 0.4, -b * 0.5, 0);
    s.lineTo(b * 0.5, 0);
    const bv = Math.min(w * 0.35, 0.006);
    const g = new THREE.ExtrudeGeometry(s, {depth: w - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 2, curveSegments: 8});
    g.translate(0, -0.01, -(w - 2 * bv) / 2);
    return g;
  };
  const placeOn = (obj, p, n, fwd = new V3(1, 0, 0)) => {
    const y = n.clone().normalize();
    const x = fwd.clone().addScaledVector(y, -fwd.dot(y)).normalize();
    const z = new V3().crossVectors(x, y);
    obj.position.copy(p);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    return obj;
  };
  // ---------------------------------------------------------------- the kitbash under the plates
  const kitPart = (parent, p, n, tx, scale = 1) => {
    const g = new THREE.Group();
    placeOn(g, p, n, tx);
    parent.add(g);
    const r = R();
    const s = scale * (0.75 + 0.5 * R());
    if (r < 0.22) {
      put(g, cylX(0.008 * s, 0.008 * s, 0.022 * s, 8).rotateZ(Math.PI / 2), M.steel);
    } else if (r < 0.45) {
      put(g, cylX(0.011 * s, 0.011 * s, 0.075 * s, 12), M.steel);
      put(g, cylX(0.016 * s, 0.016 * s, 0.018 * s, 12), M.brass, -0.03 * s);
      put(g, cylX(0.006 * s, 0.006 * s, 0.05 * s, 8), M.chrome, 0.05 * s);
    } else if (r < 0.62) {
      const gg = put(g, gearGeo(10, 0.026 * s, 0.021 * s, 0.008 * s, 0.006 * s, 0), R() < 0.6 ? M.brass : M.steel);
      gg.rotation.x = -Math.PI / 2;
    } else if (r < 0.8) {
      const L0 = 0.08 * s;
      put(g, tube([[-L0 / 2, 0, 0], [0, 0.01 * s, (R() - 0.5) * 0.03], [L0 / 2, 0, 0]], 0.0075 * s, 12, 6), M.hose);
    } else {
      put(g, rbox(0.034 * s, 0.018 * s, 0.024 * s, 0.004), R() < 0.5 ? M.steel : M.brass);
    }
    return g;
  };
  const kitOn = (S, parent, count, xr, ar, k = [0.9, 0.97], scale = 1) => {
    for (let i = 0; i < count; i++) {
      const x = lerp(xr[0], xr[1], R());
      const sgn = R() < 0.5 ? 1 : -1;
      const a = sgn * lerp(ar[0], ar[1], R());
      const kk = lerp(k[0], k[1], R());
      kitPart(parent, S.P(x, a, kk), S.N(x, a), new V3(1, 0, 0), scale);
    }
  };
  // a hoop round the body under a plate gap, from a0 to a1 on both sides
  const hoop = (S, parent, x, a0, a1, k, r, mat) => {
    for (const sg of [1, -1]) {
      const pts = [];
      for (let i = 0; i <= 14; i++) pts.push(S.P(x, sg * lerp(a0, a1, i / 14), k));
      put(parent, tube(pts, r, 28, 8), mat);
    }
  };

  // ================================================================ the torso
  const TS = makeSurf(TORSO, 2.5);
  const torso = grp(body);
  {
    const core = patchGeo(140, 64, (u, v) => {
      const x = lerp(-0.52, 1.12, u);
      const a = -Math.PI + 2 * Math.PI * v;
      return {p: TS.P(x, a, 0.86), n: TS.N(x, a)};
    });
    put(torso, core, M.core);
  }
  // rows of plates, back to front (round 3: 11 rows of big keeled scutes laid like roof tiles, an open mechanism strip
  // along the flank under their edge, two flank bands below it, a domed window mid-flank)
  const XB = [];
  const NROW = 11;
  for (let i = 0; i <= NROW; i++) XB.push(lerp(-0.48, 0.84, i / NROW));
  const GAP = 0.012;
  const WIN = {xc: 0.16, rx: 0.29, ac: deg(96), ra: deg(26)};
  const inWin = (x0, x1) => x1 > WIN.xc - WIN.rx * 0.8 && x0 < WIN.xc + WIN.rx * 0.8;
  const atLeg = (x0, x1) => LEG.some((g) => x1 > g.x - 0.12 && x0 < g.x + 0.12);
  const STRIP = {x0: -0.2, x1: 0.6, a0: 47, a1: 71};
  const inStrip = (x0, x1) => x0 > STRIP.x0 - 0.05 && x1 < STRIP.x1 + 0.05;
  const scutes = [];
  const spin = [];
  const scRows = [];
  const FL = {1: grp(torso), [-1]: grp(torso)};
  for (let r = 0; r < NROW; r++) {
    const scG = grp(torso);
    scRows.push(scG);
    const x0 = XB[r] + GAP;
    const x1 = XB[r + 1] - GAP;
    // dorsal scutes, four across: the rear edge raised over the plate behind, a ridged keel down the middle rising
    // toward the rear; the middle pair tallest
    const grow = 0.75 + 0.35 * Math.sin(Math.PI * clamp((x0 + 0.5) / 1.4, 0, 1));
    for (const [a0, a1, h] of [
      [-47, -25, 0.024],
      [-23, -2, 0.046],
      [2, 23, 0.046],
      [25, 47, 0.024],
    ]) {
      const kh = h * grow;
      const extra = (u, v) => 0.028 * (1 - u) + kh * Math.pow(Math.max(0, 1 - Math.abs(v - 0.5) / 0.2), 1.6) * (0.3 + 0.7 * (1 - u));
      const outer = Math.abs(a0) > 24;
      const pm = plate(TS, x0 - 0.035, x1, deg(a0), deg(a1), {lift: 0.02, t: 0.03, parent: scG, extra, res: 0.008, bev: 0.006, edges: ['x0']});
      scutes.push(pm);
      void outer;
    }
    for (const sg of [1, -1]) {
      const A = (d) => deg(d) * sg;
      // the open strip under the scutes' edge between hip and shoulder; a plate there only outside it
      if (!inStrip(x0, x1)) plate(TS, x0, x1, A(49), A(71), {parent: FL[sg], t: 0.026, edges: ['a1']});
      if (inWin(x0, x1)) {
        plate(TS, x0, x1, A(124), A(131), {parent: FL[sg], t: 0.024});
      } else if (!atLeg(x0, x1)) {
        plate(TS, x0, x1, A(73), A(99), {parent: FL[sg], t: 0.026, edges: inStrip(x0, x1) ? ['a0'] : []});
        plate(TS, x0, x1, A(102), A(131), {parent: FL[sg], t: 0.026});
      } else plate(TS, x0, x1, A(73), A(86), {parent: FL[sg], t: 0.026});
      plate(TS, x0, x1, A(134), A(155), {parent: FL[sg], t: 0.022});
      plate(TS, x0, x1, A(158), A(178), {parent: FL[sg], t: 0.022});
    }
    // rings under every gap: the vertebra over the back, the ribs down the flank
    hoop(TS, torso, XB[r], deg(2), deg(48), 0.965, 0.014, r % 2 ? M.brass : M.steel);
    hoop(TS, torso, XB[r], deg(72), deg(132), 0.96, 0.013, r % 2 ? M.steel : M.brass);
  }
  hoop(TS, torso, XB[NROW], deg(2), deg(48), 0.965, 0.014, M.steel);
  // rods along the body in the long gaps
  for (const sg of [1, -1]) {
    for (const [a, k, r, mat] of [
      [24, 0.975, 0.012, M.steel],
      [100.5, 0.965, 0.012, M.hose],
      [132.5, 0.96, 0.012, M.steel],
    ]) {
      const pts = [];
      for (let i = 0; i <= 30; i++) pts.push(TS.P(lerp(-0.47, 0.98, i / 30), deg(a) * sg, k));
      put(torso, tube(pts, r, 90, 8), mat);
    }
  }
  // the mechanism strip: a train of brass and steel gears meshing along the flank, a long piston with brass collars,
  // hoses above and below, small parts packed between
  for (const sg of [1, -1]) {
    const am = deg(59) * sg;
    let x = STRIP.x0 + 0.04;
    let big = true;
    while (x < STRIP.x1 - 0.03) {
      const r = big ? 0.062 : 0.04;
      const n = TS.N(x, am);
      const gm = put(torso, gearGeo(big ? 18 : 12, r, r * 0.86, 0.022, r * 0.28, big ? 5 : 0), big ? M.brass : M.steel);
      gm.position.copy(TS.P(x, am, 0.985));
      face(gm, n);
      gm.rotateZ(x * 7);
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: (big ? 1 : -1.55) * 1.1});
      const hub = put(torso, cylX(r * 0.3, r * 0.3, 0.05, 16), big ? M.steel : M.brass);
      hub.position.copy(gm.position);
      aimX(hub, n);
      x += (big ? 0.062 : 0.04) * 1.75 + 0.012;
      big = !big;
    }
    for (const [a, k, r, mat] of [
      [50, 1.0, 0.016, M.chrome],
      [68.5, 0.995, 0.011, M.hose],
      [53, 0.985, 0.009, M.brass],
    ]) {
      const pts = [];
      for (let i = 0; i <= 20; i++) pts.push(TS.P(lerp(STRIP.x0 - 0.04, STRIP.x1 + 0.04, i / 20), deg(a) * sg, k));
      put(torso, tube(pts, r, 60, 8), mat);
    }
    for (let i = 0; i < 9; i++) {
      const x = lerp(STRIP.x0, STRIP.x1, i / 8);
      const c = put(torso, cylX(0.024, 0.024, 0.016, 16), M.brass);
      c.position.copy(TS.P(x, deg(50) * sg, 1.0));
      aimX(c, new V3(1, 0, 0));
    }
    for (let i = 0; i < 90; i++) {
      const x = lerp(STRIP.x0, STRIP.x1, R());
      const a = sg * deg(lerp(STRIP.a0 + 2, STRIP.a1 - 2, R()));
      kitPart(torso, TS.P(x, a, lerp(0.93, 0.975, R())), TS.N(x, a), new V3(1, 0, 0), 1.2);
    }
  }
  kitOn(TS, torso, 360, [-0.46, 0.84], [deg(4), deg(176)], [0.92, 0.99], 1.25);
  // the neck: a gap between torso and skull packed with gears, pistons and hoses, ribbed rings under them
  for (let i = 0; i < 4; i++) {
    const x = 0.86 + i * 0.035;
    const q = TORSO(x);
    const m = put(torso, new THREE.TorusGeometry(1, 0.06, 8, 40), i % 2 ? M.steel : M.brass);
    m.position.set(x, q.cy, 0);
    m.rotation.y = Math.PI / 2;
    m.scale.set(q.rz * 0.95, q.ryT * 0.95, q.rz * 0.18);
  }
  for (const sg of [1, -1]) {
    for (const [x, a, r] of [
      [0.9, 70, 0.07],
      [0.93, 112, 0.055],
      [0.88, 30, 0.045],
    ]) {
      const n = TS.N(x, deg(a) * sg);
      const gm = put(torso, gearGeo(16, r, r * 0.86, 0.02, r * 0.3, 5), M.brass);
      gm.position.copy(TS.P(x, deg(a) * sg, 0.98));
      face(gm, n);
      const hub = put(torso, cylX(r * 0.35, r * 0.35, 0.045, 16), M.steel);
      hub.position.copy(gm.position);
      aimX(hub, n);
    }
    for (const a of [52, 88, 128]) {
      const pts = [];
      for (let i = 0; i <= 8; i++) pts.push(TS.P(lerp(0.74, 1.02, i / 8), deg(a + 8 * Math.sin(i)) * sg, 0.99 + 0.02 * Math.sin((i / 8) * Math.PI)));
      put(torso, tube(pts, 0.012, 30, 8), M.hose);
    }
  }
  kitOn(TS, torso, 70, [0.85, 1.0], [deg(4), deg(170)], [0.95, 1.01], 1.3);

  // ---------------------------------------------------------------- the glass flank dome (both sides)
  // an egg-shaped pane bulging out of the flank over a train of brass gears and a steel cylinder, lit warm from inside
  const windows = [];
  const winParts = [];
  for (const sg of [1, -1]) {
    const w = grp(torso);
    // the outline: an egg in (x, a), fuller toward the head; r = 0 the middle, r = 1 the rim
    const at = (r, th) => {
      const c = Math.cos(th);
      const sx = c > 0 ? 1.08 : 0.92;
      const x = WIN.xc + WIN.rx * sx * r * c;
      const a = sg * (WIN.ac + WIN.ra * (c > 0 ? 1.06 : 0.9) * r * Math.sin(th));
      return [x, a];
    };
    const lift = (r) => 0.018 + 0.085 * Math.pow(Math.max(0, 1 - r * r), 0.6);
    const g = patchGeo(24, 64, (u, v) => {
      const r = Math.max(0.002, u);
      const [x, a] = at(r, v * Math.PI * 2);
      const n = TS.N(x, a);
      return {p: TS.P(x, a).addScaledVector(n, lift(r)), n};
    });
    glassy(put(w, g, M.dome));
    // its frame: a shell band with rivets and a lit glass rim
    const ring0 = [];
    const ring1 = [];
    for (let i = 0; i <= 96; i++) {
      const [x, a] = at(1, (i / 96) * Math.PI * 2);
      const n = TS.N(x, a);
      ring0.push(TS.P(x, a).addScaledVector(n, 0.02));
      ring1.push(TS.P(x, a).addScaledVector(n, 0.034));
      if (i % 8 === 0 && i < 96) rivet(w, TS.P(x, a).addScaledVector(n, 0.036), n);
    }
    put(w, tube(ring0, 0.02, 240, 8, true), M.shell);
    put(w, tube(ring1, 0.0045, 240, 6, true), M.rimHot);
    // behind it: brass gears standing on the flank, a steel cylinder with brass collars, small parts
    const mech = grp(torso);
    for (const [x, a, r, tth] of [
      [0.33, 92, 0.085, 20],
      [0.19, 106, 0.068, 16],
      [0.05, 90, 0.078, 18],
      [-0.06, 104, 0.05, 12],
      [0.2, 80, 0.045, 12],
      [0.39, 108, 0.04, 10],
    ]) {
      const n = TS.N(x, deg(a) * sg);
      const gm = put(mech, gearGeo(tth, r, r * 0.86, 0.02, r * 0.25, 5), M.brass);
      gm.position.copy(TS.P(x, deg(a) * sg, 1.0));
      face(gm, n);
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: (tth % 4 ? -1 : 1) * (0.07 / r)});
      const hub = put(mech, cylX(r * 0.3, r * 0.3, 0.05, 16), M.steel);
      hub.position.copy(gm.position);
      aimX(hub, n);
    }
    {
      const p0 = TS.P(-0.1, deg(80) * sg, 1.0);
      const p1 = TS.P(0.42, deg(80) * sg, 1.0);
      const c = put(mech, cylX(0.028, 0.028, p0.distanceTo(p1), 24), M.steel);
      c.position.copy(p0).lerp(p1, 0.5);
      aimX(c, p1.clone().sub(p0));
      for (let i = 0; i < 6; i++) {
        const rr = put(mech, cylX(0.038, 0.038, 0.012, 20), M.brass);
        rr.position.copy(p0).lerp(p1, 0.1 + i * 0.15);
        aimX(rr, p1.clone().sub(p0));
      }
    }
    for (let i = 0; i < 40; i++) {
      const [x, a] = at(Math.sqrt(R()) * 0.9, R() * Math.PI * 2);
      kitPart(mech, TS.P(x, a, 0.95), TS.N(x, a), new V3(1, 0, 0), 1.1);
    }
    const lamp = new THREE.PointLight('#ffb27a', 0.08, 0.55, 2);
    lamp.position.copy(TS.P(WIN.xc, WIN.ac * sg)).addScaledVector(TS.N(WIN.xc, WIN.ac * sg), 0.07);
    w.add(lamp);
    windows.push(w);
    winParts.push({w, mech, n: TS.N(WIN.xc, WIN.ac * sg)});
  }
  anchor('window', torso, 0.16, -0.03, 0.42);

  // ================================================================ the head (pivots at the neck) and the skull
  const head = grp(body, NECK.x, NECK.y, NECK.z);
  const skull = grp(head, -NECK.x, -NECK.y, -NECK.z);
  const SS = makeSurf(SKULL, 2.6);
  put(skull, patchGeo(110, 56, (u, v) => {
    const x = lerp(0.95, XS1 - 0.0005, u);
    const a = -Math.PI + 2 * Math.PI * v;
    return {p: SS.P(x, a, 0.9), n: SS.N(x, a)};
  }), M.core);
  // the palate: a dark backing under seamed, riveted satin plates
  put(skull, patchGeo(80, 12, (u, v) => {
    const x = lerp(1.0, XS1 - 0.03, u);
    const a = deg(lerp(124, 236, v));
    return {p: SS.P(x, a, 0.96), n: SS.N(x, a)};
  }), M.mouthDark);
  const PX = [1.0, 1.13, 1.26, 1.39, 1.52, 1.65, 1.77, XS1 - 0.04];
  const PA = [129, 157, 180, 203, 231];
  const palate = grp(skull);
  for (let r = 0; r < PX.length - 1; r++)
    for (let c = 0; c < PA.length - 1; c++)
      plate(SS, PX[r] + 0.005, PX[r + 1] - 0.005, deg(PA[c] + 1), deg(PA[c + 1] - 1), {parent: palate, mat: M.mouthPlate, k: 0.975, lift: 0.004, t: 0.012, res: 0.014, rivets: true, edges: c === 1 && r % 2 === 0 ? ['x0'] : []});
  // the back of the mouth: a plate across the throat with the hinge gears turning on it
  {
    const wall = put(skull, new THREE.CircleGeometry(1, 40).rotateY(Math.PI / 2), M.mouthPlate, 1.075, -0.13, 0);
    wall.scale.set(1, 0.1, 0.19);
    for (const sg of [1, -1]) {
      const gm = put(skull, gearGeo(14, 0.045, 0.038, 0.016, 0.014, 5), M.brass);
      gm.position.set(1.085, -0.13, sg * 0.085);
      face(gm, new V3(1, 0, 0));
      spin.push({m: gm, q0: gm.quaternion.clone(), rate: sg * 1.6});
      put(skull, cylX(0.016, 0.016, 0.03, 16), M.steel, 1.09, -0.13, sg * 0.085);
    }
    const g2 = put(skull, gearGeo(10, 0.03, 0.025, 0.014, 0.01, 0), M.steel);
    g2.position.set(1.085, -0.175, 0);
    face(g2, new V3(1, 0, 0));
    spin.push({m: g2, q0: g2.quaternion.clone(), rate: -2.4});
    const lamp = new THREE.PointLight('#ffb27a', 0.05, 1.0, 2);
    lamp.position.set(1.4, -0.11, 0);
    skull.add(lamp);
  }
  // flat satin panels: few, large, with fine seams and corner rivets; amber only on the lip lines and one seam behind
  // the eyes
  const skullPl = grp(skull);
  const SX = [0.96, 1.08, 1.2, 1.33, 1.46, 1.58, 1.7, 1.8, 1.9];
  const SA = [-124, -98, -70, -40, -14, 14, 40, 70, 98, 124];
  const EYE_X = 1.9 - 0.75 * (1.9 - 0.96);
  const EYE_A = 54;
  for (let r = 0; r < SX.length - 1; r++) {
    for (let c = 0; c < SA.length - 1; c++) {
      const x0 = SX[r] + 0.006;
      const x1 = SX[r + 1] - 0.006;
      const a0 = deg(SA[c] + 1.2);
      const a1 = deg(SA[c + 1] - 1.2);
      // the eye sits on its own orbit: no plate under it
      const am = Math.abs((SA[c] + SA[c + 1]) / 2);
      const lip = c === 0 || c === SA.length - 2;
      plate(SS, x0, x1, a0, a1, {parent: skullPl, lift: 0.01, t: 0.016, res: 0.012, edges: lip ? [c === 0 ? 'a0' : 'a1'] : r === 3 && am < 60 ? ['x0'] : []});
    }
  }
  kitOn(SS, skull, 50, [1.0, 1.8], [deg(4), deg(118)], [0.93, 0.995], 0.8);
  // the lip line: amber along the upper jaw's edge, above the teeth
  for (const sg of [1, -1]) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const x = lerp(1.08, XS1 - 0.02, i / 40);
      pts.push(SS.P(x, deg(124) * sg, 1.0).add(new V3(0, 0, 0.004 * sg)));
    }
    edge(skull, pts, 0.0065);
  }
  // the nostrils: one raised mound on the snout's tip, two dark holes in amber rings
  {
    const xn = 1.8;
    const p = SS.P(xn, 0);
    const mound = put(skull, new THREE.SphereGeometry(0.06, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), M.shell);
    mound.position.copy(p).add(new V3(0, -0.004, 0));
    mound.scale.set(1.25, 0.62, 1.5);
    for (const sg of [1, -1]) {
      const q = new V3(xn + 0.012, p.y + 0.034, sg * 0.032);
      const n = new V3(0.35, 1, sg * 0.35).normalize();
      const hole = put(skull, new THREE.CylinderGeometry(0.015, 0.012, 0.02, 16), M.lining);
      hole.position.copy(q);
      hole.quaternion.setFromUnitVectors(new V3(0, 1, 0), n);
      const rg = put(skull, new THREE.TorusGeometry(0.017, 0.0035, 8, 24), M.amber);
      rg.position.copy(q).addScaledVector(n, 0.008);
      face(rg, n);
    }
  }
  const eyeParts = [];
  // the eyes (round 5): one each side at the back of the snout, 0.75 of the head length from the tip, on the upper
  // side; a raised socket sitting on the plates, the lens (diameter 0.10 of the head) looking sideways, a little
  // forward and up, a thin amber ring and a small steel bezel round it, a brow plate arching over it like a hood
  const eyes = [];
  for (const sg of [1, -1]) {
    const p = SS.P(EYE_X, deg(EYE_A) * sg);
    // the socket's frame: x the lens axis, y up across it, z completing it
    const X = new V3(0.32, 0.42, sg).normalize();
    const Y = new V3(0, 1, 0).addScaledVector(X, -X.y).normalize();
    const Z = new V3().crossVectors(X, Y);
    const e = grp(skull);
    e.position.copy(p).addScaledVector(SS.N(EYE_X, deg(EYE_A) * sg), 0.034);
    e.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
    // the raised socket: a shell boss reaching back into the skull, a steel bezel on its rim
    put(e, cylX(0.062, 0.068, 0.07, 32), M.shell, -0.03);
    const lensG = grp(e);
    const hoodG = grp(e);
    put(lensG, ring(-0.002, 0.01, 0.05, 0.063, 0.003, {segs: 48}), M.steel);
    // the thin amber ring and the glossy black lens
    put(lensG, ring(0.006, 0.013, 0.046, 0.052, 0.002, {segs: 48}), M.amber);
    put(lensG, new THREE.SphereGeometry(0.047, 32, 20), M.lens, 0.004).scale.set(0.7, 1, 1);
    // the hood: a curved shell plate over the top of the socket, overhanging the lens, with three rivets
    put(hoodG, dome(0.084, 0.013, deg(38), deg(112), {a0: deg(-78), a1: deg(78), segs: 36}), M.shell);
    for (const a of [-45, 0, 45]) {
      const q = deg(92);
      const n = new V3(Math.cos(q), Math.sin(q) * Math.cos(deg(a)), Math.sin(q) * Math.sin(deg(a)));
      rivet(hoodG, n.clone().multiplyScalar(0.085), n);
    }
    eyes.push(e);
    eyeParts.push({e, lensG, hoodG, home: e.position.clone(), axis: X.clone(), rings: [...lensG.children], ring0: lensG.children.map((o) => o.position.x)});
  }
  anchor('eye', eyes[0], 0.04, 0, 0);
  anchor('lens', eyeParts[0].lensG, 0.04, 0, 0);
  anchor('hood', eyeParts[0].hoodG, 0.02, 0.085, 0);

  // ---------------------------------------------------------------- the teeth (after the shark's fang rows)
  // straight glass cones, a little curved, the front fourth and a mid one longest, spacing jittered
  const teeth = [];
  const toothGeo = (len, rb, curl) => {
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const u = k / 6;
      pts.push(new V3(curl * u * u * len, -u * len, 0));
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 1, 10, false);
    // taper the tube: scale every ring's radius by (1 - u)^1.1
    const p = geo.attributes.position;
    const c = new THREE.CatmullRomCurve3(pts);
    for (let i = 0; i < p.count; i++) {
      const ringI = Math.floor(i / 11);
      const u = ringI / 10;
      const ctr = c.getPointAt(u);
      const v = new V3(p.getX(i), p.getY(i), p.getZ(i)).sub(ctr);
      const r = rb * Math.pow(1 - u, 1.1) + 0.0015;
      v.normalize().multiplyScalar(r);
      p.setXYZ(i, ctr.x + v.x, ctr.y + v.y, ctr.z + v.z);
    }
    geo.computeVertexNormals();
    return geo;
  };
  const toothRow = (parent, S, a, xs, xe, n, down, Lmax, sideTilt) => {
    for (const sg of [1, -1]) {
      for (let i = 0; i < n; i++) {
        const w = (i + 0.5 + (R() - 0.5) * 0.5) / n;
        const x = lerp(xe, xs, w);
        const big = i === n - 4 || i === n - 9 ? 1.35 : 1;
        const len = Lmax * big * (0.55 + 0.45 * Math.sin(Math.PI * clamp(1 - w * 0.9, 0, 1))) * (0.85 + 0.25 * R());
        const g = put(parent, toothGeo(len, 0.24 * len, (R() - 0.5) * 0.25), M.tooth);
        g.castShadow = false;
        g.position.copy(S.P(x, a * sg, 0.97));
        // the cone points down (upper row) or up (lower row), tilted a little outward
        const dir = new V3(0, (down ? -1 : 1) * Math.cos(sideTilt), sg * Math.sin(sideTilt)).normalize();
        g.quaternion.setFromUnitVectors(new V3(0, -1, 0), dir);
        g.rotateY((R() - 0.5) * 0.6);
        teeth.push({o: g, home: g.position.clone(), q0: g.quaternion.clone(), side: sg, up: down});
      }
    }
  };
  toothRow(skull, SS, deg(126), 1.12, XS1 - 0.03, 16, true, 0.1, 0.18);

  // ================================================================ the lower jaw, hung on the hinge
  const jaw = grp(head, HINGE.x - NECK.x, HINGE.y - NECK.y, 0);
  const jawIn = grp(jaw, -HINGE.x, -HINGE.y, 0);
  const JS = makeSurf(JAW, 2.4);
  // outer core and the lining inside, the tongue between
  put(jawIn, patchGeo(90, 36, (u, v) => {
    const x = lerp(0.98, XJ1 - 0.0005, u);
    const a = deg(lerp(90, 270, v));
    return {p: JS.P(x, a, 0.9), n: JS.N(x, a)};
  }), M.core);
  put(jawIn, patchGeo(80, 30, (u, v) => {
    const x = lerp(1.0, XJ1 - 0.015, u);
    const a = deg(lerp(90, 270, v));
    return {p: JS.P(x, a, 0.8), n: JS.N(x, a).negate()};
  }), M.mouthPlate);
  // the rim: a dark strip from the outer shell to the lining on each side
  for (const sg of [1, -1]) {
    put(jawIn, patchGeo(80, 3, (u, v) => {
      const x = lerp(0.99, XJ1 - 0.01, u);
      const a = deg(90) * sg;
      return {p: JS.P(x, a, lerp(0.8, 1.02, v)), n: new V3(0, 1, 0)};
    }), M.core);
  }
  // the tongue: one plate in three segments with seams, domed across, riveted, a steel strip in each seam
  {
    const TX = [1.04, 1.25, 1.45, 1.66];
    for (let k = 0; k < 3; k++) {
      const xa = TX[k] + 0.006;
      const xb = TX[k + 1] - 0.006;
      const g = patchGeo(14, 10, (u, v) => {
        const x = lerp(xa, xb, u);
        const q = JAW(x);
        const w = 0.55 * q.rz * (k === 2 ? 1 - 0.5 * u * u : 1);
        const z = lerp(-w, w, v);
        return {p: new V3(x, q.cy - 0.045 + 0.016 * Math.sin(Math.PI * v), z), n: new V3(0, 1, 0)};
      }, 0.014);
      put(jawIn, g, M.mouthPlate);
      for (const [u, v] of [[0.12, 0.18], [0.12, 0.82], [0.88, 0.18], [0.88, 0.82]]) {
        const x = lerp(xa, xb, u);
        const q = JAW(x);
        rivet(jawIn, new V3(x, q.cy - 0.045 + 0.016 * Math.sin(Math.PI * v) + 0.001, lerp(-0.55, 0.55, v) * q.rz * (k === 2 ? 1 - 0.5 * u * u : 1)), new V3(0, 1, 0));
      }
      if (k > 0) {
        const q = JAW(TX[k]);
        put(jawIn, cylX(0.005, 0.005, q.rz * 1.05, 8).rotateY(Math.PI / 2), M.steel, TX[k], q.cy - 0.04, 0);
      }
    }
  }
  const jawPl = grp(jawIn);
  const JX = [0.99, 1.12, 1.25, 1.38, 1.51, 1.63, 1.74, 1.83, XJ1 - 0.003];
  const JA = [93, 124, 152, 180, 208, 236, 267];
  for (let r = 0; r < JX.length - 1; r++) {
    for (let c = 0; c < JA.length - 1; c++) {
      const top = c === 0 || c === JA.length - 2;
      plate(JS, JX[r] + 0.006, JX[r + 1] - 0.006, deg(JA[c] + 1.2), deg(JA[c + 1] - 1.2), {parent: jawPl, lift: 0.01, t: 0.016, res: 0.012, edges: top ? [c === 0 ? 'a0' : 'a1'] : []});
    }
  }
  kitOn(JS, jawIn, 40, [1.0, 1.8], [deg(95), deg(175)], [0.93, 0.99], 0.85);
  toothRow(jawIn, JS, deg(97), 1.14, XJ1 - 0.03, 14, false, 0.085, 0.15);
  // the hinge: a brass gear and a steel hub with an amber ring each side, a piston back to the neck
  for (const sg of [1, -1]) {
    const hp = new V3(HINGE.x, HINGE.y, sg * 0.24);
    const gm = put(jaw, gearGeo(16, 0.07, 0.06, 0.022, 0.02, 6), M.brass, 0, 0, sg * 0.24);
    const hub = put(jaw, cylX(0.032, 0.032, 0.05, 20).rotateY(Math.PI / 2), M.steel, 0, 0, sg * 0.255);
    const rgm = put(jaw, new THREE.TorusGeometry(0.048, 0.006, 8, 32), M.amber, 0, 0, sg * 0.252);
    void gm, hub, rgm, hp;
  }
  for (const sg of [1, -1]) {
    const p0 = new V3(1.0, -0.04, sg * 0.21);
    const p1 = new V3(0.84, 0.02, sg * 0.235);
    const c = put(skull, cylX(0.018, 0.018, p0.distanceTo(p1), 14), M.chrome);
    c.position.copy(p0).lerp(p1, 0.5);
    aimX(c, p1.clone().sub(p0));
    const c2 = put(skull, cylX(0.026, 0.026, p0.distanceTo(p1) * 0.55, 14), M.steel);
    c2.position.copy(p0).lerp(p1, 0.7);
    aimX(c2, p1.clone().sub(p0));
  }
  const mouthPistons = [];
  for (const sg of [1, -1]) {
    const barrel = put(head, cylX(0.017, 0.017, 0.07, 14), M.steel);
    const rod = put(head, cylX(0.009, 0.009, 0.1, 10), M.chrome);
    const collar = put(head, cylX(0.021, 0.021, 0.012, 14), M.brass);
    mouthPistons.push({S: new V3(1.12, -0.06, sg * 0.13), J: new V3(1.22, -0.105, sg * 0.13), barrel, rod, collar});
  }
  anchor('jaw', jaw, 0.55, -0.06, 0.1);

  // ================================================================ the tail: a chain of segments
  const tailRoot = grp(body, TAIL_X0, -0.005, 0);
  const tailSegs = [];
  {
    let parent = tailRoot;
    let s0 = 0;
    for (let i = 0; i < NSEG; i++) {
      const Ls = SEG_L[i];
      const s1 = s0 + Ls / TAIL_LEN;
      const g = grp(parent, i === 0 ? 0 : -SEG_L[i - 1], 0, 0);
      const glass = i >= GLASS_FROM;
      const ra = tailR(s0);
      const rb = tailR(s1);
      // the segment's own surface: x from 0 (its front) to -Ls
      const prof = (x) => {
        const u = clamp(-x / Ls, 0, 1);
        const ry = lerp(ra.ry, rb.ry, u);
        const rz = lerp(ra.rz, rb.rz, u);
        return {cy: 0, ryT: ry, ryB: ry * 0.92, rz};
      };
      const S = makeSurf(prof, 2.4);
      put(g, patchGeo(10, 28, (u, v) => {
        const x = lerp(0.01, -Ls, u);
        const a = -Math.PI + 2 * Math.PI * v;
        return {p: S.P(x, a, 0.78), n: S.N(x, a)};
      }), M.core);
      // the joint ring in the gap at the front
      put(g, ring(-0.022, 0.004, ra.ry * 0.55, ra.ry * 0.88, 0.004, {segs: 32}), i % 2 ? M.brass : M.steel).scale.z = ra.rz / ra.ry;
      const bandMat = glass ? M.glassThick : M.shell;
      const eMat = glass ? M.rimHot : M.amber;
      const xa = -Ls * 0.08;
      const xb = -Ls * 0.97;
      // banded armour: the upper band roofed back over the next segment like the back scutes; amber only on the
      // upper band's rear edge (lit glass on the glass third)
      const tile = (u) => 0.016 * (1 - u);
      for (const sg of [1, -1]) {
        plate(S, xa, xb - Ls * 0.12, deg(18) * sg, deg(62) * sg, {parent: g, lift: 0.008, t: 0.02, mat: bandMat, edges: ['x1'], edgeMat: eMat, extra: (u) => tile(1 - u), res: 0.012});
        plate(S, xa, xb, deg(65) * sg, deg(104) * sg, {parent: g, lift: 0.006, t: 0.02, mat: bandMat, edges: glass ? ['x1'] : [], edgeMat: eMat});
        plate(S, xa, xb, deg(107) * sg, deg(162) * sg, {parent: g, lift: 0.006, t: 0.02, mat: bandMat, edges: [], edgeMat: eMat});
      }
      plate(S, xa, xb - Ls * 0.12, deg(-15), deg(15), {parent: g, lift: 0.012, t: 0.022, mat: bandMat, extra: (u) => tile(1 - u), res: 0.012});
      // the crest: one tall glass fin a segment, from the root to the tip, tallest at the root
      const xm = (xa + xb) / 2;
      if (i >= 1) {
        const hFin = 0.035 + 0.15 * Math.pow(1 - s0, 1.1);
        const b = Ls * 0.92;
        const lean = 0.5;
        const f = glassy(put(g, finGeo(b, hFin, 0.016, lean), M.glassThick));
        placeOn(f, S.P(xm, 0).addScaledVector(S.N(xm, 0), 0.02), S.N(xm, 0));
        // the lit leading edge
        const A = new V3(b * 0.5, -0.01, 0);
        const C = new V3(b * 0.32, hFin * 0.55 - 0.01, 0);
        const B = new V3(-b * lean + b * 0.1, hFin - 0.01, 0);
        const pts = [];
        for (let k = 0; k <= 12; k++) {
          const q = k / 12;
          pts.push(A.clone().multiplyScalar((1 - q) * (1 - q)).addScaledVector(C, 2 * (1 - q) * q).addScaledVector(B, q * q));
        }
        put(f, tube(pts, 0.0035, 24, 5), M.rimHot);
        // its root: a steel clamp on the top plate
        put(g, rbox(b * 0.7, 0.014, 0.03, 0.004), M.steel).position.copy(S.P(xm, 0).addScaledVector(S.N(xm, 0), 0.03));
      }
      if (!glass) kitOn(S, g, 12, [-Ls * 0.95, -Ls * 0.05], [deg(10), deg(170)], [0.86, 0.97], 0.8);
      else {
        // inside the glass: a brass collar and a short spring on the steel core
        put(g, ring(-Ls * 0.6, -Ls * 0.4, ra.ry * 0.7, ra.ry * 0.82, 0.003, {segs: 24}), M.brass).scale.z = ra.rz / ra.ry;
      }
      if (i === NSEG - 1) {
        const tip = put(g, solid(-Ls - 0.12, -Ls + 0.002, (u) => rb.ry * 0.95 * Math.pow(u, 0.8) + 0.001, {segs: 24}, 16), M.glassThick);
        tip.scale.z = rb.rz / rb.ry;
        glassy(tip);
      }
      tailSegs.push({g, L: Ls, i, s0, s1});
      parent = g;
      s0 = s1;
    }
  }
  anchor('tail', tailSegs[8].g, -0.05, 0.08, 0.08);

  // ================================================================ the legs
  const legs = [];
  const bone = (parent, len, r0, r1, front) => {
    // an armoured limb along +x: steel core, shell sleeve in two halves with a gap down the sides, a piston in the gap
    const g = grp(parent);
    put(g, cylX(r0 * 0.6, r1 * 0.6, len * 0.92, 16), M.steel, len / 2);
    for (const [a0, a1] of [
      [-70, 70],
      [110, 250],
    ]) {
      const m = put(g, ring(len * 0.1, len * 0.86, r0 * 0.78, r0, 0.008, {a0: deg(a0), a1: deg(a1), segs: 24}), M.shell);
      m.scale.set(1, 1, 1);
      // taper toward the far end
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = lerp(1, r1 / r0, clamp(p.getX(i) / len, 0, 1));
        p.setY(i, p.getY(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      m.geometry.computeVertexNormals();
    }
    // a broad armour plate over the outer top of the limb, riveted
    {
      const m = put(g, ring(len * 0.14, len * 0.8, r0 * 0.98, r0 * 1.16, 0.008, {a0: deg(-30), a1: deg(120), segs: 24}), M.shell);
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const k = lerp(1, r1 / r0, clamp(p.getX(i) / len, 0, 1));
        p.setY(i, p.getY(i) * k);
        p.setZ(i, p.getZ(i) * k);
      }
      m.geometry.computeVertexNormals();
      for (const xx of [0.2, 0.74]) for (const aa of [0, 90]) {
        const n = new V3(0, Math.cos(deg(aa)), Math.sin(deg(aa)));
        rivet(g, new V3(len * xx, 0, 0).addScaledVector(n, r0 * 1.17 * lerp(1, r1 / r0, xx)), n);
      }
    }
    // armour rib bands and amber trims at the ends
    put(g, ring(len * 0.86, len * 0.9, r1 * 0.7, r1 * 1.03, 0.003), M.amber);
    put(g, ring(len * 0.1, len * 0.16, r0 * 0.7, r0 * 1.06, 0.004), M.steel);
    put(g, ring(len * 0.46, len * 0.5, r0 * 0.7, r0 * 1.02, 0.003), M.brass);
    put(g, tube([[len * 0.1, -r0 * 0.95, 0], [len * 0.5, -r0 * 1.15, r0 * 0.3], [len * 0.9, -r1 * 0.95, 0]], 0.009, 20, 6), M.hose);
    for (const sg of [1, -1]) {
      put(g, cylX(0.011, 0.011, len * 0.7, 10), M.chrome, len * 0.5, 0, sg * r0 * 0.86);
      put(g, cylX(0.018, 0.018, len * 0.3, 12), M.steel, len * 0.3, 0, sg * r0 * 0.86);
    }
    void front;
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
  LEG.forEach((Lg, l) => {
    const sg = Lg.side;
    const a = deg(102) * sg;
    const S = TS.P(Lg.x, a, 0.97);
    const nS = TS.N(Lg.x, a);
    const legG = grp(body);
    // the shoulder: a big brass gear on a steel hub, an amber ring, and an armour cap over it
    const sh = grp(legG);
    sh.position.copy(S);
    face(sh, nS);
    put(sh, gearGeo(20, 0.12, 0.105, 0.03, 0.03, 6), M.brass);
    put(sh, cylX(0.05, 0.05, 0.07, 20).rotateY(Math.PI / 2), M.steel, 0, 0, 0.03);
    put(sh, new THREE.TorusGeometry(0.082, 0.007, 8, 40), M.amber, 0, 0, 0.022);
    // the pauldron: a curved armour plate over the top of the joint, the gear left open below it
    const capM = put(sh, new THREE.SphereGeometry(0.17, 32, 16, -Math.PI * 0.5, Math.PI, 0, Math.PI * 0.32), M.shell);
    capM.rotation.x = Math.PI / 2 - 0.2;
    capM.position.set(0, 0.06, -0.06);
    capM.scale.set(1.3, 1, 0.95);
    put(sh, new THREE.TorusGeometry(0.06, 0.006, 8, 32), M.steel, 0, 0, 0.065);
    for (let i = 0; i < 8; i++) {
      const aa = (i / 8) * Math.PI * 2;
      put(sh, cylX(0.009, 0.009, 0.02, 8).rotateY(Math.PI / 2), M.chrome, Math.cos(aa) * 0.072, Math.sin(aa) * 0.072, 0.04);
    }
    const upper = bone(legG, 0.26, 0.112, 0.096, Lg.front);
    const knee = jointBall(legG, 0.088, 0.075, true);
    const lower = bone(legG, 0.22, 0.092, 0.074, Lg.front);
    const ankle = jointBall(legG, 0.058, 0.05);
    // the foot: a plated palm, four steel toes with claws, glass webbing between them
    const footG = grp(legG);
    const foot = grp(footG);
    foot.scale.setScalar(1.32);
    put(foot, rbox(0.15, 0.045, 0.11, 0.018), M.shell, 0.015, 0.03, 0);
    put(foot, rbox(0.1, 0.03, 0.08, 0.012), M.steel, 0.0, 0.012, 0);
    put(foot, ring(-0.004, 0.004, 0.02, 0.06, 0.002).rotateZ(Math.PI / 2), M.amber, 0.015, 0.055, 0);
    const TO = [-40, -14, 12, 38];
    const toePaths = [];
    TO.forEach((ta, k) => {
      const dir = new V3(Math.cos(deg(ta)), 0, Math.sin(deg(ta)));
      const len = [0.17, 0.2, 0.2, 0.16][k] * (Lg.front ? 1 : 1.12);
      const base = new V3(0.06, 0.028, 0).addScaledVector(dir, 0.03);
      const k1 = base.clone().addScaledVector(dir, len * 0.45).add(new V3(0, 0.012, 0));
      const k2 = base.clone().addScaledVector(dir, len * 0.82).add(new V3(0, -0.004, 0));
      const tip = base.clone().addScaledVector(dir, len).add(new V3(0, -0.022, 0));
      toePaths.push([base, k1, k2, tip]);
      for (const [p, q, r] of [
        [base, k1, 0.016],
        [k1, k2, 0.013],
      ]) {
        const m = put(foot, cylX(r, r * 0.9, p.distanceTo(q), 12), M.steel);
        m.position.copy(p).lerp(q, 0.5);
        aimX(m, q.clone().sub(p));
      }
      for (const p of [base, k1, k2]) put(foot, new THREE.SphereGeometry(0.019, 14, 10), M.brass).position.copy(p);
      // the claw: a curved chrome cone
      const cl = put(foot, new THREE.ConeGeometry(0.014, 0.065, 12).rotateZ(-Math.PI / 2).translate(0.03, 0, 0), M.chrome);
      cl.position.copy(k2);
      aimX(cl, tip.clone().sub(k2));
      put(foot, new THREE.TorusGeometry(0.014, 0.003, 6, 16).rotateY(Math.PI / 2), M.amber).position.copy(k2);
    });
    // webbing between neighbouring toes, scalloped between the knuckles, with fine veins
    for (let k = 0; k < 3; k++) {
      const A = toePaths[k];
      const B = toePaths[k + 1];
      const cA = new THREE.CatmullRomCurve3(A);
      const cB = new THREE.CatmullRomCurve3(B);
      const g = patchGeo(10, 10, (u, v) => {
        const pa = cA.getPoint(v * 0.92);
        const pb = cB.getPoint(v * 0.92);
        const p = pa.lerp(pb, u);
        // the free edge sinks back between the toes
        const scal = Math.sin(Math.PI * u) * 0.35 * v * v;
        const base = cA.getPoint(0).lerp(cB.getPoint(0), u);
        p.lerp(base, scal);
        p.y += 0.004 * Math.sin(Math.PI * u);
        return {p, n: new V3(0, 1, 0)};
      });
      glassy(put(foot, g, M.glass));
      const segs = [];
      for (let q = 1; q < 4; q++) {
        const u = q / 4;
        let prev = null;
        for (let j = 0; j <= 8; j++) {
          const v = (j / 8) * 0.92;
          const p = cA.getPoint(v).lerp(cB.getPoint(v), u);
          const base = cA.getPoint(0).lerp(cB.getPoint(0), u);
          p.lerp(base, Math.sin(Math.PI * u) * 0.35 * (j / 8) ** 2);
          p.y += 0.006;
          if (prev) segs.push([prev.x, prev.y, prev.z, p.x, p.y, p.z]);
          prev = p;
        }
      }
      lines(foot, segs, M.vein);
      // the lit edge along the scallop
      const edgePts = [];
      for (let j = 0; j <= 10; j++) {
        const u = j / 10;
        const p = cA.getPoint(0.92).lerp(cB.getPoint(0.92), u);
        p.lerp(cA.getPoint(0).lerp(cB.getPoint(0), u), Math.sin(Math.PI * u) * 0.35);
        edgePts.push(p);
      }
      put(foot, tube(edgePts, 0.0028, 20, 5), M.rimHot);
    }
    legs.push({g: legG, S, nS, sh, upper, knee, lower, ankle, foot: footG, ...Lg, l});
  });
  anchor('leg', legs[0].knee, 0, 0, 0.06);

  // ---------------------------------------------------------------- the rivets, one instanced mesh per part
  {
    const rg = new THREE.SphereGeometry(0.0062, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
    for (const [parent, list] of RIV) {
      const im = new THREE.InstancedMesh(rg, M.rivet, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = false;
      parent.add(im);
    }
  }

  // ================================================================ pose
  const orient = (obj, from, to, up) => {
    const x = to.clone().sub(from).normalize();
    const z = new V3().crossVectors(x, up).normalize();
    const y = new V3().crossVectors(z, x);
    obj.position.copy(from);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
  };
  const L1 = 0.26;
  const L2 = 0.22;
  const ANK = 0.09;
  const setLeg = (lg, F, yaw) => {
    const A = F.clone().add(new V3(0, ANK, 0));
    const S = lg.S;
    let d = A.distanceTo(S);
    const dir = A.clone().sub(S).normalize();
    d = Math.min(d, (L1 + L2) * 0.985);
    const a = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
    // sprawled: the elbow and the knee bend up and out to the side, the elbow a little back, the knee a little forward
    const pole = new V3(lg.front ? -0.25 : 0.3, 1.0, lg.side * 0.55);
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const K = S.clone().addScaledVector(dir, a).addScaledVector(pole, h);
    const A2 = S.clone().addScaledVector(dir, d);
    const up = new V3(0, 1, 0);
    orient(lg.upper, S, K, up);
    orient(lg.lower, K, A2, up);
    lg.knee.position.copy(K);
    lg.knee.quaternion.setFromUnitVectors(new V3(0, 0, 1), new V3(0, 0, lg.side));
    lg.ankle.position.copy(A2);
    lg.ankle.quaternion.copy(lg.knee.quaternion);
    lg.foot.position.set(A2.x, F.y, A2.z);
    lg.foot.rotation.set(0, yaw, 0);
  };
  const qz = new THREE.Quaternion();
  const ZA = new V3(0, 0, 1);
  const pose = (st = {}) => {
    const {t = 0, gape = 30, headUp = 12, headYaw = 0, tailPitch = null, tailYaw = null, tailWave = 0, feet = null, footYaw = null} = st;
    const {eye = 0, drop = 0, teethOut = 0, explode = 0, spinT = t, bodyY = 0, bodyPitch = 0, bodyRoll = 0, winOpen = 0} = st;
    const ex = explode;
    body.position.set(0, bodyY, 0);
    body.rotation.set(bodyRoll * D2R, 0, bodyPitch * D2R);
    // the head: forward and up when apart, the skull lifting off the jaw
    head.position.set(NECK.x + 0.34 * ex, NECK.y + 0.12 * ex, NECK.z);
    head.rotation.set(0, headYaw * D2R, headUp * D2R);
    skull.position.set(-NECK.x, -NECK.y + 0.1 * ex, -NECK.z);
    // the jaw drops off its hinge
    const dj = Math.max(drop, ex);
    jaw.position.set(HINGE.x - NECK.x + 0.04 * dj, HINGE.y - NECK.y - 0.16 * dj, 0);
    jaw.rotation.set(0, 0, -(gape + 6 * drop) * D2R);
    {
      const ja = -(gape + 6 * drop) * D2R;
      const c = Math.cos(ja);
      const sn = Math.sin(ja);
      for (const P of mouthPistons) {
        const a = P.S.clone().add(skull.position);
        const d = P.J.clone().sub(HINGE);
        const b = new V3(d.x * c - d.y * sn, d.x * sn + d.y * c, d.z).add(jaw.position);
        const dir = b.clone().sub(a);
        const len = dir.length();
        dir.normalize();
        P.barrel.position.copy(a).addScaledVector(dir, 0.035);
        aimX(P.barrel, dir);
        P.rod.position.copy(b).addScaledVector(dir, -0.05);
        aimX(P.rod, dir);
        P.collar.position.copy(a).addScaledVector(dir, Math.min(0.07, len * 0.6));
        aimX(P.collar, dir);
      }
    }
    // the glass teeth fly out of their sockets in a ripple along each row, and back
    const to = Math.max(teethOut, ex);
    teeth.forEach((tt, i) => {
      const k = to <= 0 ? 0 : clamp(to * 1.6 - ((i % 16) / 16) * 0.6, 0, 1);
      tt.o.position.copy(tt.home).add(new V3(0, (tt.up ? -0.075 : 0.075) * k, tt.side * 0.06 * k));
    });
    // the eyes: the hood lifts back, the lens with its rings screws out along its axis
    for (const E of eyeParts) {
      const h = Math.max(eye, ex);
      E.e.position.copy(E.home).addScaledVector(E.axis, 0.1 * ex);
      E.lensG.position.set(0.07 * ex, 0, 0);
      // the steel bezel, the amber ring and the lens unscrew one after the other along the lens axis
      E.rings.forEach((o, i) => {
        const k = clamp(eye * 1.5 - i * 0.25, 0, 1);
        o.position.x = E.ring0[i] + [0.06, 0.12, 0.19][i] * k;
        o.rotation.x = k * (1.4 + 0.6 * i) * Math.PI;
      });
      E.hoodG.position.set(-0.01 * h, 0.035 * h, 0);
      E.hoodG.rotation.set(0, 0, 0.75 * h);
    }
    // the flank domes lift off, their gears come out a little way behind them; the gears turn
    for (const W of winParts) {
      W.w.position.copy(W.n).multiplyScalar(0.42 * ex + 0.24 * winOpen).add(new V3(0, 0.07 * winOpen, 0));
      W.mech.position.copy(W.n).multiplyScalar(0.16 * ex);
    }
    for (const S of spin) S.m.quaternion.copy(S.q0).multiply(qz.setFromAxisAngle(ZA, spinT * S.rate));
    // the layers: scute rows up and fanned along the back, flank bands out, head plates up off the skull, jaw plates down
    scRows.forEach((g, r) => g.position.set((r - (scRows.length - 1) / 2) * 0.045 * ex, 0.42 * ex, 0));
    FL[1].position.set(0, -0.02 * ex, 0.2 * ex);
    FL[-1].position.set(0, -0.02 * ex, -0.2 * ex);
    skullPl.position.set(0, 0.2 * ex, 0);
    jawPl.position.set(0, -0.1 * ex, 0);
    // the tail comes apart segment by segment
    tailRoot.position.set(TAIL_X0 - 0.14 * ex, -0.005, 0);
    tailSegs.forEach((sg, i) => {
      const p = tailPitch ? tailPitch[i] ?? 0 : 0;
      const yv = tailYaw ? tailYaw[i] ?? 0 : 0;
      const w = tailWave * Math.sin(t * 2 * Math.PI * 0.6 - i * 0.45) * (0.3 + i / NSEG);
      sg.g.rotation.set(0, (yv + w) * D2R, p * D2R);
      if (i > 0) sg.g.position.set(-SEG_L[i - 1] - 0.045 * ex, 0, 0);
    });
    // the legs: set by the feet, then pulled out sideways joint by joint (the front ones furthest)
    legs.forEach((lg, l) => {
      const F = feet ? new V3(...feet[l]) : new V3(...FOOT_HOME(l));
      const yaw = footYaw ? footYaw[l] : -lg.side * (lg.front ? 22 : 38) * D2R;
      setLeg(lg, F, yaw);
      const out = lg.front ? 1 : 0.55;
      lg.g.position.set((lg.front ? 0.05 : -0.05) * ex, -0.06 * ex, lg.side * 0.36 * out * ex);
      [lg.upper, lg.knee, lg.lower, lg.ankle, lg.foot].forEach((o, k) => (o.position.z += lg.side * 0.085 * (k + 1) * out * ex));
    });
  };
  pose();
  anchor('teeth', teeth[3].o, 0, -0.03, 0);
  anchor('teethF', teeth[16 + 3].o, 0, -0.03, 0);
  anchor('lensF', eyeParts[1].rings[2], 0.03, 0, 0);
  anchor('ringF', eyeParts[1].rings[1], 0.01, 0.05, 0);
  anchor('hoodF', eyeParts[1].hoodG, 0.02, 0.085, 0);
  anchor('palate', palate, 1.45, -0.075, -0.06);
  anchor('piston', mouthPistons[1].barrel, 0, 0, 0);
  anchor('scutes', scRows[6], 0.2, 0.3, 0);
  anchor('headPlates', skullPl, 1.45, 0.14, -0.05);
  anchor('jawPlates', jawPl, 1.45, -0.2, -0.1);
  anchor('dome', winParts[0].w, 0.16, -0.03, 0.43);
  anchor('hinge', jaw, 0, 0, 0.27);
  anchor('gears', winParts[0].mech, 0.16, -0.03, 0.4);
  anchor('foot', legs[0].foot, 0.1, 0.04, 0);
  anchor('glassTail', tailSegs[15].g, -0.04, 0.05, 0.05);
  return {root, body, M, clear, anchors, pose, head, jaw, skull, eyes, eyeParts, teeth, windows, winParts, tailSegs, legs, scutes};
}
