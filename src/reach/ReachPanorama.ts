import type { PerspectiveCamera } from 'three';

export interface PanoramaRect { x: number; y: number; width: number; height: number }

export interface ReachPanoramaContract {
  schema: 1;
  sessionId: string;
  isPrimaryDisplay: boolean;
  monitorBounds: PanoramaRect;
  virtualDesktopBounds: PanoramaRect;
  viewportOffsetX: number;
  viewportOffsetY: number;
  viewportWidth: number;
  viewportHeight: number;
  totalPanoramaWidth: number;
  totalPanoramaHeight: number;
  devicePixelRatio: number;
}

export interface ReachPanoramaFrame {
  sequence: number;
  jd: number;
  rate: number;
  paused: boolean;
  starId: string;
  position: [number, number, number];
  orientation: [number, number, number, number];
  referenceId: string;
  targetId: string;
  destinationId: string;
  phase: 'NEXT' | 'DEPART' | 'CRUISE';
  secondsLeft: number;
  compositionShiftX: number;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value);
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
const rect = (value: unknown): value is PanoramaRect => record(value)
  && integer(value.x) && integer(value.y) && positive(value.width) && positive(value.height)
  && integer(value.width) && integer(value.height);

export function parseReachPanorama(value: unknown): ReachPanoramaContract {
  if (!record(value) || value.schema !== 1 || typeof value.sessionId !== 'string'
    || !/^[a-f0-9]{32}$/.test(value.sessionId) || typeof value.isPrimaryDisplay !== 'boolean'
    || !rect(value.monitorBounds) || !rect(value.virtualDesktopBounds)
    || !integer(value.viewportOffsetX) || !integer(value.viewportOffsetY)
    || !integer(value.viewportWidth) || !integer(value.viewportHeight)
    || !integer(value.totalPanoramaWidth) || !integer(value.totalPanoramaHeight)
    || !positive(value.devicePixelRatio)) throw new Error('Invalid Reach panorama contract');
  const monitor = value.monitorBounds;
  const desktop = value.virtualDesktopBounds;
  if (value.viewportOffsetX !== monitor.x - desktop.x || value.viewportOffsetY !== monitor.y - desktop.y
    || value.viewportWidth !== monitor.width || value.viewportHeight !== monitor.height
    || value.totalPanoramaWidth !== desktop.width || value.totalPanoramaHeight !== desktop.height
    || value.viewportOffsetX < 0 || value.viewportOffsetY < 0
    || value.viewportOffsetX + value.viewportWidth > desktop.width
    || value.viewportOffsetY + value.viewportHeight > desktop.height)
    throw new Error('Reach panorama viewport is outside the virtual desktop');
  return value as unknown as ReachPanoramaContract;
}

export function readReachPanorama(): ReachPanoramaContract | null {
  const value = (window as Window & { __reachPanorama?: unknown }).__reachPanorama;
  if (value === undefined) {
    if (new URLSearchParams(window.location.search).has('panorama'))
      throw new Error('Reach panorama configuration was not injected');
    return null;
  }
  return parseReachPanorama(value);
}

export function applyPanoramaView(camera: PerspectiveCamera, view: ReachPanoramaContract, shiftX = 0): void {
  camera.setViewOffset(view.totalPanoramaWidth, view.totalPanoramaHeight,
    view.viewportOffsetX - shiftX, view.viewportOffsetY, view.viewportWidth, view.viewportHeight);
}

/** Shift the shared image toward the primary display, with modest per-stop variation. */
export function reachCompositionTarget(destinationId: string, primaryWidth: number,
  primaryCenterX: number, panoramaWidth: number): number {
  let hash = 2166136261;
  for (let i = 0; i < destinationId.length; i++)
    hash = Math.imul(hash ^ destinationId.charCodeAt(i), 16777619);
  const variation = destinationId.startsWith('alpha:') || destinationId === 'alpha-centauri-ab'
    ? 0 : ((hash >>> 0) % 3 - 1) * 0.1;
  return primaryCenterX - panoramaWidth / 2 + variation * primaryWidth;
}

export function localPanoramaFovRad(fullFovDeg: number, view: ReachPanoramaContract): number {
  return 2 * Math.atan(Math.tan(fullFovDeg * Math.PI / 360)
    * view.viewportHeight / view.totalPanoramaHeight);
}

function validFrame(value: unknown): value is ReachPanoramaFrame {
  if (!record(value) || !integer(value.sequence) || value.sequence < 0
    || typeof value.jd !== 'number' || !Number.isFinite(value.jd)
    || !positive(value.rate) || typeof value.paused !== 'boolean'
    || typeof value.starId !== 'string' || !/^[cplb][a-z0-9-]+$/.test(value.starId)
    || !Array.isArray(value.position) || value.position.length !== 3
    || !value.position.every(n => typeof n === 'number' && Number.isFinite(n))
    || !Array.isArray(value.orientation) || value.orientation.length !== 4
    || !value.orientation.every(n => typeof n === 'number' && Number.isFinite(n))
    || typeof value.referenceId !== 'string' || typeof value.targetId !== 'string'
    || typeof value.destinationId !== 'string'
    || !['NEXT', 'DEPART', 'CRUISE'].includes(value.phase as string)
    || typeof value.secondsLeft !== 'number' || !Number.isFinite(value.secondsLeft)
    || typeof value.compositionShiftX !== 'number' || !Number.isFinite(value.compositionShiftX)) return false;
  return true;
}

/** The primary publishes poses; followers never advance or save a voyage. */
export class ReachPanoramaSync {
  private readonly channel: BroadcastChannel;
  private nextSequence = 0;
  private receivedSequence = -1;
  private received: ReachPanoramaFrame | null = null;

  constructor(private readonly contract: ReachPanoramaContract) {
    this.channel = new BroadcastChannel(`reach-panorama-${contract.sessionId}`);
    if (!contract.isPrimaryDisplay) this.channel.onmessage = (event: MessageEvent<unknown>) => {
      if (!validFrame(event.data) || event.data.sequence <= this.receivedSequence) return;
      this.receivedSequence = event.data.sequence;
      this.received = event.data;
    };
    window.addEventListener('pagehide', () => this.channel.close(), { once: true });
  }

  publish(frame: Omit<ReachPanoramaFrame, 'sequence'>): void {
    if (!this.contract.isPrimaryDisplay) return;
    this.channel.postMessage({ ...frame, sequence: this.nextSequence++ });
  }

  get latest(): ReachPanoramaFrame | null { return this.received; }
  get sentSequence(): number { return this.nextSequence - 1; }
}

