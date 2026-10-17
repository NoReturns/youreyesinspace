import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

// Exercise production branches without writing a bundle or touching browser storage.
const entry = `
  export { ReachVoyageDirector, REACH_ITINERARY, REACH_PRODUCTION_ROUTE,
    reachLandmarkObservationDistance } from './src/reach/ReachVoyageDirector.ts';
  export { V4_STOP_IDS, V5_STOP_IDS, V6_STOP_IDS, V7_STOP_IDS, reachStopIdsForVersion, parseReachJourney, inspectReachJourneyStore } from './src/reach/JourneyState.ts';
  export { ReachPanoramaSync } from './src/reach/ReachPanorama.ts';
  export { destinationRef } from './src/reach/ReachDestinations.ts';
  export { createAlphaCentauriPreviewSystem, ALPHA_SYSTEM_ID, ALPHA_A_INDEX, ALPHA_B_INDEX }
    from './src/reach/ReachAlphaCentauri.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { LANDMARKS } from './src/data/landmarks.ts';
  export { LANDMARK_IMAGES } from './src/data/landmarkImages.ts';
  export { PARSEC_KM } from './src/core/constants.ts';
  export { ReachTiming, reachTravelKind, reachObserveKind } from './src/reach/ReachTiming.ts';
  export { reachInfoOpacity } from './src/reach/ReachInfoCard.ts';
  export { formatVoyageDistance } from './src/reach/ReachOdometer.ts';
`;
const bundle = await rolldown({
  input: '\0reach-v4-test', transform: { define: { 'import.meta.env.DEV': 'false' } },
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-v4-test',
    resolveId(id, importer) {
      if (id === '\0reach-v4-test') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-v4-test') return entry;
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
const { ReachVoyageDirector, REACH_ITINERARY, REACH_PRODUCTION_ROUTE, reachLandmarkObservationDistance,
  V4_STOP_IDS, V5_STOP_IDS, V6_STOP_IDS, V7_STOP_IDS,
  reachStopIdsForVersion, ReachPanoramaSync,
  parseReachJourney, inspectReachJourneyStore, destinationRef, createAlphaCentauriPreviewSystem,
  ALPHA_SYSTEM_ID, ALPHA_A_INDEX, ALPHA_B_INDEX, CameraController, TimeSystem, Universe,
  StarCatalog, LANDMARKS, LANDMARK_IMAGES, PARSEC_KM, ReachTiming, reachTravelKind, reachObserveKind, reachInfoOpacity,
  formatVoyageDistance } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }),
  down: () => false };
const ids = REACH_ITINERARY.map((stop) => stop.id);
assert.equal(ids.length, 71);
assert.equal(new Set(ids).size, 71);
assert.deepEqual(ids, V7_STOP_IDS);
assert.deepEqual(ids.filter((id) => V6_STOP_IDS.includes(id)), V6_STOP_IDS,
  'all 64 v6 identifiers retain their relative order');
assert.deepEqual(ids.slice(0, 6), ['earth', 'iss', 'moon', 'hubble', 'jwst', 'mars']);
assert.deepEqual(ids.slice(0, 57), V5_STOP_IDS);
assert.deepEqual([...ids].reverse().slice(-6), ['mars', 'jwst', 'hubble', 'moon', 'iss', 'earth']);
assert.equal(ids[0], 'earth');
assert.equal(ids[46], 'voyager1');
assert.deepEqual(ids.slice(47), ['star:c64548', 'alpha-centauri-ab', 'star:c80155',
  'star:c108500', 'star:c49269', 'star:c29786', 'star:c109365',
  'star:c15247', 'star:c7458', 'star:c83130', 'star:c19796', 'star:c10818',
  'l-pleiades', 'star:c25822', 'star:c73646', 'l-helix', 'star:c22577',
  'l-m42', 'star:c92866', 'l-m1', 'star:l3', 'star:l15', 'l-30dor', 'star:l17']);
for (const [index, label] of [[10818, 'Polaris'], [25822, 'Betelgeuse'],
  [73646, 'Antares'], [92866, 'Deneb']]) {
  const info = catalog.info(index);
  assert.equal(info.name, label);
  assert.ok(Number.isFinite(info.distancePc) && info.distancePc > 0);
  assert.ok(Number.isFinite(info.radiusKm) && info.radiusKm > 0);
}
for (const [index, id] of [[3, 'l-etacar'], [15, 'l-r136a1'], [17, 'l-wohg64']]) {
  assert.equal(LANDMARKS[index].id, id);
  assert.ok(LANDMARKS[index].star?.radiusSolar > 0);
}
assert.ok(catalog.distancePc(83130) < catalog.distancePc(10818));
assert.ok(catalog.distancePc(10818) < catalog.distancePc(25822));
assert.ok(catalog.distancePc(25822) < catalog.distancePc(73646));
assert.ok(catalog.distancePc(73646) < catalog.distancePc(92866));
assert.ok(catalog.distancePc(92866) < LANDMARKS[3].distancePc);
console.log('PASS stellar catalogue identities, physical radii, and outbound distance order');
for (const id of ['iss', 'hubble', 'jwst']) {
  const stop = REACH_ITINERARY.find((item) => item.id === id);
  assert.equal(stop.profile, 'probe');
  assert.equal(reachTravelKind(stop), 'nearEarthProbe');
  assert.equal(reachObserveKind(stop), 'nearEarthProbe');
  for (const [sample, travel, observe] of [[0, 75, 20], [0.5, 100, 30], [1, 125, 40]]) {
    const timing = new ReachTiming('production', () => sample);
    assert.equal(timing.travel(stop), travel);
    assert.equal(timing.observe(stop), observe);
    assert.equal(timing.departure(stop), 10);
  }
  assert.equal(new ReachTiming('test').travel(stop), 30);
  assert.equal(new ReachTiming('test').observe(stop), 8);
  assert.equal(new ReachTiming('preview').travel(stop), 8);
  assert.equal(new ReachTiming('preview').observe(stop), 6);
}
for (const id of ['juno', 'newhorizons', 'parker', 'pioneer11', 'pioneer10', 'voyager1', 'voyager2']) {
  const stop = REACH_ITINERARY.find((item) => item.id === id);
  assert.equal(reachTravelKind(stop), 'probe');
  assert.equal(reachObserveKind(stop), 'probe');
  assert.equal(new ReachTiming('production', () => 0).travel(stop), 300);
  assert.equal(new ReachTiming('production', () => 1).travel(stop), 900);
  assert.equal(new ReachTiming('production', () => 0).observe(stop), 60);
  assert.equal(new ReachTiming('production', () => 1).observe(stop), 180);
}
console.log('PASS near-Earth production timing only; other probes and test/preview unchanged');

