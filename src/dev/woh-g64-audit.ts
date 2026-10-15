import { ACESFilmicToneMapping, AdditiveBlending, Color, Mesh, OrthographicCamera,
  PlaneGeometry, Scene, ShaderMaterial, SphereGeometry, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import { temperatureToRgb } from '../astro/stellar';
import { stellarSurfaceSeed } from '../gen/StellarSeed';
import { setStellarConvectionPhase } from '../render/StellarConvection';
import { Shaders } from '../render/shaders';

// Development-only fixed-view comparison. Production never imports this module.
const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'before';
const seconds = Number(params.get('t') ?? '0');
if (!['before', 'after'].includes(mode) || ![0, 10, 30].includes(seconds)) throw new Error('Invalid audit parameters');
const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(1500, 700);
renderer.setPixelRatio(1);
renderer.outputColorSpace = SRGBColorSpace;
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.setClearColor(0x000000, 1);
document.body.append(renderer.domElement);
const camera = new OrthographicCamera(-3.75, 3.75, 1.75, -1.75, 0.1, 20);
camera.lookAt(0, 0, -1);
const scene = new Scene();
const sphere = new SphereGeometry(0.72, 128, 96);
const quad = new PlaneGeometry(2, 2);
const stars = [
  { x: -2.5, id: 'l-wohg64', temperature: 3400, seed: stellarSurfaceSeed('l-wohg64'),
    surfaceDefine: mode === 'after' ? 'WOH_G64_CONVECTION' : '', coronaDefine: mode === 'after' ? 'WOH_G64_DUST' : '' },
  { x: 0, id: 's25822-star', temperature: 3500, seed: 900,
    surfaceDefine: 'BETELGEUSE_CONVECTION', coronaDefine: '' },
  { x: 2.5, id: 'sun', temperature: 5772, seed: 1, surfaceDefine: '', coronaDefine: '' },
];
for (const star of stars) {
  const phase = new Vector3();
  if (star.surfaceDefine === 'WOH_G64_CONVECTION') setStellarConvectionPhase('woh-g64', seconds, phase);
  if (star.surfaceDefine === 'BETELGEUSE_CONVECTION') setStellarConvectionPhase('betelgeuse', seconds, phase);
  const surface = new ShaderMaterial({
    vertexShader: Shaders.surfaceVert, fragmentShader: Shaders.starFrag,
    defines: star.surfaceDefine ? { [star.surfaceDefine]: 1 } : {},
    uniforms: {
      uSeed: { value: star.seed }, uTime: { value: seconds }, uTemperature: { value: star.temperature },
      uIntensity: { value: 0.75 }, uDrift: { value: new Vector3() },
      uMotionStrength: { value: 0 }, uColorWarmth: { value: 0 },
      uConvectionPhase: { value: phase }, uIrregular: { value: 0 }, uFlattening: { value: 0 },
    },
  });
  const disc = new Mesh(sphere, surface);
  disc.position.set(star.x, 0, -10);
  scene.add(disc);
  const [cr, cg, cb] = temperatureToRgb(star.temperature);
  const warm = new Color(cr, cg, cb).lerp(new Color(1, 0.85, 0.6),
    star.temperature > 5000 && star.temperature < 6500 ? 0.6 : 0.15);
  const corona = new ShaderMaterial({
    vertexShader: Shaders.billboardVert, fragmentShader: Shaders.coronaFrag,
    defines: star.coronaDefine ? { [star.coronaDefine]: 1 } : {},
    uniforms: {
      uTime: { value: seconds }, uDrift: { value: new Vector3() },
      uMotionStrength: { value: 0 }, uColorWarmth: { value: 0 },
      uColor: { value: warm }, uIntensity: { value: 0.45 }, uCoreRadius: { value: 0.4 },
    },
    transparent: true, blending: AdditiveBlending, depthWrite: false, depthTest: true,
  });
  const glow = new Mesh(quad, corona);
  glow.position.set(star.x, 0, -10.1);
  glow.scale.setScalar(1.8);
  glow.renderOrder = 5;
  scene.add(glow);
}
renderer.render(scene, camera);
document.getElementById('status')!.textContent = `${mode}, ${seconds}s, draw calls ${renderer.info.render.calls}, WebGL error ${renderer.getContext().getError()}`;
