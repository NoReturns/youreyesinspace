import { Matrix4, Quaternion, Vector3 } from 'three';
import type { CameraController } from '../camera/CameraController';
import type { CelestialBody } from '../core/CelestialBody';
import { DAY_S, PARSEC_KM } from '../core/constants';
import { StarSystem } from '../core/StarSystem';
import type { TimeSystem } from '../core/TimeSystem';
import type { Universe } from '../core/Universe';
import { SOLAR_SYSTEM } from '../data/solarSystem';
import { LANDMARKS } from '../data/landmarks';
import {
  REACH_ITINERARY_ID, REACH_ITINERARY_VERSION,
  nextReachStopId, previousReachStopId, reachStopIdsForVersion, V6_STOP_IDS, type ReachDirection,
  type JourneyPhase, type Quat, type ReachFlightState, type ReachJourneyState, type Vec3,
} from './JourneyState';
import { ReachTiming } from './ReachTiming';
import { geometricLegKm, type ReachDistanceLeg } from './ReachOdometer';
import { destinationRef, destinationSystem, REACH_NEARBY_OBSERVATION_RADII,
  REACH_NEARBY_STAR_PREVIEWS, REACH_PROXIMA_PILOT, REACH_ALPHA_CENTAURI_PREVIEW,
  type ReachRoute, type ReachStop } from './ReachDestinations';
import { reachArrivalTraceEnabled } from './ReachArrivalTrace';
import { ALPHA_A_INDEX, ALPHA_B_INDEX, ALPHA_BARY_ID, ALPHA_SYSTEM_ID, ReachAlphaCinematic } from './ReachAlphaCentauri';
import { ReachSagittariusPreview } from './ReachSagittariusPreview';

type Stop = ReachStop;
export const REACH_ALPHA_DESTINATION_ID = 'alpha-centauri-ab';
const nearbyStar = (id: string, starId: string, label: string): Stop => ({
  id, profile: 'star', label, ref: { kind: 'star', starId },
  starPresentation: { observationDistanceRadii: REACH_NEARBY_OBSERVATION_RADII,
    surfaceMotion: 0.6, coronaMotion: 0.2, colorWarmth: 0 },
});
const landmarkStar = (landmarkId: string, label: string): Stop => {
  const index = LANDMARKS.findIndex((entry) => entry.id === landmarkId && entry.kind === 'star' && entry.star);
  if (index < 0) throw new Error(`Missing stellar landmark ${landmarkId}`);
  return nearbyStar(`star:l${index}`, `l${index}`, label);
};

// Route order and presentation profile only. Durations come from ReachTiming.
export const REACH_ITINERARY: readonly Stop[] = [
  { id: 'earth', profile: 'planet' },
  { id: 'iss', profile: 'probe' },
  { id: 'moon', profile: 'moon' },
  { id: 'hubble', profile: 'probe' },
  { id: 'jwst', profile: 'probe' },
  { id: 'mars', profile: 'planet' },
  { id: 'sun', profile: 'sun' },
  { id: 'parker', profile: 'probe' },
  { id: 'mercury', profile: 'planet' },
  { id: 'venus', profile: 'planet' },
  { id: 'phobos', profile: 'moon' },
  { id: 'deimos', profile: 'moon' },
  { id: 'vesta', profile: 'small' },
  { id: 'ceres', profile: 'planet' },
  { id: 'jupiter', profile: 'planet' },
  { id: 'juno', profile: 'probe' },
  { id: 'io', profile: 'moon' },
  { id: 'europa', profile: 'moon' },
  { id: 'ganymede', profile: 'moon' },
  { id: 'callisto', profile: 'moon' },
  { id: 'saturn', profile: 'planet' },
  { id: 'mimas', profile: 'moon' },
  { id: 'enceladus', profile: 'moon' },
  { id: 'tethys', profile: 'moon' },
  { id: 'dione', profile: 'moon' },
  { id: 'rhea', profile: 'moon' },
  { id: 'titan', profile: 'moon' },
  { id: 'iapetus', profile: 'moon' },
  { id: 'halley', profile: 'small' },
  { id: 'uranus', profile: 'planet' },
  { id: 'miranda', profile: 'moon' },
  { id: 'ariel', profile: 'moon' },
  { id: 'umbriel', profile: 'moon' },
  { id: 'titania', profile: 'moon' },
  { id: 'oberon', profile: 'moon' },
  { id: 'neptune', profile: 'planet' },
  { id: 'triton', profile: 'moon' },
  { id: 'pluto', profile: 'planet' },
  { id: 'charon', profile: 'moon' },
  { id: 'haumea', profile: 'planet' },
  { id: 'makemake', profile: 'planet' },
  { id: 'newhorizons', profile: 'probe' },
  { id: 'eris', profile: 'planet' },
  { id: 'pioneer11', profile: 'probe' },
  { id: 'pioneer10', profile: 'probe' },
  { id: 'voyager2', profile: 'probe' },
  { id: 'voyager1', profile: 'probe' },
  REACH_PROXIMA_PILOT.stops[1],
  { id: REACH_ALPHA_DESTINATION_ID, profile: 'star', label: 'Alpha Centauri A/B',
    ref: { kind: 'body', systemId: ALPHA_SYSTEM_ID, bodyId: ALPHA_BARY_ID }, binaryOverview: true },
  nearbyStar('star:c80155', 'c80155', "Barnard's Star"),
  nearbyStar('star:c108500', 'c108500', 'Wolf 359'),
  nearbyStar('star:c49269', 'c49269', 'Lalande 21185'),
  nearbyStar('star:c29786', 'c29786', 'Sirius A'),
  nearbyStar('star:c109365', 'c109365', 'Ross 248'),
  nearbyStar('star:c15247', 'c15247', 'Epsilon Eridani'),
  nearbyStar('star:c7458', 'c7458', 'Tau Ceti'),
  nearbyStar('star:c83130', 'c83130', 'Vega'),
  nearbyStar('star:c10818', 'c10818', 'Polaris'),
  nearbyStar('star:c25822', 'c25822', 'Betelgeuse'),
  nearbyStar('star:c73646', 'c73646', 'Antares'),
  nearbyStar('star:c92866', 'c92866', 'Deneb'),
  landmarkStar('l-etacar', 'Eta Carinae'),
  landmarkStar('l-r136a1', 'R136a1'),
  landmarkStar('l-wohg64', 'WOH G64'),
];
if (REACH_ITINERARY.length !== V6_STOP_IDS.length
  || new Set(REACH_ITINERARY.map((stop) => stop.id)).size !== V6_STOP_IDS.length
  || REACH_ITINERARY.some((stop, index) => stop.id !== V6_STOP_IDS[index]))
  throw new Error('Reach v6 itinerary identity or order mismatch');

