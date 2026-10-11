# Phase 2.14C.1: direct renderer flicker investigation

## Reproduction and layer isolation

The generated checkpoint starts 110.1 seconds into the production Halley-to-Sun cruise. The development-only capture steps 60 frames at 0.1 seconds each at 1101x932, reads WebGL pixels, and repeats each pose with GalaxyCloud, GalaxySprites, LandmarkSprites, NebulaClouds, NebulaImages, StarPoints, and ProcStarPoints isolated. It does not read or write the owner's active journey save.

In the original raw WebGL replay, the 80x80 region centered on the Large Magellanic Cloud (LMC) changed by 15.474 luminance units in one frame, from 97.612 to 82.138. The camera quaternion changed 0.01677 degrees at that step and the projected LMC center moved 0.341 pixels. The largest quaternion step in the replay was 0.01716 degrees and the largest projected LMC movement was 0.350 pixels. Smooth camera motion cannot explain the large brightness and shape change.

Excluding GalaxySprites reduced the maximum LMC step from 15.474 to 0.133. Excluding GalaxyCloud left a 15.562 step. The cloud and sprite both add brightness, but their overlap does not cause the temporal jump. The same flicker is present before browser composition: the normal composed replay had a 13.095 maximum step. The direct WebGL result rules out browser composition as the necessary cause.

## Root cause and correction

`GalaxySprites` supplies irregular galaxy seeds at 0.1 increments. `galaxy.frag` feeds the fragment-stage seed into a high-gain `fract(sin(...)*43758.5453)` hash that sets bright clump positions, sizes, and weights. Small changes in the fragment value can therefore select a different clump pattern. The layer isolation, stable camera matrices, and A/B seed-grid correction identify this shader path as the source of the large one-frame change. The exact GPU precision variation was not directly measured.

The correction snaps the fragment seed back to its existing 0.1 grid before the hash. It retains the original hash, color, opacity, camera motion, and both Magellanic Clouds. A different hash was tried and discarded because it made the galaxies look like faded circles. A point-to-quad trial did not solve the flicker and was discarded.

At the same viewport and path, corrected raw WebGL LMC brightness ranged from 94.863 to 95.319, with a 0.201 maximum adjacent step, a 98.7% reduction. The normal composed replay ranged from 101.578 to 102.041, with a 0.101 maximum step, a 99.2% reduction. The two white patches in both before and after frames are separate objects: the LMC and the Small Magellanic Cloud (SMC). Their soft appearance comes from the existing analytic galaxy sprite design. The after-replay SMC 50x50 region ranged from 62.014 to 62.560, with a 0.346 maximum step.

## Separate M27 observation

At an atlas mix of 1, a 60-frame 0.125-pixel-per-frame sweep around M27 had a 1.619 maximum adjacent step in a 24x24 region, both before and after the galaxy correction. Excluding LandmarkSprites reduced that to 0.366. Excluding the photographic NebulaImages contribution reduced it to 0.493. This is a separate small-scale landmark-image sampling behavior; its detailed cause and a visual-preserving correction remain unproven. The GalaxySprites correction does not affect it.

## Regression evidence and limits

The unmodified starfield portions of raw frame 53 match pixel-for-pixel before and after the correction. Typecheck, production build, long-cruise cinematic tests, Proxima tests, and all 41 journey stops passed. The journey test includes 1-4 display panorama fixtures, but a live three-monitor panorama was not run. Owner visual acceptance of the Magellanic Cloud appearance is pending. No installed screensaver, registry, owner save, backup, commit, or remote Git state was changed.

Reproduce with `node scripts/generate-reach-flicker-checkpoint.mjs`, `node scripts/reach-flicker-capture.mjs`, `npm run dev -- --host 127.0.0.1`, and `http://127.0.0.1:5173/?reach=1&reachFlicker=1&frames=60&raw=1`. The capture server receives local browser output on port 4175. Run `python scripts/analyze-reach-flicker.py` to compare saved before and after captures.
