# Brief

Read this before every object. When the user corrects something, add one line to "Corrections" at the bottom, with a number in it whenever possible.

## You are building

A machine or robotic creature from one reference picture, in three.js, entirely in code, shown in the Neurivex night studio.

## Look

- Studio: vertical gradient `#154579` → `#0E2A4A` → `#09090A`, soft floor shadow, no horizon line.
- Shells: matte dark `#1A1C21`, roughness 0.55 or more, split into plates in at least 3 sizes with real gaps.
- Mechanism behind the plates in two scales: large parts (gears, rings, actuators) and roughly 250 small ones (pistons, hoses, screws, cables).
- Accent: amber `#D78453` on rims, edge lines, lens bezels, joint rings, and on the part that is moving right now. Never as dots.
- See-through parts (glass, fins, membranes, wings): blueprint `#9CC9FF`, thin, with fine vein lines.
- Eyes: black glossy lenses inside an amber bezel.
- Light: warm key from the lamp side, strong cold rim `#9CC9FF` from behind, low blue fill.
- No pink, no neon green, no logos.

## Order

1. Measure the picture: main proportions as shares of body length, and its detail share (Sobel edges in the object's box, threshold 0.12 of max).
2. Write the checklist for this picture.
3. Build, render one still posed like the picture at 1600×900.
4. Strip: picture | still | closest approved still, plus the same strip 900 px wide. Grade every line yes / partial / no against the picture, never against what you think you built.
5. Measure the still: proportions within ±0.03 of the picture, detail share at least 0.8 of the picture's.
6. After round 2, stop and show the user. No film before a yes.

## Camera

- Frame 0: front 3/4 hero, object large, already moving.
- Every part gets its own side, height and distance, aimed at that part, pushing in while it is open.
- The part being opened stays in frame; the rest may leave it.
- Smooth paths only; the camera never follows a fin beat or a wing beat.
- Visible wing beats 1.5–2.5 Hz; anything faster becomes a soft blurred fan.

## Film

- Reuse the closest approved film's beats 1:1, change the body only.
- A part opens in about 1 s, holds, closes in 0.5 s; a new beat every 2–3 s.
- Full explode on a slow turntable, quick reassembly, a clear exit.
- Short cut ~10 s: opening, one part, explode, exit, written as its own script.

## Corrections
- Hummingbird: frame the still so the whole object is inside the edges at ~0.80 of the width; wingtips never cut.
- Hummingbird: the head is slim and tapers into the beak (beak = the head's own point, never a spike on a bulb); short thin neck.
- Hummingbird: no scattered screw dots on shells; the body tapers toward the tail with overlapping curved plates.
- Hummingbird: wing veins branch from the leading edge, never a straight criss-cross grid; 2–3 articulated arms per wing root.
- Hummingbird: the tail fan is long (~0.47 L) and points down.
- Hummingbird: body = ONE lofted form along a spine curve, beak tip → head → neck → chest → tail base; radius changes smoothly, no separate head bulb or neck rods; plates are cut from that form afterwards.
- Hummingbird: neck short and thick (~0.10 L), chest the biggest mass (height ~0.62 L, head ~0.53 of it), tapering to the tail.
- Hummingbird: wing mount = ball joint inside the top of the chest under a plate (seen through a gap) → short thick upper arm → elbow → forearm that IS the leading-edge spar; one piston chest → upper arm, one linkage rod along the spar; steel #8c939b, amber only on joint rings; never a round flange disc on the chest side.
- Hummingbird: nothing sticks out of the neck (no loose plate or rod); no amber hooks on the head, at most one thin amber line on the crown plate.
- Hummingbird: pose with the body leaning ~40° (head up-left, tail down-right), camera on the side in front 3/4 from slightly above (az −25°, el 8°), never the chest from below.
- Hummingbird: wings grow from the top-back of the shoulders behind the head; thick steel arm (#8c939b) with shoulder, elbow and wrist joints, pistons and rods along the leading edge; nothing on the chest front.
- Hummingbird: wing surface = 9–11 separate overlapping glass feather blades, longest at the tip, one central vein + fine side veins each; never one scalloped sheet.
- Hummingbird: torso = 6–8 big curved overlapping plates, 2–3 % gaps, mid-grey steel mechanism in the gaps; tail fan grows straight from the rump, no stalk or ring.
- Hummingbird: plates satin-metallic graphite (#1A1C21, metalness ~0.7, roughness ~0.4) so the warm key leaves bronze edge highlights; mechanism bright steel #8c939b and brass #B08A5A, marked keep so the night retint leaves them light.
- Hummingbird: wings and tail are lit glass (emissive #9CC9FF low, rims brighter, veins slightly emissive, opacity ~0.35); cold rim #5d9be6 from behind, warm key from the left, a visible soft floor shadow.
- Hummingbird (r8 lesson): bloom 0.55 / threshold 0.9 washes the glass to white haze and halves the detail share (0.054); keep bloom subtle (≤0.2, threshold ≥1.2).
- Hummingbird (r9): bloom 0.15 / threshold 1.2, glass rims emissive 1.2; plate clear coat ~0.06 so the back rim light leaves no glare blob; thin light edge along the beak top.
- Hummingbird (r9): chest/belly plate gaps ~4 % of the body, filled with steel and brass gears, pistons and short hose runs (never full rings).
- Hummingbird: wing blades need volume: ~10° camber across, ~9° twist to the tip, layered in depth, rim bead ~1.8 % of blade width, a thick rounded leading-edge spar.
- Hummingbird film: wasp 10 s cut 1:1 scaled by K (distances, path offsets); its own exit ends on the bird (gentle rise, camera follows), never on an empty frame; wing beats 2.2 Hz visible strokes.
- Clear blueprint-out/beats-frames before a --stills beats render: stale frames from an earlier object end up in the sheet.
- Alligator (r3): broad rounded U-shaped snout, shorter, raised nostril bump at the tip; thick deep lower jaw open ~30-35°; eye on a raised brow ridge; head plates flat satin panels with fine seams and rivets, never puffy pillows.
- Alligator (r3): thick armoured legs, elbows and knees splayed out sideways, belly low just above the floor, all four legs visible, big feet with steel claws and glass webbing.
- Alligator (r3): deeper thicker trunk; the flank window is a curved bulging glass dome over brass gears, not a flat rectangle; brass/steel mechanism exposed along the whole flank between shoulder and hip under the back-plate edge.
- Alligator (r3): back = large keeled scute plates overlapping like roof tiles, never spike cones; on the tail one tall crest of glass fins over most of its length; tail thick at the base, curving like the hero panel.
- Alligator (r3): no noisy leather bump texture, no blue sparkle points: smooth satin graphite with fine seams and small rivets.
- Alligator (r3): camera low and close, front 3/4 from just above the floor, head big on the left, whole animal including tail tip in frame.
- Alligator (r4): a new head, never adapted shark jaws: head 0.20 L; snout width at the tip ≥ 0.65 of the width at the eyes, U tip with a nostril bump; upper jaw height at the eyes ≈ 0.45 head length, jawline curving down to the tip; lower jaw as thick, bulging cheek plates at the hinge; mouth ~25°.
- Alligator (r4): teeth 18-22 per jaw side, short (≤ 0.06 head length), packed along the edge, interlocking, slightly curved; eye diameter ≈ 0.12 head length in a raised brow socket with an amber ring, never a big disc.
- Alligator (r4): upper leg diameter ≈ 0.5 trunk height; elbows and knees splayed sideways; belly ≈ 0.15 trunk height above the floor; all four legs visible.
- Alligator (r4): camera just above floor level, front 3/4, close; head big in the left third; tail tip in frame. No blue sparkle glints on scutes, rivets or joints.
- Alligator (r4): the trunk, flank mechanism, glass dome, back scutes and tail crest of r3 are approved: do not change them.
- Chameleon (r3): crouched low like the hero: body close to the branch, elbows and knees bent, thick armoured leg segments; never straight stilt legs.
- Chameleon (r3): each foot's two opposed toe bundles wrap AROUND the branch from both sides (08_gripping_foot), never standing on top of it.
- Chameleon (r3): head ~15% bigger and rounder; the glass casque tall and curving back like a helmet; the eye turret big, a cone of layered plates round the lens.
- Chameleon (r3): mouth open ~20° with a droplet-shaped glass tongue tip hanging from it, never a straight stick.
- Chameleon (r3): tail thicker, the spiral larger and lower, near the branch.
- Chameleon (r3): camera lower and closer, front 3/4 like the hero, the animal ~85% of the width.
- Chameleon (r4): casque ~40% lower than r3: a curved glass helmet sweeping back over the skull and flowing into the spine crest, never a tall triangular fin.
- Chameleon (r4): jaw ~20% shorter and rounder at the tip; keep the tongue droplet.
- Chameleon (r4): toe bundles curl round the branch and close on it from both sides, never hanging below it.
- Chameleon film: frame 0 big and clear of the side panels; labels clear of the right-hand cards; no bloom flash.