export const REACH_PRODUCTION_ROUTE: ReachRoute = {
  id: REACH_ITINERARY_ID, version: REACH_ITINERARY_VERSION, stops: REACH_ITINERARY, repeat: true,
};

/** Initial apparent radius is 40% of the vertical half-FOV, leaving room for the photo field and card. */
export function reachLandmarkObservationDistance(radiusKm: number, verticalFovRad: number): number {
  return radiusKm / (0.4 * Math.tan(verticalFovRad / 2));
}

/** Development-only routes are isolated from the production itinerary. */
export function reachPreviewRoute(id: string): ReachRoute | null {
  if (id === 'sgra') return { id: 'preview:sgra', version: 1, repeat: false,
    stops: [{ id: 'sgra', profile: 'star', label: 'Sagittarius A*',
      ref: { kind: 'body', systemId: 'b0', bodyId: 'sgra' } }] };
  if (id === 'woh-tarantula') return { id: 'preview:woh-tarantula', version: 1, repeat: true,
    stops: [REACH_ITINERARY[REACH_ITINERARY.length - 1],
      { id: 'l-30dor', profile: 'landmark', label: 'Tarantula Nebula (30 Doradus)',
        ref: { kind: 'landmark', landmarkId: 'l-30dor' } }],
  };
  if (id === 'tarantula') return { id: 'preview:tarantula', version: 1, repeat: true,
    stops: [REACH_ITINERARY[0], { id: 'l-30dor', profile: 'landmark', label: 'Tarantula Nebula (30 Doradus)',
      ref: { kind: 'landmark', landmarkId: 'l-30dor' } }],
  };
  if (id === 'alpha-centauri') return REACH_ALPHA_CENTAURI_PREVIEW;
  if (id === 'proxima') return {
    id: 'preview:proxima', version: 1, stops: REACH_PROXIMA_PILOT.stops, repeat: false,
  };
  if (id === 'betelgeuse' || id === 'woh-g64') {
    const landmarkIndex = id === 'woh-g64' ? LANDMARKS.findIndex((entry) => entry.id === 'l-wohg64') : -1;
    if (id === 'woh-g64' && (landmarkIndex < 0 || !LANDMARKS[landmarkIndex].star)) return null;
    const starId = id === 'betelgeuse' ? 'c25822' : `l${landmarkIndex}`;
    return { id: `preview:${id}`, version: 1, repeat: false,
      stops: [REACH_ITINERARY[0], {
        id: `star:${starId}`, profile: 'star', label: id === 'betelgeuse' ? 'Betelgeuse' : 'WOH G64',
        ref: { kind: 'star', starId },
        starPresentation: { observationDistanceRadii: REACH_NEARBY_OBSERVATION_RADII,
          surfaceMotion: 0, coronaMotion: 0, colorWarmth: 0 },
      }],
    };
  }
  const nearby = Object.prototype.hasOwnProperty.call(REACH_NEARBY_STAR_PREVIEWS, id)
    ? REACH_NEARBY_STAR_PREVIEWS[id as keyof typeof REACH_NEARBY_STAR_PREVIEWS] : null;
  if (nearby) {
    const [starId, label] = nearby;
    return { id: `preview:${id}`, version: 1, repeat: false,
      stops: [REACH_ITINERARY[0], {
        id: `star:${starId}`, profile: 'star', label, ref: { kind: 'star', starId },
        starPresentation: { observationDistanceRadii: REACH_NEARBY_OBSERVATION_RADII,
          surfaceMotion: 0.6, coronaMotion: 0.2, colorWarmth: 0 },
      }],
    };
  }
  const stop = REACH_ITINERARY.find((candidate) => candidate.id === id);
  if (!stop) return null;
  return { id: `preview:${id}`, version: 1,
    stops: id === 'earth' ? [REACH_ITINERARY[0]] : [REACH_ITINERARY[0], stop], repeat: false };
}

const OBSERVATION_ORBIT = 0.012;
const MOON_FLYBY_RATE = 0.025;
const MIN_SUNLIT_DOT = 0.2; // correct views with less than 60% of the disk visible
const TARGET_SUNLIT_DOT = 0.6; // 80% of the disk visible
function smoothstep(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u * u * (3 - 2 * u);
}
const vec = (v: Vector3): Vec3 => [v.x, v.y, v.z];
const quat = (q: Quaternion): Quat => [q.x, q.y, q.z, q.w];

/** A stable, evenly distributed choice for each directed leg and completed journey. */
export function reachArrivalRollQuarterTurns(fromId: string, toId: string,
  direction: ReachDirection, roundTrips: number): number {
  const key = `${roundTrips}|${direction}|${fromId}|${toId}`;
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  return hash & 3;
}

