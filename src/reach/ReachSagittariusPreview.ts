import { Matrix4, Vector3 } from 'three';
import type { CameraController } from '../camera/CameraController';
import type { CelestialBody } from '../core/CelestialBody';

// Distances are multiples of the catalog Schwarzschild radius. Every camera
// position stays outside the 14 r_s outer edge of Sagittarius A*'s disk.
const SHOTS = [
  { name: 'establish', radius: 80, latitude: 42, azimuth: -35 },
  { name: 'face-on', radius: 65, latitude: 82, azimuth: -15 },
  { name: 'oblique', radius: 45, latitude: 38, azimuth: 20 },
  { name: 'edge-on', radius: 36, latitude: 8, azimuth: 55 },
  { name: 'strong lensing', radius: 20, latitude: 25, azimuth: 85 },
] as const;
const HOLD_S = 5;
const MOVE_S = 12;
const LEG_S = HOLD_S + MOVE_S;
const SEGMENTS = (SHOTS.length - 1) * 2;
const _matrix = new Matrix4();

function ease(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

/** Development-only, reversible observation path; it does not own journey state. */
export class ReachSagittariusPreview {
  readonly duration = SEGMENTS * LEG_S;
  elapsed = 0;
  readonly body: CelestialBody;
  private readonly pole: Vector3;
  private readonly axis: Vector3;
  private readonly side: Vector3;

  constructor(body: CelestialBody, private readonly camera: CameraController) {
    this.body = body;
    this.pole = body.pole.clone().normalize();
    this.axis = new Vector3(0, 1, 0).addScaledVector(this.pole, -this.pole.y);
    if (this.axis.lengthSq() < 0.01)
      this.axis.set(1, 0, 0).addScaledVector(this.pole, -this.pole.x);
    this.axis.normalize();
    this.side = new Vector3().crossVectors(this.pole, this.axis).normalize();
    this.camera.placeAt(body, this.offset(SHOTS[0]));
    this.camera.autoOrbit = 0;
    this.pose();
  }

  get shot(): string {
    const leg = Math.min(SEGMENTS - 1, Math.floor((this.elapsed % this.duration) / LEG_S));
    return SHOTS[leg < SHOTS.length - 1 ? leg : SEGMENTS - leg]!.name;
  }

  update(dt: number): void {
    this.elapsed += Math.max(0, dt);
    this.pose();
  }

  private offset(shot: { radius: number; latitude: number; azimuth: number }): Vector3 {
    const lat = shot.latitude * Math.PI / 180;
    const az = shot.azimuth * Math.PI / 180;
    return this.axis.clone().multiplyScalar(Math.cos(lat) * Math.cos(az))
      .addScaledVector(this.side, Math.cos(lat) * Math.sin(az))
      .addScaledVector(this.pole, Math.sin(lat))
      .multiplyScalar(shot.radius * this.body.radius);
  }

  private pose(): void {
    const phase = (this.elapsed % this.duration) / LEG_S;
    const leg = Math.min(SEGMENTS - 1, Math.floor(phase));
    const forward = leg < SHOTS.length - 1;
    const from = SHOTS[forward ? leg : SEGMENTS - leg]!;
    const to = SHOTS[forward ? leg + 1 : SEGMENTS - leg - 1]!;
    const t = ease(Math.max(0, (phase - leg) * LEG_S - HOLD_S) / MOVE_S);
    const shot = {
      radius: Math.exp(Math.log(from.radius) * (1 - t) + Math.log(to.radius) * t),
      latitude: from.latitude + (to.latitude - from.latitude) * t,
      azimuth: from.azimuth + (to.azimuth - from.azimuth) * t,
    };
    this.camera.position.copy(this.body.position).add(this.offset(shot));
    this.camera.quaternion.setFromRotationMatrix(
      _matrix.lookAt(this.camera.position, this.body.position, this.pole));
  }
}