function hasDestination(universe, route = REACH_PRODUCTION_ROUTE) {
  return (id) => {
    const stop = route.stops.find((candidate) => candidate.id === id);
    if (!stop) {
      if (universe.get(id) || universe.system('c0').get(id)
        || universe.system(ALPHA_SYSTEM_ID).get(id)) return true;
      return route.stops.some((candidate) => {
        const ref = destinationRef(candidate);
        return ref.kind === 'star' && universe.system(ref.starId).star?.id === id;
      });
    }
    const ref = destinationRef(stop);
    if (ref.kind === 'landmark') return !!universe.landmark(ref.landmarkId);
    const system = universe.system(ref.kind === 'star' ? ref.starId : ref.systemId);
    return !!(ref.kind === 'star' ? system.star : system.get(ref.bodyId));
  };
}
function makeRun(saved = null, route = REACH_PRODUCTION_ROUTE, mode = 'test', onPhaseChange) {
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog, createAlphaCentauriPreviewSystem(catalog));
  if (saved && saved.frame.starId !== 'c0') universe.switchTo(saved.frame.starId, time.jd, time.t);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  let director;
  director = new ReachVoyageDirector(universe, camera, time, new ReachTiming(mode, () => 0.5),
    saved, () => onPhaseChange?.(director.capture()), route);
  return { time, universe, camera, director };
}
function step(run, dt = 1) {
  run.time.advance(dt);
  run.universe.update(run.time.jd, run.time.t);
  if (run.director.directing) run.director.update(dt, false);
  else {
    run.camera.update(dt, input, 1920, 1080, Math.PI / 3);
    run.director.update(dt, false);
  }
}
function until(run, predicate, limit = 120_000) {
  for (let i = 0; i < limit; i++) {
    step(run);
    const state = run.director.capture();
    if (predicate(state)) return state;
  }
  throw new Error('Expected v4 phase was not reached');
}
const arrivals = ['earth'];
const legs = [];
const departureSaves = [];
const binaryStages = [];
const binaryBoundarySaves = [];
const inspectionFixtures = new Map();
const addedIds = ['star:c19796', 'l-pleiades', 'l-helix', 'star:c22577', 'l-m42', 'l-m1', 'l-30dor'];
const addedStates = new Map();
const run = makeRun(null, REACH_PRODUCTION_ROUTE, 'test', (state) => {
  if (addedIds.includes(state.destinationId) && ['cruise', 'observe', 'departure'].includes(state.phase.kind))
    addedStates.set(`${state.destinationId}:${state.direction}:${state.phase.kind}`, state);
  if (state.phase.kind === 'departure') {
    legs.push([state.odometer.leg.fromId, state.odometer.leg.toId]);
    departureSaves.push(state);
    if (state.destinationId === 'voyager1' && state.phase.nextId === 'star:c64548')
      inspectionFixtures.set('voyager-proxima', state);
    if (state.destinationId === 'star:c64548' && state.phase.nextId === 'alpha-centauri-ab'
      && state.direction === 'outbound') inspectionFixtures.set('proxima-alpha', state);
    if (state.destinationId === 'iss' && state.phase.nextId === 'earth')
      inspectionFixtures.set('earth-return', state);
  }
  if (state.phase.kind === 'observe' || state.phase.kind === 'flyby'
    || state.phase.kind === 'binary' && state.phase.shot === 'establish')
    arrivals.push(state.destinationId);
  if (state.phase.kind === 'binary') {
    binaryStages.push(state.phase.shot);
    binaryBoundarySaves.push(state);
    if (state.direction === 'outbound' && state.phase.shot === 'establish')
      inspectionFixtures.set('alpha-establish', state);
    if (state.direction === 'outbound' && state.phase.shot === 'cross-to-b')
      inspectionFixtures.set('alpha-cross', state);
    if (state.direction === 'outbound' && state.phase.shot === 'observe-a')
      inspectionFixtures.set('alpha-a', state);
    if (state.direction === 'outbound' && state.phase.shot === 'observe-b')
      inspectionFixtures.set('alpha-b', state);
    if (state.direction === 'outbound' && state.phase.shot === 'final-overview')
      inspectionFixtures.set('alpha-final', state);
    if (state.direction === 'inbound' && state.phase.shot === 'establish')
      inspectionFixtures.set('alpha-inbound', state);
  }
  if (state.destinationId === 'star:l17' && state.phase.kind === 'observe')
    inspectionFixtures.set('woh-g64-turn', state);
});
const binary = run.universe.system(ALPHA_SYSTEM_ID);
assert.deepEqual(binary.bodies.map((body) => body.data.type), ['barycenter', 'star', 'star']);
assert.ok(binary.get(`s${ALPHA_A_INDEX}-star`) && binary.get(`s${ALPHA_B_INDEX}-star`));

