# THE REACH V4 — Read-Only Camera & Presentation Audit

**Date:** October 13, 2026  
**Repositories:** `C:\Storage\Universe`, `C:\Storage\Screensaver`  
**Mode:** Read-only audit (no code changes, no save mutation)

---

## 1. Executive summary

### Confirmed (source-backed)

| Finding | Implication |
|--------|-------------|
| **Reach uses one authoritative camera pose** on the primary display; followers copy `position` + `orientation` via `BroadcastChannel` (`ReachPanorama.ts`, `main.ts`). | Left/right monitors are **slices of the same view**, not separate cameras. |
| **Panorama uses Three.js `setViewOffset`** over the virtual desktop (`ReachPanorama.ts` `applyPanoramaView`, `Engine.ts` `resize`). | “Left monitor bias” cannot be fixed with per-monitor yaw without breaking sync. |
| **Voyage camera choreography is almost entirely deterministic.** The only `Math.random` in timing is **leg duration** (`ReachTiming.ts`); flight endpoints are saved in checkpoints (`JourneyState` `ReachFlightState`). | Repeated approaches are **by design**, not RNG per visit. |
| **Signed rotation is consistently positive** for dwell orbit (`OBSERVATION_ORBIT = 0.012`), moon flyby (`MOON_FLYBY_RATE = 0.025`), and departure (`orbitRate` inherited from `autoOrbit` or flyby). | One **world-space spin direction** on most departures and orbits—not a per-destination lottery. |
| **Inter-leg travel (`NEXT`)** is `CameraController.goToVantage` with great-circle offset slerp + optional `cinematicCruise` yaw/pitch on flights ≥120s (`CameraController.ts` 334–371, `ReachVoyageDirector.ts` 502). | Long cruises get **slow sinusoidal drift**, not random spins. |
| **Planet/moon arrivals** use `sunlitArrivalDirection` (sunlit hemisphere, fixed at departure) (`ReachVoyageDirector.ts` 519–550). | Composition correlates with **solar direction + inbound geometry**, not monitor index. |
| **Custom overrides exist** for Alpha Centauri (`ReachAlphaCinematic`), binary overview (`binaryOverviewDirection`), moons (flyby + parent-safe approach), probes/sun (skip sunlit retarget). | Any fix must **preserve these branches**. |
| **Odometer** updates ~1 Hz from `distanceTravelledKm` on **primary only** (`ReachOdometer.ts`, `main.ts` 310–314). | Speed HUD can reuse the same pipeline. |
| **Reach v4 itinerary has no black holes / Great Attractor / cosmic walls** as stops; those exist in free-roam / `FarUniverse` / docs, not production voyage. | Part C is **framework survey**, not current route content. |

### Hypotheses (plausible, not proven on your physical rig without capture)

1. **“Camera pans left every time”** is likely **choreography**: positive `orbitRate` during departure + `autoOrbit` during observe + `goToVantage` direction slerp from a similar post-departure attitude. There is **no** dedicated “pan left” flag; the effect is emergent from **fixed signs** and shared algorithms.
2. **“Best action on the left monitor”** is likely **both** choreography **and** projection:
   - **Projection:** In the canonical 3-monitor fixture, **panoramic optical center ≠ primary monitor center** (`test-reach-journey.mjs` desktop `8320×2160`, left `-3840…0`, primary `0…2560`). A **centered** target sits on the primary but **left of its middle**; the **left third** of the panorama is the left display—sun, rings, and approach context often sit **off-center** and can dominate there while the primary feels “empty.”
   - **Choreography:** Early `NEXT` frames use orientation slerp (`smoothstep(s×1.6)`); the body is not locked to screen center for the whole leg—peripheral drama can read as “left screen” even when the destination ends centered.

**Unproven without runtime evidence:** exact split between spin direction vs asymmetric layout on your specific resolutions/DPI; whether inbound vs outbound changes the perceived side.

---

## 2. Camera pipeline (with file:line evidence)

### 2.1 Voyage state machine (`ReachVoyageDirector.ts`)

| Stage | Internal `stage` | Countdown `phase` | Who moves the camera |
|--------|------------------|-------------------|----------------------|
| Dwell / orbit | `observe` | `DEPART` | `CameraController.update` → `autoOrbit` (`382`, `387–389`) |
| Moon flyby | `flyby` | `DEPART` | Director `updateFlyby` (`392–398`) |
| Pull away / aim at next | `departure` | `CRUISE` | Director `updateDeparture` (`441–465`) |
| Inter-stop flight | `cruise` + autopilot | `NEXT` | `CameraController` autopilot `goto` (`336–337`, `502–503`) |
| Alpha A/B | `alpha` (parallel) | `DEPART` | `ReachAlphaCinematic` (`318–332`, `356–367`) |

