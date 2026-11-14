// The alligator's walk, adapted from the tarantula's (tarantula-shared/gait.js) to four legs: a body path integrated
// from velocity keys and a diagonal trot (near-front + far-hind against far-front + near-hind). Pure functions of t, no
// three.js. World: y up; a yaw ψ turns the body's +x to (cos ψ, 0, -sin ψ), as three.js rotation.y does.
// keys: [[t, speed, yawRate°/s], ...] eased between; the path is moved so that at tRef the body stands at the origin
// facing +x. homes(l) -> [x, y, z] the foot's rest spot in the body frame; floorY the floor.
const smoother = (x) => {
  const u = Math.min(1, Math.max(0, x));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
// legs: 0 near front, 1 far front, 2 near hind, 3 far hind
const GA = [0, 3];
const GB = [1, 2];
export const STRIDE_HZ = 1.4;
const SWING = 0.42 / STRIDE_HZ;
const LIFT = 0.1;

export function buildGait({keys, duration, homes, floorY, tRef = 2.8, t0 = -1.5}) {
  const HZ = 240;
  const N = Math.ceil((duration - t0) * HZ) + 2;
  const at = (t) => {
    if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
    for (let i = 0; i < keys.length - 1; i++) {
      const [ta, va, wa] = keys[i];
      const [tb, vb, wb] = keys[i + 1];
      if (t <= tb) {
        const k = smoother((t - ta) / (tb - ta));
        return [va + (vb - va) * k, wa + (wb - wa) * k];
      }
    }
    const l = keys[keys.length - 1];
    return [l[1], l[2]];
  };
  const X = new Float64Array(N);
  const Z = new Float64Array(N);
  const Y = new Float64Array(N);
  const RATE = new Float64Array(N);
  const PH = new Float64Array(N);
  const move = (t) => {
    const [v, w] = at(t);
    return Math.min(1, Math.abs(v) / 0.5 + Math.abs(w) / 40);
  };
  for (let i = 1; i < N; i++) {
    const t = t0 + (i - 0.5) / HZ;
    const [v, w] = at(t);
    const ym = Y[i - 1] + (w * Math.PI) / 180 / HZ / 2;
    X[i] = X[i - 1] + (v * Math.cos(ym)) / HZ;
    Z[i] = Z[i - 1] - (v * Math.sin(ym)) / HZ;
    Y[i] = Y[i - 1] + (w * Math.PI) / 180 / HZ;
    RATE[i] = STRIDE_HZ * Math.max(move(t), move(t - 0.3), move(t - 0.6));
    PH[i] = PH[i - 1] + RATE[i] / HZ;
  }
  const idx = (t) => Math.min(N - 1.000001, Math.max(0, (t - t0) * HZ));
  const samp = (A, t) => {
    const f = idx(t);
    const i = Math.floor(f);
    return A[i] + (A[i + 1] - A[i]) * (f - i);
  };
  const rx = samp(X, tRef);
  const rz = samp(Z, tRef);
  const ry = samp(Y, tRef);
  const c = Math.cos(-ry);
  const s = Math.sin(-ry);
  const pathAt = (t) => {
    const x = samp(X, t) - rx;
    const z = samp(Z, t) - rz;
    return {x: x * c + z * s, z: -x * s + z * c, yaw: samp(Y, t) - ry};
  };
  const toWorld = (p, lx, lz) => [p.x + lx * Math.cos(p.yaw) + lz * Math.sin(p.yaw), p.z - lx * Math.sin(p.yaw) + lz * Math.cos(p.yaw)];

  const swings = Array.from({length: 4}, () => []);
  for (let i = 1; i < N; i++) {
    const t = t0 + i / HZ;
    for (const [grp, off] of [
      [GA, 0],
      [GB, 0.5],
    ]) {
      if (Math.floor(PH[i] - off) > Math.floor(PH[i - 1] - off) && PH[i] - off > 0) {
        for (const l of grp) {
          const S = swings[l];
          if (S.length && S[S.length - 1].t1 > t - 0.04) continue;
          S.push({t0: t, t1: t + SWING});
        }
      }
    }
  }
  const start = Array.from({length: 4}, (_, l) => {
    const h = homes(l);
    return toWorld(pathAt(t0), h[0], h[2]);
  });
  swings.forEach((S, l) => {
    let from = start[l];
    const h = homes(l);
    for (const sw of S) {
      sw.from = from;
      sw.to = toWorld(pathAt(sw.t1 + 0.12), h[0], h[2]);
      from = sw.to;
    }
  });
  const footWorld = (l, t) => {
    let planted = start[l];
    for (const sw of swings[l]) {
      if (sw.t0 > t) break;
      if (t < sw.t1) {
        const q = (t - sw.t0) / (sw.t1 - sw.t0);
        const e = smoother((q - 0.04) / 0.9);
        const y = Math.pow(Math.sin(Math.PI * q), 1.1);
        return [sw.from[0] + (sw.to[0] - sw.from[0]) * e, floorY + LIFT * y, sw.from[1] + (sw.to[1] - sw.from[1]) * e, y];
      }
      planted = sw.to;
    }
    return [planted[0], floorY, planted[1], 0];
  };
  /** A foot in the body frame of the path at t, given the body's height y and its pitch and roll (radians). */
  const footLocal = (l, t, body = {y: 0, pitch: 0, roll: 0}) => {
    const p = pathAt(t);
    const f = footWorld(l, t);
    let x = f[0] - p.x;
    let y = f[1] - body.y;
    let z = f[2] - p.z;
    const cy = Math.cos(-p.yaw);
    const sy = Math.sin(-p.yaw);
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    const cr = Math.cos(-body.roll);
    const sr = Math.sin(-body.roll);
    [y, z] = [y * cr - z * sr, y * sr + z * cr];
    const cp = Math.cos(-body.pitch);
    const sp = Math.sin(-body.pitch);
    [x, y] = [x * cp - y * sp, x * sp + y * cp];
    return [x, y, z, f[3]];
  };
  return {pathAt, footWorld, footLocal, lifted: (l, t) => footWorld(l, t)[3], rateAt: (t) => samp(RATE, t), phaseAt: (t) => samp(PH, t), velAt: at, swings};
}
