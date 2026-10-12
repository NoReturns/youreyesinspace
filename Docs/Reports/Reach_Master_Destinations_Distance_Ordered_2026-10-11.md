# The Reach: Master Destinations, Distance Ordered
Date: 2026-10-11. Status: distance-ordered catalogue with an approved 47-stop production order implemented in the uncommitted development tree as of 2026-10-12. The catalogue is not a timing plan or save schema.

## 1. Executive summary

The merged inventory has **210 unique entries**: **171 physical objects or spacecraft** and **39 regions, clusters, boundaries, large structures or scale markers**. The physical count includes galaxy and stellar-system parents separately from their named children. All **41** released v1.0.0 stops and all **47** stops in the current uncommitted development route remain present. Section 8 records the approved order of those same 47 stops; the uncommitted route code now follows it without changing this distance-ordered inventory. Suggested treatments total **84 full encounters**, **90 flybys**, **16 regional transitions** and **20 contextual markers**. These are catalogue suggestions, not the production presentation profiles or durations.

The farthest individually named physical target is **Hoag's Object, about 600 million light-years** [S19]. The farthest conceptual marker is the **cosmic microwave background last-scattering surface**, approximately **45-46 billion light-years in present comoving radius**; its light has travelled for nearly 13.8 billion years [S18]. Neither that surface nor the observable-universe edge is a physical wall to fly through.

This is a distance-oriented outbound reference from Earth. It deliberately begins at Earth and local Earth space before the Sun and inner planets. Moons and embedded targets remain near their parents. Regions containing the Sun or spanning vast volumes are chapter cues, not ordinary point waypoints. Its row order is independent of the approved itinerary in section 8. The owner's approximately 12-hour outbound Solar System target is a later cinematic timing choice, independent of the distances here.

## 2. Merged sources and duplicate reconciliation

- `F0` means present in the original Universe initial open-source commit `5f23915`: 37 Solar bodies, 12 spacecraft, 54 individually named galaxy records, and the HYG star-name catalogue. HYG has thousands of stars; catalogue presence alone is not a hand-authored encounter. `F+` means later authored Universe landmarks, pulsars, black holes or tours. `R` means a stop in the current uncommitted 47-stop Reach production route in `src/reach/ReachVoyageDirector.ts`; it does not mean that the stop shipped in v1.0.0. `G(n)` means game-reference item number n. Multiple tags indicate a merged record.
- Presentation `P` means on the current uncommitted development production route; `C` means an authored renderer or catalogue visual exists outside that route; `V` means belt particles are rendered procedurally; `N` means no dedicated current authored presentation. These flags do not certify 2K/4K imagery. Stars, compact objects and exoplanets may require procedural or explicitly interpreted visuals.
- Pluto and each other named Solar body occur once despite several sources. Alpha Centauri A/B is one binary-system entry, while Proxima is separate. M31/Andromeda, M33/Triangulum and the Magellanic Clouds each have one galaxy parent row. Saturn and its rings are separate inventory concepts but should form one staged encounter.
- Crab Nebula and Crab Pulsar are distinct objects. The Milky Way Galactic Center and Sagittarius A* are related, distinct targets. Named star-forming regions, clusters, remnants and black holes within a host galaxy are children, not galaxy aliases. Four Voyagers/Pioneers retain four distinct spacecraft rows. Draugr, Poltergeist and Phobetor are distinct authored Lich planets, with no claimed photographed surfaces.
- The initial fork has eight spacecraft beyond the four in released v1.0.0. Six of those eight are integrated into the current uncommitted route; Perseverance has a development-only surface preview, and Curiosity still needs surface encounter work. Later Universe additions include 26 named landmarks, nine pulsars and 14 black-hole systems. This inventory excludes anonymous procedural stars, galaxy particles and incidental binary companions as separate itinerary entries.

## 3. Distance conventions and ordered master list

Solar body distances use mean heliocentric semimajor axes for broad sort, not actual separation between moving encounter positions. Moons and rovers inherit the host's broad Sun distance. Interstellar source pc values are converted using 1 pc = 3.26156 LY. Original galaxy `distMpc` values are converted using 1 Mpc = 3.26156 MLY; these are the renderer catalogue's **approximate model values**, pending NED or literature confirmation before promotion into a route. NASA values cross-check representative nearby galaxies and stars. The probe numbers use either NASA Voyager values near September 2026 or explicit linear extrapolation from the repo's 2025-01-01 state; Pioneers are no longer tracked. `H`, `M` and `L` denote high, medium and low confidence at the stated precision. Redshift is retained for uncertain giant structures instead of silently mixing light-travel and present comoving distance.

Halley's row uses its semimajor axis to place it in this distance-oriented inventory. Its actual heliocentric distance ranges from about 0.59 AU at perihelion to about 35 AU at aphelion, so neither its catalogue position nor its approved itinerary slot guarantees an outward leg at a particular simulation epoch.

