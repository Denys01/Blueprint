// TROCHION TR-4, the robotic hummingbird filmed on the wasp's 10-second choreography (tour_10.js here), in r9's
// materials, light and bloom: a cold blue rim straight from behind the camera, a warm key from camera-left, subtle
// bloom on the lit glass, the floor's bottom stop lifted a touch so the soft shadow reads. The page is the night
// console with the hummingbird's cards (wing beat, turbine, wing servos, battery).
import * as THREE from 'three';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {createConsole} from '../night/console.js';
import {makeCursor, makeLabels, PAPER_NIGHT, retint, SHIFT} from '../night/look.js';
import {buildBird} from './bird.js';
import {createStage, PAPER} from '../wasp-shared/stage.js';
import {AMP, make10Tour} from './tour_10.js';

const D2R = Math.PI / 180;
Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});

const PAGE = {
  name: 'Trochion',
  code: 'TR-4',
  title: 'Robotic Hummingbird, Taken Apart',
  date: '2026-11-10',
  nav: [['overview', 'Overview'], ['eye', 'Eye'], ['beak', 'Beak'], ['turbine', 'Turbine'], ['wing', 'Wings'], ['tail', 'Tail fan'], ['exploded', 'Teardown'], ['hero', 'Release']],
  pills: [['eye', 'Eye'], ['beak', 'Beak'], ['turbine', 'Turbine'], ['wing', 'Wings'], ['tail', 'Tail fan'], ['exploded', 'Teardown'], ['hero', 'Release']],
  sub: {
    overview: ['Wingspan 2 × 140 mm', '8 glass blades a wing'],
    eye: ['Black lens, amber bezel', 'Ø 20 mm'],
    beak: ['Steel needle', '0.68 of the body'],
    turbine: ['20 blades', 'Chest intake'],
    wing: ['8 glass feathers', 'Shoulder: quick release'],
    tail: ['9 glass feathers', 'Fanned 76°'],
    exploded: ['Every part apart', 'Turntable 360°'],
    hero: ['Wing beat 2.2 Hz', 'Rising'],
  },
  cards: [
    {k: 'Wing beat', kind: 'wave', unit: 'Hz'},
    {k: 'Turbine', kind: 'bar', unit: 'k rpm'},
    {k: 'Wing servos', kind: 'bars', n: 6},
    {k: 'Battery', kind: 'bar', unit: '%'},
  ],
};
const TEXT = {
  'WING BLADES': ['Wing blades', '8 glass feathers'],
  'WING ARM': ['Wing arm', '3 joints, 2 pistons'],
  'SHOULDER BALL': ['Shoulder ball', 'quick release'],
  'OPTIC EYE': ['Optic eye', 'Ø 20 mm'],
  BEAK: ['Beak', 'steel needle'],
  'CHEST TURBINE': ['Chest turbine', '20 blades'],
  WING: ['Wing', '8 glass blades'],
  'TAIL FAN': ['Tail fan', '9 glass feathers'],
};
const STATUS = {DIVING: 'Swooping in', 'SLOW-MO': 'Slow motion', RISING: 'Rising', HOVER: 'Hovering', TEARDOWN: 'Teardown', REASSEMBLY: 'Reassembly', 'WING OFF': 'Wing off'};

