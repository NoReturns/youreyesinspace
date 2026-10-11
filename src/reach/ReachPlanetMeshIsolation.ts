import type { BodyView } from '../render/BodyRenderer';

/** Pilot-only draw gate. BodyView.update still calculates planet positions and apparent sizes. */
export function suppressProximaPlanetMeshes(views: readonly BodyView[], starId: string): void {
  for (const view of views) {
    if (view.body.id === starId) continue;
    view.group.visible = false;
    if (view.atmosphere) view.atmosphere.visible = false;
    view.meshVisible = false;
  }
}
