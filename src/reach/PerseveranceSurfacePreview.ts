import {
  Box3, BufferAttribute, BufferGeometry, CircleGeometry, Color, FogExp2, Group, IcosahedronGeometry, InstancedMesh,
  DoubleSide, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Quaternion, Scene, Sphere, Vector3,
} from 'three';
import type { CameraController } from '../camera/CameraController';
import type { CelestialBody } from '../core/CelestialBody';
import type { BodyView } from '../render/BodyRenderer';
import { loadReachSpacecraftModel } from '../render/BodyRenderer';

export const MARS_PATCH_RADIUS_KM = 450;
export const MARS_GLOBE_HIDE_ALTITUDE_KM = 15;
const CAMERA_CLEARANCE_KM = 0.005;
const ROVER_RADIUS_KM = 0.0015;
const DUST = new Color(0xb8846a);
const LOW = new Color().setRGB(0.40, 0.16, 0.08);
const MID = new Color().setRGB(0.72, 0.34, 0.14);

function smoothstep(t: number): number {
  const u = Math.max(0, Math.min(1, t));
  return u * u * (3 - 2 * u);
}

function hash(n: number): number {
  const v = Math.sin(n * 127.1 + 41 * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Curved local cap, with relief tapering to the unchanged globe at its outer edge. */
export function marsTerrainHeight(x: number, z: number, radiusKm: number): number {
  const r = Math.hypot(x, z);
  const curve = Math.sqrt(Math.max(0, radiusKm * radiusKm - r * r)) - radiusKm;
  const edge = 1 - smoothstep((r - 300) / 150);
  const center = smoothstep(r / 0.03);
  let relief = 0.055 * Math.sin(x / 18) * Math.sin(z / 21)
    + 0.016 * Math.sin(x / 3.7 + 0.4) * Math.sin(z / 4.2)
    + 0.0007 * Math.sin(x * 44) * Math.sin(z * 38);
  for (const [cx, cz, size, depth] of [
    [0.45, -0.8, 0.24, 0.008], [-3.2, 4.6, 1.1, 0.04], [25, -19, 8, 0.38],
  ]) {
    const q = Math.hypot(x - cx, z - cz) / size;
    if (q < 1) relief -= depth * (1 - q * q) ** 2;
    relief += depth * 0.25 * Math.exp(-(((q - 1) / 0.16) ** 2));
  }
  return curve + relief * edge * center;
}

export type MarsPreviewPhase = 'orbital' | 'handoff' | 'descent' | 'orbit';

export interface MarsPreviewPose {
  phase: MarsPreviewPhase;
  x: number;
  y: number;
  z: number;
  terrainOpacity: number;
  globeVisible: boolean;
}

/** Pure, repeatable camera path in kilometres relative to the landing site. */
export function marsPreviewPose(seconds: number): MarsPreviewPose {
  if (seconds < 12) {
    const u = smoothstep(seconds / 12);
    return { phase: 'orbital', x: 900 + (120 - 900) * u, y: 1800 + (120 - 1800) * u,
      z: 80 * (1 - u), terrainOpacity: 0, globeVisible: true };
  }
  if (seconds < 20) {
    const u = smoothstep((seconds - 12) / 8);
    const y = 120 + (12 - 120) * u;
    return { phase: 'handoff', x: 120 + (18 - 120) * u, y, z: 0,
      terrainOpacity: smoothstep((120 - y) / 90), globeVisible: y >= MARS_GLOBE_HIDE_ALTITUDE_KM };
  }
  if (seconds < 32) {
    const u = smoothstep((seconds - 20) / 12);
    return { phase: 'descent', x: Math.exp(Math.log(18) * (1 - u) + Math.log(0.018) * u),
      y: Math.exp(Math.log(12) * (1 - u) + Math.log(0.009) * u), z: 0,
      terrainOpacity: 1, globeVisible: false };
  }
  const angle = (seconds - 32) * 0.045;
  return { phase: 'orbit', x: Math.cos(angle) * 0.018, y: 0.009,
    z: Math.sin(angle) * 0.018, terrainOpacity: 1, globeVisible: false };
}

/** Find the brightest daylight sample over one Mars rotation without changing a saved voyage. */
export function marsPreviewDaylightJd(startJd: number, rotationHours: number,
  illuminationAt: (jd: number) => number): number {
  let bestJd = startJd;
  let bestScore = -Infinity;
  for (let sample = 0; sample <= 64; sample++) {
    const jd = startJd + sample * rotationHours / (64 * 24);
    const score = illuminationAt(jd);
    if (score > bestScore) { bestScore = score; bestJd = jd; }
  }
  return bestJd;
}

export function buildMarsTerrainGeometry(radiusKm: number): BufferGeometry {
  const spokes = 128;
  const radii = [0];
  for (let r = 0.001; r < MARS_PATCH_RADIUS_KM; r *= 1.13) radii.push(r);
  radii.push(MARS_PATCH_RADIUS_KM);
  const vertices: number[] = [0, marsTerrainHeight(0, 0, radiusKm), 0];
  const colors: number[] = [MID.r, MID.g, MID.b];
  const indices: number[] = [];
  const color = new Color();
  for (let ring = 1; ring < radii.length; ring++) {
    const r = radii[ring];
    for (let spoke = 0; spoke < spokes; spoke++) {
      const angle = 2 * Math.PI * spoke / spokes;
      const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
      const height = marsTerrainHeight(x, z, radiusKm);
      vertices.push(x, height + 0.00015, z);
      const variation = 0.2 + 0.28 * Math.sin(x / 7) * Math.sin(z / 11)
        + 0.08 * Math.sin(x * 70) * Math.sin(z * 63)
        + 0.08 * (hash(ring * 131 + spoke) - 0.5);
      color.copy(MID).lerp(LOW, Math.max(0, Math.min(0.6, variation)));
      colors.push(color.r, color.g, color.b);
      const here = 1 + (ring - 1) * spokes + spoke;
      const next = 1 + (ring - 1) * spokes + (spoke + 1) % spokes;
      if (ring === 1) indices.push(0, next, here);
      else {
        const inner = here - spokes;
        const innerNext = next - spokes;
        indices.push(inner, innerNext, here, here, innerNext, next);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function rocks(radiusKm: number): InstancedMesh {
  const material = new MeshStandardMaterial({ color: 0x8e5540, roughness: 1, flatShading: true });
  const mesh = new InstancedMesh(new IcosahedronGeometry(1, 0), material, 260);
  const object = new Object3D();
  for (let i = 0; i < mesh.count; i++) {
    const r = i < 100 ? 0.005 + Math.sqrt(hash(i * 3 + 1)) * 0.09
      : 0.1 + Math.sqrt(hash(i * 3 + 1)) * 5;
    const angle = hash(i * 3 + 2) * Math.PI * 2;
    const x = Math.cos(angle) * r, z = Math.sin(angle) * r;
    const size = i < 100 ? 0.0002 + 0.0008 * hash(i * 3 + 3)
      : 0.0003 + 0.0032 * hash(i * 3 + 3) ** 3;
    object.position.set(x, marsTerrainHeight(x, z, radiusKm) + 0.00015 + size * 0.35, z);
    object.rotation.set(hash(i + 700) * 0.3, angle, hash(i + 900) * 0.3);
    object.scale.set(size * (0.8 + hash(i + 1000)), size * 0.7, size);
    object.updateMatrix();
    mesh.setMatrixAt(i, object.matrix);
  }
  mesh.frustumCulled = false;
  return mesh;
}

/** Isolated development scene: camera still uses the shared global frame, meshes use local km. */
export class PerseveranceSurfacePreview {
  readonly group = new Group();
  readonly terrain: Mesh;
  readonly rockField: InstancedMesh;
  readonly radiusKm: number;
  private readonly background = new Color();
  private readonly fog = new FogExp2(DUST, 0);
  private readonly east = new Vector3();
  private readonly up = new Vector3();
  private readonly south = new Vector3();
  private readonly anchor = new Vector3();
  private readonly localCamera = new Vector3();
  private readonly target = new Vector3();
  private readonly basis = new Matrix4();
  private readonly inverseRotation = new Quaternion();
  private elapsed = 0;
  private modelReady = false;
  private pose = marsPreviewPose(0);

  constructor(private readonly mars: CelestialBody, private readonly rover: CelestialBody,
    private readonly camera: CameraController, private readonly scene: Scene) {
    if (rover.parent !== mars || rover.data.orbit?.kind !== 'surface'
      || rover.data.appearance.kind !== 'spacecraft') throw new Error('Perseverance preview needs its Mars surface catalogue record');
    this.updateFrame();
    const bodyDirection = this.up.clone().applyQuaternion(this.inverseRotation.copy(mars.rotation).invert());
    const flattening = mars.data.flattening ?? 0;
    const a = mars.equatorialRadius;
    this.radiusKm = a / Math.sqrt(bodyDirection.x ** 2 + bodyDirection.z ** 2
      + bodyDirection.y ** 2 / (1 - flattening) ** 2);
    const material = new MeshStandardMaterial({ vertexColors: true, roughness: 1,
      transparent: true, opacity: 0, depthWrite: false, side: DoubleSide });
    this.terrain = new Mesh(buildMarsTerrainGeometry(this.radiusKm), material);
    this.terrain.frustumCulled = false;
    this.rockField = rocks(this.radiusKm);
    this.rockField.visible = false;
    const contact = new Mesh(new CircleGeometry(1, 32), new MeshBasicMaterial({
      color: 0x3b2119, transparent: true, opacity: 0.22, depthWrite: false, side: DoubleSide,
    }));
    contact.rotation.x = -Math.PI / 2;
    contact.scale.set(0.0018, 0.0013, 1);
    contact.position.y = marsTerrainHeight(0, 0, this.radiusKm) + 0.00017;
    this.group.add(this.terrain, this.rockField, contact);
    this.group.visible = false;
    scene.add(this.group);
    loadReachSpacecraftModel(rover.data.appearance.model).then((model) => {
      const sphere = new Box3().setFromObject(model).getBoundingSphere(new Sphere());
      model.position.copy(sphere.center).multiplyScalar(-1);
      const fitted = new Group();
      fitted.add(model);
      fitted.scale.setScalar(ROVER_RADIUS_KM / Math.max(sphere.radius, 1e-9));
      fitted.rotation.y = 0.48;
      fitted.updateMatrixWorld(true);
      const bottom = new Box3().setFromObject(fitted).min.y;
      fitted.position.y = marsTerrainHeight(0, 0, this.radiusKm) - bottom + 0.00015;
      this.group.add(fitted);
      this.modelReady = true;
    }).catch((error) => console.warn('Perseverance preview model unavailable', error));
    this.update(0, false);
  }

  private updateFrame(): void {
    this.up.copy(this.rover.position).sub(this.mars.position).normalize();
    this.east.crossVectors(this.mars.pole, this.up).normalize();
    if (this.east.lengthSq() < 1e-8) this.east.set(1, 0, 0).addScaledVector(this.up, -this.up.x).normalize();
    this.south.crossVectors(this.east, this.up).normalize();
    this.basis.makeBasis(this.east, this.up, this.south);
    const radius = this.radiusKm ?? this.mars.radius;
    this.anchor.copy(this.mars.position).addScaledVector(this.up, radius);
  }

  update(dt: number, paused: boolean): void {
    if (!paused) {
      const next = Math.min(this.elapsed + dt, 3600);
      this.elapsed = !this.modelReady && next > 20 ? 20 : next;
    }
    this.updateFrame();
    this.pose = marsPreviewPose(this.elapsed);
    this.localCamera.set(this.pose.x, this.pose.y, this.pose.z);
    const ground = marsTerrainHeight(this.pose.x, this.pose.z, this.radiusKm);
    this.localCamera.y = Math.max(this.localCamera.y, ground + CAMERA_CLEARANCE_KM);
    this.camera.position.copy(this.anchor).addScaledVector(this.east, this.localCamera.x)
      .addScaledVector(this.up, this.localCamera.y).addScaledVector(this.south, this.localCamera.z);
    this.target.copy(this.anchor).addScaledVector(this.up, ROVER_RADIUS_KM);
    this.camera.quaternion.setFromRotationMatrix(new Matrix4().lookAt(this.camera.position, this.target, this.up));
    this.camera.setReference(this.mars);
    this.camera.target = this.rover;
    this.camera.autopilot = null;
    this.camera.autoOrbit = 0;
  }

  render(marsView: BodyView | undefined, roverView: BodyView | undefined): void {
    this.group.visible = this.pose.terrainOpacity > 0;
    this.group.position.copy(this.anchor).sub(this.camera.position);
    this.group.quaternion.setFromRotationMatrix(this.basis);
    (this.terrain.material as MeshStandardMaterial).opacity = this.pose.terrainOpacity;
    (this.terrain.material as MeshStandardMaterial).depthWrite = this.pose.terrainOpacity >= 1;
    this.rockField.visible = this.pose.y < 3;
    if (marsView) {
      marsView.group.visible = this.pose.globeVisible;
      if (marsView.atmosphere) marsView.atmosphere.visible = this.pose.globeVisible;
    }
    if (roverView) roverView.group.visible = false;
    const dust = smoothstep((120 - this.pose.y) / 105);
    this.scene.background = this.background.copy(DUST).multiplyScalar(dust);
    this.fog.density = dust * 0.025;
    this.scene.fog = dust > 0 ? this.fog : null;
  }

  get status(): { phase: MarsPreviewPhase; altitudeKm: number; terrainOpacity: number; globeVisible: boolean; modelReady: boolean } {
    return { phase: this.pose.phase,
      altitudeKm: this.localCamera.y - marsTerrainHeight(this.localCamera.x, this.localCamera.z, this.radiusKm),
      terrainOpacity: this.pose.terrainOpacity, globeVisible: this.pose.globeVisible, modelReady: this.modelReady };
  }
}