/** A passive voyage, independent of missions and tours. */
export class ReachVoyageDirector {
  private readonly arrivalSystem = new StarSystem('reach-arrival', 'c0', 0, new Vector3(), SOLAR_SYSTEM, [], []);
  private stop = 0;
  private stage: 'observe' | 'flyby' | 'departure' | 'cruise' = 'observe';
  private observeLeft = 0;
  private observeDuration = 0;
  private completedKm = 0;
  private roundTripCount = 0;
  private rollQuarterTurns = 0;
  private direction: ReachDirection = 'outbound';
  private cycleItineraryVersion = REACH_ITINERARY_VERSION;
  private transitionFromVersion: number | null = null;
  private leg: ReachDistanceLeg | null = null;
  private flyby: {
    body: CelestialBody; offset: Vector3; orientation: Quaternion; up: Vector3;
    elapsed: number; duration: number;
  } | null = null;
  private departure: {
    source: { id: string; position: Vector3; radius: number }; next: number; offset: Vector3; orientation: Quaternion; up: Vector3;
    orbitRate: number; radialSpeed: number; endRadius: number; duration: number; elapsed: number;
  } | null = null;
  private readonly stops: readonly ReachStop[];
  private alpha: ReachAlphaCinematic | null = null;
  private sagittarius: ReachSagittariusPreview | null = null;

  get directing(): boolean { return !!this.sagittarius || !!this.alpha || this.stage === 'departure' || this.stage === 'flyby'; }
  get observation(): { stop: ReachStop; elapsed: number; remaining: number; departing: boolean } | null {
    if (this.sagittarius) return { stop: this.stops[0],
      elapsed: Math.min(this.sagittarius.elapsed, 20), remaining: 20, departing: false };
    if (this.stage !== 'observe') return null;
    const remaining = this.alpha ? this.alpha.observationRemaining : this.observeLeft;
    const elapsed = this.alpha ? this.alpha.observationElapsed : Math.max(0, this.observeDuration - remaining);
    return { stop: this.stops[this.stop], elapsed, remaining,
      departing: this.route.repeat || this.stop < this.stops.length - 1 };
  }
  get alphaPreview(): boolean { return this.route.id === 'preview:alpha-centauri'; }
  get sagittariusPreviewStatus(): { shot: string; elapsed: number; distanceRs: number } | null {
    if (!this.sagittarius) return null;
    return { shot: this.sagittarius.shot, elapsed: this.sagittarius.elapsed,
      distanceRs: this.camera.position.distanceTo(this.sagittarius.body.position) / this.sagittarius.body.radius };
  }
  get alphaCinematic(): ReachAlphaCinematic | null { return this.alpha; }
  get roundTrips(): number { return this.roundTripCount; }
  get cameraTargetId(): string { return this.camera.target?.id ?? this.stops[this.stop].id; }
  get countdownLabel(): string {
    const id = this.countdown.destinationId;
    const stop = this.stops.find((candidate) => candidate.id === id);
    return stop?.label ?? id;
  }
  get terminalObservation(): boolean {
    if (this.alpha) return this.alpha.terminal;
    return !this.route.repeat && this.stop === this.stops.length - 1 && this.stage === 'observe';
  }
  get distanceTravelledKm(): number {
    const flight = this.stage === 'cruise' ? this.camera.autopilot : null;
    const progress = flight && flight.duration > 0 ? Math.min(1, Math.max(0, flight.t / flight.duration)) : 0;
    return this.completedKm + (this.leg?.distanceKm ?? 0) * progress;
  }

  /** Cruise progress before adding the cumulative total, for a precise HUD speed sample. */
  get activeLegDistanceKm(): number | null {
    const flight = this.stage === 'cruise' ? this.camera.autopilot : null;
    if (!flight || !this.leg || flight.duration <= 0) return null;
    return this.leg.distanceKm * Math.min(1, Math.max(0, flight.t / flight.duration));
  }
  get odometerStationary(): boolean { return this.stage === 'observe' && !this.alpha; }

  get countdown(): { phase: 'NEXT' | 'DEPART' | 'CRUISE'; destinationId: string; routeIndex: number; secondsLeft: number } {
    if (this.alpha) return { phase: 'DEPART', destinationId: this.stops[this.stop].id,
      routeIndex: this.stop, secondsLeft: this.alpha.secondsLeft };
    if (this.stage === 'departure') {
      const d = this.departure!;
      return { phase: 'CRUISE', destinationId: this.stops[d.next].id,
        routeIndex: d.next, secondsLeft: d.duration - d.elapsed };
    }
    const destinationId = this.stops[this.stop].id;
    if (this.stage === 'flyby') return { phase: 'DEPART', destinationId,
      routeIndex: this.stop, secondsLeft: this.flyby!.duration - this.flyby!.elapsed };
    if (this.stage === 'observe') return { phase: 'DEPART', destinationId,
      routeIndex: this.stop, secondsLeft: this.observeLeft };
    const flight = this.camera.autopilot;
    return { phase: 'NEXT', destinationId, routeIndex: this.stop,
      secondsLeft: flight ? flight.duration - flight.t : 0 };
  }

