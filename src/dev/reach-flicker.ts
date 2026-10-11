import { Vector3, Matrix4, Quaternion, type Object3D, type ShaderMaterial } from 'three';

// This module is loaded only by the development-only reachFlicker entry path.
type DiagnosticApp = {
  engine: { width: number; height: number; pixelRatio: number; camera: import('three').PerspectiveCamera;
    renderer: import('three').WebGLRenderer; useComposer: boolean; render(): void };
  camera: { position: Vector3; quaternion: import('three').Quaternion; autopilot: { t: number } | null };
  universe: { galaxies: { count: number; name(i: number): string };
    landmarks: Array<{ def: { id: string } }> };
  galaxySprites: { points: Object3D; direction(i: number, out?: Vector3): Vector3 };
  farSprites: Array<{ points: Object3D }>;
  clouds: Map<number, { points: Object3D }>;
  landmarkSprites: { mesh: Object3D; direction(i: number, out?: Vector3): Vector3 };
  nebulaClouds: { clouds: Array<{ points: Object3D }> };
  starPoints: { points: Object3D };
  procPoints: { views: Array<{ points: Object3D }> };
  frame(now: number): void;
  last: number;
};

const names = ['GalaxyCloud', 'GalaxySprites', 'LandmarkSprites', 'NebulaClouds',
  'NebulaImages', 'StarPoints', 'ProcStarPoints'] as const;
const direction = new Vector3();

function measure(bytes: Uint8Array, width: number, height: number, x: number, y: number, radius = 40): number | null {
  const cx = Math.round(x), cy = Math.round(y);
  if (cx < radius || cx >= width - radius || cy < radius || cy >= height - radius) return null;
  let sum = 0;
  for (let py = cy - radius; py < cy + radius; py++) {
    for (let px = cx - radius; px < cx + radius; px++) {
      const i = (py * width + px) * 4;
      sum += 0.2126 * bytes[i] + 0.7152 * bytes[i + 1] + 0.0722 * bytes[i + 2];
    }
  }
  return Math.round(sum / (4 * radius * radius) * 1000) / 1000;
}

