import { Matrix4, Quaternion, Vector3 } from 'three';
import type { CameraController } from '../camera/CameraController';
import type { CelestialBody } from '../core/CelestialBody';
import { toBarycentric } from '../astro/binary';
import { SUN_MASS_KG, SUN_RADIUS_KM } from '../astro/stellar';
import { AU_KM, DEG, J2000_JD, PARSEC_KM, YEAR_D } from '../core/constants';
import { StarSystem } from '../core/StarSystem';
import type { StarCatalog } from '../data/StarCatalog';
import type { BodyData, SimpleElements } from '../data/types';
import { basisFromPole, raDecToScene } from '../math/frames';
import type { JourneyPhase, Vec3 } from './JourneyState';

export const ALPHA_A_INDEX = 65262;
export const ALPHA_B_INDEX = 65259;
export const ALPHA_SYSTEM_ID = 'c65262';
export const ALPHA_BARY_ID = 'alpha-centauri-ab-bary';

// Pourbaix et al. (2002), A&A 386, 280: relative visual orbit.
// The catalogue puts the pair near 4.320 LY; the measured parallax gives about 4.37 LY.
// Keep the catalogue position and model the relative orbit here.
export const ALPHA_ORBIT = {
  periodYears: 79.91, semimajorAu: 23.4, eccentricity: 0.5179,
  inclinationDeg: 79.205, nodePositionAngleDeg: 204.85,
  argPeriDeg: 231.65, periastronYear: 1875.66,
} as const;

/** Two measured stellar photospheres in one catalogue-anchored barycentric frame. */
export function createAlphaCentauriPreviewSystem(catalog: StarCatalog): StarSystem {
  const a = catalog.info(ALPHA_A_INDEX);
  const b = catalog.info(ALPHA_B_INDEX);
  // Masses: Kervella et al. (2016). Radii: Kervella et al. (2017), arxiv.org/abs/1610.06185.
  // Temperatures: Morel et al. (2000), as tabulated in A&A 459, 669 (2006).
  const massA = 1.1055 * SUN_MASS_KG, massB = 0.9373 * SUN_MASS_KG;
  const originPc = a.position.clone().multiplyScalar(massA)
    .addScaledVector(b.position, massB).divideScalar(massA + massB);
  const sight = originPc.clone().normalize();
  const north = raDecToScene(0, 90).addScaledVector(sight, -raDecToScene(0, 90).dot(sight)).normalize();
  const east = new Vector3().crossVectors(north, sight).normalize();
  const pole = raDecToScene(219.902, -60.834);
  const basis = basisFromPole(pole);
  const el = basis.elements;
  const x = new Vector3(el[0], el[1], el[2]);
  const y = new Vector3(-el[6], -el[7], -el[8]);
  const observedNode = north.multiplyScalar(Math.cos(ALPHA_ORBIT.nodePositionAngleDeg * DEG))
    .addScaledVector(east, Math.sin(ALPHA_ORBIT.nodePositionAngleDeg * DEG));
  const node = Math.atan2(observedNode.dot(y), observedNode.dot(x)) / DEG;
  const orbit: SimpleElements = {
    kind: 'simple', a: ALPHA_ORBIT.semimajorAu * AU_KM,
    e: ALPHA_ORBIT.eccentricity, i: ALPHA_ORBIT.inclinationDeg,
    node, argPeri: ALPHA_ORBIT.argPeriDeg,
    M0: 360 * (2000 - ALPHA_ORBIT.periastronYear) / ALPHA_ORBIT.periodYears,
    epoch: J2000_JD, period: ALPHA_ORBIT.periodYears * YEAR_D,
    frame: 'parentEquator',
  };
  const bodies: BodyData[] = [
    { id: `s${ALPHA_A_INDEX}-star`, name: 'Alpha Centauri A', type: 'star',
      radius: 1.2234 * SUN_RADIUS_KM, mass: massA,
      appearance: { kind: 'star', temperature: 5790, seed: ALPHA_A_INDEX % 997 + 3 }, temperature: 5790 },
    { id: `s${ALPHA_B_INDEX}-star`, name: 'Alpha Centauri B', type: 'star',
      parent: `s${ALPHA_A_INDEX}-star`, orbit,
      radius: 0.8632 * SUN_RADIUS_KM, mass: massB,
      appearance: { kind: 'star', temperature: 5260, seed: ALPHA_B_INDEX % 997 + 3 }, temperature: 5260 },
  ];
  const pair = toBarycentric(bodies, ALPHA_BARY_ID, 'Alpha Centauri A/B barycenter');
  pair[0].pole = { ra: 219.902, dec: -60.834 };
  // The mass-weighted catalogue midpoint anchors the system without editing either star record.
  return new StarSystem('preview-alpha-centauri', ALPHA_SYSTEM_ID, ALPHA_A_INDEX,
    originPc.multiplyScalar(PARSEC_KM), pair, [], []);
}