  constructor(
    private readonly universe: Universe, private readonly camera: CameraController, private readonly time: TimeSystem,
    private readonly timing: ReachTiming,
    saved?: ReachJourneyState | null, private readonly onPhaseChange?: () => void,
    private readonly route: ReachRoute = REACH_PRODUCTION_ROUTE,
    private readonly verticalFovRad = 50 * Math.PI / 180,
  ) {
    this.stops = route.stops;
    this.cycleItineraryVersion = route.version;
    for (const stop of this.stops) {
      if (destinationRef(stop).kind === 'landmark') this.point(stop);
      else this.destination(stop);
    }
    if (saved) { this.restore(saved); return; }
    const initial = this.stops[0];
    const body = this.destination(initial);
    if (route.id === 'preview:sgra') {
      this.sagittarius = new ReachSagittariusPreview(body, camera);
      this.observeDuration = this.sagittarius.duration;
      this.observeLeft = this.observeDuration;
      return;
    }
    const view = initial.profile === 'star'
      ? new Vector3(0, 0.3, 1).normalize()
      : new Vector3().subVectors(universe.star.position, body.position).normalize()
        .addScaledVector(body.pole, 0.25).normalize();
    camera.placeAt(body, view.multiplyScalar(body.radius * (initial.profile === 'star'
      ? initial.starPresentation?.observationDistanceRadii ?? 40 : 4)));
    camera.autoOrbit = OBSERVATION_ORBIT;
    this.observeDuration = this.timing.observe(this.stops[0]);
    this.observeLeft = this.observeDuration;
  }

  capture(): ReachJourneyState {
    const current = this.stops[this.stop];
    const c = this.camera;
    if (!c.reference || (!c.target && !this.point(current)))
      throw new Error('Reach camera has no reference or target');
    let phase: JourneyPhase;
    let flight: ReachFlightState | null = null;
    if (this.alpha && this.route.id === REACH_ITINERARY_ID) {
      phase = this.alpha.capture();
    } else if (this.stage === 'observe') {
      phase = { kind: 'observe', elapsed: this.observeDuration - this.observeLeft, duration: this.observeDuration };
    } else if (this.stage === 'flyby') {
      const f = this.flyby!;
      phase = { kind: 'flyby', bodyId: f.body.id, offset: vec(f.offset), orientation: quat(f.orientation),
        up: vec(f.up), elapsed: f.elapsed, duration: f.duration };
    } else if (this.stage === 'departure') {
      const d = this.departure!;
      phase = { kind: 'departure', sourceId: d.source.id, nextId: this.stops[d.next].id,
        offset: vec(d.offset), orientation: quat(d.orientation), up: vec(d.up),
        orbitRate: d.orbitRate, radialSpeed: d.radialSpeed, endRadius: d.endRadius,
        elapsed: d.elapsed, duration: d.duration };
    } else {
      const ap = c.autopilot;
      if (!ap || (ap.kind !== 'goto' && ap.kind !== 'gotoPoint')
        || (!ap.target && !ap.point)) throw new Error('Reach cruise has no destination flight');
      phase = { kind: 'cruise', elapsed: ap.t, duration: ap.duration };
      flight = { targetId: ap.target?.id ?? current.id, elapsed: ap.t, duration: ap.duration,
        startOffset: vec(ap.r0), endDirection: vec(ap.dir1), endDistance: ap.dist1,
        startOrientation: quat(ap.q0), up: ap.up1 ? vec(ap.up1) : null,
        gentleStart: ap.gentleStart ?? false, cinematicCruise: ap.cinematicCruise ?? false };
      if (ap.rollDelta !== undefined) flight.rollDelta = ap.rollDelta;
    }
    return {
      schema: 1, itinerary: { id: this.route.id, version: this.route.version },
      destinationId: current.id, routeIndex: this.stop, direction: this.direction,
      cycleItineraryVersion: this.cycleItineraryVersion, phase,
      ...(this.transitionFromVersion && (this.stage === 'departure' || this.stage === 'cruise')
        ? { transitionFromVersion: this.transitionFromVersion } : {}),
      simulation: { jd: this.time.jd, rate: this.time.rate },
      frame: { starId: this.universe.current.starId },
      odometer: { completedKm: this.completedKm, roundTrips: this.roundTripCount,
        leg: this.leg ? { ...this.leg } : null },
      camera: { position: vec(c.position), orientation: quat(c.quaternion),
        referenceId: c.reference.id, targetId: c.target?.id ?? current.id, autoOrbit: c.autoOrbit, flight,
        rollQuarterTurns: this.rollQuarterTurns },
    };
  }

