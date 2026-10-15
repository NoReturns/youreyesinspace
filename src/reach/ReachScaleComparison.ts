import { Vector3, type PerspectiveCamera } from 'three';
import { AU_KM } from '../core/constants';
import { SOLAR_SYSTEM } from '../data/solarSystem';
import type { BodyView } from '../render/BodyRenderer';

const REFERENCE_IDS = ['earth', 'jupiter', 'neptune'] as const;
type ReferenceId = typeof REFERENCE_IDS[number];

export interface OrbitReference { id: ReferenceId; label: string; radiusKm: number }

/** Use the Solar System catalogue's J2000 semimajor axes, not a display radius. */
export const ORBIT_REFERENCES: readonly OrbitReference[] = REFERENCE_IDS.map((id) => {
  const orbit = SOLAR_SYSTEM.find((body) => body.id === id)?.orbit;
  if (orbit?.kind !== 'jpl') throw new Error(`Missing ${id} orbital semimajor axis`);
  return { id, label: `${id.toUpperCase()}'S ORBIT`, radiusKm: orbit.a * AU_KM };
});

/** Nearest physical radius keeps the selected ring legible within these giant discs. */
export function selectOrbitReference(starRadiusKm: number): OrbitReference | null {
  if (!Number.isFinite(starRadiusKm) || starRadiusKm <= 0) return null;
  return ORBIT_REFERENCES.reduce((best, candidate) =>
    Math.abs(candidate.radiusKm - starRadiusKm) < Math.abs(best.radiusKm - starRadiusKm)
      ? candidate : best);
}

export function orbitRadiusPx(starRadiusPx: number, starRadiusKm: number, orbitRadiusKm: number): number {
  return starRadiusPx * orbitRadiusKm / starRadiusKm;
}

export function scalePreviewEnabled(dev: boolean, reach: boolean, previewId: string | null,
  flag: string | null, isPrimary: boolean): boolean {
  return dev && reach && isPrimary && flag === '1'
    && (previewId === 'betelgeuse' || previewId === 'woh-g64');
}

const _centre = new Vector3();

/** Presentation-only drawing on the existing 2D overlay, after its normal clear. */
export class ReachScaleComparison {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  draw(view: BodyView, camera: PerspectiveCamera, width: number, height: number, dpr: number): void {
    const reference = selectOrbitReference(view.body.radius);
    if (!reference || view.distance <= view.body.radius || view.apparentRadiusPx <= 0) return;
    _centre.copy(view.relPos).project(camera);
    if (_centre.z < -1 || _centre.z > 1) return;
    const x = (_centre.x * 0.5 + 0.5) * width;
    const y = (-_centre.y * 0.5 + 0.5) * height;
    if (x < 0 || x > width || y < 0 || y > height) return;

    // Correct the renderer's small-angle radius to the tangent of the sphere's limb.
    const radialFraction = view.body.radius / view.distance;
    const discRadiusPx = view.apparentRadiusPx / Math.sqrt(1 - radialFraction * radialFraction);
    const ringRadiusPx = orbitRadiusPx(discRadiusPx, view.body.radius, reference.radiusKm);
    if (!Number.isFinite(ringRadiusPx) || ringRadiusPx < 3) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.beginPath();
    ctx.arc(x, y, ringRadiusPx, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(10, 12, 16, 0.9)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 225, 169, 0.96)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const title = `${reference.label} - ${(reference.radiusKm / AU_KM).toFixed(1)} AU RADIUS`;
    const note = 'SOLAR SYSTEM SCALE - NOT A LOCAL ORBIT';
    ctx.font = '600 12px system-ui, sans-serif';
    const titleWidth = ctx.measureText(title).width;
    ctx.font = '500 10px system-ui, sans-serif';
    const boxWidth = Math.max(titleWidth, ctx.measureText(note).width) + 20;
    if (boxWidth > width - 24) { ctx.restore(); return; }
    const boxX = Math.max(12, Math.min(width - boxWidth - 12, x - boxWidth / 2));
    const above = y - ringRadiusPx >= 68;
    const boxY = above ? Math.max(12, y - ringRadiusPx - 53)
      : Math.min(height - 52, y + ringRadiusPx + 12);
    ctx.beginPath();
    ctx.moveTo(x, y + (above ? -ringRadiusPx : ringRadiusPx));
    ctx.lineTo(Math.max(boxX + 10, Math.min(boxX + boxWidth - 10, x)), above ? boxY + 40 : boxY);
    ctx.strokeStyle = 'rgba(255, 225, 169, 0.85)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = 'rgba(8, 11, 16, 0.78)';
    ctx.fillRect(boxX, boxY, boxWidth, 40);
    ctx.fillStyle = '#ffe1a9';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(title, boxX + 10, boxY + 16);
    ctx.fillStyle = '#f0f0eb';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.fillText(note, boxX + 10, boxY + 31);
    ctx.restore();
  }
}
