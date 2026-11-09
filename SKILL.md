---
name: blueprint
description: Blueprint by Neurivex. Rebuild a machine or robotic creature from one reference picture as a three.js object written entirely in code, take it apart part by part in a night-studio look (dark shells, amber accent, blueprint glass), wrap it in a page with a button per part, and film it at 60 fps with a procedural score on the same timeline. Claude measures the picture, grades every still against it, and films only after the user approves. Use when someone gives a picture of a robotic animal, an engine, a drone or any dense mechanism and wants it built in 3D, opened up, exploded, or filmed; or mentions "blueprint", "teardown", "cutaway", "exploded view" or "make this picture a 3D model that comes apart".
---

# Blueprint, by Neurivex

You get one picture. You hand back an object built from code that opens itself up on camera, a page around it, and a film. Everything stays in the Neurivex night look.

`SKILL_DIR` is the folder holding this file. Builds and renders go to `./blueprint-out` in the folder you run from.

## Setup, once

```
cd "$SKILL_DIR" && npm install && npx playwright install chromium
```

Video needs `ffmpeg` on PATH, sound needs Python 3. Override binaries with `FFMPEG`, `PYTHON`, `CHROMIUM`. On a machine without a GPU add `CHROMIUM_EXTRA="--use-angle=swiftshader --enable-unsafe-swiftshader"` and `CAPTURE_TIMEOUT=400000`; it is slow but works.

## The look (do not drift from it)

- Studio gradient `#154579` (top) → `#0E2A4A` → `#09090A` (floor), no horizon.
- Shells matte and dark, `#1A1C21`, cut into plates with gaps so the mechanism shows.
- One accent: amber `#D78453` (glow `#CC774B`), only on edges, rims, lenses and whatever is moving right now. Never dots scattered over a shell.
- Glass, membranes, fins and anything see-through: cold blueprint `#9CC9FF`, thin and clean.
- Lighting: a warm key from the lamp side, a strong cold rim from behind.
- No pink, no neon, no green code, no other brand's logo.

`sims/night/look.js` applies this to any object: set `PAL.orange = ORANGE_TO` and `PAL.white = SHELL` before the build, call `retint(root)` after the build and after every pose. It moves warm accents to amber, turns light opaque surfaces into dark shells and light see-through ones into blueprint blue. `node sims/night/probe_warm.mjs <entry> <t> <global>` lists any colour that escaped.

## Order of work

1. **Picture.** If the user has none, give them the prompt from `docs/PROMPTS.md`. Never import the image into the scene; rebuild it.
2. **Measure the picture** before code: body height, head, jaw or limb length as shares of body length. Then its **detail share** (below).
3. **Checklist** for this picture, 10 to 12 numbered lines, written before code. Format in `docs/CHECKLIST.md`.
4. **Still loop.** Build, render a still posed like the picture, put picture | still | closest approved still side by side plus the same strip at 900 px wide. Grade each line yes / partial / no against the picture. **After round 2, stop and show the user.** Do not film before they approve.
5. **Film.** Take the example whose body is closest and keep its beats, moves and timing; scale distances, swap the body. Each part gets its own camera.
6. **Short cut.** A separate script with its own opening and exit, not pieces of the long film.
7. **Render and score.**

Read `docs/JOB_DESCRIPTION.md` before every object and append every correction the user gives to it, one line each.

## Detail share (the density check for dark shells)

A dark-pixel count does not work when the shells are dark, so Blueprint measures detail instead. Crop the picture and your still to the object's bounding box, convert to grey, run a Sobel filter, count the share of pixels whose edge strength is above 0.12 of the maximum. Your share must reach at least 0.8 of the picture's. To raise it, split large surfaces into separate plates with gaps over the mechanism and add small parts behind them. Glow dots do not count.

## Examples to start from

| | Body | Good to copy |
|---|---|---|
| `tarantula-*` | 8 legs, glass abdomen with lit coils | a walking gait from velocity keys, a jump with crouch and tuck |
| `piranha-*` | deep fish body, glass fangs, glass flank | one camera per part, a lunge at the lens |
| `wasp-*` | wings, telescoping abdomen | slow-motion explode, dive in and climb out of frame |

`<name>-shared/` is the object, `<name>-film/` the full film, `<name>-demo/` the 10-second cut. These three came from the original cutaway skill and now render in the night look.

A shark starts from `piranha-*`, a hummingbird from `wasp-*`. A snake has no close body: flag it to the user before starting and plan its own movement (a travelling wave along the spine) and its own beats.

## Files of one object