const checkedStages = new Set();
const alphaShotDurations = [
  ['establish', 9], ['approach-a', 10], ['observe-a', 8], ['retract-a', 9],
  ['cross-to-b', 14], ['approach-b', 10], ['observe-b', 8], ['retract-b', 10],
  ['final-overview', 10],
];
const alphaTotalSeconds = alphaShotDurations.reduce((total, [, seconds]) => total + seconds, 0);
let pending = null;
let inboundSnapshot = null;
let previousKm = 0;
for (let i = 0; i < 40_000 && run.director.roundTrips === 0; i++) {
  step(run);
  const state = run.director.capture();
  if (state.phase.kind === 'binary') {
    const observation = run.director.observation;
    const shotIndex = alphaShotDurations.findIndex(([shot]) => shot === state.phase.shot);
    assert.ok(observation && shotIndex >= 0);
    assert.equal(state.phase.duration, alphaShotDurations[shotIndex][1]);
    const elapsed = alphaShotDurations.slice(0, shotIndex)
      .reduce((total, [, seconds]) => total + seconds, state.phase.elapsed);
    assert.ok(Math.abs(observation.elapsed - elapsed) < 1e-9);
    assert.ok(Math.abs(observation.remaining - (alphaTotalSeconds - elapsed)) < 1e-9);
    assert.equal(observation.stop.id, 'alpha-centauri-ab');
    if (shotIndex > 0 && state.phase.elapsed === 0)
      assert.equal(reachInfoOpacity(observation), 1, 'card stays visible across Alpha shots');
  }
  assert.ok(run.director.distanceTravelledKm + 1e-4 >= previousKm, 'odometer never decreases');
  previousKm = run.director.distanceTravelledKm;
  if (pending) {
    step(pending);
    const next = pending.director.capture();
    assert.equal(next.phase.kind, state.phase.kind, 'binary reload keeps phase');
    if (state.phase.kind === 'binary') {
      assert.equal(next.phase.shot, state.phase.shot);
      assert.deepEqual(pending.director.observation, run.director.observation,
        'binary reload keeps card timing');
    }
    assert.ok(pending.camera.position.distanceTo(run.camera.position) < 1e-3,
      'binary reload keeps camera position');
    const angle = pending.camera.quaternion.angleTo(run.camera.quaternion);
    assert.ok(angle < 1e-6,
      `binary reload keeps camera orientation (${state.direction}, ${state.phase.kind},
        ${state.phase.shot ?? ''}, ${angle})`);
    pending = null;
  }
  if (state.phase.kind === 'binary' && state.phase.elapsed >= 2
    && !checkedStages.has(`${state.direction}:${state.phase.shot}`)) {
    const parsed = parseReachJourney(JSON.stringify(state), REACH_PRODUCTION_ROUTE,
      hasDestination(run.universe));
    assert.ok(parsed, 'binary checkpoint validates in production');
    pending = makeRun(parsed);
    assert.ok(pending.camera.position.distanceTo(run.camera.position) < 1e-8);
    checkedStages.add(`${state.direction}:${state.phase.shot}`);
  }
  if (!inboundSnapshot && state.direction === 'inbound' && state.destinationId === 'star:c80155'
    && state.phase.kind === 'cruise' && state.phase.elapsed >= 5) inboundSnapshot = state;
}
assert.equal(run.director.roundTrips, 1, 'Earth credits one full cycle');
assert.equal(run.director.capture().direction, 'outbound');
assert.equal(run.director.capture().cycleItineraryVersion, 7);
assert.equal(run.director.capture().odometer.leg, null);
assert.deepEqual(arrivals, [...ids, ...ids.slice(0, -1).reverse()]);
assert.equal(legs.length, 140);
assert.deepEqual(legs, [
  ...ids.slice(1).map((id, index) => [ids[index], id]),
  ...ids.slice(0, -1).reverse().map((id, index) => [ids[ids.length - 1 - index], id]),
]);
assert.equal(binaryStages.length, 18, 'one nine-shot A/B encounter in each direction');
assert.equal(addedStates.size, 42, 'each added stop has cruise, observation, and departure in both directions');
for (const [key, state] of addedStates) {
  const parsed = parseReachJourney(JSON.stringify(state), REACH_PRODUCTION_ROUTE,
    hasDestination(run.universe));
  assert.ok(parsed, `${key}: checkpoint validates`);
  const restored = makeRun(parsed).director.capture();
  assert.deepEqual(restored.phase, state.phase, `${key}: phase restores`);
  assert.deepEqual(restored.camera, state.camera, `${key}: camera restores`);
  assert.deepEqual(restored.odometer, state.odometer, `${key}: odometer restores`);
  if (state.phase.kind !== 'observe' || !state.destinationId.startsWith('l-')) continue;
  const landmark = run.universe.landmark(state.destinationId);
  const radius = landmark.def.radiusPc * PARSEC_KM;
  const expected = reachLandmarkObservationDistance(radius, 50 * Math.PI / 180);
  const point = landmark.positionPc.clone().multiplyScalar(PARSEC_KM).sub(run.universe.system('c0').origin);
  const actual = new THREE.Vector3().fromArray(state.camera.position).distanceTo(point);
  assert.ok(Math.abs(actual - expected) / expected < 0.01, `${key}: observation scale`);
  assert.equal(state.camera.referenceId, 'sun', `${key}: Solar reference`);
  assert.equal(state.camera.targetId, state.destinationId, `${key}: point target`);
  const photo = LANDMARK_IMAGES[state.destinationId];
  assert.ok(photo?.source, `${key}: attribution`);
  assert.deepEqual([...readFileSync(`public/nebulae/${photo.file}.jpg`).subarray(0, 2)], [255, 216],
    `${key}: bundled JPEG`);
}
const photographicIds = ['l-pleiades', 'l-helix', 'l-m42', 'l-m1', 'l-30dor'];
const photographicMidStates = new Map();
for (const id of photographicIds) for (const direction of ['outbound', 'inbound']) {
  const initial = addedStates.get(`${id}:${direction}:observe`);
  assert.equal(initial.phase.elapsed, 0);
  const view = makeRun(initial);
  const landmark = view.universe.landmark(id);
  const point = landmark.positionPc.clone().multiplyScalar(PARSEC_KM)
    .sub(view.universe.current.origin);
  const startOffset = view.camera.position.clone().sub(point);
  const startDistance = startOffset.length();
  assert.equal(view.camera.autoOrbit, 0, `${id} uses only the bounded cinematic arc`);
  step(view, 0.1);
  const firstAngle = view.camera.position.clone().sub(point).angleTo(startOffset);
  assert.ok(firstAngle < 0.0004, `${id} arrival has near-zero orbital speed (${firstAngle})`);
  while (view.director.capture().phase.kind === 'observe'
    && view.director.capture().phase.elapsed < initial.phase.duration / 2) step(view, 0.1);
  const middle = view.director.capture();
  photographicMidStates.set(`${id}:${direction}`, middle);
  const resumed = makeRun(parseReachJourney(JSON.stringify(middle), REACH_PRODUCTION_ROUTE,
    hasDestination(view.universe)));
  assert.deepEqual(resumed.director.capture().camera, middle.camera,
    `${id} ${direction}: mid-arc checkpoint restores exact pose`);
  let beforeDeparture = null;
  while (view.director.capture().phase.kind === 'observe') {
    beforeDeparture = view.camera.position.clone();
    step(view, 0.1);
    step(resumed, 0.1);
    assert.ok(view.camera.position.distanceTo(resumed.camera.position) / startDistance < 1e-8,
      `${id} ${direction}: restored orbit position remains deterministic`);
    assert.ok(view.camera.quaternion.angleTo(resumed.camera.quaternion) < 1e-6,
      `${id} ${direction}: restored orbit orientation remains deterministic`);
    const offset = view.camera.position.clone().sub(point);
    assert.ok(Math.abs(offset.length() / startDistance - 1) < 1e-8,
      `${id} ${direction}: observation distance stays fixed`);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(view.camera.quaternion);
    assert.ok(forward.angleTo(offset.clone().negate()) < 1e-5,
      `${id} ${direction}: landmark stays centered`);
  }
  const total = view.camera.position.clone().sub(point).angleTo(startOffset);
  assert.ok(Math.abs(total - 30 * Math.PI / 180) < 1e-5,
    `${id} ${direction}: complete observation travels 30 degrees`);
  assert.ok(beforeDeparture.distanceTo(view.camera.position) / startDistance < 0.0004,
    `${id} ${direction}: observation eases into departure`);
  assert.equal(view.director.capture().phase.kind, 'departure');
}
console.log('PASS five photographic arcs both directions, framing, easing, and mid-arc restore');
assert.equal(checkedStages.size, 18, 'each binary shot resumes in both directions');
for (const boundary of binaryBoundarySaves) {
  const parsed = parseReachJourney(JSON.stringify(boundary), REACH_PRODUCTION_ROUTE,
    hasDestination(run.universe));
  assert.ok(parsed, `${boundary.phase.shot}: stage-boundary checkpoint validates`);
  const resumed = makeRun(parsed);
  assert.deepEqual(resumed.director.capture().phase, boundary.phase,
    `${boundary.phase.shot}: stage-boundary phase is unchanged`);
  assert.ok(resumed.camera.position.distanceTo(new THREE.Vector3().fromArray(boundary.camera.position)) < 1e-8);
}
for (const state of binaryBoundarySaves.filter((item) => item.phase.shot === 'establish')) {
  const view = makeRun(state);
  const projection = new THREE.PerspectiveCamera(50, 1100 / 930, 0.1, 1e12);
  projection.quaternion.copy(view.camera.quaternion);
  projection.updateMatrixWorld();
  for (const id of [`s${ALPHA_A_INDEX}-star`, `s${ALPHA_B_INDEX}-star`]) {
    const body = view.universe.current.get(id);
    const projected = body.position.clone().sub(view.camera.position).project(projection);
    assert.ok(Math.abs(projected.x) < 0.95 && Math.abs(projected.y) < 0.85 && projected.z < 1,
      `${state.direction} ${id}: both stars stay inside the establishing view (${projected.toArray()})`);
  }
}
console.log('PASS 71 destinations, reversed return, 140 legs, round-trip and odometer accounting');
for (const fromId of ['ceres', 'triton']) {
  const leg = departureSaves.find((saved) => saved.destinationId === fromId
    && saved.direction === 'outbound')?.odometer.leg;
  assert.ok(leg, `${fromId}: outbound Solar System leg exists`);
  assert.match(formatVoyageDistance(leg.distanceKm), / AU$/,
    `${fromId}: local leg distance stays in AU even if later cumulative history reaches LY`);
}
console.log('PASS Ceres and Pluto approach leg distances use AU');
console.log('PASS production binary system, nine resumable shots in both directions');

