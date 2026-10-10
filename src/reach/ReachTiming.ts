export type ReachTimingMode = 'test' | 'production';
export type ReachProfile = 'planet' | 'moon' | 'small' | 'probe' | 'sun';
export type ReachTravelKind = 'moon' | 'planet' | 'distant' | 'probe';
export interface ReachTimingDestination { id: string; profile: ReachProfile }
export type DurationRange = readonly [minSeconds: number, maxSeconds: number];

export interface ReachTimingConfig {
  travel: Record<ReachTravelKind, DurationRange>;
  observe: Record<ReachProfile, DurationRange>;
  departure: { fullSeconds: number; moonSeconds: number };
}

export const REACH_TIMING: Record<ReachTimingMode, ReachTimingConfig> = {
  test: {
    travel: { moon: [30, 30], planet: [30, 30], distant: [30, 30], probe: [30, 30] },
    observe: { planet: [8, 8], moon: [8, 8], small: [8, 8], probe: [8, 8], sun: [8, 8] },
    departure: { fullSeconds: 10, moonSeconds: 7 },
  },
  production: {
    travel: { moon: [45, 180], planet: [120, 600], distant: [240, 900], probe: [300, 900] },
    observe: { planet: [30, 120], moon: [12, 30], small: [20, 75], probe: [60, 180], sun: [40, 100] },
    departure: { fullSeconds: 10, moonSeconds: 7 },
  },
};

// Outer planets, dwarf planets, asteroids, the comet, and the return to the Sun.
const DISTANT_STOPS = new Set([
  'vesta', 'ceres', 'uranus', 'neptune', 'pluto', 'haumea', 'makemake', 'eris', 'halley', 'sun',
]);

export function reachTravelKind(destination: ReachTimingDestination): ReachTravelKind {
  if (destination.profile === 'moon') return 'moon';
  if (destination.profile === 'probe') return 'probe';
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
    return this.pick(this.config.observe[destination.profile]);
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
