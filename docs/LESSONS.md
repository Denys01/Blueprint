# Lessons

The original cutaway skill keeps its own lessons log in [Nyxera0x/cutaway](https://github.com/Nyxera0x/cutaway/blob/main/docs/LESSONS.md); read it, most of it still applies.

This file is the Blueprint log. Every mistake made in a Blueprint build gets one row here and one line under "Corrections" in `JOB_DESCRIPTION.md`.

| Object | What went wrong | What it looked like | Line added to the brief |
|---|---|---|---|
| (all) | White shells and a dark-pixel density check don't mix with the night look | Dark shells always "pass" a dark-pixel test, even when the build is plain | Density is measured as Sobel detail share, not dark pixels |