let stellarFlights = 0;
for (const saved of departureSaves) {
  const targetStop = REACH_ITINERARY.find((stop) => stop.id === saved.phase.nextId);
  if (targetStop?.profile !== 'star') continue;
  const parsed = parseReachJourney(JSON.stringify(saved), REACH_PRODUCTION_ROUTE,
    hasDestination(run.universe));
  assert.ok(parsed, `${targetStop.id}: production departure validates`);
  assert.equal(parsed.camera.flight, null, 'departure has no sampled cruise duration');
  const flightRun = makeRun(parsed, REACH_PRODUCTION_ROUTE, 'production');
  const cruise = until(flightRun, (state) => state.phase.kind === 'cruise');
  assert.equal(cruise.odometer.leg.fromId, saved.destinationId);
  assert.equal(cruise.odometer.leg.toId, targetStop.id);
  assert.ok(cruise.phase.duration >= 240 && cruise.phase.duration <= 900);
  assert.equal(cruise.frame.starId, destinationRef(targetStop).kind === 'star'
    ? destinationRef(targetStop).starId : ALPHA_SYSTEM_ID);
  const midway = until(flightRun, (state) => state.phase.kind === 'cruise'
    && state.phase.elapsed >= state.phase.duration / 2);
  const resumed = parseReachJourney(JSON.stringify(midway), REACH_PRODUCTION_ROUTE,
    hasDestination(flightRun.universe));
  assert.ok(resumed, `${targetStop.id}: normal-duration star cruise reloads`);
  const resumedRun = makeRun(resumed, REACH_PRODUCTION_ROUTE, 'production');
  assert.equal(resumedRun.director.countdown.secondsLeft, flightRun.director.countdown.secondsLeft);
  assert.ok(resumedRun.camera.position.distanceTo(flightRun.camera.position) < 1e-8);
  const arrival = until(resumedRun, (state) => state.destinationId === targetStop.id
    && (state.phase.kind === 'observe' || state.phase.kind === 'binary'));
  assert.equal(arrival.odometer.leg, null);
  if (targetStop.ref.kind === 'star') {
    const star = resumedRun.universe.current.star;
    const distanceRadii = resumedRun.camera.position.distanceTo(star.position) / star.radius;
    assert.ok(Math.abs(distanceRadii - targetStop.starPresentation.observationDistanceRadii) < 0.02,
      `${targetStop.id}: approved observation framing`);
    assert.ok(arrival.phase.duration >= 40 && arrival.phase.duration <= 100);
    if (targetStop.id === 'star:c64548') {
      const next = until(resumedRun, (state) => state.phase.kind === 'departure');
      assert.equal(next.phase.nextId, saved.direction === 'outbound'
        ? 'alpha-centauri-ab' : 'voyager1');
    }
  }
  stellarFlights++;
}
assert.equal(stellarFlights, 37, 'eighteen stellar targets outbound and inbound, with WOH G64 once');
console.log('PASS every production star approach in both directions, 240-900s cruise, reload and framing');

const terminal = makeRun();
const atTerminal = until(terminal, (state) => state.destinationId === 'star:l17'
  && state.phase.kind === 'observe');
assert.equal(atTerminal.direction, 'inbound');
assert.equal(atTerminal.odometer.roundTrips, 0);
assert.equal(atTerminal.odometer.leg, null);
const reloadedTerminal = parseReachJourney(JSON.stringify(atTerminal), REACH_PRODUCTION_ROUTE,
  hasDestination(terminal.universe));
assert.ok(reloadedTerminal);
assert.equal(until(makeRun(reloadedTerminal), (state) => state.phase.kind === 'departure')
  .phase.nextId, 'l-30dor');
