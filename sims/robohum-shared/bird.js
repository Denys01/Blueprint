// ROBOTIC HUMMINGBIRD, the body from code, after hummingbird.png. Coordinates are the picture's: x toward the beak,
// y up, z the near side (the still mirrors x so the beak points left). L = beak base → tail base = 1.6.
// pose({explode, flap, flapAmp, t, spinT, sweepN, sweepF, lift, wingOut, eye}): explode 0..1 staged per part; the
// wings sweep about the shoulder (0 = lateral, + = toward the beak), symmetric in flight, the picture's spread for the hero.
import * as THREE from 'three';
import {V3, D2R, sweepX, ring, solid, gearGeo, rbox, cylX, cylZ, tube, coil, put} from '../wasp-shared/parts.js';

export const L = 1.6;
const S = L / 577; // picture px → units
export const P = (u, v) => [(720 - u) * S, (420 - v) * S];

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
const ss = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (b - a) === 0 ? 0 : (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

export function makeBirdMaterials() {
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    shell: phys({color: '#1A1C21', roughness: 0.4, metalness: 0.7, clearcoat: 0.06, clearcoatRoughness: 0.4}),
    shellIn: std({color: '#0f1013', roughness: 0.7, metalness: 0.2, side: THREE.DoubleSide}),
    core: std({color: '#202328', roughness: 0.5, metalness: 0.6}),
    beak: phys({color: '#16181c', roughness: 0.22, metalness: 0.7, clearcoat: 1, clearcoatRoughness: 0.06}),
    amber: std({color: '#D78453', emissive: '#CC774B', emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.6}),
    steel: std({color: '#a7adb5', roughness: 0.28, metalness: 1}),
    gunmetal: std({color: '#4d525a', roughness: 0.32, metalness: 0.9}),
    rubber: std({color: '#15161a', roughness: 0.75, metalness: 0}),
    lens: phys({color: '#020203', roughness: 0.05, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.4}),
    lensGlass: phys({color: '#6f7277', roughness: 0, metalness: 0, transmission: 1, thickness: 0, ior: 1.5, clearcoat: 1, clearcoatRoughness: 0, specularIntensity: 1, envMapIntensity: 2.4}),
    glass: phys({color: '#9CC9FF', roughness: 0.05, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02}),
    glow: std({color: '#000000', emissive: '#9CC9FF', emissiveIntensity: 1.6}),
    membrane: phys({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 0.22, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, clearcoat: 1, clearcoatRoughness: 0.05}),
    tailFilm: phys({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 0.3, roughness: 0.2, metalness: 0, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide}),
    rim: std({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 1.1, roughness: 0.2, metalness: 0}),
    rimHot: std({color: '#9CC9FF', emissive: '#9CC9FF', emissiveIntensity: 1.2, roughness: 0.2, metalness: 0}),
    vein: new THREE.LineBasicMaterial({color: new THREE.Color('#9CC9FF').multiplyScalar(1.35), transparent: true, opacity: 0.7, depthWrite: false}),
    veinTail: new THREE.LineBasicMaterial({color: new THREE.Color('#9CC9FF').multiplyScalar(1.5), transparent: true, opacity: 0.8, depthWrite: false}),
  };
}

