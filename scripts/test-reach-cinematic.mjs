import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { ReachVoyageDirector } from './src/reach/ReachVoyageDirector.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
`;
const bundle = await rolldown({
  input: '\0reach-cinematic-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-cinematic-test',
    resolveId(id) { if (id === '\0reach-cinematic-test') return id; },
    load(id) { if (id === '\0reach-cinematic-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' }, module, module.exports,
);
const { Universe, StarCatalog, TimeSystem, CameraController, ReachVoyageDirector, ReachTiming } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };

function makeRun(destination, duration, saved = null) {
  const time = new TimeSystem(new Date('2026-10-11T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const route = { id: `cinematic-${destination}`, version: 1, repeat: false,
    stops: [{ id: 'earth', profile: 'planet' }, { id: destination, profile: 'planet' }] };
  const timing = new ReachTiming('production', () => 0.5);
  const director = new ReachVoyageDirector(universe, camera, time, timing, saved, undefined, route);
  const dt = 0.1;
  function step() {
    time.advance(dt);
    universe.update(time.jd, time.t);
    if (director.directing) director.update(dt, false);
    else { camera.update(dt, input, 1920, 1080, Math.PI / 3); director.update(dt, false); }
  }
  if (!saved) {
    for (let i = 0; i < 4000 && !camera.autopilot; i++) step();
    assert.ok(camera.autopilot, `${destination} cruise started`);
    camera.autopilot.duration = duration;
  }
  return { time, universe, camera, director, step };
}

const degrees = (a, b) => a.angleTo(b) * 180 / Math.PI;
for (const [destination, duration] of [['jupiter', 240], ['uranus', 600], ['neptune', 900]]) {
  const run = makeRun(destination, duration);
  const samples = [];
  const odometerStart = run.director.distanceTravelledKm;
  for (let second = 0; second <= duration; second++) {
    if (second > 0) for (let i = 0; i < 10; i++) run.step();
    if (second % 30 === 0) samples.push({ second, orientation: run.camera.quaternion.clone() });
  }
  const halfMinutes = samples.slice(1).map((sample, i) => +(degrees(samples[i].orientation, sample.orientation)).toFixed(3));
  const intervals = samples.filter((sample) => sample.second % 60 === 0);
  const minuteAngles = intervals.slice(1).map((sample, i) => +(degrees(intervals[i].orientation, sample.orientation)).toFixed(3));
  assert.ok(minuteAngles.slice(1, -1).every((angle) => angle > 1.5), `${destination}: sky moves during long cruise`);
  if (duration >= 600) assert.ok(halfMinutes.slice(2, -2).every((angle) => angle > 0.5),
    `${destination}: sky moves over 30 seconds during long cruise`);
  assert.ok(run.director.distanceTravelledKm > odometerStart, `${destination}: odometer advances`);
  console.log(`${destination} ${duration}s: ${minuteAngles.join(', ')} deg per 60s; minimum settled 30s ${Math.min(...halfMinutes.slice(2, -2))} deg`);
}

const smooth = makeRun('uranus', 600);
const plain = makeRun('uranus', 600, smooth.director.capture());
plain.camera.autopilot.cinematicCruise = false;
let peakOffset = 0;
for (let second = 1; second <= 600; second++) {
  for (let i = 0; i < 10; i++) { smooth.step(); plain.step(); }
  const offset = degrees(smooth.camera.quaternion, plain.camera.quaternion);
  peakOffset = Math.max(peakOffset, offset);
  if (second === 1 || second === 599) assert.ok(offset < 0.1, `smooth cruise boundary at ${second}s`);
  if (second === 600) assert.ok(offset < 1e-4, 'arrival orientation matches normal framing');
  assert.ok(smooth.camera.position.distanceTo(plain.camera.position) < 1e-5, 'cruise position unaffected');
  assert.ok(Math.abs(smooth.director.distanceTravelledKm - plain.director.distanceTravelledKm) < 1e-4,
    'odometer unaffected by viewing motion');
}
assert.ok(peakOffset > 3 && peakOffset < 7, `restrained viewing offset: ${peakOffset}`);

const beforeSave = makeRun('uranus', 600);
for (let i = 0; i < 2730; i++) beforeSave.step();
const resumed = makeRun('uranus', 600, beforeSave.director.capture());
assert.ok(degrees(beforeSave.camera.quaternion, resumed.camera.quaternion) < 1e-4, 'saved orientation restored');
for (let i = 0; i < 1200; i++) {
  beforeSave.step(); resumed.step();
  assert.ok(degrees(beforeSave.camera.quaternion, resumed.camera.quaternion) < 1e-4,
    `resume orientation at step ${i}`);
  assert.ok(Math.abs(beforeSave.director.distanceTravelledKm - resumed.director.distanceTravelledKm) < 1e-3,
    `resume odometer at step ${i}`);
}

const oldFlight = makeRun('uranus', 600);
oldFlight.camera.autopilot.cinematicCruise = false;
for (let i = 0; i < 2730; i++) oldFlight.step();
const oldSave = oldFlight.director.capture();
delete oldSave.camera.flight.cinematicCruise;
const oldResumed = makeRun('uranus', 600, oldSave);
for (let i = 0; i < 300; i++) {
  oldFlight.step(); oldResumed.step();
  assert.ok(degrees(oldFlight.camera.quaternion, oldResumed.camera.quaternion) < 1e-4,
    'pre-cinematic checkpoint keeps its original camera path');
}

const short = makeRun('jupiter', 28);
const shortPlain = makeRun('jupiter', 28, short.director.capture());
shortPlain.camera.autopilot.cinematicCruise = false;
for (let i = 0; i < 280; i++) {
  short.step(); shortPlain.step();
  assert.ok(degrees(short.camera.quaternion, shortPlain.camera.quaternion) < 1e-4,
    'short pilot cruise retains its previous orientation');
}
console.log(`PASS long cruise drift, smooth boundaries, ${peakOffset.toFixed(2)} deg maximum offset, resume, legacy save, odometer, short cruise`);
