import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { ReachVoyageDirector, REACH_PRODUCTION_ROUTE } from './src/reach/ReachVoyageDirector.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
`;
const bundle = await rolldown({
  input: '\0reach-flicker-checkpoint',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-flicker-checkpoint',
    resolveId(id) { if (id === '\0reach-flicker-checkpoint') return id; },
    load(id) { if (id === '\0reach-flicker-checkpoint') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' }, module, module.exports,
);
const { Universe, StarCatalog, TimeSystem, CameraController, ReachVoyageDirector,
  REACH_PRODUCTION_ROUTE, ReachTiming } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const time = new TimeSystem(new Date('2026-10-11T00:00:00Z'));
const universe = new Universe(catalog);
universe.update(time.jd, time.t);
const camera = new CameraController(universe);
const director = new ReachVoyageDirector(universe, camera, time,
  new ReachTiming('production', () => 0.5), null, undefined, REACH_PRODUCTION_ROUTE);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
const dt = 0.1;
let found = false;
for (let step = 0; step < 400_000; step++) {
  time.advance(dt);
  universe.update(time.jd, time.t);
  if (director.directing) director.update(dt, false);
  else { camera.update(dt, input, 1280, 720, Math.PI / 3); director.update(dt, false); }
  const countdown = director.countdown;
  const flight = camera.autopilot;
  if (countdown.destinationId === 'sun' && countdown.phase === 'NEXT'
    && flight && flight.t >= 110 && flight.t < 110 + dt) {
    const saved = director.capture();
    mkdirSync('validation/flicker', { recursive: true });
    writeFileSync('validation/flicker/halley-to-sun-110s.json', JSON.stringify(saved, null, 2));
    console.log(`Generated Halley-to-Sun checkpoint at ${saved.phase.elapsed.toFixed(1)}s, duration ${saved.phase.duration}s, step ${step}`);
    found = true;
    break;
  }
}
if (!found) throw new Error('Halley-to-Sun 110s checkpoint not reached');
