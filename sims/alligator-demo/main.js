// PALUDOR AG-2, the robotic alligator's 10-second cut (its own script, not pieces of a long film), on the shark demo's
// beats: the walk-in, the eye, the jaws dropping with their glass teeth, the explode on the turntable (eye, jaws, flank
// window, front legs, tail apart), the snap back, and the lunge at the lens with the jaws open as the exit, ending on
// the alligator. 12.2 s of scene in 10 s. Tour: ../alligator-shared/tour_10.js, sim: ../alligator-shared/sim_night.js.
import {runGator} from '../alligator-shared/sim_night.js';
import TL from './timeline.json';

runGator(TL, 'alligator-demo');
