import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import { Quaternion, Vector3 } from 'three';
import * as THREE from 'three';

const entry = `
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { ReachVoyageDirector, reachArrivalRollQuarterTurns, reachPreviewRoute,
    REACH_ITINERARY } from './src/reach/ReachVoyageDirector.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
  export { createAlphaCentauriPreviewSystem } from './src/reach/ReachAlphaCentauri.ts';
`;
const bundle = await rolldown({
  input: '\0reach-roll-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-roll-test',
    resolveId(id) { if (id === '\0reach-roll-test') return id; },
    load(id) { if (id === '\0reach-roll-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' }, module, module.exports,
);
const { Universe, StarCatalog, TimeSystem, CameraController, ReachVoyageDirector,
  ReachTiming, reachArrivalRollQuarterTurns: choose, reachPreviewRoute,
  createAlphaCentauriPreviewSystem, REACH_ITINERARY } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
const tolerance = 1e-5;

function run(destination, saved = null, routeOverride = null) {
  const time = new TimeSystem(new Date('2026-10-11T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog,
    routeOverride?.id === 'preview:alpha-centauri' ? createAlphaCentauriPreviewSystem(catalog) : null);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const route = routeOverride ?? { id: `roll:${destination}`, version: 1, repeat: false,
    stops: [{ id: 'earth', profile: 'planet' }, { id: destination, profile: 'planet' }] };
  const director = new ReachVoyageDirector(universe, camera, time,
    new ReachTiming('production', () => 0.5), saved, undefined, route);
  function step(dt = 0.1) {
    time.advance(dt);
    universe.update(time.jd, time.t);
    if (director.directing) director.update(dt, false);
    else { camera.update(dt, input, 1920, 1080, Math.PI / 3); director.update(dt, false); }
  }
  if (!saved) {
    for (let i = 0; i < 4000 && !camera.autopilot; i++) step();
    assert.ok(camera.autopilot, `${destination} entered NEXT`);
    camera.autopilot.duration = 40;
  }
  return { camera, director, step };
}

function relativeRoll(rolled, baseline) {
  const relative = baseline.clone().invert().multiply(rolled);
  const axis = new Vector3(0, 0, 1);
  const forward = new Vector3(0, 0, -1).applyQuaternion(relative);
  assert.ok(forward.distanceTo(new Vector3(0, 0, -1)) < tolerance, 'view axis unchanged');
  return 2 * Math.atan2(new Vector3(relative.x, relative.y, relative.z).dot(axis), relative.w);
}

const choices = new Set();
for (const id of ['saturn', 'venus', 'mars', 'uranus']) choices.add(choose('earth', id, 'outbound', 0));
assert.deepEqual([...choices].sort(), [0, 1, 2, 3], 'all four arrival orientations selected');
assert.equal(choose('earth', 'mars', 'outbound', 0), choose('earth', 'mars', 'outbound', 0));
assert.notEqual(choose('earth', 'mars', 'outbound', 0), choose('earth', 'mars', 'inbound', 0),
  'return leg participates in selection');
assert.notEqual(choose('earth', 'mars', 'outbound', 0), choose('earth', 'mars', 'outbound', 1),
  'repeat journey participates in selection');
const distribution = [0, 0, 0, 0];
for (let cycle = 0; cycle < 4; cycle++) {
  for (let i = 1; i < REACH_ITINERARY.length; i++) {
    distribution[choose(REACH_ITINERARY[i - 1].id, REACH_ITINERARY[i].id,
      'outbound', cycle)]++;
    distribution[choose(REACH_ITINERARY[i].id, REACH_ITINERARY[i - 1].id,
      'inbound', cycle)]++;
  }
}
assert.ok(distribution.every((count) => Math.abs(count - 112) < 28),
  `four-way choices roughly balanced over repeated v4 legs: ${distribution}`);

for (const [destination, target] of [['saturn', 0], ['venus', 1], ['mars', 2], ['uranus', 3]]) {
  const active = run(destination);
  assert.equal(active.director.capture().camera.rollQuarterTurns, target);
  const baseSave = active.director.capture();
  delete baseSave.camera.flight.rollDelta;
  const baseline = run(destination, baseSave);
  for (const [seconds, expected] of [[10, 0], [20, target === 3 ? -45 : target * 45],
    [30, target === 3 ? -90 : target * 90]]) {
    while (active.camera.autopilot.t < seconds - 0.01) { active.step(); baseline.step(); }
    const roll = relativeRoll(active.camera.quaternion, baseline.camera.quaternion) * 180 / Math.PI;
    assert.ok(Math.abs(roll - expected) < 0.01, `${destination} local roll at ${seconds}s: ${roll}`);
    assert.ok(active.camera.position.distanceTo(baseline.camera.position) < tolerance,
      `${destination} position unchanged`);
  }
  const saved = active.director.capture();
  const resumed = run(destination, saved);
  assert.ok(active.camera.quaternion.angleTo(resumed.camera.quaternion) < tolerance,
    `${destination} resume starts without a snap`);
  for (let i = 0; i < 100; i++) {
    active.step(); resumed.step(); baseline.step();
    assert.ok(active.camera.quaternion.angleTo(resumed.camera.quaternion) < tolerance,
      `${destination} resume matches at step ${i}`);
  }
  assert.equal(active.director.capture().phase.kind, 'observe', `${destination} arrives`);
  assert.equal(active.director.capture().camera.rollQuarterTurns, target,
    `${destination} holds arrival choice`);
}

const sequence = run('venus', null, { id: 'roll:sequence', version: 1, repeat: false,
  stops: [{ id: 'earth', profile: 'planet' }, { id: 'venus', profile: 'planet' },
    { id: 'mars', profile: 'planet' }] });
for (let i = 0; i < 450 && sequence.director.capture().phase.kind !== 'observe'; i++) sequence.step();
assert.equal(sequence.director.capture().camera.rollQuarterTurns, 1,
  'first arrival orientation survives observation');
for (let i = 0; i < 4000 && sequence.director.capture().phase.kind !== 'departure'; i++) sequence.step();
assert.equal(sequence.director.capture().phase.kind, 'departure');
assert.equal(sequence.director.capture().camera.rollQuarterTurns, 1,
  'departure retains arrival orientation');
for (let i = 0; i < 4000 && sequence.director.capture().destinationId !== 'mars'; i++) sequence.step();
assert.equal(sequence.director.capture().phase.kind, 'cruise');
const nextTarget = choose('venus', 'mars', 'outbound', 0);
let nextSteps = (nextTarget - 1 + 4) % 4;
if (nextSteps > 2) nextSteps -= 4;
assert.equal(sequence.camera.autopilot.rollDelta, nextSteps * Math.PI / 2,
  'second leg chooses an absolute target via shortest path');
assert.equal(sequence.director.capture().camera.rollQuarterTurns, nextTarget,
  'second leg stores its absolute arrival orientation');

const legacyStart = run('mars');
const legacySave = legacyStart.director.capture();
delete legacySave.camera.rollQuarterTurns;
delete legacySave.camera.flight.rollDelta;
const legacy = run('mars', legacySave);
for (let i = 0; i < 200; i++) legacy.step();
const oldMidFlight = legacy.director.capture();
delete oldMidFlight.camera.rollQuarterTurns;
delete oldMidFlight.camera.flight.rollDelta;
const legacyResumed = run('mars', oldMidFlight);
for (let i = 0; i < 100; i++) {
  legacy.step(); legacyResumed.step();
  assert.ok(legacy.camera.quaternion.angleTo(legacyResumed.camera.quaternion) < tolerance,
    'pre-roll checkpoint keeps its original cruise orientation');
}

const alpha = run('alpha:establish', null, reachPreviewRoute('alpha-centauri'));
assert.equal(alpha.director.capture().camera.flight.rollDelta, undefined,
  'Alpha establishing flight has no experiment roll');
for (let i = 0; i < 500 && !alpha.director.alphaCinematic; i++) alpha.step();
assert.ok(alpha.director.alphaCinematic, 'Alpha authored sequence takes over');
assert.equal(alpha.director.capture().camera.rollQuarterTurns, 0,
  'Alpha authored up vector establishes the next roll reference');
assert.equal(alpha.director.capture().phase.kind, 'observe',
  'preview Alpha remains on its authored phase path');
console.log('PASS four choices, shortest local roll, phase boundary, mid-flight resume, return and repeat seeds');