| Order | Destination | Type | Approx. Sun distance/range | Units | Parent region | Origin | Existing presentation support | Confidence/notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Earth | Physical body | ~1 | AU | Solar System | F0,R,G(1) | P | H: Earth departure anchor; mean orbit 1 AU; Full; [R1,S1] |
| 2 | Low Earth Orbit | Spatial region | ~1 AU; 160-2000 km altitude | AU / km | Earth | G(2) | N | H: altitude range; Sun distance varies with Earth; Transition; [S1] |
| 3 | ISS | Spacecraft | ~1 AU; ~400 km Earth altitude | AU / km | Low Earth Orbit | F0,R | P | M: Earth-relative altitude; Flyby; [R2,S2] |
| 4 | Hubble Space Telescope | Spacecraft | ~1 AU; ~520 km Earth altitude | AU / km | Low Earth Orbit | F0,R | P | M: Earth-relative altitude; Flyby; [R2,S2] |
| 5 | Geostationary Orbit | Spatial region | ~1 AU; 35,786 km altitude | AU / km | Earth | G(3) | N | H: altitude above equator; Sun distance varies; Transition; [S1] |
| 6 | Cislunar Space | Spatial region | ~1 AU; Earth-Moon ~384,400 km | AU / km | Earth-Moon | G(4) | N | M: broad zone, not fixed shell; Transition; [S1] |
| 7 | Moon | Physical body | ~1 | AU | Earth | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 8 | James Webb Space Telescope | Spacecraft | ~1.01 AU; ~1.5 million km from Earth | AU / km | Sun-Earth L2 | F0,R | P | M: L2 halo orbit; Flyby; [R2,S2] |
| 9 | Sun | Star | 0 | AU | Solar System | F0,R | P | H: Solar origin; cinematic detour after Earth; Full; [R1,S1] |
| 10 | Parker Solar Probe | Spacecraft | 0.046-0.73 | AU | Solar corona | F0,R | P | M: 2025 model orbital range; Flyby; [R2,S2] |
| 11 | Mercury | Physical body | ~0.387 | AU | Solar System | F0,R,G(6) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 12 | Venus | Physical body | ~0.723 | AU | Solar System | F0,R,G(5) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 13 | Mars | Physical body | ~1.524 | AU | Solar System | F0,R,G(7) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 14 | Perseverance | Spacecraft | ~1.52 | AU | Mars | F0 | C | M: on Mars; site is moving with Mars; Flyby suggestion; development-only surface preview, not production; [R2,S2] |
| 15 | Curiosity | Spacecraft | ~1.52 | AU | Mars | F0 | C | M: on Mars; site is moving with Mars; Flyby suggestion; surface encounter pending, not production; [R2,S2] |
| 16 | Phobos | Physical body | ~1.524 | AU | Mars | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 17 | Deimos | Physical body | ~1.524 | AU | Mars | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 18 | Main Asteroid Belt | Spatial region | ~2.06-3.28 | AU | Solar System | F0,G(8) | V | M: renderer belt range; Transition; [R1,S1] |
| 19 | Vesta | Physical body | ~2.362 | AU | Solar System | F0,R | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 20 | Ceres | Physical body | ~2.769 | AU | Solar System | F0,R | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 21 | Jupiter Trojans | Spatial region | ~5.05-5.35 | AU | Jupiter orbit | F0,G(10) | V | M: L4/L5 populations, angularly offset; Flyby; [R1,S1] |
| 22 | Jupiter | Physical body | ~5.203 | AU | Solar System | F0,R,G(9) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 23 | Juno | Spacecraft | ~5.20 | AU | Jupiter | F0,R | P | M: Jupiter orbiter; mission status may change; Flyby; [R2,S2] |
| 24 | Io | Physical body | ~5.203 | AU | Jupiter | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 25 | Europa | Physical body | ~5.203 | AU | Jupiter | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 26 | Ganymede | Physical body | ~5.203 | AU | Jupiter | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 27 | Callisto | Physical body | ~5.203 | AU | Jupiter | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 28 | Saturn | Physical body | ~9.537 | AU | Solar System | F0,R,G(11) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 29 | Saturn Ring System | Spatial region | ~9.54 AU; ~67,000-140,000 km from Saturn centre | AU / km | Saturn | F0,G(12) | P | M: same encounter as Saturn; Context; [R1,S1] |
| 30 | Mimas | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 31 | Enceladus | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 32 | Tethys | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 33 | Dione | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 34 | Rhea | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 35 | Titan | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 36 | Iapetus | Physical body | ~9.537 | AU | Saturn | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 37 | 1P/Halley | Physical body | ~17.834 | AU | Solar System | F0,R | P | M: a=17.834 AU; perihelion ~0.59, aphelion ~35 AU; Full; [R1,S1] |
| 38 | Uranus | Physical body | ~19.189 | AU | Solar System | F0,R,G(13) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 39 | Miranda | Physical body | ~19.189 | AU | Uranus | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 40 | Ariel | Physical body | ~19.189 | AU | Uranus | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 41 | Umbriel | Physical body | ~19.189 | AU | Uranus | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 42 | Titania | Physical body | ~19.189 | AU | Uranus | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 43 | Oberon | Physical body | ~19.189 | AU | Uranus | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 44 | Neptune | Physical body | ~30.07 | AU | Solar System | F0,R,G(14) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 45 | Triton | Physical body | ~30.07 | AU | Neptune | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 46 | Kuiper Belt | Spatial region | ~30-50 | AU | Outer Solar System | F0,G(16) | V | M: model particles 37-50 AU; physical belt begins near Neptune; Transition; [R1,S7] |
| 47 | Pluto | Physical body | ~39.482 | AU | Solar System | F0,R,G(15) | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 48 | Charon | Physical body | ~39.482 | AU | Pluto | F0,R | P | M: host mean heliocentric distance; moon position varies; Full; [R1,S1] |
| 49 | Haumea | Physical body | ~43.116 | AU | Solar System | F0,R | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 50 | Makemake | Physical body | ~45.43 | AU | Solar System | F0,R | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 51 | Scattered Disc | Spatial region | ~50-120 model; objects extend farther | AU | Outer Solar System | F0,G(17) | V | L: model distribution is not a physical outer boundary; Transition; [R1,S7] |
| 52 | New Horizons | Spacecraft | ~66-67 | AU | Outer Solar System | F0,R | P | M: 2026 extrapolation from 2025 model; Flyby; [R2,S2] |
| 53 | Eris | Physical body | ~67.864 | AU | Solar System | F0,R | P | M: mean heliocentric semimajor axis; actual encounter distance varies; Full; [R1,S1] |
| 54 | Termination Shock | Boundary | ~80-100 | AU | Heliosphere | G | N | M: moving and direction-dependent; Transition; [S2] |
| 55 | Heliosheath | Spatial region | ~90-120 | AU | Heliosphere | G | N | M: between shock and heliopause; variable; Transition; [S2] |
| 56 | Pioneer 11 | Spacecraft | ~119 | AU | Outer Solar System | F0,R | P | M: 2026 linear model extrapolation; untracked; Full; [R2,S2] |
| 57 | Heliopause | Boundary | ~119-121; variable | AU | Heliosphere | G(18) | N | H: Voyager crossings near 121/119 AU; Transition; [S2] |
| 58 | Interstellar Medium | Spatial region | 0 around heliosphere; external beyond ~120 AU | AU | Local Arm | G(21) | C | H: gas surrounds heliosphere; transition at heliopause; Transition; [S2] |
| 59 | Local Interstellar Cloud | Spatial region | 0; tens of LY extent | LY | Local Bubble | G(22) | N | L: Sun in or near edge; boundary uncertain; Context; [S8] |
| 60 | Pioneer 10 | Spacecraft | ~141 | AU | Interstellar medium | F0,R | P | M: 2026 linear model extrapolation; untracked; Full; [R2,S2] |
| 61 | Voyager 2 | Spacecraft | ~144 | AU | Interstellar medium | F0,R | P | M: NASA mission table near 2026-09; Full; [R2,S2] |
| 62 | Voyager 1 | Spacecraft | ~172 | AU | Interstellar medium | F0,R | P | M: NASA mission table near 2026-09; Full; [R2,S2] |
| 63 | Inner Oort Cloud | Spatial region | ~2,000-20,000 | AU | Solar System | G(19) | N | L: inferred population; NASA inner edge ~2,000-5,000 AU; Transition; [S9] |
| 64 | Outer Oort Cloud | Spatial region | ~20,000-100,000 | AU | Solar System | G(20) | N | L: uncertain boundary; no direct cloud survey; Transition; [S9] |
| 65 | Proxima Centauri | Star or stellar system | ~4.24 | LY | Local Arm | F0,F+,G(23) | C | M: nearby-star estimate; Full; [R3,S3] |
| 66 | Alpha Centauri A/B | Star or stellar system | ~4.37 | LY | Local Arm | F0,F+,G(24) | C | M: nearby-star estimate; Full; [R3,S3] |
| 67 | Barnard's Star | Star or stellar system | ~5.95 | LY | Local Arm | F0,G(25) | C | M: nearby-star estimate; Full; [R3,S3] |
| 68 | Wolf 359 | Star or stellar system | ~7.8 | LY | Local Arm | F0,G(26) | C | M: nearby-star estimate; Full; [R3,S3] |
| 69 | Lalande 21185 | Star or stellar system | ~8.3 | LY | Local Arm | F0,G(27) | C | M: nearby-star estimate; Flyby; [R3,S3] |
| 70 | Sirius | Star or stellar system | ~8.6 | LY | Local Arm | F0,F+,G(28) | C | M: nearby-star estimate; Full; [R3,S3] |
| 71 | Ross 248 | Star or stellar system | ~10.32 | LY | Local Arm | F0 | C | M: nearby-star estimate; Flyby; [R3,S3] |
| 72 | Epsilon Eridani | Star or stellar system | ~10.49 | LY | Local Arm | F0,G(29) | C | M: nearby-star estimate; Full; [R3,S3] |
| 73 | Tau Ceti | Star or stellar system | ~11.9 | LY | Local Arm | F0,G(30) | C | M: nearby-star estimate; Full; [R3,S3] |
| 74 | Vega | Star or stellar system | ~25.04 | LY | Local Arm | F0,F+ | C | M: nearby-star estimate; Flyby; [R3,S3] |
| 75 | TRAPPIST-1 | Star or stellar system | ~40 | LY | Local Arm | G(31) | N | H: NASA rounded distance; no authored Reach system; Full; [S4] |
| 76 | Local Bubble | Spatial region | 0; ~500 LY characteristic radius | LY | Local Arm | G(32) | C | M: Sun inside; irregular cavity; Context; [S8] |
| 77 | Polaris | Star or stellar system | ~432.6 | LY | Local Arm | F0,F+ | C | L: HYG-era giant/supergiant distance; recheck against Gaia; Flyby; [R3,S3] |
| 78 | Ulker (Pleiades, M45) | Star cluster | ~0.44 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Full; [R4,S5] |
| 79 | Betelgeuse | Star or stellar system | ~500 | LY | Local Arm | F0,F+ | C | L: HYG-era giant/supergiant distance; recheck against Gaia; Full; [R3,S3] |
| 80 | PSR J0437-4715 | Pulsar / neutron star | ~0.51 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Flyby; [R5,S5] |
| 81 | Antares | Star or stellar system | ~554 | LY | Local Arm | F0,F+ | C | L: HYG-era giant/supergiant distance; recheck against Gaia; Flyby; [R3,S3] |
| 82 | Helis Bulutsusu (NGC 7293) | Remnant | ~0.65 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 83 | Geminga (PSR J0633+1746) | Pulsar / neutron star | ~0.82 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Flyby; [R5,S5] |
| 84 | Vela Pulsari (PSR B0833-45) | Pulsar / neutron star | ~0.94 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Full; [R5,S5] |
| 85 | PSR B1919+21 (LGM-1) | Pulsar / neutron star | ~0.98 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Flyby; [R5,S5] |
| 86 | Dambil Bulutsusu (M27) | Remnant | ~1.24 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 87 | Orion Bulutsusu (M42) | Nebula | ~1.34 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Full; [R4,S5] |
| 88 | Deneb | Star or stellar system | ~1412 | LY | Local Arm | F0,F+ | C | L: HYG-era giant/supergiant distance; recheck against Gaia; Flyby; [R3,S3] |
| 89 | Orion Arm / Local Arm | Spatial region | 0; several KLY across | KLY | Milky Way disk | G(33) | C | L: Sun inside; no sharp travel boundary; Context; [S10] |
| 90 | Gaia BH1 | Black hole | ~1.56 | KLY | Milky Way | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 91 | PSR B1257+12 (Lich) | Pulsar / neutron star | ~1.96 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Full; [R5,S5] |
| 92 | Draugr | Exoplanet | ~1.96 | KLY | Lich (PSR B1257+12) | F+ | C | L: host distance; authored planet, procedural surface; Flyby; [R5] |
| 93 | Poltergeist | Exoplanet | ~1.96 | KLY | Lich (PSR B1257+12) | F+ | C | L: host distance; authored planet, procedural surface; Flyby; [R5] |
| 94 | Phobetor | Exoplanet | ~1.96 | KLY | Lich (PSR B1257+12) | F+ | C | L: host distance; authored planet, procedural surface; Flyby; [R5] |
| 95 | Milky Way Galactic Disk | Spatial region | 0; ~100 KLY diameter | KLY | Milky Way | G(34) | C | M: Sun within disk; approximate extent; Context; [S10] |
| 96 | Halka Bulutsusu (M57) | Remnant | ~2.57 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 97 | A0620-00 | Black hole | ~3.46 | KLY | Milky Way | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 98 | Lagun Bulutsusu (M8) | Nebula | ~4.08 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 99 | Kartal Bulutsusu (M16) | Nebula | ~5.68 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Full; [R4,S5] |
| 100 | Yengec Pulsari (PSR B0531+21) | Pulsar / neutron star | ~6.52 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Full; [R5,S5] |
| 101 | Yengec Bulutsusu (M1) | Remnant | ~6.52 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Full; [R4,S5] |
| 102 | Cygnus X-1 | Black hole | ~7.24 | KLY | Milky Way | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 103 | Eta Carinae | Star | ~7.50 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 104 | V404 Cygni | Black hole | ~7.8 | KLY | Milky Way | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 105 | Karina Bulutsusu (NGC 3372) | Nebula | ~8.48 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Full; [R4,S5] |
| 106 | Cassiopeia A | Remnant | ~11.09 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 107 | Westerlund 1 | Star cluster | ~12.72 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 108 | 47 Tucanae (NGC 104) | Star cluster | ~14.51 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 109 | Omega Centauri (NGC 5139) | Star cluster | ~17.09 | KLY | Milky Way | F+ | C | M: source pc distance converted to KLY; Flyby; [R4,S5] |
| 110 | Hulse-Taylor Cifti (PSR B1913+16) | Pulsar / neutron star | ~17.12 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Full; [R5,S5] |
| 111 | PSR J1748-2446ad | Pulsar / neutron star | ~19.24 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Full; [R5,S5] |
| 112 | Milky Way Galactic Center | Spatial region | ~26.7 | KLY | Milky Way | G(35) | C | H: central region; Sgr A* is distinct; Full; [S10] |
| 113 | Sagittarius A* | Black hole | ~26.7 | KLY | Milky Way Galactic Center | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 114 | SGR 1806-20 (Magnetar) | Pulsar / neutron star | ~28.38 | KLY | Milky Way | F+ | C | M: catalogue pc converted; dispersion distances may be uncertain; Flyby; [R5,S5] |
| 115 | Yay Cuce Galaksisi | Galaxy | ~0.07 | MLY | Local Group | F0 | C | M: renderer model 0.02 Mpc; verify NED before route; Flyby; [R7,S6] |
| 116 | Milky Way Halo | Spatial region | 0; extends ~200-300 KLY or more | KLY | Milky Way | G(36) | C | L: halo definition and virial radius differ; Transition; [S10] |
| 117 | Large Magellanic Cloud | Galaxy | ~0.16 | MLY | Local Group | F0 | C | M: renderer model 0.05 Mpc; verify NED before route; Full; [R7,S6] |
| 118 | LMC X-1 | Black hole | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 119 | LMC X-3 | Black hole | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 120 | Tarantula Bulutsusu (30 Doradus) | Nebula | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Full; [R4,S5] |
| 121 | R136a1 | Star | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 122 | WOH G64 | Star | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 123 | NGC 1850 | Star cluster | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 124 | SN 1987A | Remnant | ~163 | KLY | Large Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Full; [R4,S5] |
| 125 | Small Magellanic Cloud | Galaxy | ~0.20 | MLY | Local Group | F0 | C | M: renderer model 0.061 Mpc; verify NED before route; Full; [R7,S6] |
| 126 | NGC 346 | Nebula | ~199 | KLY | Small Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Full; [R4,S5] |
| 127 | NGC 602 | Star cluster | ~199 | KLY | Small Magellanic Cloud | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 128 | Heykeltiras Cucesi | Galaxy | ~0.28 | MLY | Local Group | F0 | C | M: renderer model 0.086 Mpc; verify NED before route; Flyby; [R7,S6] |
| 129 | Fornax Cucesi | Galaxy | ~0.46 | MLY | Local Group | F0 | C | M: renderer model 0.14 Mpc; verify NED before route; Flyby; [R7,S6] |
| 130 | Leo I | Galaxy | ~0.82 | MLY | Local Group | F0 | C | M: renderer model 0.25 Mpc; verify NED before route; Flyby; [R7,S6] |
| 131 | Barnard Galaksisi (NGC 6822) | Galaxy | ~1.63 | MLY | Local Group | F0 | C | M: renderer model 0.5 Mpc; verify NED before route; Flyby; [R7,S6] |
| 132 | IC 1613 | Galaxy | ~2.38 | MLY | Local Group | F0 | C | M: renderer model 0.73 Mpc; verify NED before route; Flyby; [R7,S6] |
| 133 | M32 | Galaxy | ~2.48 | MLY | Local Group | F0 | C | M: renderer model 0.76 Mpc; verify NED before route; Flyby; [R7,S6] |
| 134 | Andromeda (M31) | Galaxy | ~2.54 | MLY | Local Group | F0,G(37) | C | M: renderer model 0.78 Mpc; verify NED before route; Full; [R7,S6] |
| 135 | Mayall II (G1) | Star cluster | ~2540 | KLY | Andromeda (M31) | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Full; [R4,S5] |
| 136 | Hubble'in V1 Sefeidi | Star | ~2540 | KLY | Andromeda (M31) | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 137 | S Andromedae (SN 1885A) | Remnant | ~2540 | KLY | Andromeda (M31) | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 138 | M31* | Black hole | ~2.54 | MLY | Andromeda (M31) | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 139 | NGC 206 | Star cluster | ~2540 | KLY | Andromeda (M31) | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Flyby; [R4,S5] |
| 140 | M110 | Galaxy | ~2.67 | MLY | Local Group | F0 | C | M: renderer model 0.82 Mpc; verify NED before route; Flyby; [R7,S6] |
| 141 | Triangulum (M33) | Galaxy | ~2.74 | MLY | Local Group | F0,G(38) | C | M: renderer model 0.84 Mpc; verify NED before route; Full; [R7,S6] |
| 142 | M33 X-7 | Black hole | ~2.74 | MLY | Triangulum (M33) | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 143 | NGC 604 | Nebula | ~2740 | KLY | Triangulum (M33) | F+ | C | M: host-galaxy distance proxy; depth within host unresolved; Full; [R4,S5] |
| 144 | Local Group | Large-scale cosmic structure | 0; ~10 MLY diameter | MLY | Local Sheet | G(39) | C | M: Sun is a member; not point destination; Context; [S6] |
| 145 | WLM | Galaxy | ~3.03 | MLY | Local Group | F0 | C | M: renderer model 0.93 Mpc; verify NED before route; Flyby; [R7,S6] |
| 146 | Local Sheet | Large-scale cosmic structure | 0; tens of MLY across | MLY | Virgo Supercluster | G(40) | N | L: dynamical sheet boundary definition-dependent; Context; [S11] |
| 147 | NGC 300 | Galaxy | ~6.20 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 1.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 148 | NGC 55 | Galaxy | ~6.85 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 2.1 Mpc; verify NED before route; Flyby; [R7,S6] |
| 149 | NGC 2403 | Galaxy | ~10.44 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 3.2 Mpc; verify NED before route; Flyby; [R7,S6] |
| 150 | Heykeltiras Galaksisi (NGC 253) | Galaxy | ~11.42 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 3.5 Mpc; verify NED before route; Flyby; [R7,S6] |
| 151 | Puro Galaksisi (M82) | Galaxy | ~11.42 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 3.5 Mpc; verify NED before route; Full; [R7,S6] |
| 152 | Bode Galaksisi (M81) | Galaxy | ~11.74 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 3.6 Mpc; verify NED before route; Flyby; [R7,S6] |
| 153 | M81* | Black hole | ~11.7 | MLY | Bode (M81) | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 154 | Centaurus A (NGC 5128) | Galaxy | ~12.39 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 3.8 Mpc; verify NED before route; Full; [R7,S6] |
| 155 | Centaurus A* | Black hole | ~12.4 | MLY | Centaurus A | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 156 | Guney Firildak (M83) | Galaxy | ~15.00 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 4.6 Mpc; verify NED before route; Flyby; [R7,S6] |
| 157 | M94 | Galaxy | ~15.33 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 4.7 Mpc; verify NED before route; Flyby; [R7,S6] |
| 158 | Kara Goz (M64) | Galaxy | ~17.29 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 5.3 Mpc; verify NED before route; Flyby; [R7,S6] |
| 159 | Firildak (M101) | Galaxy | ~20.87 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 6.4 Mpc; verify NED before route; Flyby; [R7,S6] |
| 160 | M106 | Galaxy | ~23.48 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 7.2 Mpc; verify NED before route; Flyby; [R7,S6] |
| 161 | M106 kara deligi | Black hole | ~23.5 | MLY | M106 | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 162 | Girdap (M51) | Galaxy | ~28.05 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 8.6 Mpc; verify NED before route; Full; [R7,S6] |
| 163 | Aycicegi (M63) | Galaxy | ~29.03 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 8.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 164 | Hayalet (M74) | Galaxy | ~29.35 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 165 | NGC 891 | Galaxy | ~29.68 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 9.1 Mpc; verify NED before route; Flyby; [R7,S6] |
| 166 | M96 | Galaxy | ~30.66 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 9.4 Mpc; verify NED before route; Flyby; [R7,S6] |
| 167 | Sombrero (M104) | Galaxy | ~31.31 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 9.6 Mpc; verify NED before route; Full; [R7,S6] |
| 168 | Sombrero kara deligi | Black hole | ~31.3 | MLY | Sombrero (M104) | F+ | C | M: model or host distance; nested observation stage; Flyby; [R6,S5] |
| 169 | M95 | Galaxy | ~32.62 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 10 Mpc; verify NED before route; Flyby; [R7,S6] |
| 170 | M105 | Galaxy | ~34.57 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 10.6 Mpc; verify NED before route; Flyby; [R7,S6] |
| 171 | M65 | Galaxy | ~34.90 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 10.7 Mpc; verify NED before route; Flyby; [R7,S6] |
| 172 | M66 | Galaxy | ~34.90 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 10.7 Mpc; verify NED before route; Flyby; [R7,S6] |
| 173 | NGC 3628 | Galaxy | ~34.90 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 10.7 Mpc; verify NED before route; Flyby; [R7,S6] |
| 174 | Igne Galaksisi (NGC 4565) | Galaxy | ~38.81 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 11.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 175 | NGC 7331 | Galaxy | ~39.79 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 12.2 Mpc; verify NED before route; Flyby; [R7,S6] |
| 176 | M77 | Galaxy | ~42.07 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 12.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 177 | M108 | Galaxy | ~45.99 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 14.1 Mpc; verify NED before route; Flyby; [R7,S6] |
| 178 | M86 | Galaxy | ~49.58 | MLY | Virgo Cluster | F0 | C | M: renderer model 15.2 Mpc; verify NED before route; Flyby; [R7,S6] |
| 179 | M99 | Galaxy | ~49.58 | MLY | Virgo Cluster | F0 | C | M: renderer model 15.2 Mpc; verify NED before route; Flyby; [R7,S6] |
| 180 | M100 | Galaxy | ~52.18 | MLY | Virgo Cluster | F0 | C | M: renderer model 16 Mpc; verify NED before route; Flyby; [R7,S6] |
| 181 | M61 | Galaxy | ~52.18 | MLY | Virgo Cluster | F0 | C | M: renderer model 16 Mpc; verify NED before route; Flyby; [R7,S6] |
| 182 | Virgo A (M87) | Galaxy | ~53.49 | MLY | Virgo Cluster | F0 | C | M: renderer model 16.4 Mpc; verify NED before route; Full; [R7,S6] |
| 183 | M87* | Black hole | ~53.5 | MLY | Virgo A (M87) | F+ | C | M: model or host distance; nested observation stage; Full; [R6,S5] |
| 184 | Virgo Cluster | Galaxy cluster | ~54 centre; members span ~50-65 | MLY | Virgo Supercluster | G(41) | C | M: centre reference, not single point; Full; [S6] |
| 185 | M60 | Galaxy | ~54.79 | MLY | Virgo Cluster | F0 | C | M: renderer model 16.8 Mpc; verify NED before route; Flyby; [R7,S6] |
| 186 | M84 | Galaxy | ~54.79 | MLY | Virgo Cluster | F0 | C | M: renderer model 16.8 Mpc; verify NED before route; Flyby; [R7,S6] |
| 187 | M109 | Galaxy | ~55.12 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 16.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 188 | M49 | Galaxy | ~55.77 | MLY | Virgo Cluster | F0 | C | M: renderer model 17.1 Mpc; verify NED before route; Flyby; [R7,S6] |
| 189 | NGC 1365 | Galaxy | ~58.38 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 17.9 Mpc; verify NED before route; Flyby; [R7,S6] |
| 190 | NGC 1300 | Galaxy | ~60.99 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 18.7 Mpc; verify NED before route; Flyby; [R7,S6] |
| 191 | Fornax A (NGC 1316) | Galaxy | ~61.97 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 19 Mpc; verify NED before route; Flyby; [R7,S6] |
| 192 | M58 | Galaxy | ~62.30 | MLY | Virgo Cluster | F0 | C | M: renderer model 19.1 Mpc; verify NED before route; Flyby; [R7,S6] |
| 193 | Antenler (NGC 4038/4039) | Galaxy | ~71.75 | MLY | Nearby extragalactic field | F0 | C | M: renderer model 22 Mpc; verify NED before route; Full; [R7,S6] |
| 194 | Virgo Supercluster / Local Supercluster | Large-scale cosmic structure | 0; ~110 MLY characteristic diameter | MLY | Laniakea | G(42) | N | L: historical definition; Sun inside; Context; [S11] |
| 195 | Laniakea Supercluster | Large-scale cosmic structure | 0; ~520 MLY characteristic diameter | MLY | Cosmic web | G(44) | N | M: flow basin containing Sun; Context; [S11] |
| 196 | Great Attractor Region | Large-scale cosmic structure | ~150-250 representative | MLY | Laniakea | G(43) | N | L: flow region, not single object; Context; [S11] |
| 197 | Perseus-Pisces Supercluster | Large-scale cosmic structure | ~200-300 representative | MLY | Cosmic web | G(45) | N | L: distributed filament; distance by segment; Transition; [S20] |
| 198 | Hoag's Object | Galaxy | ~600 | MLY | Extragalactic field | G(47) | N | H: NASA/Hubble rounded distance; Full; [S19] |
| 199 | Quipu Superstructure | Large-scale cosmic structure | ~425-815 member span | MLY | Cosmic web | G(50) | N | M: 130-250 Mpc is distance; length >400 Mpc; Context; [S12] |
| 200 | Shapley Supercluster | Large-scale cosmic structure | ~600-700 representative | MLY | Cosmic web | G(46) | N | M: distributed supercluster; Transition; [S21] |
| 201 | Bootes Void | Large-scale cosmic structure | ~700 centre; radius ~202 | MLY | Cosmic web | G(48) | N | M: primary survey v=15,500 km/s, radius 62 Mpc; centre distance depends on H0; Transition; [S22] |
| 202 | Sloan Great Wall | Large-scale cosmic structure | ~1 representative | GLY | Cosmic web | G(49) | N | L: broad wall; representative distance; Context; [S23] |
| 203 | Giant GRB Ring | Candidate large-scale structure | z=0.78-0.86 | redshift | Cosmic web | G(54) | N | L: GRB pattern; coherence uncertain; Context; [S14] |
| 204 | Huge-LQG | Candidate large-scale structure | z~1.27 | redshift | Cosmic web | G(53) | N | L: quasar association disputed; Context; [S15] |
| 205 | Giant Arc | Candidate large-scale structure | ~9.2 light travel | GLY | Cosmic web | G(51) | N | L: lookback distance; physical coherence debated; Context; [S16] |
| 206 | Big Ring | Candidate large-scale structure | ~9.2 light travel | GLY | Cosmic web | G(52) | N | L: lookback distance; Mg II tracer pattern; Context; [S16] |
| 207 | Hercules-Corona Borealis Great Wall | Candidate large-scale structure | z~1.6-2.1 | redshift | Cosmic web | G(55) | N | L: GRB-inferred; contested; Context; [S17] |
| 208 | Cosmic Web Filaments | Conceptual scale marker | 0 to observable horizon | GLY | Observable Universe | G(56) | N | H: pattern throughout; no single destination; Context; [S18] |
| 209 | Observable Universe Edge | Observational horizon | ~46 present comoving radius | GLY | Observable Universe | G(57) | N | M: no physical wall or reachable arrival; Context; [S18] |
| 210 | Cosmic Microwave Background Surface | Observational horizon | ~45-46 present comoving; ~13.8 Gyr lookback | GLY / Gyr | Observable Universe | G(58) | N | M: last-scattering light cone, not a wall; Context; [S18] |

