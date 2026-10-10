import {
  ACESFilmicToneMapping, AdditiveBlending, BufferAttribute, BufferGeometry, Color, Matrix3,
  PerspectiveCamera, Points, Scene, ShaderMaterial, SRGBColorSpace, Vector2, Vector3, Vector4,
  WebGLRenderer,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import starsVert from '../render/shaders/stars.vert?raw';
import galaxyCloudVert from '../render/shaders/galaxycloud.vert?raw';
import pointsFrag from '../render/shaders/points.frag?raw';

// Development-only entry point. The production index.html does not import this module.
const params = new URLSearchParams(location.search);
const layer = params.get('layer') ?? 'catalogue';
const axis = params.get('axis') ?? 'x';
const phase = params.get('phase') ?? 'before';
const bloomOn = params.get('bloom') !== '0';
const raw = params.get('raw') === '1';
const scale = Number(params.get('scale') ?? '1');
const width = Number(params.get('w') ?? '2560');
const height = Number(params.get('h') ?? '1440');
const frames = Number(params.get('frames') ?? '33');
const stepPx = Number(params.get('step') ?? '0.125');
const status = document.getElementById('status')!;

if (!['catalogue', 'procedural', 'cloud'].includes(layer) || !['x', 'y', 'still'].includes(axis)
  || !['before', 'after'].includes(phase) || ![0.5, 1].includes(scale)
  || !Number.isInteger(width) || !Number.isInteger(height) || width < 320 || width > 2560
  || height < 240 || height > 1440 || !Number.isInteger(frames) || frames < 2 || frames > 128
  || !Number.isFinite(stepPx) || stepPx < 0 || stepPx > 2) throw new Error('Invalid diagnostic parameters');

const canvas = document.createElement('canvas');
document.body.append(canvas);
const renderer = new WebGLRenderer({ canvas, antialias: true, logarithmicDepthBuffer: true, preserveDrawingBuffer: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor(new Color(0), 1);
renderer.setPixelRatio(scale);
renderer.setSize(width, height, false);
canvas.style.width = `${width}px`;
canvas.style.height = `${height}px`;
const scene = new Scene();
// The depth radius is immaterial to the point profile; a compact diagnostic
// radius keeps the sky sphere away from the far clip plane on all WebGL drivers.
const skyRadius = 1000;
const camera = new PerspectiveCamera(50, width / height, 0.1, 10000);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new Vector2(1, 1), 0.35, 0.4, 0.92);
bloom.enabled = bloomOn;
composer.addPass(bloom);
composer.addPass(new OutputPass());
composer.setPixelRatio(scale);
composer.setSize(width, height);

const ndc: Array<[number, number]> = [
  [-0.78, -0.65], [-0.35, -0.65], [0.1, -0.65], [0.55, -0.65], [0.82, -0.25],
  [-0.78, 0.25], [-0.35, 0.25], [0.1, 0.25], [0.55, 0.25], [0.82, 0.7],
];
const depth = 100;
const halfH = Math.tan(camera.fov * Math.PI / 360) * depth;
const halfW = halfH * camera.aspect;
const positions = ndc.map(([x, y]) => new Vector3(x * halfW, y * halfH, -depth));
const geometry = new BufferGeometry();
const pos = new Float32Array(positions.flatMap((p) => [p.x, p.y, p.z]));
const colors = new Float32Array(positions.flatMap((_, i) => i % 3 === 0 ? [1, 0.75, 0.55] : i % 3 === 1 ? [0.7, 0.83, 1] : [1, 1, 1]));
geometry.setAttribute('position', new BufferAttribute(pos, 3));
geometry.setAttribute('color', new BufferAttribute(colors, 3));
const mags = [8, 7, 6, 5, 4, 3, 2, 1, 0, -1];
let material: ShaderMaterial;
if (layer === 'cloud') {
  geometry.setAttribute('weight', new BufferAttribute(new Float32Array([0.5, 0.7, 1, 1.2, 1.5, 0.5, 0.7, 1, 1.2, 1.5]), 1));
  material = new ShaderMaterial({
    vertexShader: galaxyCloudVert, fragmentShader: pointsFrag,
    defines: { STAR_POINTS: 1, ADAPTIVE_CLOUD_POINTS: 1 },
    uniforms: {
      uBasis: { value: new Matrix3() }, uCenterRel: { value: new Vector3() },
      uPixelRatio: { value: scale }, uSkyRadius: { value: skyRadius },
      uPxPerRad: { value: 150 }, uBlobRadius: { value: 1 },
      uAlpha: { value: 0.5 }, uFade: { value: 1 }, uMaxPx: { value: 30 },
      uExtinction: { value: 0 }, uSoftness: { value: 1 }, uTint: { value: new Vector4(0, 0, 0, 0) },
    }, transparent: true, blending: AdditiveBlending, depthWrite: false,
  });
} else {
  geometry.setAttribute('absMag', new BufferAttribute(new Float32Array(mags.map((m) => m - 5)), 1));
  geometry.setAttribute('starIndex', new BufferAttribute(new Float32Array(positions.map((_, i) => i)), 1));
  material = new ShaderMaterial({
    vertexShader: starsVert, fragmentShader: pointsFrag,
    defines: { STAR_POINTS: 1, QUADRATIC_STAR_POINTS: 1 },
    uniforms: {
      uCamPc: { value: new Vector3() }, uPixelRatio: { value: scale },
      uSkyRadius: { value: skyRadius }, uHideIndex: { value: -1 },
      uMagLimit: { value: 9 }, uSoftness: { value: 0 }, uTint: { value: new Vector4(0, 0, 0, 0) },
    }, transparent: true, blending: AdditiveBlending, depthWrite: false,
  });
}
const points = new Points(geometry, material);
points.frustumCulled = false;
scene.add(points);

const gl = renderer.getContext();
const physicalW = Math.round(width * scale), physicalH = Math.round(height * scale);
const radius = 12, side = radius * 2 + 1;
const pixels = new Uint8Array(side * side * 4);
const samples: Array<{ frame: number; stars: Array<{ x: number; y: number; peak: number; integral: number; pixels: number }>; visible: number; integral: number }> = [];
const pngs: Record<string, string> = {};
const pxPerRad = physicalH / (2 * Math.tan(camera.fov * Math.PI / 360));

async function run(): Promise<void> {
  for (let frame = 0; frame < frames; frame++) {
    const angle = (axis === 'still' ? 0 : frame * stepPx) / pxPerRad;
    camera.rotation.set(axis === 'y' ? angle : 0, axis === 'x' ? angle : 0, 0);
    camera.updateMatrixWorld();
    if (raw) renderer.render(scene, camera);
    else composer.render();
    const stars = positions.map((position) => {
      const screen = position.clone().normalize().multiplyScalar(skyRadius).project(camera);
      const x = (screen.x * 0.5 + 0.5) * physicalW;
      const y = (screen.y * 0.5 + 0.5) * physicalH;
      const left = Math.max(0, Math.min(physicalW - side, Math.floor(x) - radius));
      const bottom = Math.max(0, Math.min(physicalH - side, Math.floor(y) - radius));
      gl.readPixels(left, bottom, side, side, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      let peak = 0, integral = 0, count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        peak = Math.max(peak, luma);
        integral += luma;
        if (luma > 3) count++;
      }
      return { x, y, peak, integral, pixels: count };
    });
    samples.push({ frame, stars, visible: stars.filter((s) => s.peak > 3).length, integral: stars.reduce((sum, s) => sum + s.integral, 0) });
    if (frame === 0 || frame === Math.floor(frames / 2) || frame === frames - 1) {
      pngs[frame === 0 ? 'first' : frame === frames - 1 ? 'last' : 'middle'] = canvas.toDataURL('image/png').split(',')[1];
    }
    status.textContent = `Rendered ${frame + 1}/${frames} deterministic frames`;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const name = `${layer}-${axis}-bloom${Number(bloomOn)}-scale${String(scale).replace('.', '')}-${width}x${height}${raw ? '-raw' : ''}`;
  const report = { layer, axis, bloom: bloomOn, scale, width, height, frames, stepPx, samples };
  const response = await fetch('http://127.0.0.1:4174/capture', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phase, name, report, frames: pngs }),
  });
  if (!response.ok) throw new Error(`Capture service: ${await response.text()}`);
  status.textContent = `Saved ${name}; draw calls ${renderer.info.render.calls}; WebGL error ${gl.getError()}`;
}
run().catch((error) => { status.textContent = `FAILED: ${String(error)}`; console.error(error); });