/** Resolve either catalogue point from the physical orbit in any active system frame. */
export function alphaPointDirection(binary: StarSystem, body: CelestialBody,
  frameOrigin: Vector3, cameraPosition: Vector3): Vector3 {
  return binary.origin.clone().add(body.position).sub(frameOrigin).sub(cameraPosition);
}

export type AlphaCinematicStage = 'establish' | 'approach-a' | 'observe-a'
  | 'retract-a' | 'cross-to-b' | 'approach-b' | 'observe-b'
  | 'retract-b' | 'final-overview';

const ALPHA_SHOTS: readonly { stage: AlphaCinematicStage; seconds: number; label: string }[] = [
  { stage: 'establish', seconds: 9, label: 'BINARY OVERVIEW' },
  { stage: 'approach-a', seconds: 10, label: 'APPROACH ALPHA A' },
  { stage: 'observe-a', seconds: 8, label: 'OBSERVE ALPHA A' },
  { stage: 'retract-a', seconds: 9, label: 'PULL BACK FROM A' },
  { stage: 'cross-to-b', seconds: 14, label: 'CROSS TO ALPHA B' },
  { stage: 'approach-b', seconds: 10, label: 'APPROACH ALPHA B' },
  { stage: 'observe-b', seconds: 8, label: 'OBSERVE ALPHA B' },
  { stage: 'retract-b', seconds: 10, label: 'PULL BACK FROM B' },
  { stage: 'final-overview', seconds: 10, label: 'BINARY OVERVIEW' },
];
export function alphaShotSeconds(stage: string): number | null {
  return ALPHA_SHOTS.find((shot) => shot.stage === stage)?.seconds ?? null;
}
export type ReachBinaryPhase = Extract<JourneyPhase, { kind: 'binary' }>;
const vec = (v: Vector3): Vec3 => [v.x, v.y, v.z];

const ease = (t: number): number => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };

/** Local shot path. Every waypoint uses the same barycentric km frame. */
export class ReachAlphaCinematic {
  private shot = 0;
  private elapsed = 0;
  private readonly side: Vector3;
  private readonly up: Vector3;
  private readonly entryPosition: Vector3;
  private readonly entryTarget: Vector3;
  private readonly matrix = new Matrix4();
  private readonly orientation = new Quaternion();
  private readonly aim = new Vector3();