  private restore(saved: ReachJourneyState): void {
    this.stop = this.stops.findIndex((stop) => stop.id === saved.destinationId);
    this.completedKm = saved.odometer?.completedKm ?? 0;
    this.roundTripCount = saved.odometer?.roundTrips ?? 0;
    this.rollQuarterTurns = saved.camera.rollQuarterTurns ?? 0;
    this.direction = saved.direction;
    this.cycleItineraryVersion = saved.cycleItineraryVersion;
    this.transitionFromVersion = saved.transitionFromVersion ?? null;
    this.leg = saved.odometer?.leg ? { ...saved.odometer.leg } : null;
    if (!saved.odometer && (saved.phase.kind === 'departure' || saved.phase.kind === 'cruise')) {
      const fromId = saved.phase.kind === 'departure' ? saved.destinationId
        : (this.transitionFromVersion
          ? this.direction === 'inbound'
            ? nextReachStopId(this.transitionFromVersion, saved.destinationId)
            : previousReachStopId(this.transitionFromVersion, saved.destinationId)
          : this.stops[(this.stop + (this.direction === 'inbound' ? 1 : -1)
            + this.stops.length) % this.stops.length].id)!;
      const toId = saved.phase.kind === 'departure' ? saved.phase.nextId : saved.destinationId;
      this.leg = this.makeLeg(fromId, toId);
    }
    const c = this.camera;
    c.position.fromArray(saved.camera.position);
    c.quaternion.fromArray(saved.camera.orientation);
    c.setReference(this.body(saved.camera.referenceId));
    const current = this.stops[this.stop];
    const point = this.point(current);
    c.target = point ? null : this.body(saved.camera.targetId);
    c.anchor = point && saved.phase.kind !== 'cruise'
      ? { position: point, radius: this.pointRadius(current) * 0.3, name: current.label ?? this.universe.landmark(current.id)!.def.name }
      : null;
    c.mode = 'orbit';
    c.autoOrbit = saved.camera.autoOrbit;
    const flight = saved.camera.flight;
    c.autopilot = flight ? {
      kind: point ? 'gotoPoint' : 'goto', target: point ? null : this.body(flight.targetId), point,
      ...(point ? { anchor: { radius: this.pointRadius(current) * 0.3,
        name: current.label ?? this.universe.landmark(current.id)!.def.name } } : {}),
      t: flight.elapsed, duration: flight.duration,
      r0: new Vector3().fromArray(flight.startOffset),
      dir1: new Vector3().fromArray(flight.endDirection), dist1: flight.endDistance,
      q0: new Quaternion().fromArray(flight.startOrientation),
      up1: flight.up ? new Vector3().fromArray(flight.up) : undefined,
      gentleStart: flight.gentleStart,
      cinematicCruise: flight.cinematicCruise ?? false,
      rollDelta: flight.rollDelta,
    } : null;

    const phase = saved.phase;
    this.stage = phase.kind === 'binary' ? 'observe' : phase.kind;
    if (phase.kind === 'observe') {
      this.observeDuration = phase.duration;
      this.observeLeft = phase.duration - phase.elapsed;
    } else if (phase.kind === 'flyby') {
      this.flyby = { body: this.body(phase.bodyId), offset: new Vector3().fromArray(phase.offset),
        orientation: new Quaternion().fromArray(phase.orientation), up: new Vector3().fromArray(phase.up),
        elapsed: phase.elapsed, duration: phase.duration };
    } else if (phase.kind === 'departure') {
      this.departure = { source: this.point(this.stops[this.stop])
        ? this.pointSource(this.stops[this.stop]) : this.body(phase.sourceId),
        next: this.stops.findIndex((stop) => stop.id === phase.nextId),
        offset: new Vector3().fromArray(phase.offset),
        orientation: new Quaternion().fromArray(phase.orientation), up: new Vector3().fromArray(phase.up),
        orbitRate: phase.orbitRate, radialSpeed: phase.radialSpeed, endRadius: phase.endRadius,
        elapsed: phase.elapsed, duration: phase.duration };
    } else if (phase.kind === 'binary') {
      this.alpha = new ReachAlphaCinematic(c, this.body(ALPHA_BARY_ID),
        this.body(`s${ALPHA_A_INDEX}-star`), this.body(`s${ALPHA_B_INDEX}-star`),
        REACH_NEARBY_OBSERVATION_RADII, phase);
      this.stage = 'observe';
    }
  }

  update(dt: number, paused: boolean): void {
    if (paused) return;
    if (this.sagittarius) {
      this.sagittarius.update(dt);
      this.observeLeft = this.observeDuration - (this.sagittarius.elapsed % this.observeDuration);
      return;
    }
    if (this.alpha) {
      if (this.alpha.update(dt)) {
        if (this.route.id === 'preview:alpha-centauri') {
          const shot = this.alpha.stage;
          this.stop = shot.endsWith('-a') ? 2 : shot.endsWith('-b') || shot === 'cross-to-b' ? 3 : 4;
        }
        this.onPhaseChange?.();
      }
      if (this.alpha.terminal && this.route.repeat) {
        this.alpha = null;
        this.beginDeparture(0, 0);
      }
      return;
    }
    if (this.stage === 'departure') { this.updateDeparture(dt); return; }
    if (this.stage === 'flyby') { this.updateFlyby(dt); return; }
    if (this.stage === 'cruise') {
      if (this.camera.autopilot) return;
      if (this.point(this.stops[this.stop])) this.camera.setReference(this.universe.star);
      if (this.leg && this.leg.toId === this.stops[this.stop].id) {
        this.completedKm += this.leg.distanceKm;
        this.leg = null;
      }
      const preRoundTripArrival = this.transitionFromVersion !== null
        && this.transitionFromVersion < 4;
      if (this.route.id === REACH_ITINERARY_ID && this.route.version >= 4) {
        if (this.stop === this.stops.length - 1 && this.direction === 'outbound') {
          this.direction = 'inbound';
        } else if (this.stops[this.stop].id === 'earth' && this.direction === 'inbound') {
          if (!preRoundTripArrival) this.roundTripCount++;
          this.direction = 'outbound';
          this.cycleItineraryVersion = this.route.version;
        }
      } else if (this.route.id === 'preview:woh-tarantula') {
        if (this.stop === this.stops.length - 1) this.direction = 'inbound';
        else if (this.direction === 'inbound') {
          this.roundTripCount++;
          this.direction = 'outbound';
        }
      }
      this.transitionFromVersion = null;
      const stop = this.stops[this.stop];
      if (stop.binaryOverview && (stop.id === REACH_ALPHA_DESTINATION_ID
        || this.route.id === 'preview:alpha-centauri' && stop.id === 'alpha:establish')) {
        // Alpha's authored up vector becomes the new zero reference; its camera
        // orientation is left untouched and its shots remain wholly authored.
        this.rollQuarterTurns = 0;
        const barycenter = this.body(ALPHA_BARY_ID);
        const a = this.body(`s${ALPHA_A_INDEX}-star`);
        const b = this.body(`s${ALPHA_B_INDEX}-star`);
        this.alpha = new ReachAlphaCinematic(this.camera, barycenter, a, b,
          REACH_NEARBY_OBSERVATION_RADII);
        this.stage = 'observe';
        this.observeDuration = this.alpha.secondsLeft;
        this.observeLeft = this.observeDuration;
        this.onPhaseChange?.();
        return;
      }
      if (stop.profile === 'moon') {
        const body = this.body(stop.id);
        this.flyby = {
          body, offset: new Vector3().subVectors(this.camera.position, body.position),
          orientation: this.camera.quaternion.clone(),
          up: new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize(),
          elapsed: 0, duration: this.timing.observe(stop),
        };
        this.stage = 'flyby';
      } else {
        this.stage = 'observe';
        this.observeDuration = this.timing.observe(stop);
        this.observeLeft = this.observeDuration;
        this.camera.autoOrbit = stop.profile === 'landmark' ? 0
          : stop.profile === 'probe' ? OBSERVATION_ORBIT * 0.5 : OBSERVATION_ORBIT;
      }
      this.onPhaseChange?.();
      return;
    }
    this.observeLeft = Math.max(0, this.observeLeft - dt);
    if (this.observeLeft <= 0 && (this.route.repeat || this.stop < this.stops.length - 1))
      this.beginDeparture(0, this.camera.autoOrbit);
  }

