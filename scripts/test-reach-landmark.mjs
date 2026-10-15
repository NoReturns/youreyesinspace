import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { ReachVoyageDirector, REACH_PRODUCTION_ROUTE, reachPreviewRoute,
    reachLandmarkObservationDistance } from './src/reach/ReachVoyageDirector.ts';
  export { destinationRef, destinationSystem } from './src/reach/ReachDestinations.ts';
  export { parseReachJourney, REACH_ITINERARY_VERSION } from './src/reach/JourneyState.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
  export { PARSEC_KM } from './src/core/constants.ts';
  export { reachInfoTarget } from './src/reach/ReachInfoCard.ts';
`;
const bundle = await rolldown({
  input: '\0reach-landmark-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-landmark-test',
    resolveId(id, importer) {
      if (id === '\0reach-landmark-test') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-landmark-test') return entry;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' },
  module, module.exports,
);
const { ReachVoyageDirector, REACH_PRODUCTION_ROUTE, reachPreviewRoute,
  reachLandmarkObservationDistance, destinationRef, destinationSystem,
  parseReachJourney, REACH_ITINERARY_VERSION, CameraController, TimeSystem,
  Universe, StarCatalog, ReachTiming, PARSEC_KM, reachInfoTarget } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const route = reachPreviewRoute('tarantula');
assert.equal(route.id, 'preview:tarantula');
assert.deepEqual(route.stops.map((stop) => stop.id), ['earth', 'l-30dor']);
assert.equal(route.repeat, true);
assert.deepEqual(destinationRef(route.stops[1]), { kind: 'landmark', landmarkId: 'l-30dor' });
assert.equal(destinationSystem(route.stops[1]), 'c0');
assert.equal(REACH_ITINERARY_VERSION, 6);
assert.ok(!REACH_PRODUCTION_ROUTE.stops.some((stop) => stop.id === 'l-30dor'));
assert.equal(reachPreviewRoute('unknown-landmark'), null);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }),
  down: () => false };
const fov = 50 * Math.PI / 180;
const hasDestination = (universe) => (id) => id === 'l-30dor'
  ? !!universe.landmark(id) : !!universe.system('c0').get(id);
function makeRun(saved = null) {
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time, new ReachTiming('preview'),
    saved, undefined, route, fov);
  return { universe, camera, director, time };
}
function step(run) {
  const dt = 0.1;
  run.time.advance(dt);
  run.universe.update(run.time.jd, run.time.t);
  if (run.director.directing) run.director.update(dt, false);
  else { run.camera.update(dt, input, 1920, 1080, fov); run.director.update(dt, false); }
}
function until(run, match, limit = 1000) {
  for (let i = 0; i < limit; i++) {
    step(run);
    const state = run.director.capture();
    if (match(state)) return state;
  }
  throw new Error('Tarantula phase was not reached');
}
function verifyResume(run, state, label) {
  const parsed = parseReachJourney(JSON.stringify(state), route, hasDestination(run.universe));
  assert.ok(parsed, `${label} checkpoint validates`);
  assert.equal(parseReachJourney(JSON.stringify(state), REACH_PRODUCTION_ROUTE,
    hasDestination(run.universe)), null, `${label} cannot enter production`);
  const restored = makeRun(parsed);
  assert.equal(restored.camera.position.distanceTo(run.camera.position), 0, `${label} position`);
  assert.equal(restored.camera.quaternion.angleTo(run.camera.quaternion), 0, `${label} orientation`);
  assert.equal(restored.director.distanceTravelledKm, run.director.distanceTravelledKm, `${label} odometer`);
  assert.equal(restored.director.capture().phase.kind, state.phase.kind, `${label} phase`);
  for (let i = 0; i < 12; i++) {
    step(run); step(restored);
    assert.ok(restored.camera.position.distanceTo(run.camera.position) < 1e6, `${label} continued position`);
    assert.ok(Math.abs(restored.director.distanceTravelledKm - run.director.distanceTravelledKm) < 1e-3,
      `${label} continued odometer`);
  }
  return restored;
}
const run = makeRun();
const landmark = run.universe.landmark('l-30dor');
assert.ok(landmark && landmark.systemId === null);
assert.equal(landmark.def.facts.Uzaklık, '49,6 kpc (LMC)', 'catalog distance stays intact');
const modelDistancePc = landmark.positionPc.length();
assert.ok(modelDistancePc > 50_000 && modelDistancePc < 51_000,
  'LMC disc intersection retains its independent model distance');
assert.ok(Math.abs(modelDistancePc - 49_600) > 1_000,
  'the catalog and model distances remain distinct values');
const fromEarth = run.universe.landmarkRelative(run.universe.landmarks.indexOf(landmark),
  run.universe.get('earth').position);
assert.ok(fromEarth.distanceTo(landmark.positionPc.clone().multiplyScalar(PARSEC_KM)
  .sub(run.universe.get('earth').position)) < 1e3, 'landmark point uses Sun-relative catalogue coordinates');
const distance = reachLandmarkObservationDistance(landmark.def.radiusPc * PARSEC_KM, fov);
assert.ok(Math.abs((landmark.def.radiusPc * PARSEC_KM / distance)
  / Math.tan(fov / 2) - 0.4) < 1e-12, 'arrival frames the visual radius against FOV');
const approach = until(run, (s) => s.destinationId === 'l-30dor'
  && s.phase.kind === 'cruise' && s.phase.elapsed > 3);
assert.equal(run.camera.autopilot.kind, 'gotoPoint');
assert.equal(run.camera.autopilot.target, null);
assert.ok(run.camera.autopilot.point.distanceTo(landmark.positionPc.clone().multiplyScalar(PARSEC_KM)) < 1e3);
assert.ok(Math.abs(run.camera.autopilot.dist1 - distance) < 1);
assert.ok(approach.odometer.leg.distanceKm > 1e18);
const resumedApproach = verifyResume(run, approach, 'approach');
const observed = until(resumedApproach, (s) => s.destinationId === 'l-30dor'
  && s.phase.kind === 'observe' && s.phase.elapsed > 2);
assert.equal(resumedApproach.camera.target, null);
assert.equal(resumedApproach.camera.reference.id, 'sun');
assert.equal(resumedApproach.camera.anchor.name, route.stops[1].label);
assert.equal(observed.odometer.completedKm, approach.odometer.leg.distanceKm);
assert.deepEqual(reachInfoTarget(resumedApproach.director.observation, true, destinationRef),
  { kind: 'landmark', landmarkId: 'l-30dor' });
assert.equal(reachInfoTarget(resumedApproach.director.observation, false, destinationRef), null);
const resumedObservation = verifyResume(resumedApproach, observed, 'observation');
const departure = until(resumedObservation, (s) => s.destinationId === 'l-30dor'
  && s.phase.kind === 'departure' && s.phase.elapsed > 0.5);
assert.equal(departure.phase.sourceId, 'l-30dor');
assert.equal(departure.odometer.leg.toId, 'earth');
const resumedDeparture = verifyResume(resumedObservation, departure, 'departure');
const earthReturn = until(resumedDeparture, (s) => s.destinationId === 'earth'
  && s.phase.kind === 'observe');
assert.equal(earthReturn.odometer.leg, null);
assert.ok(earthReturn.odometer.completedKm > observed.odometer.completedKm);
console.log('PASS Tarantula resolution, coordinates, FOV, camera, card, approach/observation/departure restore, and return odometer');