const atEarth = run.director.capture();
const reloadedEarth = parseReachJourney(JSON.stringify(atEarth), REACH_PRODUCTION_ROUTE,
  hasDestination(run.universe));
assert.ok(reloadedEarth);
assert.equal(until(makeRun(reloadedEarth), (state) => state.phase.kind === 'departure')
  .phase.nextId, 'iss');
console.log('PASS atomic WOH G64 and Earth reversal survives reload');

const legacyRoute = { ...REACH_PRODUCTION_ROUTE, version: 3,
  stops: reachStopIdsForVersion(3).map((id) => REACH_ITINERARY.find((stop) => stop.id === id)) };
const legacy = makeRun(null, legacyRoute);
const oldReturn = until(legacy, (state) => state.destinationId === 'voyager1'
  && state.phase.kind === 'departure');
assert.equal(oldReturn.phase.nextId, 'earth');
const migrated = parseReachJourney(JSON.stringify(oldReturn), REACH_PRODUCTION_ROUTE,
  hasDestination(legacy.universe));
assert.ok(migrated);
assert.equal(migrated.transitionFromVersion, 3);
const oldCruise = until(makeRun(migrated), (state) => state.destinationId === 'earth'
  && state.phase.kind === 'cruise');
assert.equal(oldCruise.transitionFromVersion, 3);
const reloadedOldCruise = parseReachJourney(JSON.stringify(oldCruise), REACH_PRODUCTION_ROUTE,
  hasDestination(legacy.universe));
assert.ok(reloadedOldCruise);
const oldArrival = until(makeRun(reloadedOldCruise), (state) => state.destinationId === 'earth'
  && state.phase.kind === 'observe');
assert.equal(oldArrival.odometer.roundTrips, 0);
assert.equal(oldArrival.direction, 'outbound');
assert.equal(until(makeRun(oldArrival), (state) => state.phase.kind === 'departure').phase.nextId, 'iss');
console.log('PASS old Voyager 1 to Earth leg finishes without a false v4 round trip');

for (const version of [1, 2]) {
  const historical = { ...REACH_PRODUCTION_ROUTE, version,
    stops: reachStopIdsForVersion(version).map((id) => REACH_ITINERARY.find((stop) => stop.id === id)) };
  const fromId = version === 1 ? 'earth' : 'jwst';
  const toId = version === 1 ? 'moon' : 'mars';
  const oldRun = makeRun(null, historical);
  const departure = until(oldRun, (state) => state.destinationId === fromId
    && state.phase.kind === 'departure');
  assert.equal(departure.phase.nextId, toId);
  departure.odometer.completedKm = 123_456_789;
  departure.odometer.roundTrips = 3;
  const parsed = parseReachJourney(JSON.stringify(departure), REACH_PRODUCTION_ROUTE,
    hasDestination(oldRun.universe));
  assert.ok(parsed, `v${version} departure migrates against the actual 71-stop route`);
  assert.equal(parsed.transitionFromVersion, version);
  assert.deepEqual(parsed.odometer, departure.odometer);
  assert.equal(parsed.camera.flight, null);
  assert.equal(parsed.phase.duration, departure.phase.duration);
  const migratedRun = makeRun(parsed);
  const cruise = until(migratedRun, (state) => state.destinationId === toId
    && state.phase.kind === 'cruise');
  assert.equal(cruise.transitionFromVersion, version);
  const reloaded = parseReachJourney(JSON.stringify(cruise), REACH_PRODUCTION_ROUTE,
    hasDestination(migratedRun.universe));
  assert.ok(reloaded);
  const arrival = until(makeRun(reloaded), (state) => state.destinationId === toId
    && (state.phase.kind === 'flyby' || state.phase.kind === 'observe'));
  assert.equal(arrival.odometer.completedKm,
    departure.odometer.completedKm + departure.odometer.leg.distanceKm);
  assert.equal(arrival.odometer.roundTrips, 3);
  assert.equal(arrival.transitionFromVersion, undefined);
}
console.log('PASS v1/v2 nonadjacent legs, persisted transition markers, and history against 71 stops');

const oldV4Route = { ...REACH_PRODUCTION_ROUTE, version: 4,
  stops: V4_STOP_IDS.map((id) => REACH_ITINERARY.find((stop) => stop.id === id)) };
const oldObservedV4 = makeRun(null, oldV4Route);
const oldHubbleObserve = until(oldObservedV4, (state) => state.destinationId === 'hubble'
  && state.phase.kind === 'observe');
const migratedObserve = parseReachJourney(JSON.stringify(oldHubbleObserve), REACH_PRODUCTION_ROUTE,
  hasDestination(oldObservedV4.universe));
assert.ok(migratedObserve);
assert.equal(migratedObserve.cycleItineraryVersion, 4);
assert.deepEqual(migratedObserve.phase, oldHubbleObserve.phase);
assert.equal(until(makeRun(migratedObserve), (state) => state.phase.kind === 'departure')
  .phase.nextId, 'moon');
const oldProductionV4 = makeRun(null, oldV4Route, 'production');
const oldIssFlight = until(oldProductionV4, (state) => state.destinationId === 'iss'
  && state.phase.kind === 'cruise' && state.phase.elapsed >= 15);
// Model a checkpoint written before this timing change at the same flight fraction.
oldIssFlight.phase.elapsed *= 6;
oldIssFlight.phase.duration = 600;
oldIssFlight.camera.flight.elapsed = oldIssFlight.phase.elapsed;
oldIssFlight.camera.flight.duration = 600;
const migratedIssFlight = parseReachJourney(JSON.stringify(oldIssFlight), REACH_PRODUCTION_ROUTE,
  hasDestination(oldProductionV4.universe));
assert.ok(migratedIssFlight);
assert.equal(migratedIssFlight.phase.duration, 600, 'old sampled duration survives new timing class');
assert.equal(makeRun(migratedIssFlight, REACH_PRODUCTION_ROUTE, 'production').director.capture()
  .phase.duration, 600);
const oldV4 = makeRun(null, oldV4Route);
const oldDeparture = until(oldV4, (state) => state.destinationId === 'hubble'
  && state.phase.kind === 'departure' && state.phase.elapsed >= 3);
