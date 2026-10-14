import type { ReachOdometerState } from './ReachOdometer';
import { destinationRef, destinationSystem, type ReachRoute, type ReachStop } from './ReachDestinations';
import { ALPHA_A_INDEX, ALPHA_B_INDEX, ALPHA_BARY_ID, alphaShotSeconds } from './ReachAlphaCentauri';

export const REACH_JOURNEY_KEY = 'the-reach:journey:v1';
export const REACH_ITINERARY_ID = 'solar-system-41';
export const REACH_ITINERARY_VERSION = 4;
const EXPANDED_STOP_IDS = new Set(['iss', 'hubble', 'jwst', 'juno', 'newhorizons', 'parker']);
/** Authored version 2 order, retained solely to validate and finish saved legs. */
const V2_STOP_IDS = [
  'earth', 'iss', 'hubble', 'moon', 'jwst', 'mars', 'phobos', 'deimos', 'vesta', 'ceres',
  'jupiter', 'juno', 'io', 'europa', 'ganymede', 'callisto', 'saturn', 'mimas', 'enceladus',
  'tethys', 'dione', 'rhea', 'titan', 'iapetus', 'uranus', 'miranda', 'ariel', 'umbriel',
  'titania', 'oberon', 'neptune', 'triton', 'pluto', 'charon', 'haumea', 'makemake',
  'newhorizons', 'eris', 'pioneer11', 'pioneer10', 'voyager2', 'voyager1', 'halley',
  'sun', 'parker', 'mercury', 'venus',
] as const;
const V1_STOP_IDS: readonly string[] = V2_STOP_IDS.filter((id) => !EXPANDED_STOP_IDS.has(id));
/** The approved version 3 order. Keep it to validate saved legs across the v4 extension. */
const V3_STOP_IDS = [
  'earth', 'iss', 'hubble', 'moon', 'jwst', 'sun', 'parker', 'mercury', 'venus',
  'mars', 'phobos', 'deimos', 'vesta', 'ceres', 'jupiter', 'juno', 'io', 'europa',
  'ganymede', 'callisto', 'saturn', 'mimas', 'enceladus', 'tethys', 'dione',
  'rhea', 'titan', 'iapetus', 'halley', 'uranus', 'miranda', 'ariel', 'umbriel',
  'titania', 'oberon', 'neptune', 'triton', 'pluto', 'charon', 'haumea',
  'makemake', 'newhorizons', 'eris', 'pioneer11', 'pioneer10', 'voyager2', 'voyager1',
] as const;
/** Archive this order when a later itinerary version is introduced. */
export const V4_STOP_IDS = [
  ...V3_STOP_IDS, 'star:c64548', 'alpha-centauri-ab', 'star:c80155',
  'star:c108500', 'star:c49269', 'star:c29786', 'star:c109365',
  'star:c15247', 'star:c7458', 'star:c83130',
] as const;
export type ReachDirection = 'outbound' | 'inbound';
export function reachStopIdsForVersion(version: number): readonly string[] | null {
  if (version === 1) return V1_STOP_IDS;
  if (version === 2) return V2_STOP_IDS;
  if (version === 3) return V3_STOP_IDS;
  if (version === 4) return V4_STOP_IDS;
  return null;
}
export function previousReachStopId(version: number, destinationId: string): string | null {
  const ids = reachStopIdsForVersion(version);
  if (!ids) return null;
  const index = ids.indexOf(destinationId);
  return index < 0 ? null : ids[(index - 1 + ids.length) % ids.length];
}
export const REACH_PROXIMA_PILOT_KEY = 'the-reach:journey:pilot-proxima:v4';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

interface TimedPhase { elapsed: number; duration: number }
export type JourneyPhase =
  | ({ kind: 'observe' } & TimedPhase)
  | ({ kind: 'flyby'; bodyId: string; offset: Vec3; orientation: Quat; up: Vec3 } & TimedPhase)
  | ({ kind: 'departure'; sourceId: string; nextId: string; offset: Vec3; orientation: Quat;
       up: Vec3; orbitRate: number; radialSpeed: number; endRadius: number } & TimedPhase)
  | ({ kind: 'cruise' } & TimedPhase)
  | ({ kind: 'binary'; shot: string; entryPosition: Vec3; entryTarget: Vec3;
       side: Vec3; up: Vec3 } & TimedPhase);

export interface ReachFlightState {
  targetId: string;
  elapsed: number;
  duration: number;
  startOffset: Vec3;
  endDirection: Vec3;
  endDistance: number;
  startOrientation: Quat;
  up: Vec3 | null;
  gentleStart: boolean;
  /** Absent in checkpoints written before cinematic cruise viewing was introduced. */
  cinematicCruise?: boolean;
  /** Signed local-view roll added over this cruise; absent in older checkpoints. */
  rollDelta?: number;
}