export function makeHum(TL) {
  return async ({canvas, capture}) => {
    const app = document.getElementById('app');
    const b = buildBird();
    b.root.rotation.order = 'YXZ';
    // the bird at rest in the picture's spread: its centre, its size, and where the pulled-out wing hangs
    b.pose({spread: 1, wingOut: 1});
    b.root.updateMatrixWorld(true);
    const wa = b.anchors.wing;
    const WING = wa.obj.localToWorld(wa.at.clone());
    b.pose({spread: 1});
    b.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(b.root);
    const c = box.getCenter(new THREE.Vector3());
    // K: the wasp's opening distance (7.9) becomes the one where the bird fills ~85 % of the width from the opening side
    const tanH = Math.tan(15 * D2R) * (16 / 9);
    const wProj = (box.max.x - box.min.x) * Math.cos(46 * D2R) + (box.max.z - box.min.z) * Math.sin(46 * D2R);
    const K = wProj / 0.85 / (2 * tanH) / 7.9;
    const FLOOR = box.min.y - 0.5;
    const T = make10Tour(TL, {K, FLOOR, C: c.toArray(), WING: WING.toArray()});
    const st = createStage({canvas, floorY: FLOOR});
    st.addBee(b);
    retint(b.root);
    const rim = new THREE.DirectionalLight('#5d9be6', 4.5);
    const warm = new THREE.DirectionalLight('#CC774B', 2.2);
    st.scene.add(rim, rim.target, warm, warm.target);
    // a cap on the scene's light before the bloom: a pixel brighter than 1.5 is scaled down keeping its hue, so stacked
    // glass close to the lens (the reassembly push-in) can never flash white
    const cap = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, uCap: {value: 1.5}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float uCap; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float m = max(max(c.r, c.g), max(c.b, 1e-4)); gl_FragColor = vec4(c.rgb * min(1.0, uCap / m), c.a); }',
    });
    st.composer.insertPass(cap, st.composer.passes.length - 1);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.15, 0.4, 1.2);
    st.composer.insertPass(bloom, st.composer.passes.length - 1);
    const ui = createConsole(app, PAGE);
    const cursorAt = makeCursor(ui, T.SCRIPT);
    const labels = makeLabels(st, b.anchors, TEXT);
    const fit = () => {
      const k = Math.min(innerWidth / 1600, innerHeight / 900);
      app.style.transform = `scale(${k})`;
    };
    const resize = () => {
      fit();
      st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    };
    resize();
    window.HUM = {st, b, T, K};
    return {
      resize,
      render(t) {
        const s = T.stateAt(t);
        b.pose({explode: s.explode, flap: s.flap, flapAmp: s.amp, spread: 1 - s.amp / AMP, t: s.spinT, wingOut: s.wingOut, wingFlip: s.wingFlip});
        retint(b.root);
        const f = s.flight;
        b.root.position.copy(f.pos);
        b.root.rotation.set(f.roll * D2R, f.yaw * D2R, f.pitch * D2R);
        const cm = s.cam;
        const az = cm.az * D2R;
        const el = cm.el * D2R;
        // the lights ride with the camera: the rim straight from behind, the warm key from camera-left
        const tgt = new THREE.Vector3(cm.tx, cm.ty, cm.tz);
        const cd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
        rim.position.copy(tgt).addScaledVector(cd, -8).add(new THREE.Vector3(0, 0.3, 0));
        rim.target.position.copy(tgt);
        warm.position.copy(tgt).addScaledVector(right, -7).addScaledVector(cd, 3).add(new THREE.Vector3(0, 2, 0));
        warm.target.position.copy(tgt);
        rim.target.updateMatrixWorld();
        warm.target.updateMatrixWorld();
        st.frame({...cm, az, el, sx: cm.sx + SHIFT[0], sy: cm.sy + SHIFT[1]}, {guides: s.guides});
        const tel = T.telemetry(t, s);
        const v = s.view;
        const opening = Math.max(s.open?.[v] ?? 0, v === 'wing' ? s.wingOut : 0);
        ui.update({
          time: t,
          dur: TL.duration,
          status: STATUS[tel.status] ?? tel.status,
          cards: [
            {v: tel.freq.toFixed(1), wave: tel.stroke.map((p) => p[0] / AMP)},
            {v: (24 * tel.turbine).toFixed(1), bar: tel.turbine},
            {bars: tel.servos},
            {v: Math.round(tel.battery * 100), bar: tel.battery},
          ],
          apart: Math.round(Math.max(opening, s.explode) * 100),
          view: v === 'intro' ? 'overview' : v,
          callouts: labels(tel.labelSet),
          cursor: cursorAt(t),
        });
        return {};
      },
    };
  };
}

export const runHum = (TL, title = 'robohum-demo') =>
  runSim({duration: TL.duration, fps: 60, theme: 'light', hud: {enabled: false, title, subtitle: ''}, director: {enabled: false}, watermark: ''}, makeHum(TL));
