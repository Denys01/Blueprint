// CHROMIRA CM-1, the robotic chameleon's 10-second cut (tour_10.js) in the approved still's (round 4's) materials,
// light and bloom: a cold blue rim from behind, a warm key from camera-left, bloom 0.15 / threshold 1.4, the floor
// shadow. The lights ride with the camera as they sat in the still. A cap before the bloom scales any pixel brighter
// than 1.4 down, so glass stacking up in the teardown or the tongue at the lens never flashes. Mirrored across x as
// the still was shot (head on the left). The page is the night console with the chameleon's cards: eye turn, tongue
// speed, battery.
import * as THREE from 'three';
import {ShaderPass} from 'three/examples/jsm/postprocessing/ShaderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {runSim} from '../kit/runtime.js';
import {createConsole} from '../night/console.js';
import {makeCursor, makeLabels, PAPER_NIGHT, retint, SHIFT} from '../night/look.js';
import {createStage, PAPER} from '../shark-shared/stage.js';
import {buildChameleon, FLOOR_Y} from './chameleon.js';
import {FOV, make10Tour, restFrame} from './tour_10.js';

const D2R = Math.PI / 180;
Object.assign(PAPER, PAPER_NIGHT, {low: '#0b1424'});

const PAGE = {
  name: 'Chromira',
  code: 'CM-1',
  title: 'Robotic Chameleon, Taken Apart',
  date: '2026-11-10',
  nav: [['overview', 'Overview'], ['eye', 'Eye turret'], ['tongue', 'Tongue'], ['casque', 'Casque'], ['tail', 'Tail'], ['exploded', 'Teardown'], ['hero', 'Strike']],
  pills: [['eye', 'Eye'], ['tongue', 'Tongue'], ['casque', 'Casque'], ['tail', 'Tail'], ['exploded', 'Teardown'], ['hero', 'Strike']],
  sub: {
    overview: ['Body 0.4 m, tail 0.58 m', 'Grips a steel branch'],
    eye: ['Turret turns 180° alone', 'Lens rings unscrew'],
    tongue: ['Spring launcher', 'Glass tongue, droplet tip'],
    casque: ['Glass helmet lifts off', 'Gears underneath'],
    tail: ['Spiral uncoils', 'And coils back'],
    exploded: ['Crest, plates, head, legs', 'In layers'],
    hero: ['Locks on the lens', 'Fires the tongue'],
  },
  cards: [
    {k: 'Eye turn', kind: 'wave', unit: '°'},
    {k: 'Tongue speed', kind: 'bar', unit: 'm/s'},
    {k: 'Battery', kind: 'bar', unit: '%'},
  ],
};
const STATUS = {GRIPPING: 'Gripping', 'EYE TURNING': 'Eye turning', 'TONGUE FIRED': 'Tongue fired', 'CASQUE OPEN': 'Casque open', 'TAIL UNCOILED': 'Tail uncoiled', TEARDOWN: 'Teardown', REASSEMBLY: 'Reassembly', 'LOCKING ON': 'Locking on', STRIKE: 'Strike'};

export function makeChameleon(TL) {
  const FILM = TL.film ?? TL.duration;
  const SPEED = TL.duration / FILM;
  return async ({canvas, capture}) => {
    const app = document.getElementById('app');
    const a = buildChameleon();
    const A = restFrame(a);
    const T = make10Tour(TL, A);
    a.root.scale.x = -1;
    const m = -1;
    const st = createStage({canvas, floorY: FLOOR_Y, span: 2.8});
    st.camera.fov = FOV;
    st.camera.updateProjectionMatrix();
    st.addBody(a);
    retint(a.root);
    const rim = new THREE.DirectionalLight('#5d9be6', 4.2);
    const warm = new THREE.DirectionalLight('#d9894f', 3.4);
    st.scene.add(rim, rim.target, warm, warm.target);
    const cap = new ShaderPass({
      uniforms: {tDiffuse: {value: null}, uCap: {value: 1.4}},
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform sampler2D tDiffuse; uniform float uCap; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); float m = max(max(c.r, c.g), max(c.b, 1e-4)); gl_FragColor = vec4(c.rgb * min(1.0, uCap / m), c.a); }',
    });
    st.composer.insertPass(cap, st.composer.passes.length - 1);
    const bloom = new UnrealBloomPass(new THREE.Vector2(1920, 1080), 0.15, 0.4, 1.4);
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
    window.CHAM = {st, a, T, A};
    const up = new THREE.Vector3(0, 1, 0);
    return {
      resize,
      render(tf) {
        const t = tf * SPEED;
        const s = T.stateAt(t);
        a.pose(s);
        retint(a.root);
        const c = s.cam;
        const az = m * c.az * D2R;
        const el = c.el * D2R;
        const tgt = new THREE.Vector3(m * c.tx, c.ty, c.tz);
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
            {v: Math.round(tel.eye).toString(), wave: tel.wave},
            {v: tel.speed.toFixed(1), bar: Math.min(1, tel.speed / 8)},
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

export const runChameleon = (TL, title = 'chameleon-demo') =>
  runSim({duration: TL.film ?? TL.duration, fps: 60, theme: 'light', hud: {enabled: false, title, subtitle: ''}, director: {enabled: false}, watermark: ''}, makeChameleon(TL));