**Destination selection:** `nextDestinationId()` (`429–438`) — v4 outbound/inbound with `cycleItineraryVersion`; production order `REACH_ITINERARY` / `V4_STOP_IDS` (`31–93`).

**Arrival (end of departure):** frame switch if needed (`471–477`), build `approach` / `arrival` / `distance` / `flightDuration` (`478–501`), then:

```text
ReachVoyageDirector.ts:502
this.camera.goToVantage(destination, arrival, distance, flightDuration, binaryUp, stop.profile !== 'star', true);
```

- `gentleStart`: `true` for non-`star` (`stop.profile !== 'star'`).
- `cinematicCruise`: always `true` on this call.

**Return journey:** at last stop outbound → `direction = 'inbound'` (`345–347`); at Earth inbound → `roundTripCount++` (`348–351`).

### 2.2 Yaw / pitch / roll / orbit / look-at / easing

**`goToVantage` / autopilot `goto`** (`CameraController.ts`):

- **Position:** log radial blend `dist(s)` + **spherical slerp** from `r0` to `dir1` (`334–347`).
- **Orientation:** `lookAt(target)` with optional fixed `up1`; slerp from `q0` with `smoothstep(min(1, s×1.6))` (`359–362`).
- **`gentleStart`:** progress damped for first 25% of duration (`326–327`).
- **`cinematicCruise`:** if `duration ≥ 120`, envelope × `sin` yaw on **Y** and pitch on **X** (`363–371`) — deterministic in time, not seeded.

**Dwell:** `autoOrbit` rad/s about camera **up** (`409–413`).

**Departure:** orbit offset via `setFromAxisAngle(d.up, orbitAngle)` with `orbitAngle = orbitRate × duration × (u − u² + u³/3)` (`445–452`); quaternion `orbitOrientation` slerps toward look-at next system (`454–465`).

**Moon flyby:** same axis pattern with `MOON_FLYBY_RATE × elapsed` (`395–398`).

**Arrival direction (planets/moons/small):** `sunlitArrivalDirection` — if `proposed·toSun < 0.2`, pick tangent sunlit `vantage` at `TARGET_SUNLIT_DOT = 0.6` (`519–550`); moons search ±12 steps around sun axis (`543–548`).

**Stars:** `arrival = approach` (no sunlit retarget) (`497–498`). **Probes/sun:** early return in `sunlitArrivalDirection` (`520`).

**Alpha / binary:** `ReachAlphaCinematic` uses fixed `side` from incoming vector (`125–131`, shots `163–177`); `binaryOverviewDirection` applies fixed `applyAxisAngle(axis, 1.2)` (`507–516`).

### 2.3 Randomization & checkpoints

| Mechanism | Random? | Checkpoint |
|-----------|---------|------------|
| Travel/observe/departure **durations** | Yes — `ReachTiming.pick` (`63–66`) | Phase `elapsed`/`duration` in `JourneyPhase` |
| **Flight geometry** (`dir1`, `dist1`, `r0`, `q0`, flags) | No — fixed at leg start | `camera.flight` + full `camera` pose (`237–240`, `283–291`) |
| Departure `orbitRate`, `radialSpeed` | No — from `autoOrbit` / flyby | `phase` kind `departure` (`227–232`, `303–309`) |
| Alpha cinematic | No — `side`/`up` saved | `phase` kind `binary` (`145–147`, `310–314`) |

Restoring a cruise leg **replays the same** `endDirection` and `cinematicCruise` (`283–291`).

### 2.4 Saved journey restoration

- `restore()` (`257–316`): pose, `autoOrbit`, autopilot reconstruction, phase → `stage` / `flyby` / `departure` / `alpha`.
- **Persistence:** primary only — `reachStore` when `isPrimaryDisplay !== false` (`main.ts` 129–132); followers **no** `ReachVoyageDirector` (`297–302`).
- Auto-save ~30s + `pagehide` / `visibilitychange` (`1415`, `325–329`).

---

## 3. Left pan / left-monitor bias — two problems

### Problem A: Camera genuinely rotating one way

**Evidence for a consistent positive spin family:**