  private updateFlyby(dt: number): void {
    const f = this.flyby!;
    f.elapsed = Math.min(f.duration, f.elapsed + dt);
    const orbit = new Quaternion().setFromAxisAngle(f.up, MOON_FLYBY_RATE * f.elapsed);
    const radius = f.offset.length() * (1 + 0.45 * f.elapsed / f.duration);
    this.camera.position.copy(f.body.position).add(f.offset.clone().applyQuaternion(orbit).setLength(radius));
    this.camera.quaternion.copy(f.orientation).premultiply(orbit);
    if (f.elapsed < f.duration) return;
    const radialSpeed = f.offset.length() * 0.45 / f.duration;
    this.flyby = null;
    this.beginDeparture(radialSpeed, MOON_FLYBY_RATE);
  }

  private beginDeparture(radialSpeed: number, orbitRate: number): void {
    this.transitionFromVersion = null;
    const source = this.point(this.stops[this.stop])
      ? this.pointSource(this.stops[this.stop]) : this.destination(this.stops[this.stop]);
    const nextId = this.nextDestinationId();
    const next = this.stops.findIndex((stop) => stop.id === nextId);
    if (next < 0) throw new Error(`Reach route no longer resolves ${nextId}`);
    this.leg = this.makeLeg(this.stops[this.stop].id, this.stops[next].id);
    const offset = new Vector3().subVectors(this.camera.position, source.position);
    const isMoon = this.stops[this.stop].profile === 'moon';
    const duration = this.timing.departure(this.stops[this.stop]);
    this.departure = {
      source, next, offset,
      orientation: this.camera.quaternion.clone(),
      up: new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize(),
      orbitRate, radialSpeed,
      endRadius: Math.max(offset.length() * (this.stops[this.stop].binaryOverview ? 1.5 : isMoon ? 4 : 6),
        source.radius * (this.stops[next].profile === 'star' ? 300 : 20)),
      duration, elapsed: 0,
    };
    this.camera.autoOrbit = 0;
    this.stage = 'departure';
    this.onPhaseChange?.();
  }

  private nextDestinationId(): string {
    if (!this.route.repeat || this.route.id !== REACH_ITINERARY_ID
      || this.route.version < 4)
      return this.stops[(this.stop + 1) % this.stops.length].id;
    const ids = this.cycleItineraryVersion !== this.route.version
      ? reachStopIdsForVersion(this.cycleItineraryVersion) : this.stops.map((stop) => stop.id);
    if (!ids) throw new Error('Reach return itinerary is unavailable');
    const index = ids.indexOf(this.stops[this.stop].id);
    if (index < 0) throw new Error('Reach current stop is absent from its cycle');
    if (this.direction === 'outbound' && index === ids.length - 1
      && this.cycleItineraryVersion < this.route.version && this.stop < this.stops.length - 1) {
      this.cycleItineraryVersion = this.route.version;
      return this.stops[this.stop + 1].id;
    }
    return ids[index + (this.direction === 'inbound' ? -1 : 1)]!;
  }

  private updateDeparture(dt: number): void {
    const d = this.departure!;
    d.elapsed = Math.min(d.duration, d.elapsed + dt);
    const u = d.elapsed / d.duration;
    const orbitAngle = d.orbitRate * d.duration * (u - u * u + u * u * u / 3);
    const orbit = new Quaternion().setFromAxisAngle(d.up, orbitAngle);
    // Cubic Hermite radius inherits flyby speed and finishes with zero radial speed.
    const startRadius = d.offset.length();
    const radius = startRadius + d.radialSpeed * d.duration * (u - 2 * u * u + u * u * u)
      + (d.endRadius - startRadius) * smoothstep(u);
    const offset = d.offset.clone().applyQuaternion(orbit).setLength(radius);
    this.camera.position.copy(d.source.position).add(offset);

    const orbitOrientation = d.orientation.clone().premultiply(orbit);
    const nextStop = this.stops[d.next];
    const nextSystem = destinationSystem(nextStop) === this.universe.current.starId
      ? this.universe.current : this.universe.system(destinationSystem(nextStop));
    if (nextSystem !== this.universe.current) nextSystem.update(this.time.jd, this.time.t);
    const direction = nextSystem.origin.clone().add(this.destinationPosition(nextStop, nextSystem.origin))
      .sub(this.universe.current.origin).sub(this.camera.position);
    const up = new Vector3(0, 1, 0).applyQuaternion(orbitOrientation);
    const facing = new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(new Vector3(), direction, up));
    this.camera.quaternion.copy(orbitOrientation).slerp(facing,
      nextStop.profile === 'star' ? smoothstep((u - 0.4) / 0.6)
        : 0.3 * smoothstep((u - 0.2) / 0.8));

