import type { ReachDestinationRef, ReachStop } from './ReachDestinations';

export type ReachInfoSide = 'left' | 'right';
export interface ReachInfoPlacement {
  side: ReachInfoSide;
  vertical: 'center' | 'top' | 'bottom';
  width: number;
  availableHeight: number;
}

export interface ReachObservation {
  stop: ReachStop;
  elapsed: number;
  remaining: number;
  departing: boolean;
}

export function reachInfoTarget(observation: ReachObservation | null, primary: boolean,
  resolve: (stop: ReachStop) => ReachDestinationRef): ReachDestinationRef | null {
  return primary && observation ? resolve(observation.stop) : null;
}

export function reachInfoSide(projectedX: number, previous: ReachInfoSide | null): ReachInfoSide {
  if (projectedX < -0.18) return 'right';
  if (projectedX > -0.06) return 'left';
  return previous ?? 'left';
}

export function reachInfoPlacement(projectedX: number, projectedY: number, radiusPx: number,
  viewportWidth: number, viewportHeight: number, previous: ReachInfoSide | null): ReachInfoPlacement {
  const side = reachInfoSide(projectedX, previous);
  const x = (projectedX + 1) * viewportWidth / 2;
  const y = (1 - projectedY) * viewportHeight / 2;
  const clearance = (side === 'left' ? x : viewportWidth - x) - radiusPx - 32;
  if (clearance >= 160) return { side, vertical: 'center', width: Math.min(400, clearance),
    availableHeight: viewportHeight - 112 };
  const above = y - radiusPx - 48;
  const below = viewportHeight - y - radiusPx - 48;
  return { side, vertical: above >= below ? 'top' : 'bottom',
    width: Math.min(400, viewportWidth / 2 - 20), availableHeight: Math.max(80, Math.max(above, below)) };
}

export function reachInfoOpacity(observation: ReachObservation | null): number {
  if (!observation) return 0;
  return Math.max(0, Math.min(1, observation.elapsed / 5,
    observation.departing ? observation.remaining / 5 : 1));
}