export interface ReachJourneyState {
  schema: 1;
  itinerary: { id: string; version: number };
  destinationId: string;
  routeIndex: number;
  direction: ReachDirection;
  /** Inbound follows the route on which the return began, even after a future expansion. */
  cycleItineraryVersion: number;
  /** Original route for a saved departure/cruise crossing an itinerary boundary. */
  transitionFromVersion?: number;
  phase: JourneyPhase;
  simulation: { jd: number; rate: number };
  frame: { starId: string };
  /** Absent in checkpoints written before the odometer was introduced. */
  odometer?: ReachOdometerState;
  camera: {
    position: Vec3;
    orientation: Quat;
    referenceId: string;
    targetId: string;
    autoOrbit: number;
    flight: ReachFlightState | null;
    /** Arrival orientation in quarter turns; absent in older checkpoints. */
    rollQuarterTurns?: number;
  };
}

/** Replaceable persistence boundary for the eventual native JourneyStateStore. */
export interface ReachJourneyStore {
  read(): string | null;
  write(json: string): void;
}

export interface ReachRouteStop extends ReachStop {}

export class LocalStorageReachJourneyStore implements ReachJourneyStore {
  constructor(private readonly key = REACH_JOURNEY_KEY) {}
  read(): string | null { return window.localStorage.getItem(this.key); }
  write(json: string): void { window.localStorage.setItem(this.key, json); }
}

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const vec3 = (v: unknown): v is Vec3 => Array.isArray(v) && v.length === 3
  && v.every((n) => finite(n) && Math.abs(n) < 1e15);
const nonzeroVec = (v: unknown): v is Vec3 => vec3(v) && v.some((n) => n !== 0);
const quat = (v: unknown): v is Quat => Array.isArray(v) && v.length === 4 && v.every(finite)
  && Math.abs(v.reduce((sum: number, n: number) => sum + n * n, 0) - 1) < 1e-3;
const unit = (v: unknown): v is Vec3 => vec3(v)
  && Math.abs(v.reduce((sum: number, n: number) => sum + n * n, 0) - 1) < 1e-3;
const duration = (v: unknown): v is number => finite(v) && v > 0 && v <= 1000;
const progress = (v: unknown, length: number): v is number => finite(v) && v >= 0 && v <= length;

