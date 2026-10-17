# Third-party notices

The source code of Your Eyes In Space is MIT-licensed (see `LICENSE`). The project bundles or
streams the following third-party material, each under its own terms.

## Data

| Item | Files | Source | Licence |
|---|---|---|---|
| Star catalogue (derived) | `public/data/stars.bin`, `public/data/star-names.json` | [HYG Database](https://github.com/astronexus/HYG-Database) by David Nash (Astronexus), compiled from Hipparcos, Yale BSC and Gliese | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) - the derived binary is redistributed under the same licence; build with `scripts/build-stars.mjs` |
| Planetary orbital elements | `src/data/solarSystem.ts` | NASA/JPL, E. M. Standish, *Keplerian Elements for Approximate Positions of the Major Planets* | Public domain (US Government work) |
| Spacecraft state vectors | `src/data/spacecraft.ts` | [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) (approximate, early 2025) | Public domain |
| Galaxy catalogue | `src/galaxy/galaxies.ts` | NED / literature values | Facts; no copyright claimed |
| Deep-sky landmarks (positions, distances, sizes, magnitudes) | `src/data/landmarks.ts` | Literature / SIMBAD / NED values | Facts; no copyright claimed |
| Pulsars (periods, distances, ages, fields, companions) | `src/data/pulsars.ts` | ATNF Pulsar Catalogue (Manchester et al. 2005) / literature | Facts; no copyright claimed |
| Black holes (masses, distances, S-star and binary orbital elements) | `src/data/blackholes.ts` | Literature values: GRAVITY Collaboration (S2), Gillessen et al. (S-stars), EHT Collaboration (Sgr A*, M87*), Miller-Jones et al. (Cygnus X-1), El-Badry et al. (Gaia BH1), Miller-Jones et al. (V404 Cygni), Cantrell et al. (A0620-00) | Facts; no copyright claimed |

Procedural stars, galaxies and the cosmic web are generated deterministically and are not real
catalogue objects.

## 3D models

The legacy `public/models/*.glb` spacecraft (Voyager, Pioneer, Parker Solar Probe, Hubble, JWST,
Perseverance, Juno, Dawn, Galileo, and the retained `iss.glb` fallback) come from
[NASA 3D Resources](https://science.nasa.gov/3d-resources/) and are Draco-compressed copies.
The production ISS asset, `public/models/iss-vtad-uastc-joined.glb`, is an optimized derivative
of the [NASA VTAD International Space Station 3D Model](https://science.nasa.gov/resource/international-space-station-3d-model/)
([original GLB](https://assets.science.nasa.gov/content/dam/science/psd/solar/2023/09/i/ISS_stationary.glb)).
It retains NASA geometry and surface imagery, with UASTC/KTX2 compressed textures and joined
meshes. The accepted production file is 26,574,636 bytes, SHA-256
`445b11b724b449f974cc4d2c05f50ecdf0120df312ef0751d91df679c4d68b32`.
The original downloads and optimization records remain in `Preview/Spacecraft-Model-Pilot/` and
are not production assets. The mission planner's fictional ships (Star Trek, Star Wars,
The Expanse) use original, schematic primitive-built models (`src/render/ProceduralShips.ts`);
no third-party model or artwork is bundled. NASA material is generally not copyrighted, but the
[NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/) apply:
the NASA insignia and name must not be used in a way that implies endorsement.

## Bundled planetary imagery

* `public/textures/jupiter-pia07782.jpg` is the unmodified cylindrical Jupiter map
  [PIA07782](https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/)
  from Cassini. Credit: NASA/JPL/Space Science Institute. Use is subject to the
  [JPL image use policy](https://www.jpl.nasa.gov/jpl-image-use-policy/);
  no NASA, JPL or Caltech endorsement is implied.

## Streamed imagery (not bundled)

Loaded at runtime directly from NASA servers; see `src/data/imagery.ts`.

* Earth — [NASA GIBS](https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api):
  *Blue Marble Next Generation* and *VIIRS Black Marble* — public domain.
* Moon — [NASA Moon Trek](https://trek.nasa.gov/moon/): *LRO WAC Global Mosaic* — public domain.
* Mars — [NASA Mars Trek](https://trek.nasa.gov/mars/): *Viking MDIM 2.1 Colour Mosaic* — public domain.

## Software dependencies

* [three.js](https://threejs.org/) — MIT
* [Basis Universal transcoder](https://github.com/BinomialLLC/basis_universal) (bundled for offline KTX2 textures) - Apache-2.0
* [Vite](https://vite.dev/), [TypeScript](https://www.typescriptlang.org/) — MIT / Apache-2.0 (build-time only)
* Node.js — MIT (build-time only)

## Trademarks

"Your Eyes In Space", the eye-and-orbit logo and "BigBrains" are trademarks of BigBrains
(https://bigbrains.com.tr). Forks must use their own name and logo.

"Star Trek", "USS Enterprise", "Star Wars", "Millennium Falcon", "X-wing" and "The Expanse" /
"Rocinante" are trademarks of their respective owners (Paramount, Lucasfilm/Disney, Alcon/Amazon).
They are referenced nominatively in the mission planner as well-known fictional vehicles for
educational comparison with real spacecraft; this project is not affiliated with or endorsed by
those owners.
