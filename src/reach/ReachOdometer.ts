import { Vector3 } from 'three';
import { AU_KM, LIGHT_YEAR_KM } from '../core/constants';
import type { ReachVoyageDirector } from './ReachVoyageDirector';
import { COUNTDOWN_POSITIONS, resolveCountdownPosition, type CountdownPosition } from './ReachCountdownOverlay';

export interface ReachDistanceLeg {
  fromId: string;
  toId: string;
  distanceKm: number;
  departureJd: number;
}

export interface ReachOdometerState {
  completedKm: number;
  roundTrips: number;
  leg: ReachDistanceLeg | null;
}

/** Centre-to-centre separation in one Sun-relative scene frame, sampled at departure. */
export function geometricLegKm(origin: Vector3, source: Vector3, destination: Vector3): number {
  return origin.clone().add(destination).distanceTo(origin.clone().add(source));
}

export function formatVoyageDistance(km: number): string {
  const unit = km >= LIGHT_YEAR_KM * 1_000_000 ? 'MLY' : km >= LIGHT_YEAR_KM ? 'LY' : 'AU';
  const divisor = unit === 'MLY' ? LIGHT_YEAR_KM * 1_000_000 : unit === 'LY' ? LIGHT_YEAR_KM : AU_KM;
  const value = Math.max(0, km) / divisor;
  if (value > 0 && value < 1e-9) return `${value.toExponential(2)} ${unit}`;
  const digits = value >= 1000 ? 0 : value >= 100 ? 1 : value >= 1 ? 3
    : Math.min(9, Math.max(3, Math.ceil(-Math.log10(value || 1)) + 2));
  return `${value.toLocaleString('en-US', { maximumFractionDigits: digits })} ${unit}`;
}

/** Use the opposite row so long countdown names cannot overlap the two-line odometer. */
export function resolveOdometerPosition(countdown: CountdownPosition | 'auto', routeIndex: number): CountdownPosition {
  const occupied = resolveCountdownPosition(countdown, routeIndex);
  const row = occupied.startsWith('top') ? COUNTDOWN_POSITIONS.slice(3) : COUNTDOWN_POSITIONS.slice(0, 3);
  return row[routeIndex % row.length];
}

export function readOdometerContract(): { position: CountdownPosition | 'auto' } | null {
  const value = (window as Window & { __reachCountdown?: unknown }).__reachCountdown;
  if (!value || typeof value !== 'object') return null;
  const config = value as { primaryDisplay?: unknown; position?: unknown };
  if (config.primaryDisplay !== true || (config.position !== 'auto'
    && !COUNTDOWN_POSITIONS.includes(config.position as CountdownPosition))) return null;
  return { position: config.position as CountdownPosition | 'auto' };
}

export class ReachOdometerOverlay {
  private readonly element = document.createElement('div');
  private lastUpdate = -Infinity;
  private lastRouteIndex = -1;

  constructor(private readonly director: ReachVoyageDirector, private readonly countdownPosition: CountdownPosition | 'auto') {
    this.element.id = 'reach-odometer';
    this.element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.element);
  }

  update(now: number): void {
    const routeIndex = this.director.countdown.routeIndex;
    if (routeIndex !== this.lastRouteIndex) {
      this.lastRouteIndex = routeIndex;
      this.element.dataset.position = resolveOdometerPosition(this.countdownPosition, routeIndex);
    }
    if (now - this.lastUpdate < 1000) return;
    this.lastUpdate = now;
    const text = `Distance Travelled: ${formatVoyageDistance(this.director.distanceTravelledKm)}\nRound-Trips: ${this.director.roundTrips}`;
    if (this.element.textContent !== text) this.element.textContent = text;
  }
}