```text
ReachVoyageDirector.ts:123-124
const OBSERVATION_ORBIT = 0.012;
const MOON_FLYBY_RATE = 0.025;
```

```text
ReachVoyageDirector.ts:389
this.beginDeparture(0, this.camera.autoOrbit);
```

```text
ReachVoyageDirector.ts:445-446
const orbitAngle = d.orbitRate * d.duration * (u - u * u + u * u * u / 3);
const orbit = new Quaternion().setFromAxisAngle(d.up, orbitAngle);
```

No code path negates `orbitRate` for variety. **Inbound vs outbound** changes route order, not these formulas.

**`NEXT` leg:** approach path is the **short great-circle** from current offset to `arrival`; combined with **sunlit** bias, paths are **correlated** across the solar system (ecliptic/solar direction), which can **feel** like the same swing even when not literally “yaw left” in camera Euler space.

**Not the cause:** per-monitor camera offsets (none exist).

### Problem B: Panorama puts drama on the left display

**Shared orientation** — primary publishes, followers apply (`main.ts` 1402–1413, 1384–1392).

**Projection** — one frustum, horizontal slices (`ReachPanorama.ts` 74–77, `Engine.ts` 72–75).

Tests assert each monitor’s **center pixel** maps to that monitor’s center (`test-reach-journey.mjs` 426–431), and seams align (443–447). **Global** look-at center maps to **panorama geometric center** (`desktop.x + width/2`), which for the standard fixture is **not** the primary’s physical center.

**Why primary can look “empty”:** autopilot **looks at the target**; sun, rings, parent planet, star field, and dust are **composition peripherals**. With a wide FOV across three unlike widths, peripherals often fall in the **left slice** while the disc sits nearer panoramic center (still on primary, but not in the “hero” region you watch).

**Verdict:** Treat as **both** unless instrumentation says otherwise: **fixed-sign orbit choreography** + **single-camera wide framing** + **asymmetric monitor layout**. Fixing only RNG would miss the main issues; fixing only projection would leave the repeated departure spin.

---

## 4. Multi-monitor vs single-monitor

| Mode | Behavior |
|------|----------|
| **1 monitor** | No `__reachPanorama`; full viewport; voyage + odometer + countdown on that window (`main.ts` 126–127, 303–314). |
| **N monitors** | One WebView per display; `isPrimaryDisplay` on exactly one (`ReachWebApplication.cs` 268–271, 727–731). |
| **Followers** | No director, no save, no HUD (`main.ts` 297–302); pose from sync only. |
| **FOV** | `localPanoramaFovRad` scales vertical FOV by `viewportHeight / totalPanoramaHeight` (`ReachPanorama.ts` 79–82) — **shorter** monitors see a **narrower** vertical slice (test line 467). |

**Risks if changing framing**

