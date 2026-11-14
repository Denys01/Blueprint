# Prompts

## 1. Reference picture (ChatGPT or any image model)

Base prompt, swap the part in brackets:

```
A robotic [subject] built as a precision machine, studio product shot in a dark night studio: background a smooth vertical gradient from deep blue #154579 at the top to near-black #09090A at the floor, soft shadow under the subject.
Shells matte dark graphite #1A1C21, split into separate plates with visible gaps.
Dense mechanism visible through the gaps and through clear parts: gears, pistons, hoses, small screws, cables.
Warm amber #D78453 only on thin edge lines, rims, lens bezels and joint rings, never as dots.
Glass, fins, wings and membranes in cold pale blue #9CC9FF, thin and translucent, with fine vein lines like a blueprint.
Eyes are glossy black lenses inside an amber ring.
Warm key light from the left, strong cold blue rim light from behind.
Front three-quarter view, the whole subject in frame, 16:9.
No text, no logos, no people.
```

Ready-made subjects:

- **Shark:** `a hammerhead shark, swimming, hammer head toward the camera, glass dorsal and pectoral fins, a segmented tail stalk ending in a glass crescent fin`
- **Snake:** `a cobra rising into a strike pose with its hood spread, the body as a chain of short ring segments with gaps showing a spine of gears, a glass hood with fine veins, glass fangs`
- **Hummingbird:** `a hummingbird hovering in front of a single glass flower, wings spread as thin glass blades with fine veins, a long thin beak, a chest of layered plates over a small turbine`

- **Great white:** `a great white shark, swimming, jaws slightly open with glass teeth, glass dorsal and pectoral fins, a segmented tail stalk ending in a glass crescent fin`
- **Alligator:** `an American alligator low on four bent legs mid-stride, jaws slightly open with rows of glass teeth, keeled back plates like scutes, a glass panel on the flank over the gears, glass webbing between the toes, a long tail with a glass fin crest`
- **Chameleon:** `a chameleon gripping a thin steel branch, tail curled into a tight spiral, eye turrets in cones of layered plates, a curved glass casque, mouth slightly open with a glass tongue tip`

Lessons from the four Blueprint builds, worth keeping in any picture prompt:

- Plates **satin-metallic** graphite curved like armor, so the warm key leaves bronze highlights; not flat matte black.
- Mechanism **bright steel and brass**, so it reads in the gaps.
- The head flows into the beak or snout as one form; no bulb head on a neck.
- Wings and fins as separate glass blades with fine branching veins, never one sheet with a grid.
- The whole subject in frame, side three-quarter view, a little from above.

Pick subjects with many joints and a dense core. A long smooth surface stays a toy no matter how many rounds it gets. One main set of limbs per creature.

## 2. Still loop

```
Read docs/JOB_DESCRIPTION.md and this checklist. Build [subject] and loop:
1. Render a still at 1600×900 posed like the picture.
2. Make a strip: picture | still | closest approved still, plus the same strip 900 px wide.
3. Measure proportions and detail share against the picture.
4. Grade every checklist line yes / partial / no, one line each.
5. Fix the no's first, then the partials.
After round 2 stop and show me the strip, the numbers and the grades. Wait for my notes.
```

## 3. Film

```
Port the approved film of [closest example] 1:1: same beat times and moves, distances scaled to this object. Change the body only.
Map its parts onto these slots: [part 1, part 2, part 3, part 4, part 5].
Each part opens in about 1 s, holds while its mechanism keeps moving, closes in 0.5 s, under its own camera aimed at it.
Then a full explode on a slow turntable, a quick reassembly, and an exit.
Page: an invented product name in the Neurivex style ("<Name> NX-<n>"), one pill button per part pressed by the cursor, live cards that follow the parts.
Before showing me, put frames at 1.5, 4.5 and 12.4 s next to the approved film's. Smaller, flatter or blurrier means it is not ready.
```

## 4. Short cut

```
Write a separate 10-second script for [subject]: the opening, one part, the explode, the exit. Give it its own opening move and its own exit, different from the last short we posted.
```

## 5. Sound

```
Score the film from its timeline.json with sfx/score_kit.py: a low bed for the whole film, a soft click per button, a short accent on each part that moves, silence over continuous motion. Master to −14 LUFS.
```

## 1b. Reference sheet (what worked best)

Full step-by-step for ChatGPT, with the split message and a worked example: [REFERENCE_IMAGES.md](REFERENCE_IMAGES.md).

One image with every view of the same subject, then split into separate files from that image. Do not generate the panels one by one: each generation draws a slightly different animal.

```
A character reference sheet of one robotic [subject] built as a precision machine, dark night studio: background gradient from deep blue #154579 to near-black #09090A.
Large hero panel top-left: [pose], side three-quarter view, the whole subject in frame.
Other panels: side, top, front and back orthographic views; close-ups of [the eye, the key joints, the feet, the glass parts, the signature part]; an exploded view showing how the parts separate.
Armor: curved overlapping plates in satin dark graphite #1A1C21 with fine seams and small rivets; bright steel and brass mechanism visible in the gaps: gears, pistons, hoses, screws.
Warm amber #D78453 only on thin plate edges, joint rings and lens bezels, never as dots.
Glass parts in cold pale blue #9CC9FF, translucent with fine veins.
Warm key light from the left, strong cold blue rim light from behind, soft floor shadow.
16:9. No text, no logos, no people.
```

Name the split files by number and part (`01_hero.png`, `02_side.png`, … `10_tongue_launcher.png`) and keep the full sheet next to them. In the build prompt: the sheet is the source of truth, `01_hero` is the pose for the still, the orthographic panels are for measuring, the close-ups for part design, the exploded panel for the teardown.

## 6. Build prompt that kept rounds low

```
Use the blueprint skill. Reference: [subject].png (the sheet, source of truth) plus the split panels in [folder]. Use them as is.
- 01_hero: the look and pose to match in the still.
- Measure proportions once from the side/top/front/back panels.
- Part design from the close-ups; the teardown follows the exploded panel.
Base, to save tokens: start from [closest example]; read only what you need.
Build, render the still, save [subject]-still-r1.png. At most ONE fix pass (save -r2, keep r1's code). Then one strip (hero | still) + 900px and stop. No film before my yes.
After my yes: ONLY the 10-second cut, one shot per beat from its own side and distance, frame 0 big and clear of the side panels, labels clear of the cards, no bloom flash, ending on the subject, not an empty frame.
```
