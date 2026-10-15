export type ReachTimingMode = 'test' | 'production' | 'preview';
export type ReachProfile = 'planet' | 'moon' | 'small' | 'probe' | 'sun' | 'star' | 'landmark';
export type ReachTravelKind = 'moon' | 'planet' | 'distant' | 'probe' | 'nearEarthProbe' | 'interstellar';
export type ReachObserveKind = ReachProfile | 'nearEarthProbe';
export interface ReachTimingDestination { id: string; profile: ReachProfile }
export type DurationRange = readonly [minSeconds: number, maxSeconds: number];

export interface ReachTimingConfig {
  travel: Record<ReachTravelKind, DurationRange>;
  observe: Record<ReachObserveKind, DurationRange>;
  departure: { fullSeconds: number; moonSeconds: number };
}

export const REACH_TIMING: Record<ReachTimingMode, ReachTimingConfig> = {
  preview: {
    travel: { moon: [8, 8], planet: [8, 8], distant: [8, 8], probe: [8, 8], nearEarthProbe: [8, 8], interstellar: [8, 8] },
    observe: { planet: [6, 6], moon: [6, 6], small: [6, 6], probe: [6, 6], nearEarthProbe: [6, 6], sun: [6, 6], star: [6, 6], landmark: [90, 90] },
    departure: { fullSeconds: 2, moonSeconds: 2 },
  },
  test: {
    travel: { moon: [30, 30], planet: [30, 30], distant: [30, 30], probe: [30, 30], nearEarthProbe: [30, 30], interstellar: [28, 28] },
    observe: { planet: [8, 8], moon: [8, 8], small: [8, 8], probe: [8, 8], nearEarthProbe: [8, 8], sun: [8, 8], star: [8, 8], landmark: [8, 8] },
    departure: { fullSeconds: 10, moonSeconds: 7 },
  },
  production: {
    travel: { moon: [45, 180], planet: [120, 600], distant: [240, 900], probe: [300, 900], nearEarthProbe: [75, 125], interstellar: [240, 900] },
    observe: { planet: [30, 120], moon: [12, 30], small: [20, 75], probe: [60, 180], nearEarthProbe: [20, 40], sun: [40, 100], star: [40, 100], landmark: [40, 100] },
    departure: { fullSeconds: 10, moonSeconds: 7 },
  },
};

// Outer planets, dwarf planets, asteroids, the comet, and the return to the Sun.
const DISTANT_STOPS = new Set([
  'vesta', 'ceres', 'uranus', 'neptune', 'pluto', 'haumea', 'makemake', 'eris', 'halley', 'sun',
]);
const NEAR_EARTH_PROBES = new Set(['iss', 'hubble', 'jwst']);

export function reachObserveKind(destination: ReachTimingDestination): ReachObserveKind {
  return destination.profile === 'probe' && NEAR_EARTH_PROBES.has(destination.id)
    ? 'nearEarthProbe' : destination.profile;
}

export function reachTravelKind(destination: ReachTimingDestination): ReachTravelKind {
  if (destination.profile === 'star' || destination.profile === 'landmark') return 'interstellar';
  if (destination.profile === 'moon') return 'moon';
  if (destination.profile === 'probe') return NEAR_EARTH_PROBES.has(destination.id) ? 'nearEarthProbe' : 'probe';
  return DISTANT_STOPS.has(destination.id) ? 'distant' : 'planet';
}

/** A duration is drawn only when its phase begins, then held by JourneyState. */
export class ReachTiming {
  readonly config: ReachTimingConfig;

  constructor(readonly mode: ReachTimingMode = 'production', private readonly random: () => number = Math.random) {
    this.config = REACH_TIMING[mode];
  }

  travel(destination: ReachTimingDestination): number {
    return this.pick(this.config.travel[reachTravelKind(destination)]);
  }

  observe(destination: ReachTimingDestination): number {
    return this.pick(this.config.observe[reachObserveKind(destination)]);
  }

  departure(destination: ReachTimingDestination): number {
    return destination.profile === 'moon' ? this.config.departure.moonSeconds : this.config.departure.fullSeconds;
  }

  private pick([min, max]: DurationRange): number {
    const sampled = this.random();
    const unit = Number.isFinite(sampled) ? Math.min(1, Math.max(0, sampled)) : 0.5;
    return min + (max - min) * unit;
  }
}