    if (u < 1) return;
    this.departure = null;
    this.stop = d.next;
    const stop = this.stops[this.stop];
    if (destinationSystem(stop) !== this.universe.current.starId) {
      const delta = this.universe.switchTo(destinationSystem(stop), this.time.jd, this.time.t);
      const shiftStarted = reachArrivalTraceEnabled() ? performance.now() : 0;
      this.camera.shiftFrame(delta, this.universe.star);
      if (shiftStarted) console.info('[reach-arrival-event]', JSON.stringify({ name: 'camera-frame-shift',
        atMs: Math.round(performance.now()), durationMs: Math.round((performance.now() - shiftStarted) * 100) / 100 }));
    }
    const point = this.point(stop);
    const destination = point ? null : this.destination(stop);
    const targetPosition = point ?? destination!.position;
    const fromDestination = new Vector3().subVectors(this.camera.position, targetPosition).normalize();
    // Moon approach is on the outside of its parent orbit, with the planet behind the subject.
    const approach = stop.profile === 'moon' && destination!.parent
      ? new Vector3().subVectors(destination!.position, destination!.parent.position).normalize()
      : fromDestination;
    const binaryPair = stop.binaryOverview ? this.universe.current : null;
    const companion = binaryPair?.get('s65259-star');
    const primary = binaryPair?.get('s65262-star');
    const binarySeparation = companion && primary ? companion.position.distanceTo(primary.position) : 0;
    const distance = point ? reachLandmarkObservationDistance(this.pointRadius(stop), this.verticalFovRad)
      : stop.binaryOverview ? binarySeparation * 1.6
      : stop.profile === 'star' || stop.profile === 'sun'
      ? destination!.radius * (stop.starPresentation?.observationDistanceRadii ?? 40)
      : stop.profile === 'probe' ? destination!.radius * 4.5
      : stop.profile === 'moon' ? destination!.radius * 5
      : Math.max(destination!.radius * 3.6, (destination!.data.rings?.outer ?? 0) * 2.2);
    const flightDuration = this.timing.travel(stop);
    const binaryDirection = stop.binaryOverview && companion && primary
      ? this.binaryOverviewDirection(approach, companion.position.clone().sub(primary.position)) : null;
    const arrival = binaryDirection ?? (point || stop.profile === 'star' ? approach
      : this.sunlitArrivalDirection(stop, approach, fromDestination, distance, flightDuration));
    const binaryUp = binaryDirection && companion && primary
      ? new Vector3().crossVectors(companion.position.clone().sub(primary.position), binaryDirection).normalize()
      : undefined;
    if (point) {
      this.camera.setReference(this.universe.star);
      this.camera.goToPoint(point, distance, arrival,
        { radius: this.pointRadius(stop) * 0.3, name: stop.label ?? this.universe.landmark(stop.id)!.def.name },
        flightDuration);
    } else this.camera.goToVantage(destination!, arrival, distance, flightDuration,
      binaryUp, stop.profile !== 'star', true);
    // The stored angle is the arrival orientation. The flight owns the transition from
    // its captured start quaternion, so a restart can reconstruct any point in it.
    if (!stop.binaryOverview) {
      const targetRoll = reachArrivalRollQuarterTurns(this.leg!.fromId,
        stop.id, this.direction, this.roundTripCount);
      let steps = (targetRoll - this.rollQuarterTurns + 4) % 4;
      if (steps > 2) steps -= 4;
      this.camera.autopilot!.rollDelta = steps * Math.PI / 2;
      this.rollQuarterTurns = targetRoll;
    }
    this.stage = 'cruise';
    this.onPhaseChange?.();
  }

  private binaryOverviewDirection(incoming: Vector3, separation: Vector3): Vector3 {
    const axis = separation.normalize();
    const sideways = incoming.clone().addScaledVector(axis, -incoming.dot(axis));
    if (sideways.lengthSq() < 0.01) sideways.copy(this.universe.current.star.pole)
      .addScaledVector(axis, -this.universe.current.star.pole.dot(axis));
    if (sideways.lengthSq() < 0.01) sideways.crossVectors(axis, Math.abs(axis.y) < 0.9
      ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0));
    // A different real line of sight keeps the Large Magellanic Cloud's broad
    // sprite out of the A/B establishing composition. No stellar scale changes.
    return sideways.normalize().applyAxisAngle(axis, 1.2);
  }

  private sunlitArrivalDirection(stop: Stop, proposed: Vector3, incoming: Vector3, distance: number, flightDuration: number): Vector3 {
    if (stop.profile === 'probe' || stop.profile === 'sun') return proposed;

    // Predict once at departure. Keep the chosen endpoint fixed throughout the flight.
    const advance = flightDuration * this.time.effectiveRate;
    this.arrivalSystem.update(this.time.jd + advance / DAY_S, this.time.t + advance);
    const body = this.arrivalSystem.get(stop.id)!;
    const toSun = new Vector3().subVectors(this.arrivalSystem.star.position, body.position).normalize();
    if (proposed.dot(toSun) >= MIN_SUNLIT_DOT) return proposed;

    // Closest three-quarter direction to the existing composition. An incoming
    // tangent resolves the rare case where the original direction is anti-solar.
    const tangent = proposed.clone().addScaledVector(toSun, -proposed.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.copy(incoming).addScaledVector(toSun, -incoming.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.copy(body.pole).addScaledVector(toSun, -body.pole.dot(toSun));
    if (tangent.lengthSq() < 1e-6) tangent.crossVectors(Math.abs(toSun.x) < 0.9
      ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0), toSun);
    tangent.normalize();
    const vantage = (side: Vector3) => toSun.clone().multiplyScalar(TARGET_SUNLIT_DOT)
      .addScaledVector(side, Math.sqrt(1 - TARGET_SUNLIT_DOT ** 2)).normalize();
    const preferred = vantage(tangent);
    if (stop.profile !== 'moon' || this.moonArrivalClear(stop, preferred, distance, flightDuration)) return preferred;

    // Keep the same phase angle while looking for a parent-safe side of the moon.
    for (let step = 1; step <= 12; step++) {
      for (const sign of [1, -1]) {
        const side = tangent.clone().applyAxisAngle(toSun, sign * step * Math.PI / 12);
        const alternative = vantage(side);
        if (this.moonArrivalClear(stop, alternative, distance, flightDuration)) return alternative;
      }
    }
    return proposed;
  }

  private moonArrivalClear(stop: Stop, direction: Vector3, distance: number, flightDuration: number): boolean {
    const current = this.body(stop.id);
    const offset = this.camera.position.clone().sub(current.position);
    const startDirection = offset.clone().normalize();
    const angle = Math.acos(Math.min(1, Math.max(-1, startDirection.dot(direction))));
    const sine = Math.sin(angle);
    const advance = flightDuration * this.time.effectiveRate;

    // Sample the same radial and angular easing as CameraController's fixed
    // vantage flight, using the moon and parent at each predicted time.
    for (let i = 0; i <= 32; i++) {
      const raw = i / 32;
      const progress = raw < 0.25 ? raw * smoothstep(raw / 0.25) : raw;
      const s = smoothstep(progress);
      const radius = Math.exp((1 - s) * Math.log(Math.max(offset.length(), 1e-3)) + s * Math.log(distance));
      const flightDirection = angle < 1e-4 ? startDirection.clone()
        : startDirection.clone().multiplyScalar(Math.sin((1 - s) * angle) / sine)
          .addScaledVector(direction, Math.sin(s * angle) / sine);
      this.arrivalSystem.update(this.time.jd + advance * raw / DAY_S, this.time.t + advance * raw);
      const moon = this.arrivalSystem.get(stop.id)!;
      const parent = moon.parent!;
      const camera = moon.position.clone().addScaledVector(flightDirection, radius);
      if (camera.distanceTo(parent.position) <= parent.radius * 1.1) return false;

      if (i === 32) {
        const toMoon = moon.position.clone().sub(camera);
        const toParent = parent.position.clone().sub(camera);
        if (toParent.length() < toMoon.length()) {
          const separation = toMoon.angleTo(toParent);
          const apparentRadii = Math.asin(Math.min(1, moon.radius / toMoon.length()))
            + Math.asin(Math.min(1, parent.radius / toParent.length()));
          if (separation < apparentRadii) return false;
        }
      }
    }
    return true;
  }

  private body(id: string): CelestialBody {
    const body = this.universe.get(id);
    if (!body) throw new Error(`Reach destination missing: ${id}`);
    return body;
  }

  private point(stop: ReachStop): Vector3 | null {
    const ref = destinationRef(stop);
    if (ref.kind !== 'landmark') return null;
    const landmark = this.universe.landmark(ref.landmarkId);
    if (!landmark || landmark.systemId !== null) throw new Error(`Reach landmark missing: ${ref.landmarkId}`);
    return landmark.positionPc.clone().multiplyScalar(PARSEC_KM).sub(this.universe.current.origin);
  }

  private pointRadius(stop: ReachStop): number {
    const ref = destinationRef(stop);
    if (ref.kind !== 'landmark') throw new Error(`Reach destination is not a landmark: ${stop.id}`);
    return this.universe.landmark(ref.landmarkId)!.def.radiusPc * PARSEC_KM;
  }

  private pointSource(stop: ReachStop): { id: string; position: Vector3; radius: number } {
    return { id: stop.id, position: this.point(stop)!, radius: this.pointRadius(stop) * 0.3 };
  }

  private destinationPosition(stop: ReachStop, origin: Vector3): Vector3 {
    const ref = destinationRef(stop);
    return ref.kind === 'landmark'
      ? this.universe.landmark(ref.landmarkId)!.positionPc.clone().multiplyScalar(PARSEC_KM).sub(origin)
      : this.destination(stop).position;
  }

  private destination(stop: ReachStop): CelestialBody {
    const ref = destinationRef(stop);
    if (ref.kind === 'landmark') throw new Error(`Reach landmark has no body: ${stop.id}`);
    const systemId = ref.kind === 'star' ? ref.starId : ref.systemId;
    const system = systemId === this.universe.current.starId
      ? this.universe.current : this.universe.system(systemId);
    const body = ref.kind === 'star' ? system.star : system.get(ref.bodyId);
    if (!body) throw new Error(`Reach destination missing: ${stop.id}`);
    return body;
  }

  private makeLeg(fromId: string, toId: string): ReachDistanceLeg {
    const from = this.stops.find((stop) => stop.id === fromId)!;
    const to = this.stops.find((stop) => stop.id === toId)!;
    const sourceSystem = destinationSystem(from) === this.universe.current.starId
      ? this.universe.current : this.universe.system(destinationSystem(from));
    const targetSystem = destinationSystem(to) === this.universe.current.starId
      ? this.universe.current : this.universe.system(destinationSystem(to));
    if (targetSystem !== this.universe.current) targetSystem.update(this.time.jd, this.time.t);
    return { fromId, toId, departureJd: this.time.jd,
      distanceKm: geometricLegKm(sourceSystem.origin, this.destinationPosition(from, sourceSystem.origin),
        targetSystem.origin.clone().sub(sourceSystem.origin).add(this.destinationPosition(to, targetSystem.origin))) };
  }
}
