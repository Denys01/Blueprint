# Lessons

The original cutaway skill keeps its own lessons log in [Nyxera0x/cutaway](https://github.com/Nyxera0x/cutaway/blob/main/docs/LESSONS.md); read it, most of it still applies.

This file is the Blueprint log. Every mistake made in a Blueprint build gets one row here and one line under "Corrections" in `JOB_DESCRIPTION.md`.

| Object | What went wrong | What it looked like | Line added to the brief |
|---|---|---|---|
| (all) | White shells and a dark-pixel density check don't mix with the night look | Dark shells always "pass" a dark-pixel test, even when the build is plain | Density is measured as Sobel detail share, not dark pixels |
| Great white | Shark jaws tuned on the piranha read as a crocodile; the round-2 detail pass cluttered the head | A thin spike snout; a busy head of small plates | Cut detail into the flank and stalk, keep the head's plates large; measure snout and head off the picture |
| Hummingbird | Nine still rounds: head, neck and chest built as separate parts, one flat scalloped wing sheet, flat black mechanism | A bulb head on a rod neck; paper wings; a black egg body | Body = one lofted form, plates cut after; wings = separate glass blades on a jointed arm; steel/brass marked `keep` |
| Hummingbird | Bloom 0.55 / threshold 0.9 | Wings and tail washed to white haze, detail share 0.054 | Bloom ≤0.2, threshold ≥1.2 |
| Alligator | The head was adapted from the shark's jaws; a "fix everything" pass overshot | A gharial plank snout; then a giant box head | Build a new head from numbers; when a pass overshoots, go back to the last good round and change one thing (r3 + eyes = r5) |
| Chameleon | Single-picture builds drift on proportions | — | A reference sheet split into panels from the same image: approved in 4 rounds |
| (films) | Frame 0, bloom flashes and labels | Frame 0 cut off by the side panels; a white flash on reassembly; labels under the cards | Frame 0 big and clear of the panels; cap emissive before the bloom; labels clear of the cards |