export async function runReachFlicker(appInput: unknown): Promise<void> {
  const app = appInput as DiagnosticApp;
  const params = new URLSearchParams(location.search);
  const frames = Math.min(160, Math.max(2, Number(params.get('frames') ?? 60)));
  const step = Math.min(0.1, Math.max(0.01, Number(params.get('step') ?? 0.1)));
  const raw = params.get('raw') === '1';
  const shortRadius = params.get('skyRadius') === 'short';
  const mode = params.get('mode') === 'm27' ? 'm27' : 'halley';
  const status = document.createElement('pre');
  status.style.cssText = 'position:fixed;z-index:10000;top:0;left:0;background:#111;color:white;padding:8px';
  document.body.append(status);
  const galaxyIndex = Array.from({ length: app.universe.galaxies.count }, (_, i) => i)
    .find((i) => /Büyük Macellan|Large Magellanic/i.test(app.universe.galaxies.name(i)));
  const smallGalaxyIndex = Array.from({ length: app.universe.galaxies.count }, (_, i) => i)
    .find((i) => /Küçük Macellan|Small Magellanic/i.test(app.universe.galaxies.name(i)));
  const m27Index = app.universe.landmarks.findIndex((l) => l.def.id === 'l-m27');
  if (galaxyIndex === undefined || smallGalaxyIndex === undefined || m27Index < 0) throw new Error('Magellanic Cloud or M27 missing');
  // Let local photographic assets load before stepping. This wait changes no journey state.
  await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
  await new Promise((resolve) => setTimeout(resolve, 1500));
  const eng = app.engine;
  if (raw) eng.useComposer = false;
  if (shortRadius) {
    const material = (app.galaxySprites.points as Object3D & { material: ShaderMaterial }).material;
    material.uniforms.uSkyRadius.value = 1e9;
  }
  const gl = eng.renderer.getContext();
  const width = gl.drawingBufferWidth, height = gl.drawingBufferHeight;
  const pixels = new Uint8Array(width * height * 4);
  const output: Array<Record<string, unknown>> = [];
  const pngs: Record<string, string> = {};
  app.last = 0;
  if (mode === 'm27') {
    app.frame(step * 1000);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    app.frame(step * 2000);
  }
  const m27Base = mode === 'm27'
    ? new Quaternion().setFromRotationMatrix(new Matrix4().lookAt(
      new Vector3(), app.landmarkSprites.direction(m27Index), new Vector3(0, 1, 0))) : null;
  for (let n = 0; n < frames; n++) {
    if (mode === 'halley') app.frame((n + 1) * step * 1000);
    else {
      const angle = n * 0.125 / (height / (2 * Math.tan(eng.camera.fov * Math.PI / 360)));
      eng.camera.quaternion.copy(m27Base!).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), angle));
      eng.camera.updateMatrixWorld();
    }
    const objects: Record<string, Object3D[]> = {
      GalaxyCloud: Array.from(app.clouds.values(), (cloud) => cloud.points),
      GalaxySprites: [app.galaxySprites.points, ...app.farSprites.map((sprite) => sprite.points)],
      LandmarkSprites: [app.landmarkSprites.mesh],
      NebulaClouds: app.nebulaClouds.clouds.map((cloud) => cloud.points),
      NebulaImages: [],
      StarPoints: [app.starPoints.points],
      ProcStarPoints: app.procPoints.views.map((view) => view.points),
    };
    const all = Object.values(objects).flat();
    const visible = new Map(all.map((object) => [object, object.visible]));
    const atlas = (app.landmarkSprites.mesh as Object3D & { material: ShaderMaterial }).material.uniforms.uAtlasMix;
    const atlasMix = atlas.value as number;
    const positions = [app.galaxySprites.direction(galaxyIndex), app.landmarkSprites.direction(m27Index),
      app.galaxySprites.direction(smallGalaxyIndex)]
      .map((dir) => {
        direction.copy(dir).multiplyScalar(1e11).project(eng.camera);
        return [(direction.x * 0.5 + 0.5) * width, (direction.y * 0.5 + 0.5) * height];
      });
    const variants: Record<string, unknown> = {};
    for (const variant of ['all', ...names]) {
      for (const object of all) object.visible = visible.get(object)!;
      atlas.value = atlasMix;
      if (variant === 'NebulaImages') atlas.value = 0;
      else if (variant !== 'all') for (const object of objects[variant]) object.visible = false;
      eng.render();
      gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let global = 0;
      for (let i = 0; i < pixels.length; i += 64) global += pixels[i] + pixels[i + 1] + pixels[i + 2];
      variants[variant] = {
        global: Math.round(global / (pixels.length / 64) / 3 * 1000) / 1000,
        lmc: measure(pixels, width, height, positions[0][0], positions[0][1]),
        m27: measure(pixels, width, height, positions[1][0], positions[1][1], 12),
        smc: measure(pixels, width, height, positions[2][0], positions[2][1], 25),
      };
      if (variant === 'all' && (n === 0 || n === Math.floor(frames / 2) || n === frames - 1
        || (n >= 49 && n <= 55))) {
        const snapshot = document.createElement('canvas');
        snapshot.width = width; snapshot.height = height;
        const context = snapshot.getContext('2d')!;
        const image = context.createImageData(width, height);
        for (let row = 0; row < height; row++) {
          image.data.set(pixels.subarray(row * width * 4, (row + 1) * width * 4),
            (height - row - 1) * width * 4);
        }
        context.putImageData(image, 0, 0);
        pngs[n >= 49 && n <= 55 ? `f${n}` : n === 0 ? 'first' : n === frames - 1 ? 'last' : 'middle'] = snapshot.toDataURL('image/png').split(',')[1];
      }
    }
    for (const object of all) object.visible = visible.get(object)!;
    atlas.value = atlasMix;
    output.push({ frame: n, elapsed: app.camera.autopilot?.t,
      camera: eng.camera.quaternion.toArray(), position: app.camera.position.toArray(),
      targets: positions, atlasMix, variants });
    status.textContent = `Direct WebGL capture ${n + 1}/${frames}`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const response = await fetch('http://127.0.0.1:4175/capture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ label: mode === 'm27' ? 'm27' : shortRadius ? 'halley-radius' : raw ? 'halley-raw' : 'halley',
      width, height, step, samples: output, pngs }),
  });
  if (!response.ok) throw new Error(`Capture save: ${await response.text()}`);
  status.textContent = `Saved ${frames} direct WebGL frames; GL error ${gl.getError()}`;
}