## 4. Nested regions and scale markers

- **The Sun is already inside:** the local interstellar gas/cloud, Local Bubble, Orion/Local Arm, Milky Way disk and halo, Local Group, Local Sheet, Virgo/Local Supercluster, Laniakea and cosmic-web filaments. Nearest distance is zero for each; table placement indicates an interpretive chapter or a meaningful outer edge. No centre is treated as an ordinary departure-to-arrival leg.
- **Solar populations overlap:** the belt and Trojans, Kuiper Belt and Scattered Disc contain objects with a range of orbital shapes. NASA gives an Oort inner edge around 2,000-5,000 AU and possible outer edge 10,000-100,000 AU. The inner/outer split shown in the table is illustrative. Heliopause distance varies with time and direction; individual probes cannot be placed on a universal one-dimensional path [S2,S9].
- **Hosts contain children:** the Magellanic Clouds, Andromeda, M33 and M87 have named internal targets. Their equal rounded Sun distance does not make them duplicates. The Virgo Cluster covers a volume, so individual member distances can straddle its representative centre. The Great Attractor is a flow region within the broader Laniakea construction.
- **Cosmological scales differ:** approximate nearby galaxy distances and model Mpc values are adequate only for a preliminary order. Quipu is given a member-distance range, not its length. The Sloan wall, voids and superclusters have no exact centre-leg distance. The Giant Arc/Big Ring values are light-travel descriptions; GRB and LQG candidates retain redshift. A chosen cosmology is required to put all on a present comoving axis. The observable horizon and CMB surface are observational concepts.

