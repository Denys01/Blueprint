# Making the reference images in ChatGPT

Blueprint builds from pictures. The builds that needed the fewest rounds started from a **reference sheet**: one image with a hero shot, side/top/front/back views and close-ups of the same subject, then split into separate files **from that same image**. Panels generated one by one each draw a slightly different animal, and Claude ends up chasing the differences.

Two messages to ChatGPT (or any image model that can edit its own output):

1. **The sheet.** Fill in the `[ENTER ...]` parts.
2. **The split.** Only after the sheet looks right.

Then put the files in your project and point Claude Code at them (prompt at the bottom).

## Message 1: the sheet

```
Create a character reference sheet of one robotic [ENTER YOUR SUBJECT, e.g. "snow leopard"] built as a precision machine, in a dark night studio: background a smooth gradient from deep blue #154579 to near-black #09090A.

Large hero panel top-left: [ENTER THE POSE, e.g. "crouched on a rock, ready to pounce"], side three-quarter view from slightly above, the whole subject in frame.

Other panels, same subject in every panel: side, top, front and back orthographic views; close-ups of the eye and of [ENTER 3-5 KEY PARTS, e.g. "the paw with claws, the jaw, the tail joint, the shoulder"]; one exploded view showing how the parts separate.

Armor: curved overlapping plates in satin dark graphite #1A1C21 with fine seams and small rivets; bright steel and brass mechanism visible in the gaps: gears, pistons, hoses, screws, cables.
Warm amber #D78453 only on thin plate edges, joint rings and lens bezels, never as dots.
Glass parts in cold pale blue #9CC9FF, translucent with fine veins: [ENTER THE GLASS PARTS, e.g. "a glass panel on the flank over the gears, glass claws"].
Eyes are glossy black lenses inside an amber ring.
Warm key light from the left, strong cold blue rim light from behind, soft floor shadow.
16:9. No text, no labels, no logos, no people.
```

Check before you split:

- the hero panel shows the **whole** subject, nothing cut by the frame;
- it is the **same** subject in every panel (count legs, teeth, plates);
- the mechanism in the gaps is light steel and brass, not black;
- no text or labels on the image.

If something is off, ask for that one change on the same sheet ("keep everything, make the tail longer") instead of generating a new one.

## Message 2: the split

```
Split this exact sheet into separate images, one per panel, without redrawing anything. Name them in this order: 01_hero, 02_side, 03_top, 04_front, 05_back, 06_eye, then the close-ups as 07_..., 08_... named after the part, and the exploded view last. Give me all of them as one ZIP.
```

Save the full sheet as `<subject>.png` and unzip the panels into `<subject>-ref/`, both in the project root. Keep folder names in plain Latin letters: non-ASCII paths can break Python and ffmpeg on Windows.

## Worked example: an ant

Message 1, filled in:

```
Create a character reference sheet of one robotic ant built as a precision machine, in a dark night studio: background a smooth gradient from deep blue #154579 to near-black #09090A.

Large hero panel top-left: standing on a flat stone, front legs raised, mandibles open, antennae forward, side three-quarter view from slightly above, the whole subject in frame.

Other panels, same subject in every panel: side, top, front and back orthographic views; close-ups of the eye and of the mandibles, an antenna with its segments, a leg joint with the foot hook, the narrow waist, the abdomen; one exploded view showing how the parts separate.

Armor: curved overlapping plates in satin dark graphite #1A1C21 with fine seams and small rivets; bright steel and brass mechanism visible in the gaps: gears, pistons, hoses, screws, cables.
Warm amber #D78453 only on thin plate edges, joint rings and lens bezels, never as dots.
Glass parts in cold pale blue #9CC9FF, translucent with fine veins: the abdomen as a glass dome over brass gears and a coiled spring, the tips of the antennae.
Eyes are glossy black lenses inside an amber ring.
Warm key light from the left, strong cold blue rim light from behind, soft floor shadow.
16:9. No text, no labels, no logos, no people.
```

Message 2 as above. Expected files: `01_hero`, `02_side`, `03_top`, `04_front`, `05_back`, `06_eye`, `07_mandibles`, `08_antenna`, `09_leg_joint`, `10_waist`, `11_abdomen`, `12_exploded`.

## Then, in Claude Code

```
Use the blueprint skill. Reference: ant.png (the full sheet, source of truth) plus the split panels in ant-ref/. They are cut from the same sheet, so they show the same animal. Use them as is.
- 01_hero: the look and pose to match in the still.
- Measure proportions once from 02_side, 03_top, 04_front, 05_back.
- Part design from the close-ups; the teardown follows the exploded panel.
Base, to save tokens: start from the closest example (for an ant: tarantula-* for the legs and gait, wasp-* for the insect body); read only what you need.
Build, render the still, save blueprint-out/ant-still-r1.png. At most ONE fix pass (save -r2, keep r1's code). Then one strip (01_hero | still) + 900px and stop. No film before my yes.
After my yes: ONLY the 10-second cut, one shot per beat from its own side and distance, frame 0 big and clear of the side panels, labels clear of the cards, no bloom flash, ending on the subject, not an empty frame.
```

More on the build prompt and the lessons behind it: [PROMPTS.md](PROMPTS.md), [LESSONS.md](LESSONS.md).
