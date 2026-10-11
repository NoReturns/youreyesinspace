import type { ReachOdometerState } from './ReachOdometer';
import { destinationRef, destinationSystem, type ReachRoute, type ReachStop } from './ReachDestinations';

export const REACH_JOURNEY_KEY = 'the-reach:journey:v1';
export const REACH_ITINERARY_ID = 'solar-system-41';
export const REACH_ITINERARY_VERSION = 1;
export const REACH_PROXIMA_PILOT_KEY = 'the-reach:journey:pilot-proxima:v4';

export type Vec3 = [number, number, number];
export type Quat = [number, number, number, number];

interface TimedPhase { elapsed: number; duration: number }
export type JourneyPhase =
  | ({ kind: 'observe' } & TimedPhase)
  | ({ kind: 'flyby'; bodyId: string; offset: Vec3; orientation: Quat; up: Vec3 } & TimedPhase)
  | ({ kind: 'departure'; sourceId: string; nextId: string; offset: Vec3; orientation: Quat;
       up: Vec3; orbitRate: number; radialSpeed: number; endRadius: number } & TimedPhase)
  | ({ kind: 'cruise' } & TimedPhase);

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
}

export interface ReachJourneyState {
  schema: 1;
  itinerary: { id: string; version: number };
  destinationId: string;
  routeIndex: number;
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
  const destination = record(state) && typeof state.destinationId === 'string'
    ? route.find((stop) => stop.id === state.destinationId) : undefined;
  if (!record(state) || state.schema !== 1 || !record(state.itinerary)
    || state.itinerary.id !== routeId || state.itinerary.version !== routeVersion
    || typeof state.destinationId !== 'string' || !destination
    || !hasBody(state.destinationId) || !Number.isInteger(state.routeIndex) || !finite(state.routeIndex)
    || state.routeIndex < 0 || state.routeIndex >= route.length
    || !record(state.simulation) || !finite(state.simulation.jd)
    || state.simulation.jd < 2_000_000 || state.simulation.jd > 3_000_000
    || !finite(state.simulation.rate) || state.simulation.rate <= 0 || state.simulation.rate > 1_000_000
    || !record(state.frame) || typeof state.frame.starId !== 'string'
    || !record(state.camera) || !vec3(state.camera.position) || !quat(state.camera.orientation)
    || typeof state.camera.referenceId !== 'string' || !hasBody(state.camera.referenceId)
    || typeof state.camera.targetId !== 'string' || !hasBody(state.camera.targetId)
    || state.camera.referenceId !== state.camera.targetId
    || !finite(state.camera.autoOrbit) || Math.abs(state.camera.autoOrbit) > 1
    || !record(state.phase) || !duration(state.phase.duration)
    || !progress(state.phase.elapsed, state.phase.duration)) return null;

  const phase = state.phase;
  const currentRef = destinationRef(destination);
  const expectedBodyId = currentRef.kind === 'star' ? `s${currentRef.starId.slice(1)}-star` : currentRef.bodyId;
  const expectedFrame = destinationSystem(destination);
  if (state.frame.starId !== expectedFrame || state.camera.referenceId !== expectedBodyId) return null;
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
      || typeof flight.gentleStart !== 'boolean') return null;
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
    const expectedFrom = route[(route.findIndex((stop) => stop.id === state.destinationId) - 1 + route.length) % route.length].id;
    if (phase.kind === 'departure' ? !record(odometer.leg) || odometer.leg.fromId !== state.destinationId
      || odometer.leg.toId !== phase.nextId
      : phase.kind === 'cruise' ? !record(odometer.leg) || odometer.leg.fromId !== expectedFrom
        || odometer.leg.toId !== state.destinationId
        : odometer.leg !== null) return null;
  }

  return state as unknown as ReachJourneyState;
}

export function loadReachJourney(store: ReachJourneyStore, route: readonly ReachRouteStop[] | ReachRoute,
  hasBody: (id: string) => boolean): ReachJourneyState | null {
  try { return parseReachJourney(store.read(), route, hasBody); } catch { return null; }
}

export function saveReachJourney(store: ReachJourneyStore, state: ReachJourneyState): boolean {
  try { store.write(JSON.stringify(state)); return true; } catch { return false; }
}
