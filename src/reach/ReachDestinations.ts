import type { ReachTimingDestination } from './ReachTiming';
import { ALPHA_BARY_ID, ALPHA_SYSTEM_ID, ALPHA_A_INDEX, ALPHA_B_INDEX } from './ReachAlphaCentauri';

export type ReachDestinationRef =
  | { kind: 'body'; systemId: string; bodyId: string }
  | { kind: 'star'; starId: string }
  | { kind: 'landmark'; landmarkId: string };

export interface ReachStop extends ReachTimingDestination {
  /** Stable route identity; legacy Solar stops retain their existing body IDs. */
  ref?: ReachDestinationRef;
  label?: string;
  /** Optional encounter presentation; physical catalogue properties remain authoritative. */
  starPresentation?: {
    observationDistanceRadii: number;
    surfaceMotion: number;
    coronaMotion: number;
    colorWarmth: number;
  };
  /** A/B barycentric establishing and departure overview. */
  binaryOverview?: boolean;
}

export interface ReachRoute {
  id: string;
  version: number;
  stops: readonly ReachStop[];
  repeat: boolean;
}

export const REACH_PROXIMA_PILOT: ReachRoute = {
  id: 'pilot-proxima', version: 4, repeat: false,
  stops: [
    { id: 'earth', profile: 'planet', ref: { kind: 'body', systemId: 'c0', bodyId: 'earth' } },
    { id: 'star:c64548', profile: 'star', label: 'Proxima Centauri',
      ref: { kind: 'star', starId: 'c64548' },
      starPresentation: { observationDistanceRadii: 6.95, surfaceMotion: 1, coronaMotion: 0.35, colorWarmth: 0.85 } },
  ],
};

/** Catalogue primary stars exposed only through development preview routes. */
export const REACH_NEARBY_STAR_PREVIEWS = {
  barnard: ['c80155', "Barnard's Star"],
  'wolf-359': ['c108500', 'Wolf 359'],
  'lalande-21185': ['c49269', 'Lalande 21185'],
  sirius: ['c29786', 'Sirius A'],
  'ross-248': ['c109365', 'Ross 248'],
  'epsilon-eridani': ['c15247', 'Epsilon Eridani'],
  'tau-ceti': ['c7458', 'Tau Ceti'],
  vega: ['c83130', 'Vega'],
} as const;

/** A 50-degree vertical FOV gives a 30% disc while clearing the 4.5-radius corona. */
export const REACH_NEARBY_OBSERVATION_RADII = Math.max(4.8,
  Math.sqrt(1 + 1 / (0.30 * Math.tan(50 * Math.PI / 360)) ** 2));

const alphaBaryRef: ReachDestinationRef = { kind: 'body', systemId: ALPHA_SYSTEM_ID, bodyId: ALPHA_BARY_ID };
export const REACH_ALPHA_CENTAURI_PREVIEW: ReachRoute = {
  id: 'preview:alpha-centauri', version: 1, repeat: false,
  stops: [
    { id: 'earth', profile: 'planet', ref: { kind: 'body', systemId: 'c0', bodyId: 'earth' } },
    { id: 'alpha:establish', profile: 'star', label: 'Alpha Centauri A/B',
      ref: alphaBaryRef, binaryOverview: true },
    { id: 'alpha:a', profile: 'star', label: 'Alpha Centauri A',
      ref: { kind: 'body', systemId: ALPHA_SYSTEM_ID, bodyId: `s${ALPHA_A_INDEX}-star` },
      starPresentation: { observationDistanceRadii: REACH_NEARBY_OBSERVATION_RADII,
        surfaceMotion: 0.6, coronaMotion: 0.2, colorWarmth: 0 } },
    { id: 'alpha:b', profile: 'star', label: 'Alpha Centauri B',
      ref: { kind: 'body', systemId: ALPHA_SYSTEM_ID, bodyId: `s${ALPHA_B_INDEX}-star` },
      starPresentation: { observationDistanceRadii: REACH_NEARBY_OBSERVATION_RADII,
        surfaceMotion: 0.6, coronaMotion: 0.2, colorWarmth: 0 } },
    { id: 'alpha:departure', profile: 'star', label: 'Alpha Centauri A/B',
      ref: alphaBaryRef, binaryOverview: true },
  ],
};

export function destinationRef(stop: ReachStop): ReachDestinationRef {
  return stop.ref ?? { kind: 'body', systemId: 'c0', bodyId: stop.id };
}

export function destinationSystem(stop: ReachStop): string {
  const ref = destinationRef(stop);
  return ref.kind === 'star' ? ref.starId : ref.kind === 'landmark' ? 'c0' : ref.systemId;
}

/** Bounded wall-clock drift: stable through simulation rate changes and shared by panorama windows. */
export function reachStarVisualDrift(seconds: number): [number, number, number] {
  return [Math.sin(seconds * 0.045), Math.cos(seconds * 0.061), Math.sin(seconds * 0.037 + 0.8)];
}

/** Keep the pilot target's catalogue point until its local disc is clearly visible. */
export function reachPilotStarHideIndex(index: number, starRadiusPx: number, pilotCruise: boolean): number {
  return pilotCruise && starRadiusPx < 1.5 ? -1 : index;
}

/** Blend the pilot point into the already-rendered corona across its measured approach size. */
export function reachPilotStarBlend(starRadiusPx: number): number {
  const t = Math.min(1, Math.max(0, (starRadiusPx - 0.15) / 1.35));
  return t * t * (3 - 2 * t);
}

/** Pilot-only point/corona presentation. The isolation mode leaves the star renderer untouched. */
export function reachPilotStarAppearance(index: number, starRadiusPx: number,
  pilotCruise: boolean, disableCoronaBlend: boolean): {
    hideIndex: number; targetIndex: number; pointOpacity: number; coronaScale: number; discScale: number;
  } {
  const hideIndex = reachPilotStarHideIndex(index, starRadiusPx, pilotCruise);
  if (!pilotCruise) return { hideIndex, targetIndex: -1, pointOpacity: 1, coronaScale: 1, discScale: 1 };
  const blend = disableCoronaBlend ? 0 : reachPilotStarBlend(starRadiusPx);
  return {
    hideIndex, targetIndex: hideIndex === -1 ? index : -1,
    pointOpacity: disableCoronaBlend ? 1 : 1 - blend,
    coronaScale: disableCoronaBlend ? 1 : blend,
    discScale: disableCoronaBlend ? 1 : blend,
  };
}
