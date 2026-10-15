import { OrthographicCamera, Scene, ShaderMaterial, SphereGeometry, Mesh, Vector3, WebGLRenderer,
  ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import { LANDMARKS } from '../data/landmarks';
import { Shaders } from '../render/shaders';
import { stellarSurfaceSeed } from '../gen/StellarSeed';

// Development-only isolated surface comparison. Production never imports this module.
const rows = [
  { id: 'l-etacar', name: 'Eta Carinae' },
  { id: 'l-r136a1', name: 'R136a1' },
  { id: 'l-wohg64', name: 'WOH G64' },
  { id: 'l-crabpsr', name: 'Crab pulsar', temperature: 28000, pulsar: true },
  { id: 'l-geminga', name: 'Geminga', temperature: 28000, pulsar: true },
  { id: 's25822-star', name: 'Betelgeuse', temperature: 3500, seed: 900, convection: true },
  { id: 'sun', name: 'Sun', temperature: 5772, seed: 1 },
];
const width = 1000, rowHeight = 260, height = rowHeight * rows.length;
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(width, height);
renderer.setPixelRatio(1);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.outputColorSpace = SRGBColorSpace;
document.body.append(renderer.domElement);
const halfHeight = rows.length * 0.65;
const camera = new OrthographicCamera(-2.5, 2.5, halfHeight, -halfHeight, 0.1, 20);
camera.position.set(0, 0, 0);
camera.lookAt(0, 0, -1);
const scene = new Scene();
const geometry = new SphereGeometry(0.43, 96, 64);
const labels: HTMLElement[] = [];
for (let index = 0; index < rows.length; index++) {
  const row = rows[index];
  const def = LANDMARKS.find((item) => item.id === row.id);
  const temperature = 'temperature' in row ? row.temperature! : def!.star!.temperature;
  const currentSeed = 'seed' in row ? row.seed! : stellarSurfaceSeed(row.id);
  const legacySeed = 'seed' in row ? row.seed! : 'pulsar' in row
    ? (row.id.length * 17) % 991 + 3 : (row.id.length * 31) % 997 + 5;
  for (const [column, seed] of [legacySeed, currentSeed].entries()) {
    const material = new ShaderMaterial({
      vertexShader: Shaders.surfaceVert, fragmentShader: Shaders.starFrag,
      defines: 'convection' in row ? { BETELGEUSE_CONVECTION: 1 } : {},
      uniforms: {
        uSeed: { value: seed }, uTime: { value: 0 }, uTemperature: { value: temperature },
        uIntensity: { value: 0.75 }, uDrift: { value: new Vector3() },
        uMotionStrength: { value: 0 }, uColorWarmth: { value: 0 },
        uConvectionPhase: { value: new Vector3(1, 0, 0) },
        uIrregular: { value: 0 }, uFlattening: { value: 0 },
      },
    });
    const mesh = new Mesh(geometry, material);
    mesh.position.set(column === 0 ? -1.2 : 1.2, (rows.length - 1) * 0.65 - index * 1.3, -10);
    scene.add(mesh);
  }
  const label = document.createElement('div');
  label.textContent = `${row.name}: ${legacySeed} / ${currentSeed}`;
  label.style.cssText = `position:absolute;left:20px;top:${98 + index * rowHeight}px`;
  document.body.append(label);
  labels.push(label);
}
renderer.render(scene, camera);
const glError = renderer.getContext().getError();
document.getElementById('status')!.textContent = `ready; WebGL error ${glError}`;
