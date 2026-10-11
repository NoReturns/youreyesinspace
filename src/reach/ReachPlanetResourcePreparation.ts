import { Mesh, PerspectiveCamera, Scene, WebGLRenderTarget, type WebGLRenderer } from 'three';
import type { BodyView } from '../render/BodyRenderer';

export interface PlanetPreparationStep {
  id: string;
  compileCallMs: number;
  compileWaitMs: number;
  firstDrawMs: number;
  geometries: number;
  textures: number;
  programs: number;
  error?: string;
}

/** Prepare only the bodies of the newly entered system, one body per idle turn. */
export async function preparePlanetResources(
  views: readonly BodyView[], starId: string, renderer: WebGLRenderer, liveScene: Scene,
  signal: AbortSignal, record: (step: PlanetPreparationStep) => void,
): Promise<void> {
  const camera = new PerspectiveCamera(50, 1, 0.1, 10);
  const target = new WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });
  try {
    for (const view of views) {
      if (signal.aborted) break;
      if (view.body.id === starId || !view.surface) continue;
      await new Promise<void>((resolve) => {
        if (typeof requestIdleCallback === 'function') requestIdleCallback(() => resolve());
        else setTimeout(resolve, 0);
      });
      if (signal.aborted) break;

      // Clones share the actual materials and geometries. Their single-pixel draw
      // uploads buffers and initializes render state without touching the live scene.
      const scene = new Scene();
      const add = (mesh: Mesh): void => {
        const clone = new Mesh(mesh.geometry, mesh.material);
        clone.frustumCulled = false;
        clone.position.set(0, 0, -2);
        clone.scale.setScalar(1e-9);
        scene.add(clone);
      };
      view.group.traverse((object) => { if (object instanceof Mesh) add(object); });
      if (view.atmosphere) add(view.atmosphere);
      const started = performance.now();
      let compileCallMs = 0;
      let compileWaitMs = 0;
      let firstDrawMs = 0;
      let error: string | undefined;
      try {
        const ready = renderer.compileAsync(scene, camera, liveScene);
        compileCallMs = performance.now() - started;
        await ready;
        compileWaitMs = performance.now() - started - compileCallMs;
        if (signal.aborted) break;
        const previousTarget = renderer.getRenderTarget();
        const drawStarted = performance.now();
        try {
          renderer.setRenderTarget(target);
          renderer.render(scene, camera);
        } finally {
          renderer.setRenderTarget(previousTarget);
        }
        firstDrawMs = performance.now() - drawStarted;
      } catch (cause) {
        error = String(cause);
      }
      record({ id: view.body.id, compileCallMs, compileWaitMs, firstDrawMs,
        geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
        programs: renderer.info.programs?.length ?? 0, error });
    }
  } finally {
    target.dispose();
  }
}