## 5. Recommended encounter use

- **Full arrival/observation:** retain the 41 released v1.0.0 stops and the six spacecraft integrated in the current uncommitted development route, then curate a smaller set of stellar and deep-sky set pieces: Proxima, Alpha Centauri, Sirius, TRAPPIST-1, Orion, Crab remnant/pulsar, Galactic Center/Sgr A*, the Magellanic Clouds and Tarantula, Andromeda, Triangulum, M87/M87*, Centaurus A and Hoag's Object. The table intentionally flags more full candidates than a final route needs.
- **Brief flyby:** secondary named galaxies, clusters, stellar remnants, some pulsars and compact objects, the two Mars rovers after surface encounters are approved, and Lich planets. A flyby of an exoplanet uses an acknowledged interpretation, never invented observed surface imagery.
- **Regional/environment event:** local orbital space, belts, heliospheric boundaries, Oort ranges, Galactic halo and selected void or supercluster approaches. Treat these as environment changes or narration events rather than exact body arrivals.
- **Context only:** overlapping structures that contain the Sun, debated enormous associations, cosmic web and observable horizons. Do not allocate a physical journey leg to the CMB or an edge of the universe.

## 6. Scientific references and uncertainties

- `R1`: Local `src/data/solarSystem.ts`; initial release verified with `git show 5f23915:src/data/solarSystem.ts`. Orbital elements and belt-particle ranges are model data.
- `R2`: Local `src/data/spacecraft.ts`; approximate state as of 2025-01-01, linear probe speeds, and spacecraft models.
- `R3`: Local `public/data/star-names.json`, `public/data/stars.bin` and `src/data/tours.ts`; HYG-derived star names and later authored tour targets.
- `R4`: Local `src/data/landmarks.ts`; named landmark positions and pc or host distances.
- `R5`: Local `src/data/pulsars.ts`; pulsars and their specifically authored companion planets.
- `R6`: Local `src/data/blackholes.ts`; 14 named black-hole systems.
- `R7`: Local `src/galaxy/galaxies.ts`; 54 named galaxy records, explicitly described as approximate parameters.
- `S1`: [NASA/JPL Solar System dynamics](https://ssd.jpl.nasa.gov/planets/) and local JPL-style source elements; orbital means used for broad sort.
- `S2`: [NASA Voyager live table](https://science.nasa.gov/specials/apps/voyager-vital-signs/table/) and [Voyager FAQ](https://science.nasa.gov/mission/voyager/frequently-asked-questions/).
- `S3`: [NASA Sun facts](https://science.nasa.gov/sun/facts/) and [nearby star overview](https://science.nasa.gov/the-science-behind-project-hail-mary/).
- `S4`: [NASA TRAPPIST-1](https://science.nasa.gov/solar-system/10-things-all-about-trappist-1/); about 40 LY.
- `S5`: [SIMBAD database](https://simbad.cds.unistra.fr/simbad/) is a future object-by-object validation source. Rows marked R4-R6 retain repository estimates; this report does not claim a fresh SIMBAD measurement for every object.
- `S6`: [NASA Andromeda](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-31/), [M33](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-33/) and [LMC](https://science.nasa.gov/the-galaxy-next-door/).
- `S7`: [NASA Solar System overview](https://science.nasa.gov/learn/basics-of-space-flight/chapter1-1/); trans-Neptunian populations.
- `S8`: [ESA Local Bubble](https://www.esa.int/ESA_Multimedia/Images/2023/12/The_Local_Bubble_around_the_Sun).
- `S9`: [NASA Oort Cloud facts](https://science.nasa.gov/solar-system/oort-cloud/facts/); cloud bounds inferred, not directly mapped.
- `S10`: [NASA Milky Way location](https://science.nasa.gov/learn/basics-of-space-flight/chapter1-1/); Sun within Orion Arm, centre about 26,000 LY.
- `S11`: [Original Laniakea study](https://arxiv.org/abs/1409.0880); local supercluster/flow boundaries depend on definition.
- `S12`: [Quipu discovery paper](https://arxiv.org/abs/2501.19236); member clusters 130-250 Mpc distant, length more than 400 Mpc.
- `S13`: [NASA large-scale structures](https://science.nasa.gov/universe/galaxies/large-scale-structures/); Sloan Great Wall spans about 1.4 GLY, which is its length, not its Sun distance.
- `S14`: [Giant GRB Ring study](https://academic.oup.com/mnras/article/452/3/2236/1078524); redshift 0.78-0.86.
- `S15`: [Huge-LQG discovery](https://arxiv.org/abs/1211.6256) and [statistical challenge](https://arxiv.org/abs/1502.03563); mean z 1.27.
- `S16`: [Giant Arc study](https://academic.oup.com/mnras/article/516/2/1557/6657809) and [AAS Giant Arc/Big Ring presentation](https://aas.org/sites/default/files/2024-01/AAS243_Thu2_AlexiaLopez.pdf).
- `S17`: [Hercules-Corona Borealis GRB analysis](https://academic.oup.com/mnras/article/498/2/2544/5895980) and [critical reanalysis](https://academic.oup.com/mnras/article/495/4/4291/5843300).
- `S18`: [NASA observable-universe explanation](https://science.nasa.gov/image-article/apod-2022-march-16-the-observable-universe/) and [US decadal report](https://assets.science.nasa.gov/content/dam/science/astro/programs/cosmic-origins/documents/astro2020/26141.pdf).
- `S19`: [NASA/Hubble Hoag's Object](https://science.nasa.gov/asset/hubble/ring-of-hot-blue-stars-pinwheels-around-yellow-nucleus-of-hoags-object-galaxy/); approximately 600 MLY.

- `S20`: [ESA/Hubble Perseus Cluster](https://esahubble.org/images/heic0817c/); a member of the Perseus-Pisces complex is about 235-250 MLY away, supporting a broad regional range.
- `S21`: [NASA HEASARC Shapley Supercluster](https://heasarc.gsfc.nasa.gov/docs/objects/heapow/archive/large_scale_structure/shapley_erosita.html); roughly 650 MLY.
- `S22`: [Kirshner et al. 1987 primary Bootes Void survey](https://articles.adsabs.harvard.edu/pdf/1987ApJ...314..493K); centre recession velocity 15,500 km/s and radius 62 Mpc. The ~700 MLY centre is a rounded H0-dependent low-redshift inference, and near edge is roughly 500 MLY.
- `S23`: [NASA Sloan Great Wall image](https://science.nasa.gov/image-article/apod-2007-november-7-the-sloan-great-wall-largest-known-structure/) and [discovery context](https://arxiv.org/abs/1311.1104); approximately 1 GLY away, distinct from its more than 1 GLY length.

Before implementation: refresh moving spacecraft ephemerides, especially silent Pioneers; recheck HYG-era giant-star distances with Gaia/SIMBAD; confirm any promoted galaxy against NED or a published distance measurement; choose cosmological parameters before assigning one-axis distances to redshift structures; and decide whether GRB, quasar and Mg II patterns merit physical cinematic representation. No missing precision is invented here.

## 7. Game-list coverage and open owner decisions

| Game # | Original reference entry | Merged order | Canonical row |
| --- | --- | --- | --- |
| 1 | Earth | 1 | Earth |
| 2 | Low Earth Orbit | 2 | Low Earth Orbit |
| 3 | Geostationary Orbit | 5 | Geostationary Orbit |
| 4 | Cislunar Space | 6 | Cislunar Space |
| 5 | Venus | 12 | Venus |
| 6 | Mercury | 11 | Mercury |
| 7 | Mars | 13 | Mars |
| 8 | Main Asteroid Belt | 18 | Main Asteroid Belt |
| 9 | Jupiter | 22 | Jupiter |
| 10 | Jupiter Trojans | 21 | Jupiter Trojans |
| 11 | Saturn | 28 | Saturn |
| 12 | Saturn Ring System | 29 | Saturn Ring System |
| 13 | Uranus | 38 | Uranus |
| 14 | Neptune | 44 | Neptune |
| 15 | Pluto | 47 | Pluto |
| 16 | Kuiper Belt | 46 | Kuiper Belt |
| 17 | Scattered Disc | 51 | Scattered Disc |
| 18 | Heliopause | 57 | Heliopause |
| 19 | Inner Oort Cloud | 63 | Inner Oort Cloud |
| 20 | Outer Oort Cloud | 64 | Outer Oort Cloud |
| 21 | Interstellar Medium | 58 | Interstellar Medium |
| 22 | Local Interstellar Cloud | 59 | Local Interstellar Cloud |
| 23 | Proxima Centauri | 65 | Proxima Centauri |
| 24 | Alpha Centauri A/B | 66 | Alpha Centauri A/B |
| 25 | Barnard’s Star | 67 | Barnard's Star |
| 26 | Wolf 359 | 68 | Wolf 359 |
| 27 | Lalande 21185 | 69 | Lalande 21185 |
| 28 | Sirius | 70 | Sirius |
| 29 | Epsilon Eridani | 72 | Epsilon Eridani |
| 30 | Tau Ceti | 73 | Tau Ceti |
| 31 | TRAPPIST-1 | 75 | TRAPPIST-1 |
| 32 | Local Bubble | 76 | Local Bubble |
| 33 | Orion Arm / Local Arm | 89 | Orion Arm / Local Arm |
| 34 | Milky Way Galactic Disk | 95 | Milky Way Galactic Disk |
| 35 | Milky Way Galactic Center | 112 | Milky Way Galactic Center |
| 36 | Milky Way Halo | 116 | Milky Way Halo |
| 37 | Andromeda Galaxy | 134 | Andromeda (M31) |
| 38 | Triangulum Galaxy | 141 | Triangulum (M33) |
| 39 | Local Group | 144 | Local Group |
| 40 | Local Sheet | 146 | Local Sheet |
| 41 | Virgo Cluster | 184 | Virgo Cluster |
| 42 | Virgo Supercluster / Local Supercluster | 194 | Virgo Supercluster / Local Supercluster |
| 43 | Great Attractor Region | 196 | Great Attractor Region |
| 44 | Laniakea Supercluster | 195 | Laniakea Supercluster |
| 45 | Perseus-Pisces Supercluster | 197 | Perseus-Pisces Supercluster |
| 46 | Shapley Supercluster | 200 | Shapley Supercluster |
| 47 | Hoag’s Object | 198 | Hoag's Object |
| 48 | Boötes Void | 201 | Bootes Void |
| 49 | Sloan Great Wall | 202 | Sloan Great Wall |
| 50 | Quipu Superstructure | 199 | Quipu Superstructure |
| 51 | Giant Arc | 205 | Giant Arc |
| 52 | Big Ring | 206 | Big Ring |
| 53 | Huge-LQG | 204 | Huge-LQG |
| 54 | Giant GRB Ring | 203 | Giant GRB Ring |
| 55 | Hercules-Corona Borealis Great Wall | 207 | Hercules-Corona Borealis Great Wall |
| 56 | Cosmic Web Filaments | 208 | Cosmic Web Filaments |
| 57 | Observable Universe Edge | 209 | Observable Universe Edge |
| 58 | Cosmic Microwave Background Surface | 210 | Cosmic Microwave Background Surface |

The released v1.0.0 baseline has 41 production IDs in this authored order: `earth`, `moon`, `mars`, `phobos`, `deimos`, `vesta`, `ceres`, `jupiter`, `io`, `europa`, `ganymede`, `callisto`, `saturn`, `mimas`, `enceladus`, `tethys`, `dione`, `rhea`, `titan`, `iapetus`, `uranus`, `miranda`, `ariel`, `umbriel`, `titania`, `oberon`, `neptune`, `triton`, `pluto`, `charon`, `haumea`, `makemake`, `eris`, `pioneer11`, `pioneer10`, `voyager2`, `voyager1`, `halley`, `sun`, `mercury`, `venus`. The six integrated spacecraft are absent from that released baseline.

Open owner decisions: select a small promoted subset of the 54 named galaxies and other deep-sky entries; decide whether host black holes and Lich planets are distinct arrivals or observation stages; and choose a cosmology and evidence threshold for very large candidate structures. Future travel time and reverse-route mechanics require separate review. No travel times are assigned here.

## 8. Approved 47-stop production itinerary (uncommitted implementation)

The owner approved the following Earth-departure order on 2026-10-12. It groups spacecraft with nearby parent bodies, makes one early sunward sweep, then proceeds generally outward. This is a separate itinerary decision: it does not change the 210-row distance-ordered catalogue above. The current uncommitted development route in `src/reach/ReachVoyageDirector.ts` now follows this order with version 3 save migration. It has not been committed or released.

| Stop | Destination | ID |
| --- | --- | --- |
| 1 | Earth | `earth` |
| 2 | ISS | `iss` |
| 3 | Hubble Space Telescope | `hubble` |
| 4 | Moon | `moon` |
| 5 | James Webb Space Telescope | `jwst` |
| 6 | Sun | `sun` |
| 7 | Parker Solar Probe | `parker` |
| 8 | Mercury | `mercury` |
| 9 | Venus | `venus` |
| 10 | Mars | `mars` |
| 11 | Phobos | `phobos` |
| 12 | Deimos | `deimos` |
| 13 | Vesta | `vesta` |
| 14 | Ceres | `ceres` |
| 15 | Jupiter | `jupiter` |
| 16 | Juno | `juno` |
| 17 | Io | `io` |
| 18 | Europa | `europa` |
| 19 | Ganymede | `ganymede` |
| 20 | Callisto | `callisto` |
| 21 | Saturn | `saturn` |
| 22 | Mimas | `mimas` |
| 23 | Enceladus | `enceladus` |
| 24 | Tethys | `tethys` |
| 25 | Dione | `dione` |
| 26 | Rhea | `rhea` |
| 27 | Titan | `titan` |
| 28 | Iapetus | `iapetus` |
| 29 | 1P/Halley | `halley` |
| 30 | Uranus | `uranus` |
| 31 | Miranda | `miranda` |
| 32 | Ariel | `ariel` |
| 33 | Umbriel | `umbriel` |
| 34 | Titania | `titania` |
| 35 | Oberon | `oberon` |
| 36 | Neptune | `neptune` |
| 37 | Triton | `triton` |
| 38 | Pluto | `pluto` |
| 39 | Charon | `charon` |
| 40 | Haumea | `haumea` |
| 41 | Makemake | `makemake` |
| 42 | New Horizons | `newhorizons` |
| 43 | Eris | `eris` |
| 44 | Pioneer 11 | `pioneer11` |
| 45 | Pioneer 10 | `pioneer10` |
| 46 | Voyager 2 | `voyager2` |
| 47 | Voyager 1 | `voyager1` |

Halley's slot follows its mean semimajor axis, not its instantaneous position. Its approximately 0.59-35 AU orbital range may produce a non-outward leg in the actual simulation. Perseverance and Curiosity would fit after Mars and before Phobos if separately approved for production; neither is among the 47 approved stops. Perseverance is development-preview-only, and Curiosity's surface encounter remains pending.

The uncommitted implementation uses itinerary version 3 and migrates valid released version 1 and uncommitted version 2 saves directly. It maps the saved route index by stable destination ID and preserves the saved simulation epoch, camera state, active phase, elapsed and total duration, and the explicit next destination or flight target. An active departure or cruise finishes its recorded leg, even when that leg is no longer adjacent in the new order; its predecessor is validated against the route version that created it. Completed odometer distance, the sampled active-leg distance and departure epoch, and recorded round-trip history are retained without recalculating prior legs. Countdown remaining time continues from the saved phase. After the transitional leg, the next departure follows the version 3 successor. A rejected checkpoint remains in storage instead of being overwritten by a fresh voyage.
