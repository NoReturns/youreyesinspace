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

const MLY_KM = LIGHT_YEAR_KM * 1_000_000;
const GLY_KM = LIGHT_YEAR_KM * 1_000_000_000;

/** Centre-to-centre separation in one Sun-relative scene frame, sampled at departure. */
export function geometricLegKm(origin: Vector3, source: Vector3, destination: Vector3): number {
  return origin.clone().add(destination).distanceTo(origin.clone().add(source));
}

function localeNumber(value: number, maximumFractionDigits: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits, minimumFractionDigits: 0 });
}

/** Readable magnitude-based precision for HUD quantities. */
function hudFractionDigits(value: number): number {
  const v = Math.abs(value);
  if (v >= 10_000) return 0;
  if (v >= 1000) return 0;
  if (v >= 100) return 1;
  if (v >= 10) return 2;
  if (v >= 1) return 3;
  if (v >= 0.1) return 4;
  if (v >= 0.01) return 5;
  return 6;
}

function astroFractionDigits(value: number): number {
  const v = Math.abs(value);
  if (v >= 1000) return 0;
  if (v >= 100) return 1;
  if (v >= 1) return 3;
  return hudFractionDigits(v);
}

export function formatVoyageDistance(km: number): string {
  if (!Number.isFinite(km) || km <= 0) return '0 km';
  if (km < 0.01 * AU_KM) {
    const digits = km >= 1000 ? 0 : hudFractionDigits(km);
    return `${localeNumber(km, digits)} km`;
  }
  if (km < 1000 * AU_KM) {
    const au = km / AU_KM;
    return `${localeNumber(au, astroFractionDigits(au))} AU`;
  }
  if (km < MLY_KM) {
    const ly = km / LIGHT_YEAR_KM;
    return `${localeNumber(ly, astroFractionDigits(ly))} LY`;
  }
  if (km < GLY_KM) {
    const mly = km / MLY_KM;
    return `${localeNumber(mly, astroFractionDigits(mly))} million LY`;
  }
  const gly = km / GLY_KM;
  return `${localeNumber(gly, astroFractionDigits(gly))} billion LY`;
}

export function formatApproxSpeed(kmPerSecond: number): string {
  const prefix = 'Approx Speed: ';
  if (!Number.isFinite(kmPerSecond) || kmPerSecond <= 0) return `${prefix}0 km/s`;
  const unitKm = kmPerSecond >= LIGHT_YEAR_KM ? LIGHT_YEAR_KM
    : kmPerSecond >= AU_KM ? AU_KM : 1;
  const unit = unitKm === LIGHT_YEAR_KM ? 'LY/s' : unitKm === AU_KM ? 'AU/s' : 'km/s';
  const value = kmPerSecond / unitKm;
  if (value < 0.000001) return `${prefix}< 0.000001 ${unit}`;
  return `${prefix}${localeNumber(value, hudFractionDigits(value))} ${unit}`;
}

/** @deprecated Use formatApproxSpeed */
export const formatApproxSpeedC = formatApproxSpeed;

/** Use the opposite row so long countdown names cannot overlap the odometer. */
export function resolveOdometerPosition(countdown: CountdownPosition | 'auto', routeIndex: number): CountdownPosition {
  const occupied = resolveCountdownPosition(countdown, routeIndex);
  const row = occupied.startsWith('top') ? COUNTDOWN_POSITIONS.slice(3) : COUNTDOWN_POSITIONS.slice(0, 3);
  return row[routeIndex % row.length];
}

export function readOdometerContract(defaultVisible = false): { position: CountdownPosition | 'auto' } | null {
  const value = (window as Window & { __reachCountdown?: unknown }).__reachCountdown;
  if (value === undefined) return defaultVisible ? { position: 'auto' } : null;
  if (!value || typeof value !== 'object') return null;
  const config = value as { primaryDisplay?: unknown; position?: unknown };
  if (config.primaryDisplay !== true || (config.position !== 'auto'
    && !COUNTDOWN_POSITIONS.includes(config.position as CountdownPosition))) return null;
  return { position: config.position as CountdownPosition | 'auto' };
}

const MIN_SPEED_SAMPLE_S = 0.9;

export class ReachOdometerOverlay {
  private readonly element = document.createElement('div');
  private lastUpdate = -Infinity;
  private lastRouteIndex = -1;
  private lastPhase = '';
  private lastDistanceSample = -1;
  private lastDistanceTime = -Infinity;

  constructor(private readonly director: ReachVoyageDirector, private readonly countdownPosition: CountdownPosition | 'auto') {
    this.element.id = 'reach-odometer';
    this.element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.element);
  }

  private resetSpeedSampling(): void {
    this.lastDistanceSample = -1;
    this.lastDistanceTime = -Infinity;
  }

  update(now: number): void {
    const countdown = this.director.countdown;
    if (countdown.routeIndex !== this.lastRouteIndex) {
      this.lastRouteIndex = countdown.routeIndex;
      this.element.dataset.position = resolveOdometerPosition(this.countdownPosition, countdown.routeIndex);
      this.resetSpeedSampling();
    }
    if (countdown.phase !== this.lastPhase) {
      this.lastPhase = countdown.phase;
      this.resetSpeedSampling();
    }
    if (now - this.lastUpdate < 1000) return;
    this.lastUpdate = now;

    const distanceLine = `Distance Travelled: ${formatVoyageDistance(this.director.distanceTravelledKm)}`;
    let speedLine = '';
    if (this.director.odometerStationary) {
      speedLine = formatApproxSpeed(0);
      this.resetSpeedSampling();
    } else if (countdown.phase === 'NEXT') {
      const km = this.director.activeLegDistanceKm;
      if (km === null) {
        this.resetSpeedSampling();
      } else {
        if (this.lastDistanceSample >= 0 && now - this.lastDistanceTime >= MIN_SPEED_SAMPLE_S * 1000) {
          const dt = (now - this.lastDistanceTime) / 1000;
          const delta = km - this.lastDistanceSample;
          if (dt > 0 && delta >= 0 && Number.isFinite(delta)) {
            speedLine = formatApproxSpeed(delta / dt);
          }
        }
        this.lastDistanceSample = km;
        this.lastDistanceTime = now;
      }
    } else {
      this.resetSpeedSampling();
    }

    const text = speedLine ? `${distanceLine}\n${speedLine}` : distanceLine;
    if (this.element.textContent !== text) this.element.textContent = text;
  }
}