export function buildBird({seed = 7} = {}) {
  const M = makeBirdMaterials();
  const R = rng(seed);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const clear = [];
  const anchors = {};
  const anchor = (key, obj, x, y, z) => (anchors[key] ??= {obj, at: new V3(x, y, z)});
  const X = [];
  const ex = (obj, dir, dist, s = 0, f = 1, spin = null) => {
    X.push({obj, home: obj.position.clone(), q0: obj.quaternion.clone(), dir: new V3(...dir).normalize(), dist, s, f, spin});
    return obj;
  };
  const grp = (parent, x = 0, y = 0, z = 0) => {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  const lines = (parent, segs, mat) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(segs.flat(), 3));
    const l = new THREE.LineSegments(g, mat);
    parent.add(l);
    clear.push(l);
    return l;
  };
  const faceTo = (obj, n) => obj.quaternion.setFromUnitVectors(new V3(0, 0, 1), n.clone().normalize());
  const spinners = []; // {obj, axis, rate}
  const screwM = [];
  const mtx = new THREE.Matrix4();
  const screwAt = (parent, p) => {
    parent.updateMatrixWorld(true);
    screwM.push({parent, m: new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)});
  };

  // ================================================================ the body: ONE lofted form, tail base → beak tip
  // Measured once off hummingbird.png (px; L = beak base → tail base = 577): beak 395 = 0.68 L; head Ø 190 = 0.33 L
  // against chest height 356 = 0.62 L (head 0.53 of the chest); neck ~60 = 0.10 L long and Ø 184 (thick); tail fan
  // 265 = 0.46 L. Spine points and radii are read off the same picture; one centripetal Catmull-Rom carries both, so
  // the radius changes smoothly along the curve with no steps. The beak droops slightly over its last 0.1.
  const KZ = 0.82; // the cross-section is a little narrower side to side than top to bottom
  const SPN = [
    [868, 640, 40], [835, 548, 128], [765, 405, 178], [706, 288, 124], [672, 220, 92], [640, 168, 95],
    [592, 162, 58], [545, 170, 15], [440, 160, 10], [300, 149, 6.5], [200, 142, 3.6], [150, 146, 1.2],
  ];
  const TILT = -24 * D2R;
  const PIV = new V3(...P(672, 220), 0);
  const rotP = (u, v) => new V3(...P(u, v), 0).sub(PIV).applyAxisAngle(new V3(0, 0, 1), TILT).add(PIV);
  const spine = new THREE.CatmullRomCurve3(SPN.map(([u, v, r], i) => (i < 4 ? rotP(u, v) : new V3(...P(u, v), 0)).setZ(r * S)), false, 'centripetal');
  const NS = 800;
  const SAM = spine.getSpacedPoints(NS);
  const LT = spine.getLength();
  const ZV = new V3(0, 0, 1);
  const fr = (s) => {
    const q = Math.min(NS - 1e-6, Math.max(0, s * NS));
    const i = Math.floor(q);
    const f = q - i;
    const a = SAM[i];
    const b = SAM[i + 1];
    const i0 = Math.max(0, i - 1);
    const i1 = Math.min(NS, i + 2);
    const T = new V3(SAM[i1].x - SAM[i0].x, SAM[i1].y - SAM[i0].y, 0).normalize();
    return {C: new V3(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f, 0), T, N: new V3(-T.y, T.x, 0), r: Math.max(0.002, a.z + (b.z - a.z) * f), dr: (SAM[i1].z - SAM[i0].z) / ((i1 - i0) / NS)};
  };
  // a point on the form at (s, angle) and its normal: angle 0 = dorsal, 90° = near side (+z), 180° = ventral
  const at = (s, a, k = 1, off = 0) => {
    const f = fr(s);
    const rr = f.r * k + off;
    const p = f.C.clone().addScaledVector(f.N, rr * Math.cos(a)).addScaledVector(ZV, rr * KZ * Math.sin(a));
    const n = f.N.clone().multiplyScalar(Math.cos(a)).addScaledVector(ZV, Math.sin(a) / KZ).addScaledVector(f.T, (-f.dr * k) / LT).normalize();
    return [p, n, f];
  };
  const sAtXY = (q) => {
    let best = 0;
    let bd = 1e9;
    SAM.forEach((p, i) => {
      const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
      if (d < bd) [bd, best] = [d, i];
    });
    return best / NS;
  };
  const sAt = (u, v) => {
    const [x, y] = P(u, v);
    let best = 0;
    let bd = 1e9;
    SAM.forEach((p, i) => {
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bd) [bd, best] = [d, i];
    });
    return best / NS;
  };
  const sChest = sAtXY(rotP(765, 405));
  const sNeck = sAtXY(rotP(700, 278));
  const sHead = sAt(640, 168);
  const sFace = sAt(600, 163);
  const sBeak = sAt(545, 170);
  // the shoulders: on the top-back of the chest just below the neck, either side of the spine
  const sSh = sNeck - 0.035;
  const aSh = 0.55;
  // triangles from a vertex function, each turned to agree with its normal (or flat when it has none)
  const tri = (pos, nor, a, b, c, na, nb, nc) => {
    const g = new V3().subVectors(b, a).cross(new V3().subVectors(c, a)).normalize();
    if (na && g.dot(na) < 0) {
      [b, c] = [c, b];
      [nb, nc] = [nc, nb];
    }
    for (const [p, n] of [[a, na || g], [b, nb || g], [c, nc || g]]) {
      pos.push(p.x, p.y, p.z);
      nor.push(n.x, n.y, n.z);
    }
  };
  // a surface patch fn(u, v, off) → [point, normal]; with t > 0 a slab t thick with its four side walls
  const patchGeo = (nu, nv, fn, t = 0) => {
    const pos = [];
    const nor = [];
    const grid = (off) => {
      const Pg = [];
      const Ng = [];
      for (let i = 0; i <= nu; i++) {
        Pg.push([]);
        Ng.push([]);
        for (let j = 0; j <= nv; j++) {
          const [p, n] = fn(i / nu, j / nv, off);
          Pg[i].push(p);
          Ng[i].push(n);
        }
      }
      return [Pg, Ng];
    };
    const face = ([Pg, Ng], flip) => {
      for (let i = 0; i < nu; i++)
        for (let j = 0; j < nv; j++) {
          const n = (ii, jj) => (flip ? Ng[ii][jj].clone().negate() : Ng[ii][jj]);
          tri(pos, nor, Pg[i][j], Pg[i + 1][j], Pg[i + 1][j + 1], n(i, j), n(i + 1, j), n(i + 1, j + 1));
          tri(pos, nor, Pg[i][j], Pg[i + 1][j + 1], Pg[i][j + 1], n(i, j), n(i + 1, j + 1), n(i, j + 1));
        }
    };
    const O = grid(0);
    face(O, false);
    if (t > 0) {
      const I = grid(-t);
      face(I, true);
      const wall = (list) => {
        for (let k = 0; k < list.length - 1; k++) {
          const [a, b] = [list[k], list[k + 1]];
          tri(pos, nor, O[0][a[0]][a[1]], O[0][b[0]][b[1]], I[0][b[0]][b[1]]);
          tri(pos, nor, O[0][a[0]][a[1]], I[0][b[0]][b[1]], I[0][a[0]][a[1]]);
        }
      };
      const range = (n) => [...Array(n + 1).keys()];
      wall(range(nu).map((i) => [i, 0]));
      wall(range(nu).map((i) => [i, nv]));
      wall(range(nv).map((j) => [0, j]));
      wall(range(nv).map((j) => [nu, j]));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  };
  const two = (m) => {
    const c = m.clone();
    c.side = THREE.DoubleSide;
    return c;
  };
  const MP = {plate: two(M.shell), core: two(M.core), beak: two(M.beak), amber: two(M.amber)};
  M.mechA = new THREE.MeshStandardMaterial({color: '#8c939b', roughness: 0.32, metalness: 0.75});
  M.mechB = new THREE.MeshStandardMaterial({color: '#B08A5A', roughness: 0.35, metalness: 0.75});
  M.hose = new THREE.MeshStandardMaterial({color: '#5c636b', roughness: 0.6, metalness: 0.2});
  for (const m of [M.mechA, M.mechB, M.hose, M.steel, M.gunmetal]) m.userData.keep = true;
  const zr = (g) => g.rotateY(-Math.PI / 2);

  const torso = grp(body);
  // the form itself: a dark core under the plates (0.9 of the radius), rising to the full radius at the face so the
  // face and the beak are the same surface
  const kCore = (s) => 0.9 + 0.1 * ss(sFace - 0.06, sFace, s);
  const loft = (s0, s1, nu, k, mat, parent) =>
    put(parent, patchGeo(nu, 72, (u, v) => {
      const s = s0 + (s1 - s0) * u;
      const [p, n] = at(s, -Math.PI + 2 * Math.PI * v, k(s));
      return [p, n];
    }), mat);
  loft(0, sFace, 260, kCore, MP.core, torso);
  loft(sFace, sBeak, 40, () => 1, MP.plate, torso);
  const beak = grp(body);
  loft(sBeak, 1, 160, () => 1, MP.beak, beak);
  // the gape: a fine dark seam along each side of the beak, from the face toward the tip
  for (const a of [1.78, -1.78]) {
    const pts = [];
    for (let k = 0; k <= 30; k++) pts.push(at(sFace + (0.965 - sFace) * (k / 30), a, 1, 0.0015)[0]);
    put(beak, tube(pts, 0.0035, 90, 5), M.rubber);
  }
  M.beakHi = new THREE.MeshStandardMaterial({color: '#c9d3dd', roughness: 0.25, metalness: 0.5, emissive: '#9CC9FF', emissiveIntensity: 0.35});
  M.beakHi.userData.keep = true;
  {
    const pts = [];
    for (let k = 0; k <= 40; k++) pts.push(at(sFace + (0.97 - sFace) * (k / 40), 0.45, 1, 0.0015)[0]);
    put(beak, tube(pts, 0.003, 120, 5), M.beakHi);
  }
  put(torso, new THREE.SphereGeometry(fr(0).r * 0.92, 24, 16), MP.core, fr(0).C.x, fr(0).C.y, 0);
  ex(beak, [1, 0.05, 0], 0.5, 0.1, 0.6);
  anchor('beak', beak, ...at(sBeak + (1 - sBeak) * 0.45, 0.6)[0].toArray());

  // ---------------------------------------------------------------- plates, cut from the smooth form
  // rows across the spine; each row's edges bow toward the head on the sides (the picture's curved chest bands);
  // odd rows sit higher and overlap their neighbours, gaps of a few mm between plates show the mechanism
  const WIN = [
    {s: [sChest - 0.065, sChest + 0.075], a: [1.55, 3.0]}, // turbine bay
    {s: [sChest - 0.11, sChest + 0.035], a: [0.62, 1.38]}, // glass capsule
    {s: [sNeck - 0.03, sNeck + 0.04], a: [0.45, 1.3]}, // neck gears
    {s: [sHead - 0.025, sHead + 0.05], a: [0.95, 1.75]}, // the eye
    {s: [sHead - 0.075, sHead - 0.02], a: [1.15, 2.15]}, // gears behind the eye
  ];
  const inWin = (s, a) => WIN.some((w) => s > w.s[0] && s < w.s[1] && a > w.a[0] && a < w.a[1]);
  const BOW = 0.022;
  const plateAt = (s0, s1, a0, a1, lift, t, mat, parent) =>
    put(parent, patchGeo(Math.max(3, Math.ceil((s1 - s0) * 160)), Math.max(3, Math.ceil((a1 - a0) / 0.07)), (u, v, off) => {
      const a = a0 + (a1 - a0) * v;
      const s = s0 + (s1 - s0) * u + BOW * Math.sin(a) * Math.sin(a);
      const [p, n] = at(s, a, 1, lift + off);
      return [p, n];
    }, t), mat);
  const inNeck = (s1, a) => s1 > WIN[2].s[0] && s1 < WIN[2].s[1] && a > WIN[2].a[0] && a < WIN[2].a[1];
  let crown = null;
  const GAPS = {s: [], a: []};
  let headStart = sFace;
  let s = 0.012;
  let bi = 0;
  while (s < sFace - 0.02) {
    const len = [0.042, 0.056, 0.07][Math.floor(R() * 3)];
    const s1 = Math.min(sFace - 0.012, s + len);
    const odd = bi % 2 === 1;
    const inBody = s1 < sNeck;
    const ov = inBody ? 0.003 : odd ? 0.012 : 0;
    const lift = odd ? 0.02 : 0.007;
    let a = -Math.PI + R() * 0.5;
    const end = a + Math.PI * 2 - 0.04;
    while (a < end) {
      const w = [0.34, 0.6, 0.95][Math.floor(R() * 3)];
      const a1 = Math.min(end, a + w);
      const am = (((a + a1) / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      const sc = (s + s1) / 2 + BOW * Math.sin(am) ** 2;
      const oldSkip = inWin(sc, am) || a1 - a <= 0.14;
      const keep = oldSkip ? false : R() > 0.05;
      const rA = keep ? R() : 1;
      const rE = keep ? R() : 0.5;
      if (keep || (a1 - a > 0.14 && inNeck(sc, am))) {
        const g = grp(torso);
        const s0p = Math.max(0.004, s - ov);
        headStart = Math.min(headStart, s0p);
        const s1p = s1 + ov;
        const sb = sSh - BOW * Math.sin(aSh) ** 2;
        let spans = [[a, a1]];
        if (sb > s0p - 0.01 && sb < s1p + 0.01) {
          for (const t of [aSh, -aSh].flatMap((x) => [x, x + 2 * Math.PI, x - 2 * Math.PI])) {
            if (t < a - 0.2 || t > a1 + 0.2) continue;
            spans = spans.flatMap(([p, q]) => [[p, Math.min(q, t - 0.2)], [Math.max(p, t + 0.2), q]]).filter(([p, q]) => q - p > 0.1);
          }
        }
        for (const [p, q] of spans) {
          plateAt(s0p, s1p, p, q, lift, 0.014, MP.plate, g);
          if (rA < 0.3 && sc < sNeck - 0.03) plateAt(s1p - 0.007, s1p, p, q, lift + 0.003, 0.012, MP.amber, g);
        }
        if (!crown && sHead > s0p && sHead < s1p && a < 0 && a1 > 0) crown = {s1p, a, a1, lift, g};
        const [, n] = at(sc, am);
        ex(g, [n.x, n.y, n.z], 0.3 + 0.25 * rE, 0.05, 0.6);
      }
      if (inBody) GAPS.a.push([s, s1, a1 + 0.075]);
      a = a1 + (inBody ? 0.15 : 0.035) + R() * 0.03;
    }
    if (inBody) GAPS.s.push(s1 + 0.01);
    s = s1 + (inBody ? 0.02 : 0.004);
    bi++;
  }
  // ---------------------------------------------------------------- the chest and belly gaps, filled
  const R9 = rng(seed + 909);
  const gapMech = grp(torso);
  const openAt = (s1, a) => WIN.slice(0, 2).some((w) => s1 > w.s[0] && s1 < w.s[1] && a > w.a[0] && a < w.a[1]);
  const coreAt = (s1, a, off) => at(s1, a, kCore(s1), off);
  const gearAt = (s1, a, ro, mat) => {
    const [p, n] = coreAt(s1, a, 0.022);
    const gm = put(gapMech, gearGeo(12 + Math.floor(ro * 250), ro, ro * 0.82, 0.012, ro * 0.25, ro > 0.04 ? 4 : 0), mat);
    gm.position.copy(p);
    faceTo(gm, n);
    spinners.push({obj: gm, rate: (R9() < 0.5 ? -1 : 1) * 2});
  };
  const pistonAt = (s1, a) => {
    const [p, , f] = coreAt(s1, a, 0.03);
    const g = grp(gapMech);
    g.position.copy(p);
    g.quaternion.setFromUnitVectors(new V3(1, 0, 0), f.T);
    put(g, cylX(0.009, 0.009, 0.11, 10), M.mechA);
    put(g, cylX(0.016, 0.016, 0.05, 10), M.mechB, -0.03, 0, 0);
  };
  for (const sg of GAPS.s) {
    for (let a = -0.5; a <= 3.3; a += 0.24) {
      const s1 = sg + BOW * Math.sin(a) ** 2;
      if (openAt(s1, a)) continue;
      const r = R9();
      if (r < 0.55) gearAt(s1, a + (R9() - 0.5) * 0.08, 0.028 + R9() * 0.024, r < 0.3 ? M.mechB : M.mechA);
      else if (r < 0.8) pistonAt(s1, a);
    }
    const h0 = -0.3 + R9() * 1.5;
    const hp = [];
    for (let k = 0; k <= 8; k++) {
      const a = h0 + k * 0.09;
      hp.push(coreAt(sg + BOW * Math.sin(a) ** 2, a, 0.036)[0]);
    }
    put(gapMech, tube(hp, 0.01, 30, 6), M.hose);
  }
  for (const [s0, s1, a] of GAPS.a) {
    const aa = ((((a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    if (aa < -0.7) continue;
    const sm = (s0 + s1) / 2 + BOW * Math.sin(aa) ** 2;
    if (openAt(sm, aa)) continue;
    pistonAt(sm, aa);
    gearAt(s0 + 0.25 * (s1 - s0) + BOW * Math.sin(aa) ** 2, aa, 0.026 + R9() * 0.02, M.mechB);
  }
  if (crown) plateAt(crown.s1p - 0.005, crown.s1p, Math.max(crown.a, -0.75), Math.min(crown.a1, 0.75), crown.lift + 0.002, 0.008, MP.amber, crown.g);

  // ---------------------------------------------------------------- mechanism on the core, seen in the gaps
  const mech = grp(torso);
  const inWinAny = () => {
    const w = WIN[Math.floor(R() * 3)];
    return [w.s[0] + R() * (w.s[1] - w.s[0]), w.a[0] + R() * (w.a[1] - w.a[0])];
  };
  const onCore = (s1, a, off) => at(s1, a, kCore(s1), off);
  for (let i = 0; i < 70; i++) {
    const [s1, a] = i < 44 ? inWinAny() : [0.04 + R() * (sFace - 0.1), R() * Math.PI * 2];
    const ro = 0.025 + R() * 0.055;
    const [p, n] = onCore(s1, a, 0.012 + R() * 0.02);
    const gm = put(mech, gearGeo(10 + Math.floor(ro * 300), ro, ro * 0.82, 0.014, ro * 0.25, ro > 0.05 ? 4 : 0), R() < 0.55 ? M.mechA : M.mechB);
    gm.position.copy(p);
    faceTo(gm, n);
    gm.visible = !(s1 > sNeck - 0.06 && s1 < sFace);
    spinners.push({obj: gm, rate: ((R() < 0.5 ? -1 : 1) * (0.6 + R())) / ro * 0.05});
  }
  for (let i = 0; i < 44; i++) {
    const [s1, a] = i < 26 ? inWinAny() : [0.05 + R() * (sFace - 0.12), R() * Math.PI * 2];
    const len = 0.1 + R() * 0.16;
    const r = 0.01 + R() * 0.01;
    const [p, , f] = onCore(s1, a, 0.03);
    const g = grp(mech);
    g.position.copy(p);
    g.quaternion.setFromUnitVectors(new V3(1, 0, 0), f.T);
    put(g, cylX(r, r, len, 12), M.mechA);
    g.visible = !(s1 > sNeck - 0.06 && s1 < sFace);
    put(g, cylX(r + 0.007, r + 0.007, len * 0.45, 12), M.mechB, -len * 0.27, 0, 0);
    put(g, cylZ(r + 0.012, r + 0.012, r * 2.5, 12), M.mechB, len / 2, 0, 0);
  }
  for (let i = 0; i < 12; i++) {
    const a = R() * Math.PI * 2;
    const pts = [];
    for (let k = 0; k <= 16; k++) pts.push(onCore(0.04 + (k / 16) * (sFace - 0.1), a + Math.sin(k * 0.9 + i) * 0.12, 0.018)[0]);
    put(mech, tube(pts, 0.006 + R() * 0.006, 64, 6), R() < 0.3 ? M.hose : M.hose);
  }
  // the glass capsule with a lit coil, near flank under the shoulder
  const cap = grp(torso);
  {
    const [p, , f] = onCore(sChest - 0.04, 1.0, 0.03);
    cap.position.copy(p);
    cap.quaternion.setFromUnitVectors(new V3(1, 0, 0), f.T);
  }
  put(cap, cylX(0.05, 0.05, 0.24, 32), M.glass);
  put(cap, cylX(0.058, 0.058, 0.02, 32), M.steel, 0.12, 0, 0);
  put(cap, cylX(0.058, 0.058, 0.02, 32), M.steel, -0.12, 0, 0);
  put(cap, coil(0.03, 0.006, 7, 0.2), M.glow).position.x = -0.1;
  ex(cap, [0, 0.3, 1], 0.45, 0.1, 0.7);
  anchor('capsule', cap, 0, 0.05, 0.05);

  // ---------------------------------------------------------------- chest turbine (as before, on the new chest)
  const turb = grp(torso);
  {
    const [p, n, f] = at(sChest + 0.005, 2.2, 0.95);
    turb.position.copy(p);
    faceTo(turb, n.clone().addScaledVector(f.T, 0.25));
  }
  put(turb, zr(ring(-0.06, 0.05, 0.145, 0.19, 0.01, {segs: 64})), M.shell);
  put(turb, zr(ring(0.045, 0.058, 0.168, 0.192, 0.004, {segs: 64})), M.amber);
  put(turb, zr(ring(-0.04, 0.0, 0.118, 0.145, 0.004, {segs: 64})), M.gunmetal);
  put(turb, new THREE.CircleGeometry(0.15, 48), M.rubber, 0, 0, -0.035);
  const rotor = grp(turb);
  for (let i = 0; i < 20; i++) {
    const b = grp(rotor);
    b.rotation.z = (i / 20) * Math.PI * 2;
    const bl = put(b, rbox(0.03, 0.105, 0.006, 0.002), M.steel, 0, 0.075, 0);
    bl.rotation.y = 38 * D2R;
  }
  put(rotor, zr(ring(-0.02, 0.02, 0.026, 0.05, 0.005, {segs: 32})), M.gunmetal);
  put(rotor, new THREE.CylinderGeometry(0.0, 0.048, 0.1, 32).rotateX(Math.PI / 2), M.steel, 0, 0, 0.055);
  for (let i = 0; i < 12; i++) screwAt(turb, new V3(Math.cos(i * 0.5236) * 0.18, Math.sin(i * 0.5236) * 0.18, 0.052));
  spinners.push({obj: rotor, rate: 14, z: true});
  ex(turb, [0.2, -0.4, 1], 0.6, 0.0, 0.5);
  anchor('turbine', turb, 0, 0, 0.06);

  // ---------------------------------------------------------------- eye (as before) and the gears behind it
  const head = grp(body);
  const eye = grp(head);
  {
    const [p, n, f] = at(sHead + 0.015, 1.3, 1, -0.012);
    eye.position.copy(p);
    eye.userData.n = n.clone().addScaledVector(f.T, 0.1);
  }
  const eyeAim = grp(eye);
  faceTo(eyeAim, eye.userData.n);
  put(eyeAim, zr(ring(-0.02, 0.025, 0.062, 0.086, 0.007, {segs: 64})), M.amber);
  put(eyeAim, zr(ring(-0.03, 0.01, 0.086, 0.1, 0.005, {segs: 64})), M.shell);
  put(eyeAim, new THREE.SphereGeometry(0.066, 40, 24), M.lens).scale.set(1, 1, 0.55);
  put(eyeAim, new THREE.SphereGeometry(0.07, 40, 24, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), M.lensGlass).scale.set(1, 1, 0.6);
  ex(eye, [0.2, 0.2, 1], 0.4, 0.05, 0.5);
  anchor('eye', eyeAim, 0, 0, 0.05);
  [[-0.05, 1.55, 0.034], [-0.035, 1.95, 0.026], [-0.065, 1.3, 0.024]].forEach(([ds, a, ro], i) => {
    const [p, n] = onCore(sHead + ds, a, 0.006);
    const gm = put(head, gearGeo(12 + i * 2, ro, ro * 0.8, 0.012, ro * 0.3, ro > 0.03 ? 4 : 0), M.steel);
    gm.position.copy(p);
    faceTo(gm, n);
    spinners.push({obj: gm, rate: i % 2 ? 3 : -3});
  });
  // the shoulder sits on the new chest's surface (same x, y as before; z where the surface is)

  // ================================================================ wings: glass blades on a metal arm
  const W = 2.55;
  const chord = (u) => (0.26 + 0.42 * Math.sin((Math.PI / 2) * Math.min(1, u / 0.32))) * (u < 0.32 ? 1 : Math.pow((1 - u) / 0.68, 0.85));
  const NF = 11;
  M.arm = new THREE.MeshStandardMaterial({color: '#8c939b', roughness: 0.3, metalness: 0.8});
  M.arm.userData.keep = true;
  const TE = (x) => {
    const u = x / W;
    const f = u * NF;
    const lobe = Math.pow(Math.abs(Math.sin(Math.PI * f)), 0.45);
    return -chord(u) * (0.86 + 0.14 * lobe);
  };
  const LE = (x) => 0.05 * Math.sin(Math.PI * Math.min(1, x / W) * 0.95);
  const buildWing = (side) => {
    const g = new THREE.Group();
    // the arm along the leading edge: shoulder, elbow and wrist joints (amber rings), then the hand
    const J = [new V3(0, 0, 0), new V3(0.36, -0.03, 0), new V3(0.92, LE(0.92) - 0.005, 0), new V3(1.32, LE(1.32), 0)];
    const RJ = [0.046, 0.038, 0.03, 0.019];
    const seg = (a, b, r0, r1, mat, dz = 0) => {
      const d = b.clone().sub(a);
      const sg = grp(g, a.x, a.y, a.z + dz);
      sg.quaternion.setFromUnitVectors(new V3(1, 0, 0), d.clone().normalize());
      put(sg, cylX(r0, r1, d.length(), 16), mat, d.length() / 2, 0, 0);
    };
    for (let i = 0; i < 3; i++) seg(J[i], J[i + 1], RJ[i], RJ[i + 1], M.arm);
    J.slice(0, 3).forEach((p, i) => {
      const r = RJ[i] * 1.35;
      put(g, cylZ(r, r, 0.07, 28), M.arm, p.x, p.y, 0);
      put(g, zr(ring(0.034, 0.041, r * 0.65, r + 0.003, 0.003, {segs: 32})), M.amber).position.set(p.x, p.y, 0);
      put(g, cylZ(r * 0.35, r * 0.35, 0.09, 12), M.gunmetal, p.x, p.y, 0);
    });
    // small pistons under the upper arm and the forearm, linkage rods over them
    const pin = (p, r, dz) => put(g, cylZ(r, r, 0.032, 12), M.gunmetal, p.x, p.y, dz);
    const pis = (a, b) => {
      seg(a, a.clone().lerp(b, 0.55), 0.016, 0.016, M.gunmetal, 0.012);
      seg(a, b, 0.0075, 0.0075, M.arm, 0.012);
      pin(a, 0.014, 0.012);
      pin(b, 0.014, 0.012);
    };
    pis(new V3(0.05, -0.075, 0), new V3(0.31, -0.085, 0));
    pis(new V3(0.42, -0.08, 0), new V3(0.86, LE(0.86) - 0.07, 0));
    const rod = (a, b) => {
      seg(a, b, 0.006, 0.006, M.arm, 0.018);
      pin(a, 0.011, 0.018);
      pin(b, 0.011, 0.018);
    };
    rod(new V3(0.36, 0.05, 0), new V3(0.92, LE(0.92) + 0.045, 0));
    rod(new V3(0.92, LE(0.92) + 0.045, 0), new V3(1.32, LE(1.32) + 0.03, 0));
    // the surface: 10 separate glass feather blades fanned from the arm, longest at the tip, overlapping at the root
    // and parting toward their tips; each with one central vein and fine side veins
    const NB = 8;
    for (let k = 0; k < NB; k++) {
      const f = k / (NB - 1);
      const rx0 = 0.16 + 1.12 * f;
      const root = new V3(rx0, LE(rx0) - 0.02, 0);
      const xt = W * (0.2 + 0.68 * f);
      const tip = k === NB - 1 ? new V3(W, LE(W), 0) : new V3(xt, -chord(xt / W) * 0.98, 0);
      const d = tip.clone().sub(root);
      const Lb = d.length();
      const wb = 0.3 - 0.08 * f;
      const CAMB = Math.tan(10 * D2R) / wb;
      const TW = 9 * D2R;
      const zf = (x, y) => CAMB * x * x + x * Math.tan(TW * (y / Lb));
      const g0 = (y) => Math.pow(Math.sin(Math.PI * Math.pow(Math.min(0.995, y / Lb), 0.8)), 0.6);
      const hwR = (y) => wb * 0.55 * g0(y);
      const hwL = (y) => wb * 0.45 * g0(y);
      const NY = 28;
      const NX = 8;
      const pos = [];
      const idx = [];
      for (let iy = 0; iy <= NY; iy++) {
        const y = (Lb * iy) / NY;
        for (let ix = 0; ix <= NX; ix++) {
          const u = -1 + (2 * ix) / NX;
          const x = u < 0 ? u * hwL(y) : u * hwR(y);
          pos.push(x, y, zf(x, y));
        }
      }
      for (let iy = 0; iy < NY; iy++)
        for (let ix = 0; ix < NX; ix++) {
          const a = iy * (NX + 1) + ix;
          idx.push(a, a + 1, a + NX + 2, a, a + NX + 2, a + NX + 1);
        }
      const bladeGeo = new THREE.BufferGeometry();
      bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      bladeGeo.setIndex(idx);
      bladeGeo.computeVertexNormals();
      const bg = grp(g, root.x, root.y, -0.03 + 0.011 * k);
      bg.rotation.z = Math.atan2(d.y, d.x) - Math.PI / 2;
      clear.push(put(bg, bladeGeo, M.membrane));
      const halfW = hwR;
      const V = [];
      const nv = Math.max(4, Math.round(Lb / 0.1));
      for (let jv = 1; jv < nv; jv++) {
        const y = (jv / nv) * Lb * 0.92;
        for (const sgn of [1, -0.82]) {
          const w = halfW(Math.min(Lb * 0.97, y + 0.05)) * sgn;
          const mx = w * 0.5;
          const my = y + Math.abs(w) * 0.45;
          V.push([0, y, mx, my], [mx, my, w * 0.92, my + Math.abs(w) * 0.25], [mx, my, w * 0.6, my + Math.abs(w) * 0.7]);
        }
      }
      lines(bg, V.flatMap(([x0, y0, x1, y1]) => [[x0, y0, zf(x0, y0) + 0.002], [x1, y1, zf(x1, y1) + 0.002]]), M.vein);
      const onB = (x, y, dz = 0.001) => new V3(x, y, zf(x, y) + dz);
      put(bg, tube([0, 0.25, 0.5, 0.75, 0.96].map((f2) => onB(0, Lb * f2)), 0.0045, 32, 6), M.rim);
      const outline = [];
      for (let iy = 0; iy <= NY; iy++) outline.push(onB(hwR((Lb * iy) / NY), (Lb * iy) / NY, 0));
      for (let iy = NY - 1; iy > 0; iy--) outline.push(onB(-hwL((Lb * iy) / NY), (Lb * iy) / NY, 0));
      put(bg, tube(outline, 0.009 * wb, 160, 6, true), M.rimHot);
    }
    {
      const le = [];
      for (let k = 0; k <= 30; k++) {
        const x = 1.3 + ((W - 1.3) * k) / 30;
        le.push(new V3(x, LE(x), 0.004));
      }
      put(g, tube(le, 0.014, 60, 12), M.rimHot);
    }
    g.userData.side = side;
    return g;
  };
  // sides: near (+z) and far (mirrored); each a shoulder group whose wing turns by sweep and lift
  // the mount, the same on both sides: a ball joint on the top-back of the chest, behind the head, seen through a
  // gap in the plates; the wing's arm grows out of it
  const wings = [1, -1].map((s) => {
    const side = new THREE.Group();
    side.scale.z = s;
    body.add(side);
    const [bp, bn] = at(sSh, aSh, 0.93);
    const mount = grp(side, bp.x, bp.y, bp.z);
    put(mount, new THREE.SphereGeometry(0.06, 32, 20), M.arm);
    const sock = grp(mount);
    faceTo(sock, bn);
    put(sock, zr(ring(-0.04, 0.0, 0.055, 0.082, 0.006, {segs: 40})), M.gunmetal);
    put(sock, zr(ring(0.0, 0.007, 0.062, 0.084, 0.002, {segs: 40})), M.amber);
    const shoulder = grp(side, bp.x, bp.y, bp.z);
    const wing = buildWing(s);
    shoulder.add(wing);
    ex(shoulder, [0, 0.35, 1], 0.55, 0.15, 0.7);
    return {side, shoulder, wing, mount};
  });
  anchor('wing', wings[0].wing, 1.4, -0.2, 0.02);
  anchor('arm', wings[0].wing, 0.62, 0.0, 0.06);
  anchor('shoulder', wings[0].mount, 0, 0, 0.07);
  const basis = new THREE.Matrix4();
  const orientWing = (wing, sweepDeg, liftDeg, twistDeg = 0) => {
    const ph = sweepDeg * D2R;
    const th = liftDeg * D2R;
    const d = new V3(Math.sin(ph) * Math.cos(th), Math.sin(th), Math.cos(ph) * Math.cos(th));
    const c = new V3(0, -1, 0).addScaledVector(d, d.y).normalize();
    c.applyAxisAngle(d, twistDeg * D2R);
    const y = c.clone().negate();
    const z = new V3().crossVectors(d, y);
    basis.makeBasis(d, y, z);
    wing.quaternion.setFromRotationMatrix(basis);
  };

  // ================================================================ glass tail fan
  const tail = grp(body, fr(0).C.x, fr(0).C.y, 0);
  const TF = 9;
  const FL = 0.76;
  const leaf = new THREE.Shape();
  leaf.moveTo(0, 0);
  leaf.bezierCurveTo(0.075, 0.18 * FL, 0.115, 1.0 * FL, 0, FL);
  leaf.bezierCurveTo(-0.115, 1.0 * FL, -0.075, 0.18 * FL, 0, 0);
  const leafGeo = new THREE.ShapeGeometry(leaf, 16);
  const TR = 0.04; // feather roots sit inside the rump
  for (let i = 0; i < TF; i++) {
    const ang = (-38 + (76 * i) / (TF - 1) - 12) * D2R; // fanned down
    const f = grp(tail);
    f.rotation.z = Math.PI + ang;
    f.position.z = 0.012 * (4 - Math.abs(i - 4));
    const lf = put(f, leafGeo, M.tailFilm, 0, TR, 0);
    clear.push(lf);
    const V = [[0, TR, 0.002, 0, TR + FL * 0.96, 0.002]];
    for (let j = 1; j <= 6; j++) {
      const y = TR + (j / 7) * FL * 0.9;
      const w = 0.055 * Math.sin(Math.PI * (j / 7.5));
      V.push([0, y, 0.002, w, y + 0.06, 0.002], [0, y, 0.002, -w, y + 0.06, 0.002]);
    }
    lines(f, V.map((a) => [a.slice(0, 3), a.slice(3)]).flat(), M.veinTail);
    const rim = [];
    for (let k = 0; k <= 40; k++) {
      const p = leaf.getPoint(k / 40);
      rim.push(new V3(p.x, p.y + TR, 0));
    }
    put(f, tube(rim, 0.0035, 80, 5, true), M.rim);
    ex(f, [Math.sin(ang) * -1, -1, 0], 0.25 + 0.04 * Math.abs(i - 4), 0.2, 0.7);
  }
  ex(tail, [-0.3, -1, 0], 0.4, 0.15, 0.6);
  anchor('tail', tail, 0, -0.45, 0.04);

  // screws, one instanced mesh per parent
  const screwGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.006, 8).rotateX(Math.PI / 2);
  const byParent = new Map();
  for (const s of screwM) {
    if (!byParent.has(s.parent)) byParent.set(s.parent, []);
    byParent.get(s.parent).push(s.m);
  }
  for (const [parent, ms] of byParent) {
    const im = new THREE.InstancedMesh(screwGeo, M.gunmetal, ms.length);
    ms.forEach((m, i) => im.setMatrixAt(i, m));
    parent.add(im);
  }

  // ================================================================ pose
  const pose = ({explode = 0, flap = 0, flapAmp = 0, t = 0, spinT = t, sweepN = null, sweepF = null, lift = 15, twist = 0, wingOut = 0, wingFlip = 0, spread = 0} = {}) => {
    const e = Math.min(1, Math.max(0, explode));
    for (const it of X) {
      const k = ss(it.s, it.f, e);
      it.obj.position.copy(it.home).addScaledVector(it.dir, it.dist * k);
    }
    for (const sp of spinners) sp.obj.rotation.z = spinT * sp.rate;
    const base = Math.sin(flap) * flapAmp;
    const sN = sweepN ?? -64 * spread + base * (1 - spread);
    const sF = sweepF ?? 64 * spread + base * (1 - spread);
    orientWing(wings[0].wing, sN, lift + Math.cos(flap) * flapAmp * 0.15, twist);
    orientWing(wings[1].wing, sF, lift + Math.cos(flap) * flapAmp * 0.15, twist);
    wings[0].shoulder.position.y += wingOut * 0.3;
    wings[0].shoulder.position.z += wingOut * 0.9;
    if (wingFlip > 0) wings[0].wing.rotateX(Math.PI * 2 * wingFlip);
  };
  pose();
  return {root, body, pose, clear, M, anchors, wings, torso, head, tail, turb};
}
