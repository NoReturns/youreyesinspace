import type { Vector3 } from 'three';

export type StellarConvection = 'betelgeuse' | 'woh-g64' | null;

export function stellarConvection(id: string): StellarConvection {
  if (id === 's25822-star') return 'betelgeuse';
  if (id === 'l-wohg64') return 'woh-g64';
  return null;
}

/** Wall-clock phases keep a fixed-camera surface evolving even when simulation time is paused. */
export function setStellarConvectionPhase(kind: Exclude<StellarConvection, null>, seconds: number, phase: Vector3): void {
  const broadRate = kind === 'woh-g64' ? 0.024 : 0.035;
  const fineRate = kind === 'woh-g64' ? 0.038 : 0.061;
  phase.set(Math.cos(seconds * broadRate), Math.sin(seconds * broadRate), Math.sin(seconds * fineRate));
}
