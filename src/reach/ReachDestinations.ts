import type { ReachTimingDestination } from './ReachTiming';

export type ReachDestinationRef =
  | { kind: 'body'; systemId: string; bodyId: string }
  | { kind: 'star'; starId: string };

export interface ReachStop extends ReachTimingDestination {
  /** Stable route identity; legacy Solar stops retain their existing body IDs. */
  ref?: ReachDestinationRef;
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
    { id: 'star:c64548', profile: 'star', ref: { kind: 'star', starId: 'c64548' } },
  ],
};

export function destinationRef(stop: ReachStop): ReachDestinationRef {
  return stop.ref ?? { kind: 'body', systemId: 'c0', bodyId: stop.id };
}

export function destinationSystem(stop: ReachStop): string {
  const ref = destinationRef(stop);
  return ref.kind === 'star' ? ref.starId : ref.systemId;
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
    hideIndex: number; targetIndex: number; pointOpacity: number; coronaScale: number;
  } {
  const hideIndex = reachPilotStarHideIndex(index, starRadiusPx, pilotCruise);
  if (!pilotCruise) return { hideIndex, targetIndex: -1, pointOpacity: 1, coronaScale: 1 };
  const blend = disableCoronaBlend ? 0 : reachPilotStarBlend(starRadiusPx);
  return {
    hideIndex, targetIndex: hideIndex === -1 ? index : -1,
    pointOpacity: disableCoronaBlend ? 1 : 1 - blend,
    coronaScale: disableCoronaBlend ? 1 : blend,
  };
}