export function parseReachJourney(raw: string | null, routeInput: readonly ReachRouteStop[] | ReachRoute,
  hasBody: (id: string) => boolean): ReachJourneyState | null {
  if (raw === null) return null;
  const route = Array.isArray(routeInput) ? routeInput as readonly ReachRouteStop[] : (routeInput as ReachRoute).stops;
  const routeId = Array.isArray(routeInput) ? REACH_ITINERARY_ID : (routeInput as ReachRoute).id;
  const routeVersion = Array.isArray(routeInput) ? REACH_ITINERARY_VERSION : (routeInput as ReachRoute).version;
  let state: unknown;
  try { state = JSON.parse(raw); } catch { return null; }
  const sourceVersion = record(state) && record(state.itinerary) ? state.itinerary.version : null;
  const productionRoute = routeId === REACH_ITINERARY_ID && routeVersion >= 4;
  const migrating = productionRoute && typeof sourceVersion === 'number'
    && Number.isSafeInteger(sourceVersion) && sourceVersion < routeVersion
    && reachStopIdsForVersion(sourceVersion) !== null;
  const sourceIds: readonly string[] = migrating
    ? reachStopIdsForVersion(sourceVersion as number)! : route.map((stop) => stop.id);
  const destination = record(state) && typeof state.destinationId === 'string'
    ? route.find((stop) => stop.id === state.destinationId) : undefined;
  if (!record(state) || state.schema !== 1 || !record(state.itinerary)
    || state.itinerary.id !== routeId || (!migrating && sourceVersion !== routeVersion)
    || typeof state.destinationId !== 'string' || !destination
    || !hasBody(state.destinationId) || !Number.isSafeInteger(state.routeIndex)
    || (state.routeIndex as number) < 0
    || ((migrating || !productionRoute) && (state.routeIndex as number) >= sourceIds.length)
    || ((migrating || !productionRoute) && sourceIds[state.routeIndex as number] !== state.destinationId)
    || !record(state.simulation) || !finite(state.simulation.jd)
    || state.simulation.jd < 2_000_000 || state.simulation.jd > 3_000_000
    || !finite(state.simulation.rate) || state.simulation.rate <= 0 || state.simulation.rate > 1_000_000
    || !record(state.frame) || typeof state.frame.starId !== 'string'
    || !record(state.camera) || !vec3(state.camera.position) || !quat(state.camera.orientation)
    || typeof state.camera.referenceId !== 'string' || !hasBody(state.camera.referenceId)
    || typeof state.camera.targetId !== 'string' || !hasBody(state.camera.targetId)
    || !finite(state.camera.autoOrbit) || Math.abs(state.camera.autoOrbit) > 1
    || (state.camera.rollQuarterTurns !== undefined
      && (!Number.isInteger(state.camera.rollQuarterTurns)
        || (state.camera.rollQuarterTurns as number) < 0
        || (state.camera.rollQuarterTurns as number) > 3))
    || !record(state.phase) || !duration(state.phase.duration)
    || !progress(state.phase.elapsed, state.phase.duration)) return null;

  const phase = state.phase;
  const active = phase.kind === 'departure' || phase.kind === 'cruise';
  const savedTransition = state.transitionFromVersion;
  if (savedTransition !== undefined && (!Number.isSafeInteger(savedTransition)
    || reachStopIdsForVersion(savedTransition as number) === null
    || (savedTransition as number) >= (sourceVersion as number)
    || !active || !productionRoute)) return null;
  const transitionVersion: number | null = typeof savedTransition === 'number' ? savedTransition
    : migrating && active ? sourceVersion as number : null;
  if (transitionVersion !== null && phase.kind !== 'departure' && phase.kind !== 'cruise') return null;
  const transitionIds: readonly string[] = transitionVersion === null ? sourceIds
    : reachStopIdsForVersion(transitionVersion)!;
  const direction: ReachDirection = migrating && (sourceVersion as number) < 4 ? 'outbound'
    : state.direction === 'outbound' || state.direction === 'inbound' ? state.direction : 'outbound';
  const cycleVersion = migrating && (sourceVersion as number) < 4 ? routeVersion
    : migrating && direction === 'outbound' ? routeVersion : state.cycleItineraryVersion;
  if (productionRoute && (!migrating || (sourceVersion as number) >= 4)
    && (state.direction !== 'outbound' && state.direction !== 'inbound'
      || !Number.isSafeInteger(cycleVersion) || (cycleVersion as number) < 4
      || (cycleVersion as number) > routeVersion
      || ((cycleVersion as number) !== routeVersion
        && !reachStopIdsForVersion(cycleVersion as number)))) return null;
  const cycleIds = productionRoute
    ? (cycleVersion === routeVersion ? route.map((stop) => stop.id)
      : reachStopIdsForVersion(cycleVersion as number)!) : sourceIds;
  const transitionDirection: ReachDirection = transitionVersion !== null && transitionVersion >= 4
    ? direction : 'outbound';
  const predecessor = (ids: readonly string[], id: string): string | null => {
    const index = ids.indexOf(id);
    return index < 0 ? null : ids[(index - 1 + ids.length) % ids.length];
  };
  const successor = (ids: readonly string[], id: string): string | null => {
    const index = ids.indexOf(id);
    return index < 0 ? null : ids[(index + 1) % ids.length];
  };
  const currentRef = destinationRef(destination);
  const expectedBodyId = currentRef.kind === 'star' ? `s${currentRef.starId.slice(1)}-star` : currentRef.bodyId;
  const expectedFrame = destinationSystem(destination);
  if (state.frame.starId !== expectedFrame || state.camera.referenceId !== expectedBodyId) return null;
  const binaryTargets = [ALPHA_BARY_ID, `s${ALPHA_A_INDEX}-star`, `s${ALPHA_B_INDEX}-star`];
  if (phase.kind !== 'binary' && state.camera.referenceId !== state.camera.targetId) return null;
  if (phase.kind !== 'observe' && state.camera.autoOrbit !== 0) return null;
  if (phase.kind === 'observe') {
    if (destination.profile === 'moon' || state.camera.flight !== null) return null;
  } else if (phase.kind === 'flyby') {
    if (destination.profile !== 'moon' || phase.bodyId !== state.destinationId
      || !nonzeroVec(phase.offset) || !quat(phase.orientation)
      || !unit(phase.up) || state.camera.flight !== null) return null;
  } else if (phase.kind === 'departure') {
    if (phase.sourceId !== expectedBodyId || typeof phase.nextId !== 'string'
      || !route.some((stop) => stop.id === phase.nextId) || !hasBody(phase.nextId)
      || phase.nextId !== (transitionVersion !== null
        ? transitionDirection === 'inbound'
          ? predecessor(transitionIds, state.destinationId) : successor(transitionIds, state.destinationId)
        : direction === 'inbound' ? predecessor(cycleIds, state.destinationId)
          : successor(sourceIds, state.destinationId))
      || !nonzeroVec(phase.offset) || !quat(phase.orientation) || !unit(phase.up)
      || !finite(phase.orbitRate) || Math.abs(phase.orbitRate) > 1
      || !finite(phase.radialSpeed) || !finite(phase.endRadius) || phase.endRadius <= 0 || phase.endRadius >= 1e15
      || state.camera.flight !== null) return null;
  } else if (phase.kind === 'cruise') {
    const flight = state.camera.flight;
    if (!record(flight) || flight.targetId !== expectedBodyId
      || !duration(flight.duration) || !progress(flight.elapsed, flight.duration)
      || flight.duration !== phase.duration || flight.elapsed !== phase.elapsed
      || !nonzeroVec(flight.startOffset) || !unit(flight.endDirection)
      || !finite(flight.endDistance) || flight.endDistance <= 0 || flight.endDistance >= 1e15
      || !quat(flight.startOrientation) || (flight.up !== null && !unit(flight.up))
      || typeof flight.gentleStart !== 'boolean'
      || (flight.cinematicCruise !== undefined && typeof flight.cinematicCruise !== 'boolean')
      || (flight.rollDelta !== undefined && (!finite(flight.rollDelta)
        || ![-Math.PI, -Math.PI / 2, 0, Math.PI / 2, Math.PI].some(
          (angle) => Math.abs(angle - (flight.rollDelta as number)) < 1e-9)))) return null;
  } else if (phase.kind === 'binary') {
    if (state.destinationId !== 'alpha-centauri-ab'
      || !binaryTargets.includes(state.camera.targetId as string)
      || state.camera.flight !== null
      || typeof phase.shot !== 'string' || alphaShotSeconds(phase.shot) !== phase.duration
      || !vec3(phase.entryPosition) || !vec3(phase.entryTarget)
      || !unit(phase.side) || !unit(phase.up)) return null;
  } else return null;

  if (state.odometer !== undefined) {
    const odometer = state.odometer;
    if (!record(odometer) || !finite(odometer.completedKm) || odometer.completedKm < 0
      || odometer.completedKm > 1e25 || !Number.isSafeInteger(odometer.roundTrips)
      || (odometer.roundTrips as number) < 0 || (odometer.roundTrips as number) > 1_000_000
      || (odometer.leg !== null && (!record(odometer.leg)
        || typeof odometer.leg.fromId !== 'string' || !hasBody(odometer.leg.fromId)
        || typeof odometer.leg.toId !== 'string' || !hasBody(odometer.leg.toId)
        || !finite(odometer.leg.distanceKm) || odometer.leg.distanceKm < 0 || odometer.leg.distanceKm > 1e25
        || !finite(odometer.leg.departureJd) || odometer.leg.departureJd < 2_000_000
        || odometer.leg.departureJd > 3_000_000))) return null;
    if (phase.kind === 'departure' ? !record(odometer.leg) || odometer.leg.fromId !== state.destinationId
      || odometer.leg.toId !== phase.nextId
      : phase.kind === 'cruise' ? !record(odometer.leg)
        || odometer.leg.fromId !== (transitionVersion !== null
          ? transitionDirection === 'inbound'
            ? successor(transitionIds, state.destinationId) : predecessor(transitionIds, state.destinationId)
          : direction === 'inbound' ? successor(cycleIds, state.destinationId)
            : predecessor(sourceIds, state.destinationId))
        || odometer.leg.toId !== state.destinationId
        : odometer.leg !== null) return null;
  }

  const parsed = state as unknown as ReachJourneyState;
  return { ...parsed, itinerary: { id: routeId, version: routeVersion },
    routeIndex: route.findIndex((stop) => stop.id === parsed.destinationId),
    direction, cycleItineraryVersion: productionRoute ? cycleVersion as number : routeVersion,
    ...(transitionVersion !== null ? { transitionFromVersion: transitionVersion } : {}) };
}

export function loadReachJourney(store: ReachJourneyStore, route: readonly ReachRouteStop[] | ReachRoute,
  hasBody: (id: string) => boolean): ReachJourneyState | null {
  try { return parseReachJourney(store.read(), route, hasBody); } catch { return null; }
}

/** A rejected checkpoint remains in storage for recovery instead of being replaced by a fresh voyage. */
export function inspectReachJourneyStore(store: ReachJourneyStore, route: ReachRoute,
  hasBody: (id: string) => boolean): { state: ReachJourneyState | null; canWrite: boolean } {
  try {
    const raw = store.read();
    const state = parseReachJourney(raw, route, hasBody);
    return { state, canWrite: raw === null || state !== null };
  } catch { return { state: null, canWrite: false }; }
}

export function saveReachJourney(store: ReachJourneyStore, state: ReachJourneyState): boolean {
  try { store.write(JSON.stringify(state)); return true; } catch { return false; }
}
