// Shared shape helpers lifted from the alligator r5 build (alligator-shared/alligator.js): profile tables, swept
// super-ellipse surfaces, patch slabs, the r5 materials (keep flag on the mechanism), and the plate / rivet / kitbash
// builder used under every shell.
import * as THREE from 'three';
import {V3, D2R, gearGeo, rbox, cylX, tube, put, aimX} from '../wasp-shared/parts.js';
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
export {rng, clamp, lerp, ss, table, se, makeSurf, patchGeo};
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

export function makeBuilder(M, R, body) {
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
  return {clear, anchors, anchor, grp, glassy, lines, edge, cosU, RIV, rivet, plate, deg, face, finGeo, placeOn, kitPart, kitOn, hoop,
    rivetMeshes() {
    const rg = new THREE.SphereGeometry(0.0062, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5);
    for (const [parent, list] of RIV) {
      const im = new THREE.InstancedMesh(rg, M.rivet, list.length);
      list.forEach((m, i) => im.setMatrixAt(i, m));
      im.castShadow = false;
      parent.add(im);
    }
    }};
}