assert.equal(oldDeparture.phase.nextId, 'moon');
oldDeparture.odometer.completedKm = 123_456_789;
oldDeparture.odometer.roundTrips = 2;
const migratedDeparture = parseReachJourney(JSON.stringify(oldDeparture), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV4.universe));
assert.ok(migratedDeparture);
assert.equal(migratedDeparture.itinerary.version, 7);
assert.equal(migratedDeparture.routeIndex, ids.indexOf('hubble'));
assert.equal(migratedDeparture.cycleItineraryVersion, 4);
assert.equal(migratedDeparture.transitionFromVersion, 4);
assert.deepEqual(migratedDeparture.phase, oldDeparture.phase);
assert.deepEqual(migratedDeparture.odometer, oldDeparture.odometer);
assert.deepEqual(migratedDeparture.camera, oldDeparture.camera);
const invalidOldIndex = { ...oldDeparture, routeIndex: V4_STOP_IDS.indexOf('moon') };
assert.equal(parseReachJourney(JSON.stringify(invalidOldIndex), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV4.universe)), null, 'old route index must match its stable destination ID');
const migratedV4 = makeRun(migratedDeparture);
const oldMoonCruise = until(migratedV4, (state) => state.destinationId === 'moon'
  && state.phase.kind === 'cruise' && state.phase.elapsed >= 15);
assert.equal(oldMoonCruise.transitionFromVersion, 4);
assert.equal(oldMoonCruise.phase.duration, oldMoonCruise.camera.flight.duration);
const midFlight = parseReachJourney(JSON.stringify(oldMoonCruise), REACH_PRODUCTION_ROUTE,
  hasDestination(migratedV4.universe));
assert.ok(midFlight);
assert.deepEqual(midFlight.odometer, oldMoonCruise.odometer);
assert.deepEqual(midFlight.camera, oldMoonCruise.camera);
const resumedMoon = makeRun(midFlight);
assert.ok(resumedMoon.camera.position.distanceTo(migratedV4.camera.position) < 1e-8);
assert.ok(resumedMoon.camera.quaternion.angleTo(migratedV4.camera.quaternion) < 1e-6);
assert.equal(resumedMoon.director.capture().phase.duration, oldMoonCruise.phase.duration);
assert.equal(resumedMoon.director.capture().camera.rollQuarterTurns,
  oldMoonCruise.camera.rollQuarterTurns);
assert.equal(resumedMoon.director.capture().camera.flight.rollDelta,
  oldMoonCruise.camera.flight.rollDelta);
const moonArrival = until(resumedMoon, (state) => state.destinationId === 'moon'
  && state.phase.kind === 'flyby');
assert.equal(moonArrival.odometer.completedKm,
  oldMoonCruise.odometer.completedKm + oldMoonCruise.odometer.leg.distanceKm);
assert.equal(moonArrival.odometer.roundTrips, 2);
const continuedDeparture = until(resumedMoon, (state) => state.phase.kind === 'departure');
assert.equal(continuedDeparture.phase.nextId, 'jwst');
assert.ok(parseReachJourney(JSON.stringify(continuedDeparture), REACH_PRODUCTION_ROUTE,
  hasDestination(resumedMoon.universe)), 'continued old outbound departure remains resumable');
const continuedCruise = until(resumedMoon, (state) => state.phase.kind === 'cruise');
assert.ok(parseReachJourney(JSON.stringify(continuedCruise), REACH_PRODUCTION_ROUTE,
  hasDestination(resumedMoon.universe)), 'continued old outbound cruise remains resumable');
console.log('PASS old v4 outbound leg keeps endpoint, duration, odometer, and roll across migration');

const oldReturnV4 = makeRun(null, oldV4Route);
const oldInbound = until(oldReturnV4, (state) => state.direction === 'inbound'
  && state.destinationId === 'moon' && state.phase.kind === 'departure');
assert.equal(oldInbound.phase.nextId, 'hubble');
const migratedInbound = parseReachJourney(JSON.stringify(oldInbound), REACH_PRODUCTION_ROUTE,
  hasDestination(oldReturnV4.universe));
assert.ok(migratedInbound);
assert.equal(migratedInbound.cycleItineraryVersion, 4);
assert.equal(migratedInbound.transitionFromVersion, 4);
const inboundV4 = makeRun(migratedInbound);
const inboundFlight = until(inboundV4, (state) => state.destinationId === 'hubble'
  && state.phase.kind === 'cruise' && state.phase.elapsed >= 10);
assert.equal(inboundFlight.transitionFromVersion, 4);
const reloadedInbound = parseReachJourney(JSON.stringify(inboundFlight), REACH_PRODUCTION_ROUTE,
  hasDestination(inboundV4.universe));
assert.ok(reloadedInbound);
assert.deepEqual(reloadedInbound.odometer, inboundFlight.odometer);
assert.deepEqual(reloadedInbound.camera, inboundFlight.camera);
const inboundWithoutOdometer = structuredClone(inboundFlight);
delete inboundWithoutOdometer.odometer;
const parsedWithoutOdometer = parseReachJourney(JSON.stringify(inboundWithoutOdometer),
  REACH_PRODUCTION_ROUTE, hasDestination(inboundV4.universe));
assert.ok(parsedWithoutOdometer);
assert.equal(makeRun(parsedWithoutOdometer).director.capture().odometer.leg.fromId, 'moon');
const resumedInbound = makeRun(reloadedInbound);
assert.ok(resumedInbound.camera.position.distanceTo(inboundV4.camera.position) < 1e-8);
assert.ok(resumedInbound.camera.quaternion.angleTo(inboundV4.camera.quaternion) < 1e-6);
const returnVisits = [];
let returnPrevious = null;
for (let i = 0; i < 10_000; i++) {
  step(resumedInbound);
  const state = resumedInbound.director.capture();
  if (state.phase.kind === 'observe' && state.destinationId !== returnPrevious) {
    returnVisits.push(state.destinationId);
    returnPrevious = state.destinationId;
  }
  if (state.destinationId === 'earth' && state.phase.kind === 'observe'
    && state.direction === 'outbound') break;
}
assert.deepEqual(returnVisits.slice(0, 3), ['hubble', 'iss', 'earth']);
const returnedV4 = resumedInbound.director.capture();
assert.equal(returnedV4.destinationId, 'earth');
assert.equal(returnedV4.odometer.roundTrips, 1);
assert.equal(returnedV4.cycleItineraryVersion, 7);
assert.equal(until(resumedInbound, (state) => state.phase.kind === 'departure').phase.nextId, 'iss');
console.log('PASS old v4 inbound order finishes, counts trip, then adopts new route');

const oldV5Route = { ...REACH_PRODUCTION_ROUTE, version: 5,
  stops: V5_STOP_IDS.map((id) => REACH_ITINERARY.find((stop) => stop.id === id)) };
