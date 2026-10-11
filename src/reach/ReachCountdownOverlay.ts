import type { ReachVoyageDirector } from './ReachVoyageDirector';

export const COUNTDOWN_POSITIONS = [
  'top-left', 'top-centre', 'top-right',
  'bottom-left', 'bottom-centre', 'bottom-right',
] as const;
export type CountdownPosition = typeof COUNTDOWN_POSITIONS[number];

export function resolveCountdownPosition(position: CountdownPosition | 'auto', routeIndex: number): CountdownPosition {
  return position === 'auto' ? COUNTDOWN_POSITIONS[routeIndex % COUNTDOWN_POSITIONS.length] : position;
}

interface CountdownContract { enabled: boolean; primaryDisplay: boolean; position: CountdownPosition | 'auto' }

export function readCountdownContract(defaultVisible = false): CountdownContract | null {
  const value = (window as Window & { __reachCountdown?: unknown }).__reachCountdown;
  if (value === undefined)
    return defaultVisible ? { enabled: true, primaryDisplay: true, position: 'auto' } : null;
  if (!value || typeof value !== 'object') return null;
  const config = value as Partial<CountdownContract>;
  if (config.enabled !== true || config.primaryDisplay !== true) return null;
  if (config.position !== 'auto' && !COUNTDOWN_POSITIONS.includes(config.position as CountdownPosition)) return null;
  return config as CountdownContract;
}

export function formatCountdown(seconds: number): string {
  const whole = Number.isFinite(seconds) ? Math.ceil(Math.max(0, seconds)) : 0;
  const minutes = Math.floor(whole / 60);
  const sec = String(whole % 60).padStart(2, '0');
  if (minutes < 60) return `${String(minutes).padStart(2, '0')}:${sec}`;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}:${sec}`;
}

export class ReachCountdownOverlay {
  private readonly element = document.createElement('div');
  private lastUpdate = -Infinity;
  private lastRouteIndex = -1;

  constructor(private readonly director: ReachVoyageDirector, private readonly position: CountdownPosition | 'auto') {
    this.element.id = 'reach-countdown';
    this.element.setAttribute('aria-hidden', 'true');
    document.body.appendChild(this.element);
  }

  update(now: number): void {
    const countdown = this.director.countdown;
    if (countdown.routeIndex !== this.lastRouteIndex) {
      this.lastRouteIndex = countdown.routeIndex;
      this.element.dataset.position = resolveCountdownPosition(this.position, countdown.routeIndex);
    }
    if (now - this.lastUpdate < 1000) return;
    this.lastUpdate = now;
    const name = countdown.destinationId.replace(/([a-z])(\d)/g, '$1 $2').toUpperCase();
    const text = `${countdown.phase}: ${name} ${formatCountdown(countdown.secondsLeft)}`;
    if (this.element.textContent !== text) this.element.textContent = text;
  }
}
