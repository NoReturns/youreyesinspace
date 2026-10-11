import type { Quaternion, Vector3 } from 'three';
import type { PlanetPreparationStep } from './ReachPlanetResourcePreparation';

export function reachArrivalTraceEnabled(): boolean {
  return typeof window !== 'undefined'
    && (window as Window & { __reachArrivalTrace?: boolean }).__reachArrivalTrace === true;
}

interface ArrivalFrame {
  ms: number;
  intervalMs: number;
  frameMs: number;
  cameraMs: number;
  bodiesMs: number;
  galaxyMs: number;
  orbitMs: number;
  visibleOrbits: number;
  visibleMeshes: string;
  eligibleMeshes: string;
  visiblePlanetMeshes: string;
  geometries: number;
  textures: number;
  programs: number;
  drawCalls: number;
  renderMs: number;
  distanceKm: number;
  radiusPx: number;
  point: boolean;
  pointOpacity: number;
  corona: boolean;
  coronaIntensity: number;
  mesh: boolean;
  phase: string;
  flightS: number | null;
  visibility: DocumentVisibilityState;
  position: [number, number, number];
  orientation: [number, number, number, number];
  turnDeg: number;
}

/** Opt-in development trace for the Proxima pilot; it never participates in playback decisions. */
export class ReachArrivalTrace {
  private readonly frames: ArrivalFrame[] = [];
  private readonly events: { name: string; atMs: number; durationMs?: number }[] = [];
  private readonly longTasks: { atMs: number; durationMs: number }[] = [];
  private readonly preparation: (PlanetPreparationStep & { atMs: number; visibility: DocumentVisibilityState })[] = [];
  private readonly firstDraws: { id: string; atMs: number; renderMs: number; intervalMs: number;
    flightS: number | null; prepared: boolean }[] = [];
  private readonly prepared = new Set<string>();
  private readonly drawn = new Set<string>();
  private lastOrientation: Quaternion | null = null;
  private handoffMs: number | null = null;
  private firstCorona = false;
  private lastPhase = '';
  private flushed = false;