const oldV5Outbound = makeRun(null, oldV5Route);
const oldVegaFlight = until(oldV5Outbound, (state) => state.destinationId === 'star:c83130'
  && state.direction === 'outbound' && state.phase.kind === 'cruise');
const migratedVegaFlight = parseReachJourney(JSON.stringify(oldVegaFlight), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV5Outbound.universe));
assert.ok(migratedVegaFlight);
assert.equal(migratedVegaFlight.transitionFromVersion, 5);
const continuedVega = makeRun(migratedVegaFlight);
const v7Vega = until(continuedVega, (state) => state.destinationId === 'star:c83130'
  && state.phase.kind === 'observe');
assert.equal(v7Vega.direction, 'outbound');
assert.equal(until(continuedVega, (state) => state.phase.kind === 'departure').phase.nextId,
  'star:c19796');
assert.equal(continuedVega.director.capture().cycleItineraryVersion, 7);
const oldV5 = makeRun(null, oldV5Route);
const oldVega = until(oldV5, (state) => state.destinationId === 'star:c83130'
  && state.phase.kind === 'observe');
assert.equal(oldVega.direction, 'inbound');
oldVega.odometer.completedKm = 123_456_789;
const migratedV5 = parseReachJourney(JSON.stringify(oldVega), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV5.universe));
assert.ok(migratedV5);
assert.equal(migratedV5.itinerary.version, 7);
assert.equal(migratedV5.cycleItineraryVersion, 5);
assert.equal(migratedV5.odometer.completedKm, oldVega.odometer.completedKm);
assert.equal(until(makeRun(migratedV5), (state) => state.phase.kind === 'departure')
  .phase.nextId, 'star:c7458');
const oldV5Inbound = until(oldV5, (state) => state.destinationId === 'star:c80155'
  && state.direction === 'inbound' && state.phase.kind === 'cruise');
const migratedV5Flight = parseReachJourney(JSON.stringify(oldV5Inbound), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV5.universe));
assert.ok(migratedV5Flight);
assert.equal(migratedV5Flight.transitionFromVersion, 5);
const v5ReturnVisits = [];
const resumedV5 = makeRun(migratedV5Flight, REACH_PRODUCTION_ROUTE, 'test', (state) => {
  if (state.phase.kind === 'observe' || state.phase.kind === 'flyby'
    || state.phase.kind === 'binary' && state.phase.shot === 'establish')
    v5ReturnVisits.push(state.destinationId);
});
const v5Earth = until(resumedV5, (state) => state.destinationId === 'earth'
  && state.phase.kind === 'observe' && state.odometer.roundTrips === 1);
assert.equal(v5Earth.cycleItineraryVersion, 7);
assert.equal(until(resumedV5, (state) => state.phase.kind === 'departure').phase.nextId, 'iss');
assert.ok(v5ReturnVisits.every((id) => V5_STOP_IDS.includes(id)),
  'a pinned v5 return skips added destinations');
console.log('PASS v5 outbound extension, inbound migration, odometer, and v7 adoption at Earth');

const oldV6Route = { ...REACH_PRODUCTION_ROUTE, version: 6,
  stops: V6_STOP_IDS.map((id) => REACH_ITINERARY.find((stop) => stop.id === id)) };
const oldV6 = makeRun(null, oldV6Route);
const oldVegaDeparture = until(oldV6, (state) => state.destinationId === 'star:c83130'
  && state.direction === 'outbound' && state.phase.kind === 'departure');
assert.equal(oldVegaDeparture.phase.nextId, 'star:c10818');
oldVegaDeparture.odometer.completedKm += 123_456_789;
oldVegaDeparture.odometer.roundTrips = 3;
const migratedV6Departure = parseReachJourney(JSON.stringify(oldVegaDeparture), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV6.universe));
assert.ok(migratedV6Departure);
assert.equal(migratedV6Departure.itinerary.version, 7);
assert.equal(migratedV6Departure.cycleItineraryVersion, 6);
assert.equal(migratedV6Departure.transitionFromVersion, 6);
assert.deepEqual(migratedV6Departure.odometer, oldVegaDeparture.odometer);
const continuedV6 = makeRun(migratedV6Departure);
const v6PolarisCruise = until(continuedV6, (state) => state.destinationId === 'star:c10818'
  && state.phase.kind === 'cruise');
assert.equal(v6PolarisCruise.transitionFromVersion, 6);
const reloadedV6Cruise = parseReachJourney(JSON.stringify(v6PolarisCruise), REACH_PRODUCTION_ROUTE,
  hasDestination(continuedV6.universe));
assert.ok(reloadedV6Cruise);
assert.deepEqual(reloadedV6Cruise.odometer, v6PolarisCruise.odometer);
const resumedV6 = makeRun(reloadedV6Cruise);
const v6Polaris = until(resumedV6, (state) => state.destinationId === 'star:c10818'
  && state.phase.kind === 'observe');
assert.equal(v6Polaris.cycleItineraryVersion, 6);
assert.equal(until(resumedV6, (state) => state.phase.kind === 'departure').phase.nextId,
  'star:c25822', 'pinned v6 outbound cycle skips Pleiades');
const v6Turn = until(resumedV6, (state) => state.destinationId === 'star:l17'
  && state.direction === 'inbound' && state.phase.kind === 'observe');
assert.equal(v6Turn.cycleItineraryVersion, 6);
assert.equal(until(resumedV6, (state) => state.phase.kind === 'departure').phase.nextId,
  'star:l15', 'pinned v6 turnaround skips Tarantula');
const oldV6Inbound = until(oldV6, (state) => state.destinationId === 'star:l17'
  && state.direction === 'inbound' && state.phase.kind === 'observe');
const migratedV6Inbound = parseReachJourney(JSON.stringify(oldV6Inbound), REACH_PRODUCTION_ROUTE,
  hasDestination(oldV6.universe));
assert.ok(migratedV6Inbound);
assert.equal(migratedV6Inbound.cycleItineraryVersion, 6);
assert.deepEqual(migratedV6Inbound.odometer, oldV6Inbound.odometer);
const resumedV6Inbound = makeRun(migratedV6Inbound);
const completedV6 = until(resumedV6Inbound, (state) => state.destinationId === 'earth'
  && state.direction === 'outbound' && state.phase.kind === 'observe'
  && state.odometer.roundTrips === 1);
assert.equal(completedV6.cycleItineraryVersion, 7);
assert.equal(until(resumedV6Inbound, (state) => state.destinationId === 'star:c83130'
  && state.direction === 'outbound' && state.phase.kind === 'departure').phase.nextId,
  'star:c19796', 'v7 begins after the completed v6 return');