- Any per-stop yaw that differs per monitor → **breaks** sync model.
- Shifting “hero” to primary center without touching followers → impossible; must rotate **shared** `quaternion` / approach `dir1`.
- Checkpoint must store new profile fields if approach endpoints change (`ReachFlightState` schema).
- `shiftFrame` clears autopilot (`CameraController.ts` 280–282`) — already used at interstellar hops; must remain gapless with panorama publish.

**LEFT / CENTRE / RIGHT relative to primary:** Safe **only** as **shared** world-space offsets (e.g. rotate `dir1` about target pole by profile angle, or offset look-at). Define whether “CENTRE” means **panorama** or **primary** center—they differ on typical 3-head layouts. Panoramic alignment is preserved if all displays use the same pose.

---

## 5. Representative destinations & overrides (must keep)

| Case | Behavior | Location |
|------|----------|----------|
| Earth start | Sunward + pole bias, `placeAt`, `autoOrbit` | `ReachVoyageDirector.ts` 203–208 |
| Moons | Flyby then departure with `MOON_FLYBY_RATE`; approach from outside parent orbit | 369–377, 481–483, 553–588 |
| Sun / probes | No sunlit retarget; probe/star distances | 520, 489–492 |
| Stars (Proxima, nearby) | `approach` only; `starPresentation` radii | 497–498, `ReachDestinations.ts` |
| Alpha Centauri AB | `binaryOverview` → `ReachAlphaCinematic`; custom `binaryOverviewDirection` | 356–367, 507–516, `ReachAlphaCentauri.ts` |
| Parker / trajectory craft | `goTo` mission vehicle logic if ever used from free mode | `CameraController.ts` 172–179 (not Reach-specific) |

Reach **does not** call `goToBlackHole` or landmark tours.

---

## 6. Pacing & restoration risks

- **Slow approach:** `gentleStart` + long production travel bands (`ReachTiming.ts` 25–27) + log radial easing.
- **Departure pacing:** 10s (7s moon) + cubic Hermite radius (`447–450`).
- **Changing `dir1` per destination** alters saved `endDirection` — old saves remain valid only if profiles are derived **deterministically from `stop.id`** (no version skew).
- **Alpha `binary` phase** is a separate checkpoint kind — do not fold into generic profiles without migration.
- **`cinematicCruise`** on all non-star `goToVantage` calls — reducing drift affects “alive” long legs but may help left-drift perception.

---

## 7. Recommended minimal correction strategy

**Principle:** **Destination cinematic profiles** (authored or hash-derived from `stop.id`), not per-visit RNG.

1. **Profile table on `ReachStop`** (or parallel map): `orbitSign`, `departureOrbitScale`, `approachAzimuthOffset` (about target pole), `framing` (`panorama` | `primary-biased`), optional `cinematicCruise` strength/duration gate.
2. **Apply at existing choke points only:** `beginDeparture` (`orbitRate`), end of `updateDeparture` before `goToVantage` (`arrival`), `observe` `autoOrbit` sign (`382`), without changing panorama contract.
3. **Panorama vs primary framing:** if the goal is “hero on primary,” compute offset from monitor contract once (`__reachPanorama`) and rotate shared `dir1` so the target projects to primary center **for that layout** — optional per-installation calibration, not per random seed.
4. **Do not** add per-monitor cameras or independent yaw on followers.
5. **Preserve** Alpha binary, moon clearance, sunlit dot thresholds, Proxima/star radii.

### Alternatives

| Option | Pros | Cons |
|--------|------|------|
| Negate `orbitRate` on half of stops (deterministic) | Tiny diff | Doesn’t fix projection / sun side |
| Widen FOV on primary only | — | **Breaks** panorama |
| Random sign each visit | Variety | Violates checkpoint determinism; feels “operator spinning wheel” |
| Re-center virtual desktop layout in OS | No code | May not match owner’s physical desk |

---

## 8. Part B — Approximate speed HUD (feasibility)

**Owner target:** `APPROX SPEED: 1820878 c` (whole number in **c**), ~1 Hz, **only `NEXT`**, below odometer.

| Piece | Status | Source |
|-------|--------|--------|
| Authoritative distance | Yes | `ReachVoyageDirector.distanceTravelledKm` (`171–174`) — `completedKm` + leg × autopilot progress in `cruise` only |
| Phase gate | Yes | `countdown.phase === 'NEXT'` (`190–192`) |
| Hide observe/departure/flyby/alpha | Yes | Those phases are `DEPART` or `CRUISE`, not `NEXT` |
| Timebase | Wall `performance.now()` in odometer (`62–68`) | Same pattern for speed |
| **c** conversion | `C_KM_S = 299_792.458` (`constants.ts` 6) | `Δkm / Δt / C_KM_S`, `Math.round` for display |
| UI placement | `#reach-odometer` fixed, `resolveOdometerPosition` opposes countdown (`ReachOdometer.ts` 34–38, `style.css` 52–73) | Second line or sibling element under odometer |
| Primary-only | Same `__reachCountdown` / `primaryDisplay` gate as odometer (`readOdometerContract` 46–47) | Followers have no odometer today |
| Accelerated travel | Distance is **geometric leg km × flight progress**, not `time.rate` | Correct for “distance covered per real second” during `NEXT` |
| **Gap** | During `CRUISE` (departure) and `DEPART`, odometer still advances? | `distanceTravelledKm` **does not** include departure motion (`172` — only `cruise` autopilot). Speed hidden when not `NEXT` matches spec. |

**Caveat:** First second after `NEXT` begins can spike (small Δt); use ≥1 s window or smooth like odometer.

**Screensaver:** does not inject a separate odometer contract — only `__reachCountdown` (`ReachWebApplication.cs` 713–721); odometer defaults via `readOdometerContract(true)` on primary.

---

## 9. Part C — Exotic destinations (architecture only)

| Type | Registration / render | Reach v4 |
|------|----------------------|----------|
| **Black holes** | `BLACK_HOLES` → `Universe.blackHoles`; body `type: 'blackhole'`, `radius = schwarzschildKm(massSolar)` (`blackholes.ts`); **mesh skipped**, `BlackHolePass` lensing (`BodyRenderer.ts`, `BlackHolePass.ts`); `goTo` disk-plane arrival (`CameraController.ts` 136–161) | **Not** on itinerary |
| **SMBH vs stellar BH** | Mass in data drives `radius` and lensing scale | M87* `6.5e9` vs Cyg X-1 `21.2` M☉ — same pipeline, different km scale |
| **Superclusters** | `FarUniverse` / `FAR_TIERS` tier “Süperküme kompleksleri” — noise shell, aggregated points (`FarUniverse.ts` 43–59) | Not voyage stops |
| **Cosmic walls / Great Attractor** | Named in `Docs/Reports/Reach_Master_Destinations_...` only; **no** matching runtime landmark/voyage stop in `src/` | Would need new `ReachStop` + camera/`goToPoint` or anchor orbit |
| **Large-scale pullback** | `FarUniverse` fade tiers, `goToPoint` / galaxy tours in `main.ts` (free mode) | Reach director has no equivalent hook |

**Blockers for exotic Reach stops:** no profile slot for lensing-first arrivals; distributed structures are **point-sprite tiers**, not volumetric walls; interstellar frame switch (`shiftFrame`) assumes a **body** target.

---

## 10. Proposed implementation sequence

1. **Instrument (read-only on prod):** log `orbitRate`, `arrival`/`r0` angles, and `__reachPanoramaStatus` projection of target + Sun at leg start/mid/end — confirm A vs B on your three monitors.
2. **Authored cinematic profiles** for solar-system stops (sign + azimuth offset); keep Alpha/moon/binary paths untouched.
3. **Optional primary-center framing** using injected panorama contract (layout-specific).
4. **Tune `cinematicCruise`** per profile (or disable for short legs).
5. **Speed HUD** in `ReachOdometerOverlay` (or paired overlay), phase-gated `NEXT`.
6. **Exotic destinations** only after camera profile system exists — black hole as special `goTo` + lensing QA.

---

## 11. Focused validation plan (no save mutation)

1. **Three-monitor physical:** At `NEXT` start, note whether motion is **world spin** (stars move uniformly) vs **subject sliding** (target moves within frame). Only the latter is strong projection framing evidence.
2. **`window.__reachPanoramaStatus()`** on primary (`main.ts` 367–377): compare `contract.viewportOffset*` across windows; project target at center vs Sun vector.
3. **Checkpoint safety:** After any future change, restore mid-`cruise` with saved `flight.endDirection` — must not jump (existing `test-reach-journey.mjs` / `test-reach-v4.mjs` patterns).
4. **Regression set:** Moon parent occlusion (`moonArrivalClear`), Alpha establish (LMC comment 514–515), seam test (`test-reach-journey.mjs` 443–447).
5. **Single-monitor:** Confirm profiles don’t assume panorama (null `readReachPanorama()`).

---

## 12. Design distinction (choreography vs projection)

| Question | Answer |
|----------|--------|
| Is the camera **literally** rotating left every time? | **Partially yes** in the sense of **fixed positive** `autoOrbit`, flyby, and departure `orbitRate`, plus deterministic `goToVantage` slerp—not a named “pan left” API. |
| Is the **panorama** putting the show on the left panel? | **Often yes** for **peripheral** interest: one shared view, wide FOV, asymmetric layout; target centered in **panorama** ≠ centered on **primary**. |
| Should we “just randomize”? | **No** — evidence points to **composed profiles** and optional **layout-aware framing**, with checkpoints storing deterministic endpoints. |

---

## Key source files (quick index)

| Area | Path |
|------|------|
| Voyage director | `Universe/src/reach/ReachVoyageDirector.ts` |
| Camera autopilot | `Universe/src/camera/CameraController.ts` |
| Panorama contract & sync | `Universe/src/reach/ReachPanorama.ts` |
| Engine view offset | `Universe/src/core/Engine.ts` |
| Main loop / publish | `Universe/src/main.ts` |
| Journey checkpoints | `Universe/src/reach/JourneyState.ts` |
| Timing (random durations only) | `Universe/src/reach/ReachTiming.ts` |
| Odometer HUD | `Universe/src/reach/ReachOdometer.ts` |
| Alpha cinematic | `Universe/src/reach/ReachAlphaCentauri.ts` |
| Screensaver multi-monitor | `Screensaver/Application/ReachWebApplication.cs` |
| Panorama tests | `Universe/scripts/test-reach-journey.mjs` |