  constructor(private readonly disableCoronaBlend = false, private readonly disablePlanetMeshes = false) {
    if (typeof PerformanceObserver !== 'undefined'
      && PerformanceObserver.supportedEntryTypes.includes('longtask')) {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.longTasks.push({ atMs: Math.round(entry.startTime), durationMs: Math.round(entry.duration) });
          if (this.longTasks.length > 32) this.longTasks.shift();
        }
      }).observe({ type: 'longtask', buffered: true });
    }
  }

  event(name: string, durationMs?: number): void {
    const event = { name, atMs: Math.round(performance.now()),
      durationMs: durationMs === undefined ? undefined : Math.round(durationMs * 100) / 100 };
    this.events.push(event);
    if (this.events.length > 32) this.events.shift();
    console.info('[reach-arrival-event]', JSON.stringify(event));
  }

  preparationStep(step: PlanetPreparationStep): void {
    this.preparation.push({ ...step, atMs: Math.round(performance.now()), visibility: document.visibilityState });
    if (this.preparation.length > 32) this.preparation.shift();
    if (!step.error) this.prepared.add(step.id);
  }

  frame(data: Omit<ArrivalFrame, 'turnDeg' | 'position' | 'orientation'>,
    position: Vector3, orientation: Quaternion): void {
    const turnDeg = this.lastOrientation ? this.lastOrientation.angleTo(orientation) * 180 / Math.PI : 0;
    this.lastOrientation = orientation.clone();
    const frame: ArrivalFrame = { ...data, turnDeg,
      position: [position.x, position.y, position.z],
      orientation: [orientation.x, orientation.y, orientation.z, orientation.w] };
    const prev = this.frames[this.frames.length - 1];
    this.frames.push(frame);
    if (this.frames.length > 2400) this.frames.shift();
    for (const id of frame.visiblePlanetMeshes.split(',').filter(Boolean)) {
      if (this.drawn.has(id)) continue;
      this.drawn.add(id);
      this.firstDraws.push({ id, atMs: Math.round(frame.ms), renderMs: Math.round(frame.renderMs * 10) / 10,
        intervalMs: Math.round(frame.intervalMs * 10) / 10, flightS: frame.flightS,
        prepared: this.prepared.has(id) });
    }
    if (frame.corona && !this.firstCorona) {
      this.firstCorona = true;
      this.event('first-corona-visible');
    }
    if (frame.phase !== this.lastPhase) {
      this.lastPhase = frame.phase;
      this.event(`phase:${frame.phase}`);
    }
    if (prev?.point && !frame.point) {
      this.handoffMs = frame.ms;
      this.event('point-to-disc-handoff');
    }
    if (!this.flushed && this.handoffMs !== null && frame.ms >= this.handoffMs + 2000) this.flush();
  }

  /** Bounded, copyable report. Call window.__reachArrivalReport() in DevTools. */
  report(): string {
    const end = this.frames[this.frames.length - 1]?.ms ?? performance.now();
    const window = this.frames.filter((f) => f.ms >= end - 20_000);
    const compact = (f: ArrivalFrame) => ({
      atMs: Math.round(f.ms), wallTime: new Date(performance.timeOrigin + f.ms).toISOString(),
      intervalMs: Math.round(f.intervalMs * 10) / 10,
      frameMs: Math.round(f.frameMs * 10) / 10,
      cameraMs: Math.round(f.cameraMs * 10) / 10,
      bodiesMs: Math.round(f.bodiesMs * 10) / 10,
      galaxyMs: Math.round(f.galaxyMs * 10) / 10,
      orbitMs: Math.round(f.orbitMs * 10) / 10,
      renderMs: Math.round(f.renderMs * 10) / 10,
      visibleOrbits: f.visibleOrbits, visibleMeshes: f.visibleMeshes,
      eligibleMeshes: f.eligibleMeshes, phase: f.phase,
      geometries: f.geometries, textures: f.textures, programs: f.programs,
      drawCalls: f.drawCalls,
      flightS: f.flightS === null ? null : Math.round(f.flightS * 100) / 100,
      radiusPx: Math.round(f.radiusPx * 100) / 100,
      distanceKm: Math.round(f.distanceKm), point: f.point,
      pointOpacity: Math.round(f.pointOpacity * 100) / 100,
      corona: f.corona, coronaIntensity: Math.round(f.coronaIntensity * 100) / 100,
      mesh: f.mesh, turnDeg: Math.round(f.turnDeg * 100) / 100,
      visibility: f.visibility,
    });
    const gaps = window.filter((f) => f.intervalMs >= 50);
    const visibilityChanged = (from: number, to: number) => this.events.some((event) =>
      event.name.startsWith('visibility:') && event.atMs >= from && event.atMs <= to);
    const backgroundGaps = gaps.filter((f) => {
      const prev = window[window.indexOf(f) - 1];
      return f.visibility !== 'visible' || prev?.visibility !== 'visible'
        || visibilityChanged(prev?.ms ?? f.ms - f.intervalMs, f.ms);
    });
    const slow = [...window].sort((a, b) => b.frameMs - a.frameMs).slice(0, 12);
    const gapContexts = window.flatMap((f, i) => f.intervalMs >= 100
      ? [{ gapAtMs: Math.round(f.ms), frames: window.slice(Math.max(0, i - 2), i + 3).map(compact) }]
      : []);
    const stateChanges = window.flatMap((f, i) => {
      const prev = window[i - 1];
      if (!prev || (f.phase === prev.phase && f.point === prev.point && f.corona === prev.corona
        && f.visibleOrbits === prev.visibleOrbits && f.visibleMeshes === prev.visibleMeshes
        && f.eligibleMeshes === prev.eligibleMeshes
        && f.geometries === prev.geometries && f.textures === prev.textures
        && f.programs === prev.programs)) return [];
      return [compact(f)];
    });
    const samples = window.filter((f, i) => i === 0 || i === window.length - 1
      || Math.floor(f.ms / 300) !== Math.floor(window[i - 1].ms / 300));
    return JSON.stringify({ capturedAt: new Date().toISOString(), disableCoronaBlend: this.disableCoronaBlend,
      disablePlanetMeshes: this.disablePlanetMeshes,
      frameCount: window.length,
      maxIntervalMs: Math.max(0, ...window.map((f) => f.intervalMs)),
      events: this.events, preparation: this.preparation, firstVisiblePlanetDraws: this.firstDraws,
      longTasks: this.longTasks, gaps: gaps.map(compact),
      backgroundGaps: backgroundGaps.map(compact),
      foregroundGaps: gaps.filter((f) => !backgroundGaps.includes(f)).map(compact),
      gapContexts, stateChanges, slowFrames: slow.map(compact),
      samples: samples.map(compact) }, null, 2);
  }

  private flush(): void {
    this.flushed = true;
    console.info('[reach-arrival-report]', this.report());
  }
}
