// CHROMIRA CM-1, the robotic chameleon's 10-second cut (its own script): frame 0 on the whole animal, then the eye
// turret, the tongue launcher, the casque, the tail, the teardown in layers and the strike at the lens, ending on the
// chameleon. 12.4 s of scene in 10 s. Tour: ../chameleon-shared/tour_10.js, sim: ../chameleon-shared/sim_night.js.
import {runChameleon} from '../chameleon-shared/sim_night.js';
import TL from './timeline.json';

runChameleon(TL, 'chameleon-demo');
