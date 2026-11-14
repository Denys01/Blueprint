"""Score for CHROMIRA CM-1, the robotic chameleon's 10-second cut (entry chameleon-demo, tour_10.js), mixed like the
alligator's (alligator-shared/score_demo.py): a bed in D minor (Dm9, Bbmaj7, Gm9, A7sus at 92 bpm) at one level the whole
way, a quiet click on every button press, and for every act short quiet accents on its own moves: thread ticks as the
eye turret swings and its lens rings unscrew; a spring release, a glass whoosh out and a soft snap back for the tongue;
a glass lift and a seat click for the casque; a ratchet as the tail uncoils and again as it coils back; a whoosh into
the teardown and three clicks as it seats; a rising air as it locks on the lens, then the strike and its return.
No drones.

    python run_sfx.py sims/chameleon-shared/score_demo.py --timeline sims/chameleon-demo/score-film.json --out <wav>

The timeline is the cut's script in film seconds (score-film.json, scene times / speed 1.24); the offsets inside each
act come from tour_10.js in scene seconds and are scaled the same way, so every cue lands on its frame.
"""

import os

from sfx.score_kit import airy, bed, chords, hz, thud  # noqa: E402
from sfx.synth import blip, click, envelope, pad  # noqa: E402

TIMELINE = "../chameleon-demo/score-film.json"
OUT = os.environ.get("OUT", "chameleon-score.wav")
TARGET_LUFS = -14.0
SEED = 47

CHORDS = chords("Dm9:D3 F3 A3 C4 E4/D2", "Bbmaj7:Bb2 D3 F3 A3 D4/Bb1", "Gm9:G2 Bb2 D3 F3 A3/G1", "A7sus:A2 D3 E3 G3 C4/A1")
MOTIF = [(0.5, hz("A5")), (1.5, hz("F5")), (2.5, hz("E5"))]


def snap(mix, t, level=0.05, pan=0.0):
    mix.put(t, click(1500, 0.03), level, pan=pan)
    mix.put(t, thud(110, 0.06, 0.25), level * 0.5, pan=pan)


def fire(mix, t, level=1.0, pan=0.0):
    """The launcher: a spring release, a fast glass whoosh out."""
    mix.put(t - 0.02, click(900, 0.02), 0.03 * level, pan=pan)
    mix.put(t, thud(150, 0.05, 0.3), 0.03 * level, pan=pan)
    mix.put(t, airy(0.35, 700, 3200, 0.4), 0.03 * level, pan=pan)


def score(mix, tl):
    dur = tl["duration"]
    K = 1.0 / tl.get("speed", 1.0)  # scene seconds -> film seconds
    left, right, low, drums = bed(dur, 92, CHORDS, MOTIF, motif_voice="blip", kicks=(0, 2.5), snares=(1, 3), hats=8, swing=0.08, keys_vel=0.75, keys_lp=3600)
    mix.put_stereo(0, left, right, 0.13)
    mix.put(0, low, 0.13)
    mix.put(0, drums, 0.05)
    bar = 4 * 60 / 92
    changes = [(0.12 + b * bar, [f for f in CHORDS[b % len(CHORDS)][0][:4]]) for b in range(int(dur / bar) + 1)]
    pl, pr = pad(dur, changes, volume=envelope([(0, 0), (1.0, 1), (dur - 1.4, 1), (dur, 0)]), detune=0.8, tremolo=0.18, xfade=0.5)
    mix.put_stereo(0, pl, pr, 0.07)

    for e in tl["script"]:
        t0, act = e["t"], e["act"]
        at = lambda dt: t0 + dt * K  # noqa: E731
        mix.put(t0, click(2400, 0.025), 0.055, pan=0.45)
        if act == "eye":
            mix.put(at(0.15), airy(0.6, 900, 2000, 0.5), 0.012, pan=-0.2)
            for j, dt in enumerate((0.4, 0.55, 0.7, 0.85, 1.0, 1.15)):
                mix.put(at(dt), click(3200 - 160 * j, 0.018), 0.032, pan=-0.15)
            for j, dt in enumerate((1.5, 1.62, 1.74, 1.86)):
                mix.put(at(dt), click(2500 + 180 * j, 0.018), 0.028, pan=-0.15)
        elif act == "tongue":
            fire(mix, at(0.35), 1.0, pan=-0.2)
            mix.put(at(1.05), airy(0.4, 2600, 800, 0.4), 0.02, pan=-0.2)
            snap(mix, at(1.55), 0.05, pan=-0.1)
        elif act == "casque":
            mix.put(at(0.3), airy(0.8, 600, 2200, 0.6), 0.02, pan=0.1)
            for j in range(6):
                mix.put(at(0.5 + 0.12 * j), click(2700 + 50 * (j % 3), 0.012), 0.014, pan=0.1)
            mix.put(at(1.35), airy(0.35, 2000, 800, 0.5), 0.012, pan=0.1)
            mix.put(at(1.75), click(2100, 0.03), 0.05, pan=0.1)
        elif act == "tail":
            for j in range(12):
                mix.put(at(0.22 + 0.065 * j), click(1900 - 40 * j, 0.012), 0.022, pan=0.3)
            for j in range(10):
                mix.put(at(1.12 + 0.06 * j), click(1500 + 50 * j, 0.012), 0.02, pan=0.3)
            mix.put(at(1.72), thud(90, 0.06, 0.3), 0.03, pan=0.3)
        elif act == "exploded":
            mix.put(at(0.15), airy(1.3, 450, 2400, 0.7), 0.032, pan=-0.15)
            mix.put(at(0.2), blip(hz("D6"), 0.3, 0.1), 0.025)
        elif act == "assemble":
            mix.put(t0, airy(0.7, 2200, 600, 0.5), 0.02, pan=0.15)
            for j, dt in enumerate((0.3, 0.45, 0.6)):
                mix.put(at(dt), click(2000 + 300 * j, 0.03), 0.05, pan=-0.3 + 0.3 * j)
        elif act == "hero":
            mix.put(at(0.08), airy(0.6, 500, 1500, 0.5), 0.016, pan=0.2)
            fire(mix, at(0.72), 1.6, pan=0.0)
            mix.put(at(0.75), thud(60, 0.12, 0.5), 0.05)
            mix.put(at(1.32), airy(0.45, 2600, 700, 0.4), 0.022)
            snap(mix, at(1.77), 0.05)
