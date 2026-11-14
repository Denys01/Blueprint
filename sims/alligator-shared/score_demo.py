"""Score for PALUDOR AG-2, the robotic alligator's 10-second cut (entry alligator-demo, tour_10.js), mixed like the
shark's (shark-shared/score.py): a bed in D minor (Dm9, Bbmaj7, Gm9, A7sus at 92 bpm: e-piano, bass, soft drums and a
pad on the same changes) at one level the whole way, a quiet click on every button press, and for every act short quiet
accents on its own moves (fix pass: a glass lift and gear ticks for the window beat, the lunge 0.85 s after HERO): soft footfalls through the walk-in and a snap as the jaw shuts at its end, thread ticks as
the lens screws out and back, a drop and a ripple of glass ticks as the teeth fly out and a snap as the jaw seats, a
whoosh into the teardown and three clicks as it seats again, a rising air on the wind-up and a rush and a low knock
for the lunge. No drones.

    python run_sfx.py sims/alligator-shared/score_demo.py --timeline sims/alligator-demo/score-film.json --out <wav>

The timeline is the cut's script in film seconds (score-film.json, scene times / speed 1.24); the offsets inside each
act come from tour_10.js in scene seconds and are scaled the same way, so every cue lands on its frame.
"""

import os

from sfx.score_kit import airy, bed, chords, hz, thud  # noqa: E402
from sfx.synth import blip, click, envelope, pad  # noqa: E402

TIMELINE = "../alligator-demo/score-film.json"
OUT = os.environ.get("OUT", "alligator-score.wav")
TARGET_LUFS = -14.0
SEED = 43

CHORDS = chords("Dm9:D3 F3 A3 C4 E4/D2", "Bbmaj7:Bb2 D3 F3 A3 D4/Bb1", "Gm9:G2 Bb2 D3 F3 A3/G1", "A7sus:A2 D3 E3 G3 C4/A1")
MOTIF = [(0.5, hz("A5")), (1.5, hz("F5")), (2.5, hz("E5"))]


def snap(mix, t, level=0.06, pan=0.0):
    """The jaw shutting: a short click on a soft low knock."""
    mix.put(t, click(1500, 0.03), level, pan=pan)
    mix.put(t, thud(110, 0.06, 0.25), level * 0.5, pan=pan)


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
    # the walk-in: a soft footfall per diagonal pair (the trot at 1.4 Hz plants a pair every 0.36 s), the jaw snap at 2.3 s
    t = 0.05
    i = 0
    while t < 2.75:
        mix.put(t * K, thud(70 + 8 * (i % 2), 0.05, 0.18), 0.05, pan=-0.25 + 0.5 * (i % 2))
        mix.put(t * K, click(900, 0.02), 0.012, pan=-0.25 + 0.5 * (i % 2))
        t += 0.357
        i += 1
    snap(mix, (2.3 + 0.12) * K, 0.05, pan=0.2)

    for e in tl["script"]:
        t0, act = e["t"], e["act"]
        at = lambda dt: t0 + dt * K  # noqa: E731
        mix.put(t0, click(2400, 0.025), 0.055, pan=0.45)
        if act == "eye":
            mix.put(at(0.35), airy(0.5, 1200, 2600, 0.5), 0.012, pan=-0.15)
            for j, dt in enumerate((0.5, 0.68, 0.86, 1.04, 1.22)):
                mix.put(at(dt), click(3200 - 180 * j, 0.018), 0.033, pan=-0.1)
            for j, dt in enumerate((2.0, 2.12, 2.24, 2.36)):
                mix.put(at(dt), click(2500 + 180 * j, 0.018), 0.03, pan=-0.1)
        elif act == "jaw":
            mix.put(at(0.3), airy(0.6, 1400, 500, 0.6), 0.02, pan=0.15)
            mix.put(at(0.32), thud(85, 0.08, 0.3), 0.03)
            for j in range(14):
                mix.put(at(0.62 + 0.05 * j), click(3300 + 70 * j, 0.012), 0.02, pan=-0.3 + 0.045 * j)
            for j in range(8):
                mix.put(at(1.6 + 0.045 * j), click(3600 - 60 * j, 0.012), 0.016, pan=0.3 - 0.07 * j)
            snap(mix, at(2.25), 0.06, pan=0.15)
        elif act == "exploded":
            mix.put(at(0.2), airy(1.3, 450, 2400, 0.7), 0.032, pan=-0.15)
            mix.put(at(0.25), blip(hz("D6"), 0.3, 0.1), 0.025)
        elif act == "assemble":
            mix.put(t0, airy(0.9, 2200, 600, 0.5), 0.02, pan=0.15)
            for j, dt in enumerate((0.55, 0.75, 0.95)):
                mix.put(at(dt), click(2000 + 300 * j, 0.03), 0.05, pan=-0.3 + 0.3 * j)
            mix.put(at(0.9), airy(0.5, 400, 1300, 0.6), 0.016)
        elif act == "window":
            mix.put(at(0.6), airy(0.6, 900, 2400, 0.5), 0.016, pan=-0.2)
            for j in range(10):
                mix.put(at(0.7 + 0.11 * j), click(2600 + 40 * (j % 3), 0.012), 0.014, pan=-0.25)
            mix.put(at(1.55), airy(0.35, 2000, 900, 0.5), 0.011, pan=-0.2)
            mix.put(at(1.85), click(2100, 0.03), 0.05, pan=-0.2)
        elif act == "hero":
            mix.put(at(0.1), airy(0.8, 500, 1500, 0.5), 0.018, pan=0.2)
            mix.put(at(0.85), airy(1.6, 450, 2600, 0.7), 0.034, pan=0.1)
            mix.put(at(0.85), thud(60, 0.12, 0.5), 0.06)
            mix.put(at(0.9), click(1200, 0.03), 0.03)
