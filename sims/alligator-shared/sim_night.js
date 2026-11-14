// PALUDOR AG-2, the robotic alligator's 10-second cut (tour_10.js, the shark's choreography) in the approved still's
// (round 5's) materials, light and bloom: a cold blue rim from behind, a warm key from camera-left, bloom 0.15 /
// threshold 1.2, the floor shadow. The lights ride with the camera as they sat in the still. A cap before the bloom
// scales any pixel brighter than 1.5 down, so the glass stacking up in the teardown or the reassembly never flashes.
// The scene is mirrored across x as the still was shot (head on the left). The page is the night console with the
// alligator's cards: gait, bite force, battery.
import * as THREE from 'three';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {createConsole} from '../night/console.js';
import {makeCursor, makeLabels, PAPER_NIGHT, retint, SHIFT} from '../night/look.js';
import {createStage, PAPER} from '../shark-shared/stage.js';
import {buildAlligator, FLOOR_Y} from './alligator.js';
import {FOV, restFrame} from './fit.js';
import {make10Tour} from './tour_10.js';

const D2R = Math.PI / 180;
Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});

const PAGE = {
  name: 'Paludor',
  code: 'AG-2',
  title: 'Robotic Alligator, Taken Apart',
  date: '2026-11-10',
  nav: [['overview', 'Overview'], ['eye', 'Eye'], ['jaw', 'Jaws'], ['exploded', 'Teardown'], ['window', 'Window'], ['hero', 'Lunge']],
  pills: [['eye', 'Eye'], ['jaw', 'Jaws'], ['exploded', 'Teardown'], ['window', 'Window'], ['hero', 'Lunge']],
  sub: {
    overview: ['Length 3.9 m, 4-leg trot', 'Glass teeth, glass crest'],
    eye: ['Black lens, amber ring', 'Hooded brow socket'],
    jaw: ['Jaw drops, teeth fly out', 'Lit palate, hinge pistons'],
    exploded: ['Scutes, plates, jaws, legs, window', 'Turntable 180°'],
    window: ['Glass dome lifts off', 'Brass gears keep turning'],
    hero: ['Wind-up, jaws wide', 'Lunge at the lens'],
  },
  cards: [
    {k: 'Gait', kind: 'wave', unit: 'Hz'},
    {k: 'Bite force', kind: 'bar', unit: 'kN'},
    {k: 'Battery', kind: 'bar', unit: '%'},
  ],
};
const STATUS = {WALKING: 'Walking in', STANDING: 'Standing', 'EYE OPEN': 'Eye open', 'JAW DROPPED': 'Jaw dropped', 'WINDOW OPEN': 'Window open', TEARDOWN: 'Teardown', REASSEMBLY: 'Reassembly', 'WIND-UP': 'Winding up', LUNGE: 'Lunging', 'JAWS OPEN': 'Jaws open'};

export function makeGator(TL) {
  const FILM = TL.film ?? TL.duration;
  const SPEED = TL.duration / FILM;
  return async ({canvas, capture}) => {
    const app = document.getElementById('app');
    const a = buildAlligator();
    const A = restFrame(a);
    const T = make10Tour(TL, A);
    a.root.rotation.order = 'YXZ';
    a.root.scale.x = -1;
    const m = -1;
    const st = createStage({canvas, floorY: FLOOR_Y, span: 3.2});
    st.camera.fov = FOV;
    st.camera.updateProjectionMatrix();
    st.addBody(a);
    retint(a.root);
    const rim = new THREE.DirectionalLight('#5d9be6', 4.2);
    const warm = new THREE.DirectionalLight('#d9894f', 3.6);
    st.scene.add(rim, rim.target, warm, warm.target);
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
    const labels = makeLabels(st, a.anchors);
    const fit = () => (app.style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`);
    const resize = () => {
      fit();
      st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    };
    resize();
    window.GATOR = {st, a, T, A};
    const up = new THREE.Vector3(0, 1, 0);
    return {
      resize,
      render(tf) {
        const t = tf * SPEED;
        const s = T.stateAt(t);
        a.pose(s);
        retint(a.root);
        const f = s.flight;
        a.root.position.set(m * f.pos.x, 0, f.pos.z);
        a.root.rotation.set(0, m * f.yaw * D2R, 0);
        const c = s.cam;
        const az = m * c.az * D2R;
        const el = c.el * D2R;
        const tgt = new THREE.Vector3(m * c.tx, c.ty, c.tz);
        // the lights where the still had them, relative to the camera: the rim from straight behind and above, the warm
        // key from the camera's side, a little left and above
        const cd = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
        const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
        rim.position.copy(tgt).addScaledVector(cd, -8).addScaledVector(up, 1.6);
        rim.target.position.copy(tgt);
        warm.position.copy(tgt).addScaledVector(cd, 7.96).addScaledVector(right, -1.38).addScaledVector(up, 2.17);
        warm.target.position.copy(tgt);
        rim.target.updateMatrixWorld();
        warm.target.updateMatrixWorld();
        st.frame({tx: tgt.x, ty: tgt.y, tz: tgt.z, az, el, d: c.d, sx: m * c.sx + SHIFT[0], sy: c.sy + SHIFT[1]}, {guides: s.guides});
        const tel = T.telemetry(t, s);
        const v = s.view;
        ui.update({
          time: tf,
          dur: FILM,
          status: STATUS[tel.status] ?? tel.status,
          cards: [
            {v: tel.freq.toFixed(1), wave: tel.wave},
            {v: tel.bite.toFixed(1), bar: tel.bite / 14},
            {v: Math.round(tel.battery * 100), bar: tel.battery},
          ],
          apart: Math.round(Math.max(s.open?.[v] ?? 0, s.explode) * 100),
          view: v === 'intro' ? 'overview' : v,
          callouts: labels(tel.labelSet),
          cursor: cursorAt(t),
        });
        return {};
      },
    };
  };
}

export const runGator = (TL, title = 'alligator-demo') =>
  runSim({duration: TL.film ?? TL.duration, fps: 60, theme: 'light', hud: {enabled: false, title, subtitle: ''}, director: {enabled: false}, watermark: ''}, makeGator(TL));