| File | Job |
|---|---|
| `<body>.js` | The object from code. Every part that comes apart is its own group with a named anchor; `pose(state)` sets one moment. |
| `parts.js` | Materials and shape helpers; `PAL` holds the colours. |
| `stage.js` | Studio, lights, floor shadow; `frame(cam)` draws one frame. |
| `tour.js` | The film as functions of time: clocks per act, motion, explode, cameras, telemetry for the page. |
| `sim_night.js` | Wires state → pose, camera, page, and applies the night look. |
| `score.py` | Sound on the film's timeline. |

An object outside `SKILL_DIR`: a folder with `main.js` that imports `blueprint-kit/runtime.js` and `blueprint-night/look.js`; build it with `node "$SKILL_DIR/sims/build.mjs" ./my-object`.

## render(t)

```js
import {runSim} from 'blueprint-kit/runtime.js';
runSim({duration: 20, fps: 60, hud: {enabled: false}, director: {enabled: false}}, async ({cfg, canvas}) => {
  // build once, tabulate anything integrated over time
  return {render(t) { /* draw frame t from scratch */ return {}; }, resize() {}};
});
```

- `render(t)` depends on `t` only: no `Math.random` (seeded `rng` from `kit/util.js`), no `Date`, no state between frames.
- Beats live in `<name>-film/timeline.json` in seconds; the score reads the same file.
- `{"duration": 11.3, "film": 10.0}` plays 11.3 s of scene in 10 s.
- Frame 0 is the thumbnail: front 3/4, object big, already moving.

## Commands

```
node "$SKILL_DIR/sims/build.mjs" piranha-film
node "$SKILL_DIR/sims/capture.mjs" piranha-film --size 1600x900 --dpr 1.2 --stills beats --cols 4 --out blueprint-out/beats.png
node "$SKILL_DIR/sims/capture.mjs" piranha-film --size 1600x900 --dpr 1.2 --still 9.4 --out blueprint-out/still.png
node "$SKILL_DIR/sims/capture.mjs" piranha-film --size 1600x900 --dpr 2.4 --out blueprint-out/film-4k.mp4
python "$SKILL_DIR/run_sfx.py" "$SKILL_DIR/sims/piranha-shared/score.py"
ffmpeg -y -i blueprint-out/film-4k.mp4 -i blueprint-out/piranha-score.wav -map 0:v -map 1:a -vf scale=1920:1080:flags=lanczos -c:v libx264 -crf 16 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart blueprint-out/film.mp4
```

A short cut whose scene runs faster than its film: score the scene with `TL=<demo timeline> OUT=<wav>`, then `ffmpeg -af atempo=<factor>`.

## Review loop

You can't watch video, only frames. Never call an object done without reading sheets of the latest render.

1. `--stills beats` gives one labelled tile per beat. Read every tile against the checklist.
2. Zoom in with `--stills every:0.2 --from A --to B` or `--still T`.
3. `node sims/night/cam_track.mjs <entry> <global>` prints the camera every 0.5 s. If azimuth, elevation and distance barely change between beats, the film looks parked.
4. `node sims/night/anchors_dump.mjs <entry> <global>` prints part anchors to aim cameras at.
5. Fix, rebuild, repeat until a full pass finds nothing. Last: `node "$SKILL_DIR/sheet.mjs" --video <final.mp4> --timeline <timeline.json>`.

Check every pass: parts return to where they were and never pass through each other; the opening part fills the frame; labels never cover what they name; amber only on edges and moving parts; a new camera side, height or distance every beat; a part opens in about 1 s, holds, closes in 0.5 s, a new beat every 2 to 3 s.

## Known three.js traps

- HDR glow colours (above 1) break `getHSL`: read and write them at unit peak.
- Colours a pose rewrites every frame need retinting again after the pose.
- Vertex colours ignore the material: retint the `color` attribute.
- `smoothstep(a, b, x)` with `a > b` returns 0 on Windows (ANGLE/D3D); write `1.0 - smoothstep(b, a, x)`.
- One NaN pixel blacks out the frame through bloom: clamp every `pow()` base in shaders.

## Sound

`sfx/` synthesises sound in pure Python at 48 kHz from the film's timeline, so it can't drift. Masters to −14 LUFS, true peak ≤ −2 dBFS. A soft click per button, a short accent per moving part, nothing over continuous motion.

## Credits

Fork of [Nyxera0x/cutaway](https://github.com/Nyxera0x/cutaway) (MIT). Kit, capture and sound engine from [whaleyxbt/claude-motion](https://github.com/whaleyxbt/claude-motion) (MIT). CC0 samples via [Barty-Bart/motion-graphics](https://github.com/Barty-Bart/motion-graphics). Night look, detail-share check and prompts by Neurivex.
