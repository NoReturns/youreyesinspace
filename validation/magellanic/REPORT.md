# Phase 2.14C.2 Magellanic Cloud visual comparison

The LMC and SMC are analytic irregular-galaxy sprites, not photo textures. `public/tour-media/magellan.jpg` is tour media and is not sampled by the galaxy renderer. `GalaxySprites` draws the sprites with additive blending. The LMC also receives a small `GalaxyCloud` additive contribution at the Halley checkpoint; the SMC cloud has no measurable contribution in the tested regions. The old irregular shader added four broad Gaussian clumps, clipped their sum, and used an almost uniform color. At the tested apparent sizes (roughly 60 and 30 pixels across), broad overlapping clumps and additive exposure made both objects read as pale smudges.

The scoped change in `src/render/shaders/galaxy.frag` keeps the existing seed-grid snap used to suppress camera-motion flicker. It gives irregulars a faint diffuse old-star component and six narrower, lower-intensity star-forming concentrations, with modest color variation among them. The result is an uneven LMC body and a smaller, more fragmented SMC. The galaxy catalog, camera, GalaxyCloud, blending mode, global exposure, and M27 were not edited.

Matching frame 53 of the Halley-to-Sun checkpoint at 1101x932:

- Raw WebGL before: `before/halley-raw-f53.png`
- Raw WebGL after: `after/halley-raw-f53.png`
- Composed before: `before/halley-f53.png`
- Composed after: `after/halley-f53.png`

The raw capture was repeated with the pre-change and post-change shader at identical projected centers. Each capture has 60 frames spaced 0.1 seconds apart. The camera quaternion changed at most 0.017162 degrees per step and the LMC center moved at most 0.350 pixels per step in both runs. Mean luminance is measured in an 80x80 LMC region and a 50x50 SMC region, in 8-bit display units.

| Raw WebGL region | Before range | Before maximum adjacent step | After range | After maximum adjacent step |
| --- | ---: | ---: | ---: | ---: |
| LMC | 94.864-95.319 | 0.199 | 53.046-53.418 | 0.088 |
| SMC | 62.028-62.581 | 0.342 | 24.734-25.051 | 0.080 |

The lower mean is local to irregular sprites; no global brightness control changed. It leaves headroom for the separate concentrations. In the composed LMC view, the before range was 101.578-102.041 with a 0.101 maximum adjacent step; the after range was 65.637-66.257 with a 0.202 maximum step. The composed before capture did not record an SMC region, so a composed before/after SMC number is unavailable. The corrected composed SMC range was 25.253-26.079 with a 0.464 maximum step. Neither raw nor composed capture shows the previous large one-frame sprite jump.

Validation: `node scripts/test-reach-cinematic.mjs`, `node scripts/test-reach-interstellar.mjs`, `node scripts/test-reach-journey.mjs`, `npm run typecheck`, and `npm run build` passed. The build needed execution outside the sandbox because Vite dependency resolution hit `spawn EPERM` inside it. No installed screensaver or three-monitor panorama was tested. Owner visual acceptance remains pending, including whether these small apparent sizes carry enough detail on the intended display.