  constructor(private readonly camera: CameraController, readonly barycenter: CelestialBody,
    readonly a: CelestialBody, readonly b: CelestialBody, readonly observationRadii: number,
    saved?: ReachBinaryPhase) {
    if (saved) {
      this.shot = ALPHA_SHOTS.findIndex((candidate) => candidate.stage === saved.shot);
      if (this.shot < 0) throw new Error('Unknown Alpha cinematic shot');
      this.elapsed = saved.elapsed;
      this.entryPosition = new Vector3().fromArray(saved.entryPosition);
      this.entryTarget = new Vector3().fromArray(saved.entryTarget);
      this.side = new Vector3().fromArray(saved.side);
      this.up = new Vector3().fromArray(saved.up);
      return;
    }
    this.entryPosition = camera.position.clone();
    this.entryTarget = barycenter.position.clone();
    const axis = b.position.clone().sub(a.position).normalize();
    const incoming = camera.position.clone().sub(barycenter.position);
    this.side = incoming.clone().addScaledVector(axis, -incoming.dot(axis)).normalize();
    if (this.side.lengthSq() < 0.5) this.side.copy(camera.position).sub(barycenter.position).normalize();
    this.up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion).normalize();
    camera.autopilot = null;
    camera.autoOrbit = 0;
    camera.setReference(barycenter);
    camera.target = barycenter;
    camera.mode = 'orbit';
  }

  get stage(): AlphaCinematicStage { return ALPHA_SHOTS[this.shot].stage; }
  get label(): string { return ALPHA_SHOTS[this.shot].label; }
  get secondsLeft(): number { return this.terminal ? 0 : ALPHA_SHOTS[this.shot].seconds - this.elapsed; }
  get observationElapsed(): number {
    return ALPHA_SHOTS.slice(0, this.shot).reduce((total, shot) => total + shot.seconds, this.elapsed);
  }
  get observationRemaining(): number {
    return ALPHA_SHOTS.slice(this.shot + 1).reduce((total, shot) => total + shot.seconds, this.secondsLeft);
  }
  get terminal(): boolean { return this.shot === ALPHA_SHOTS.length - 1 && this.elapsed >= ALPHA_SHOTS[this.shot].seconds; }
  get target(): Vector3 { return this.aim.clone(); }
  capture(): ReachBinaryPhase {
    return { kind: 'binary', shot: this.stage, elapsed: this.elapsed,
      duration: ALPHA_SHOTS[this.shot].seconds, entryPosition: vec(this.entryPosition),
      entryTarget: vec(this.entryTarget), side: vec(this.side), up: vec(this.up) };
  }

  update(dt: number): boolean {
    if (this.terminal) return false;
    const shot = ALPHA_SHOTS[this.shot];
    this.elapsed = Math.min(shot.seconds, this.elapsed + dt);
    const t = ease(this.elapsed / shot.seconds);
    const separation = this.a.position.distanceTo(this.b.position);
    const wide = this.barycenter.position.clone().addScaledVector(this.side, separation * 1.6);
    const aFar = this.a.position.clone().addScaledVector(this.side, separation * 1.6);
    const bFar = this.b.position.clone().addScaledVector(this.side, separation * 1.6);
    const aClose = this.a.position.clone().addScaledVector(this.side, this.a.radius * this.observationRadii);
    const bClose = this.b.position.clone().addScaledVector(this.side, this.b.radius * this.observationRadii);
    const position = this.camera.position;
    let look: Vector3;
    switch (shot.stage) {
      case 'establish': position.copy(this.entryPosition); look = this.entryTarget; break;
      case 'approach-a': position.copy(wide).lerp(aClose, t); look = this.barycenter.position.clone().lerp(this.a.position, t); break;
      case 'observe-a': position.copy(aClose); look = this.a.position; break;
      case 'retract-a': position.copy(aClose).lerp(aFar, t); look = this.a.position; break;
      case 'cross-to-b': position.copy(aFar).lerp(bFar, t); look = this.a.position.clone().lerp(this.b.position, t); break;
      case 'approach-b': position.copy(bFar).lerp(bClose, t); look = this.b.position; break;
      case 'observe-b': position.copy(bClose); look = this.b.position; break;
      case 'retract-b': position.copy(bClose).lerp(bFar, t); look = this.b.position; break;
      case 'final-overview': position.copy(bFar).lerp(wide, t); look = this.b.position.clone().lerp(this.barycenter.position, t); break;
    }
    this.aim.copy(look);
    this.matrix.lookAt(position, look, this.up);
    this.orientation.setFromRotationMatrix(this.matrix);
    this.camera.quaternion.copy(this.orientation);
    this.camera.target = shot.stage.includes('-a') ? this.a
      : shot.stage.includes('-b') ? this.b : this.barycenter;
    if (this.elapsed < shot.seconds) return false;
    if (this.shot === ALPHA_SHOTS.length - 1) return false;
    this.shot++;
    this.elapsed = 0;
    return true;
  }
}
