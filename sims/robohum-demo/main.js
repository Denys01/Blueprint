// TROCHION TR-4, the robotic hummingbird's 10-second cut (2026-11-10): the wasp demo's beats 1:1, scaled to the bird
// (swoop in, the wing pulled off and turned over, the slow-motion explode on a turntable, a rise in frame at the end).
// Tour: ../robohum-shared/tour_10.js, sim: ../robohum-shared/sim_night.js.
import {runHum} from '../robohum-shared/sim_night.js';
import TL from './timeline.json';

runHum(TL, 'robohum-demo');