console.log('PASS v6 departure, cruise, outbound, turnaround, inbound, odometer, and v7 adoption');

assert.ok(inboundSnapshot);
const futureStop = { id: 'future:additional', profile: 'star', label: 'Future stop',
  ref: { kind: 'star', starId: 'c64548' } };
const futureRoute = { ...REACH_PRODUCTION_ROUTE, version: 8,
  stops: [...REACH_ITINERARY.slice(0, 49), futureStop, ...REACH_ITINERARY.slice(49)] };
const futureSaved = parseReachJourney(JSON.stringify(inboundSnapshot), futureRoute,
  hasDestination(run.universe, futureRoute));
assert.ok(futureSaved);
assert.equal(futureSaved.cycleItineraryVersion, 7);
assert.equal(futureSaved.transitionFromVersion, 7);
const futureIntermediate = makeRun(futureSaved, futureRoute).director.capture();
const futureReloaded = parseReachJourney(JSON.stringify(futureIntermediate), futureRoute,
  hasDestination(run.universe, futureRoute));
assert.ok(futureReloaded);
assert.equal(futureReloaded.transitionFromVersion, 7);
const futureVisits = [];
const futureRun = makeRun(futureReloaded, futureRoute, 'test', (state) => {
  if (state.phase.kind === 'observe' || state.phase.kind === 'flyby'
    || state.phase.kind === 'binary' && state.phase.shot === 'establish')
    futureVisits.push(state.destinationId);
});
until(futureRun, (state) => state.destinationId === 'earth'
  && state.phase.kind === 'observe' && state.odometer.roundTrips === 1);
assert.equal(futureVisits[0], 'star:c80155', 'the active inbound leg keeps its saved target');
assert.ok(!futureVisits.includes(futureStop.id), 'expanded stop is skipped on pinned inbound cycle');
assert.equal(futureRun.director.capture().cycleItineraryVersion, 8);
assert.equal(until(futureRun, (state) => state.phase.kind === 'departure').phase.nextId, 'iss');
console.log('PASS inbound cycle remains on v7 after a simulated v8 expansion');

const previousChannel = globalThis.BroadcastChannel;
const previousWindow = globalThis.window;
class TestChannel {
  static channels = [];
  constructor(name) { this.name = name; TestChannel.channels.push(this); }
  postMessage(data) { for (const channel of TestChannel.channels)
    if (channel !== this && channel.name === this.name) channel.onmessage?.({ data }); }
  close() {}
}
globalThis.BroadcastChannel = TestChannel;
globalThis.window = { addEventListener() {} };
const display = (isPrimaryDisplay) => ({ isPrimaryDisplay, sessionId: 'a'.repeat(32) });
const leader = new ReachPanoramaSync(display(true));
const follower = new ReachPanoramaSync(display(false));
const secondFollower = new ReachPanoramaSync(display(false));
const alphaState = binaryBoundarySaves.find((state) => state.direction === 'inbound'
  && state.phase.shot === 'observe-b');
assert.ok(alphaState);
leader.publish({ jd: alphaState.simulation.jd, rate: alphaState.simulation.rate,
  paused: false, starId: alphaState.frame.starId, position: alphaState.camera.position,
  orientation: alphaState.camera.orientation, referenceId: alphaState.camera.referenceId,
  targetId: alphaState.camera.targetId, destinationId: alphaState.destinationId,
  phase: 'DEPART', secondsLeft: alphaState.phase.duration - alphaState.phase.elapsed,
  compositionShiftX: 0 });
assert.equal(follower.latest.starId, ALPHA_SYSTEM_ID);
assert.equal(follower.latest.destinationId, 'alpha-centauri-ab');
assert.deepEqual(follower.latest.position, alphaState.camera.position);
assert.deepEqual(follower.latest.orientation, alphaState.camera.orientation);
assert.equal(follower.latest.referenceId, alphaState.camera.referenceId);
for (const id of addedIds) {
  const state = photographicMidStates.get(`${id}:outbound`)
    ?? addedStates.get(`${id}:outbound:observe`);
  assert.ok(state);
  leader.publish({ jd: state.simulation.jd, rate: state.simulation.rate,
    paused: false, starId: state.frame.starId, position: state.camera.position,
    orientation: state.camera.orientation, referenceId: state.camera.referenceId,
    targetId: state.camera.targetId, destinationId: state.destinationId,
    phase: 'DEPART', secondsLeft: state.phase.duration - state.phase.elapsed,
    compositionShiftX: 0 });
  for (const view of [follower, secondFollower]) {
    assert.equal(view.latest.destinationId, id);
    assert.deepEqual(view.latest.position, state.camera.position);
    assert.deepEqual(view.latest.orientation, state.camera.orientation);
    assert.equal(view.latest.targetId, state.camera.targetId);
  }
}
follower.publish({ ...follower.latest, destinationId: 'earth' });
assert.equal(follower.latest.destinationId, addedIds[addedIds.length - 1]);
globalThis.BroadcastChannel = previousChannel;
globalThis.window = previousWindow;
console.log('PASS primary-only Alpha and seven new-stop panorama publication across three displays');

const raw = JSON.stringify(atEarth);
assert.equal(inspectReachJourneyStore({ read: () => raw, write() {} },
  REACH_PRODUCTION_ROUTE, hasDestination(run.universe)).canWrite, true);
assert.equal(inspectReachJourneyStore({ read: () => '{invalid', write() { throw Error('write'); } },
  REACH_PRODUCTION_ROUTE, hasDestination(run.universe)).canWrite, false);
assert.deepEqual(parseReachJourney(raw, REACH_PRODUCTION_ROUTE, hasDestination(run.universe)), atEarth);
const staleIndex = parseReachJourney(JSON.stringify({ ...atEarth, routeIndex: 999 }),
  REACH_PRODUCTION_ROUTE, hasDestination(run.universe));
assert.equal(staleIndex.routeIndex, 0, 'v4 navigation derives display index from destination ID');
console.log('PASS v4 reload idempotency and rejected-save protection');
if (process.argv.includes('--emit-fixtures')) {
  const directory = 'validation/reach-v4';
  mkdirSync(directory, { recursive: true });
  for (const [name, state] of inspectionFixtures) {
    writeFileSync(`${directory}/${name}.json`, `${JSON.stringify(state, null, 2)}\n`);
  }
  assert.equal(inspectionFixtures.size, 10);
  console.log('PASS ten development-only production-route inspection checkpoints written');
}
