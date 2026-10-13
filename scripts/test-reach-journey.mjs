import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import { Vector3 } from 'three';
import * as THREE from 'three';

// Bundle the production TypeScript in memory so this test needs no runner or new dependency.
const entry = `
  export { ReachVoyageDirector, REACH_ITINERARY, reachPreviewRoute } from './src/reach/ReachVoyageDirector.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { StarSystem } from './src/core/StarSystem.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { SOLAR_SYSTEM } from './src/data/solarSystem.ts';
  export { ReachTiming, REACH_TIMING, reachTravelKind } from './src/reach/ReachTiming.ts';
  export { COUNTDOWN_POSITIONS, ReachCountdownOverlay, formatCountdown, readCountdownContract, resolveCountdownPosition } from './src/reach/ReachCountdownOverlay.ts';
  export { ReachOdometerOverlay, formatVoyageDistance, geometricLegKm, readOdometerContract, resolveOdometerPosition } from './src/reach/ReachOdometer.ts';
  export { ReachPanoramaSync, applyPanoramaView, localPanoramaFovRad, parseReachPanorama, readReachPanorama } from './src/reach/ReachPanorama.ts';
  export { inspectReachJourneyStore, loadReachJourney, parseReachJourney, saveReachJourney } from './src/reach/JourneyState.ts';
`;
const bundle = await rolldown({
  input: '\0reach-journey-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-journey-test',
    resolveId(id) { if (id === '\0reach-journey-test') return id; },
    load(id) { if (id === '\0reach-journey-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String }, module, module.exports,
);
const {
  ReachVoyageDirector, REACH_ITINERARY, reachPreviewRoute, CameraController, StarSystem, TimeSystem, SOLAR_SYSTEM,
  ReachTiming, REACH_TIMING, reachTravelKind, inspectReachJourneyStore,
  loadReachJourney, parseReachJourney, saveReachJourney,
  COUNTDOWN_POSITIONS, ReachCountdownOverlay, formatCountdown, readCountdownContract, resolveCountdownPosition,
  ReachOdometerOverlay, formatVoyageDistance, geometricLegKm, readOdometerContract, resolveOdometerPosition,
  ReachPanoramaSync, applyPanoramaView, localPanoramaFovRad, parseReachPanorama, readReachPanorama,
} = module.exports;

// Keep the original Solar-only harness as a v3 migration fixture. The v4 production
// route uses real interstellar systems and has separate full-cycle coverage.
const route = REACH_ITINERARY.slice(0, 47);
const legacyProductionRoute = { id: 'solar-system-41', version: 3, stops: route, repeat: true };
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
const date = '2026-10-10T00:00:00Z';

function makeRun(saved = null, { mode = 'test', random = () => 0.5, onPhaseChange, selectedRoute } = {}) {
  const time = new TimeSystem(new Date(date));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const system = new StarSystem('sol', 'c0', 0, new Vector3(), SOLAR_SYSTEM, [], []);
  system.update(time.jd, time.t);
  const universe = {
    current: system,
    get: (id) => system.get(id),
    get star() { return system.star; },
    nearestBody: (position) => system.nearestBody(position),
  };
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time, new ReachTiming(mode, random), saved, onPhaseChange,
    selectedRoute ?? legacyProductionRoute);
  return { time, system, universe, camera, director };
}

function step(run) {
  const dt = 0.1;
  run.time.advance(dt);
  run.system.update(run.time.jd, run.time.t);
  if (run.director.directing) run.director.update(dt, false);
  else {
    run.camera.update(dt, input, 1920, 1080, Math.PI / 3);
    run.director.update(dt, false);
  }
}

function until(run, match, limit = 40_000) {
  for (let i = 0; i < limit; i++) {
    step(run);
    const state = run.director.capture();
    if (match(state)) return state;
  }
  throw new Error('Requested journey phase was not reached');
}

function compare(run, resumed, label) {
  assert.equal(resumed.time.jd, run.time.jd, `${label}: Julian date`);
  assert.equal(resumed.time.rate, run.time.rate, `${label}: time rate`);
  assert.ok(resumed.camera.position.distanceTo(run.camera.position) < 1e-8, `${label}: restored position`);
  assert.ok(1 - Math.abs(resumed.camera.quaternion.dot(run.camera.quaternion)) < 1e-12, `${label}: restored orientation`);
  assert.equal(resumed.camera.reference?.id, run.camera.reference?.id, `${label}: camera reference`);
  assert.equal(resumed.camera.target?.id, run.camera.target?.id, `${label}: camera target`);
  assert.equal(resumed.director.distanceTravelledKm, run.director.distanceTravelledKm, `${label}: odometer`);
  assert.equal(resumed.director.roundTrips, run.director.roundTrips, `${label}: round trips`);
  const phase = run.director.capture().phase;
  const steps = Math.ceil((phase.duration - phase.elapsed) / 0.1) + 20;
  for (let i = 0; i < steps; i++) {
    step(run);
    step(resumed);
    assert.ok(resumed.camera.position.distanceTo(run.camera.position) < 1e-4, `${label}: continuing position at step ${i}`);
    assert.ok(1 - Math.abs(resumed.camera.quaternion.dot(run.camera.quaternion)) < 1e-10, `${label}: continuing orientation at step ${i}`);
    const a = run.director.capture().phase;
    const b = resumed.director.capture().phase;
    assert.equal(b.kind, a.kind, `${label}: continuing phase`);
    assert.ok(Math.abs((b.duration - b.elapsed) - (a.duration - a.elapsed)) < 1e-8, `${label}: remaining time`);
    assert.ok(Math.abs(resumed.director.distanceTravelledKm - run.director.distanceTravelledKm) < 1e-3,
      `${label}: continuing odometer at step ${i}`);
  }
}

let changes = 0;
const fresh = makeRun(null, { onPhaseChange: () => changes++ });
assert.equal(fresh.director.capture().destinationId, 'earth');
assert.equal(fresh.director.capture().phase.kind, 'observe');
assert.equal(fresh.director.distanceTravelledKm, 0);
assert.equal(fresh.director.roundTrips, 0);
assert.equal(loadReachJourney({ read: () => null, write() {} }, route, (id) => !!fresh.universe.get(id)), null);
console.log('PASS fresh Earth opening without save data');

const cases = [
  ['planet observation', (s) => s.destinationId === 'mars' && s.phase.kind === 'observe' && s.phase.elapsed >= 5],
  ['departure', (s) => s.destinationId === 'earth' && s.phase.kind === 'departure' && s.phase.elapsed >= 5],
  ['interplanetary cruise', (s) => s.destinationId === 'mars' && s.phase.kind === 'cruise' && s.phase.elapsed >= s.phase.duration / 2],
  ['moving moon flyby', (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby' && s.phase.elapsed >= 5],
  ['Pioneer observation', (s) => s.destinationId === 'pioneer11' && s.phase.kind === 'observe' && s.phase.elapsed >= 5],
  ['Voyager observation', (s) => s.destinationId === 'voyager1' && s.phase.kind === 'observe' && s.phase.elapsed >= 5],
  ...['iss', 'hubble', 'jwst', 'juno', 'newhorizons', 'parker'].map((id) =>
    [`${id} observation`, (s) => s.destinationId === id && s.phase.kind === 'observe' && s.phase.elapsed >= 5]),
];
for (const [label, match] of cases) {
  const run = makeRun();
  const captured = until(run, match);
  let raw = null;
  const store = { read: () => raw, write: (json) => { raw = json; } };
  assert.equal(saveReachJourney(store, captured), true);
  const parsed = loadReachJourney(store, route, (id) => !!run.universe.get(id));
  assert.ok(parsed, `${label}: saved state validates`);
  assert.deepEqual(parsed.phase, captured.phase, `${label}: phase data survives JSON`);
  const resumed = makeRun(parsed);
  const countdown = run.director.countdown;
  const phase = captured.phase;
  assert.equal(countdown.phase, phase.kind === 'cruise' ? 'NEXT' : phase.kind === 'departure' ? 'CRUISE' : 'DEPART');
  assert.equal(countdown.destinationId, phase.kind === 'departure' ? phase.nextId : captured.destinationId);
  assert.ok(Math.abs(countdown.secondsLeft - (phase.duration - phase.elapsed)) < 1e-8);
  assert.equal(resumed.director.countdown.phase, countdown.phase);
  assert.equal(resumed.director.countdown.destinationId, countdown.destinationId);
  assert.equal(resumed.director.countdown.routeIndex, countdown.routeIndex);
  assert.ok(Math.abs(resumed.director.countdown.secondsLeft - countdown.secondsLeft) < 1e-8,
    `${label}: restored countdown`);
  compare(run, resumed, label);
  console.log(`PASS ${label} save, restore, remaining duration, and continuity through the next phase`);
}
until(fresh, (s) => s.phase.kind === 'departure');
assert.ok(changes > 0, 'phase changes must trigger checkpoint callback');

const valid = fresh.director.capture();
const hasBody = (id) => !!fresh.universe.get(id);
assert.equal(parseReachJourney('{bad json', route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, schema: 2 }), route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, itinerary: { ...valid.itinerary, version: 5 } }), route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, destinationId: 'removed' }), route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify(valid), route, (id) => id !== 'earth' && hasBody(id)), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, camera: { ...valid.camera, orientation: [0, 0, 0, 0] } }), route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, destinationId: 'moon',
  camera: { ...valid.camera, referenceId: 'moon', targetId: 'moon' },
  phase: { kind: 'observe', elapsed: 1, duration: 12 } }), route, hasBody), null);
assert.equal(parseReachJourney(JSON.stringify({ ...valid, routeIndex: 4 }), route, hasBody), null,
  'a v3 index mismatched with its destination is rejected');
assert.equal(inspectReachJourneyStore({ read: () => JSON.stringify(valid), write() {} },
  { id: valid.itinerary.id, version: 3, stops: route, repeat: true }, hasBody).canWrite, true);
assert.equal(inspectReachJourneyStore({ read: () => '{bad json', write() {} },
  { id: valid.itinerary.id, version: 3, stops: route, repeat: true }, hasBody).canWrite, false,
  'a rejected checkpoint must not be overwritten by fresh startup');
const unavailable = { read() { throw new Error('blocked'); }, write() { throw new Error('blocked'); } };
assert.equal(loadReachJourney(unavailable, route, hasBody), null);
assert.equal(saveReachJourney(unavailable, valid), false);
step(fresh);
console.log('PASS corrupt, incompatible, removed-body, invalid-quaternion, index, and checkpoint-preservation guards');

assert.equal(route.length, 47);
const originalIds = 'earth moon mars phobos deimos vesta ceres jupiter io europa ganymede callisto saturn mimas enceladus tethys dione rhea titan iapetus uranus miranda ariel umbriel titania oberon neptune triton pluto charon haumea makemake eris pioneer11 pioneer10 voyager2 voyager1 halley sun mercury venus'.split(' ');
assert.equal(originalIds.length, 41);
const approvedIds = 'earth iss hubble moon jwst sun parker mercury venus mars phobos deimos vesta ceres jupiter juno io europa ganymede callisto saturn mimas enceladus tethys dione rhea titan iapetus halley uranus miranda ariel umbriel titania oberon neptune triton pluto charon haumea makemake newhorizons eris pioneer11 pioneer10 voyager2 voyager1'.split(' ');
assert.deepEqual(route.map((stop) => stop.id), approvedIds, 'production route matches the approved order exactly');
assert.equal(new Set(approvedIds).size, 47, 'all destinations are unique');
const authority = readFileSync('Docs/Reports/Reach_Master_Destinations_Distance_Ordered_2026-10-11.md', 'utf8');
const authorityIds = [...authority.split('## 8. Approved 47-stop production itinerary')[1]
  .matchAll(/^\| \d+ \| [^|]+ \| `([^`]+)` \|$/gm)].map((match) => match[1]);
assert.deepEqual(route.map((stop) => stop.id), authorityIds, 'code matches the approved authority section');
assert.ok(!route.some((stop) => ['perseverance', 'curiosity'].includes(stop.id)),
  'surface rovers remain outside the production route until terrain-safe framing is proven');
for (const [id, parent, orbitKind] of [
  ['iss', 'earth', 'simple'], ['hubble', 'earth', 'simple'], ['jwst', 'earth', 'lagrange'],
  ['parker', 'sun', 'simple'], ['perseverance', 'mars', 'surface'],
  ['curiosity', 'mars', 'surface'], ['juno', 'jupiter', 'simple'], ['newhorizons', 'sun', 'linear'],
]) {
  const body = fresh.system.get(id);
  assert.ok(body, `${id}: catalogue resolves`);
  assert.equal(body.parent?.id, parent, `${id}: parent`);
  assert.equal(body.data.orbit?.kind, orbitKind, `${id}: position source`);
  assert.ok(body.position.toArray().every(Number.isFinite), `${id}: finite position`);
  assert.equal(body.data.appearance.kind, 'spacecraft', `${id}: appearance`);
  const model = body.data.appearance.model;
  assert.equal(readFileSync(`public${model}`).subarray(0, 4).toString(), 'glTF', `${id}: local GLB`);
}
for (const [before, added] of [
  ['earth', 'iss'], ['iss', 'hubble'], ['moon', 'jwst'], ['jupiter', 'juno'],
  ['makemake', 'newhorizons'], ['sun', 'parker'],
]) assert.equal(route[route.findIndex((stop) => stop.id === before) + 1].id, added);
assert.equal(reachTravelKind(route.find((stop) => stop.id === 'moon')), 'moon');
assert.equal(reachTravelKind(route.find((stop) => stop.id === 'mars')), 'planet');
assert.equal(reachTravelKind(route.find((stop) => stop.id === 'neptune')), 'distant');
assert.equal(reachTravelKind(route.find((stop) => stop.id === 'voyager1')), 'probe');
for (const stop of route) {
  for (const value of [0, 0.37, 1, Number.NaN]) {
    const production = new ReachTiming('production', () => value);
    const travel = production.travel(stop);
    const observe = production.observe(stop);
    const [travelMin, travelMax] = REACH_TIMING.production.travel[reachTravelKind(stop)];
    const [observeMin, observeMax] = REACH_TIMING.production.observe[stop.profile];
    assert.ok(Number.isFinite(travel) && travel > 0 && travel >= travelMin && travel <= travelMax);
    assert.ok(Number.isFinite(observe) && observe > 0 && observe >= observeMin && observe <= observeMax);
    const test = new ReachTiming('test', () => value);
    assert.equal(test.travel(stop), 30);
    assert.equal(test.observe(stop), 8);
    assert.equal(test.departure(stop), stop.profile === 'moon' ? 7 : 10);
  }
}
console.log('PASS production bounds, test durations, and non-finite random input for all 47 stops');
console.log('PASS eight spacecraft resolve to catalogue positions, parents, appearances, and local GLBs');

const circuit = makeRun();
const visited = new Set(['earth']);
const travelled = new Set();
const addedProbeIds = new Set(['iss', 'hubble', 'jwst', 'juno', 'newhorizons', 'parker']);
let voyagerWrap = false;
for (let i = 0; i < 30_000 && (visited.size < route.length || travelled.size < route.length); i++) {
  step(circuit);
  const state = circuit.director.capture();
  if (state.destinationId === 'voyager1' && state.phase.kind === 'departure') {
    assert.equal(circuit.director.countdown.destinationId, 'earth');
    assert.equal(circuit.director.countdown.routeIndex, 0);
    voyagerWrap = true;
  }
  if (state.phase.kind === 'cruise') {
    assert.equal(state.phase.duration, 30);
    travelled.add(state.destinationId);
    if (addedProbeIds.has(state.destinationId)) {
      const parent = circuit.system.get(state.destinationId).parent;
      assert.ok(circuit.camera.position.distanceTo(parent.position) > parent.radius,
        `${state.destinationId}: cruise camera remains outside parent`);
    }
  }
  if (state.phase.kind === 'observe' || state.phase.kind === 'flyby') {
    assert.equal(state.phase.duration, 8);
    visited.add(state.destinationId);
    if (addedProbeIds.has(state.destinationId)) {
      const body = circuit.system.get(state.destinationId);
      const distance = circuit.camera.position.distanceTo(body.position);
      assert.ok(distance >= body.radius * 4 && distance <= body.radius * 5,
        `${state.destinationId}: close model framing`);
      assert.ok(circuit.camera.position.distanceTo(body.parent.position) > body.parent.radius,
        `${state.destinationId}: observation camera remains outside parent`);
    }
  }
}
assert.equal(visited.size, route.length);
assert.equal(travelled.size, route.length);
assert.ok(voyagerWrap, 'Voyager 1 departure labels the next Earth destination');
assert.ok(circuit.director.distanceTravelledKm > 0);
assert.equal(circuit.director.roundTrips, 0, 'the expanded loop is not a round-trip');
const beforeLoopReturn = circuit.director.distanceTravelledKm;
const loopReturn = until(circuit, (s) => s.destinationId === 'earth' && s.phase.kind === 'observe');
assert.ok(loopReturn.odometer.completedKm >= beforeLoopReturn, 'ordinary loop does not reset distance');
assert.equal(loopReturn.odometer.roundTrips, 0, 'returning to Earth in the current loop is not a round-trip');
console.log('PASS all 47 test-mode arrivals and travel legs');

const earth = circuit.system.get('earth');
const moon = circuit.system.get('moon');
const origin = circuit.system.origin;
assert.ok(Math.abs(geometricLegKm(origin, earth.position, moon.position)
  - earth.position.distanceTo(moon.position)) < 1e-6);
assert.equal(geometricLegKm(new Vector3(100, -20, 30), new Vector3(0, 0, 0), new Vector3(3, 4, 12)), 13);
assert.equal(formatVoyageDistance(42.681 * 149_597_870.7), '42.681 AU');
assert.equal(formatVoyageDistance(9.4607e12), '1 ly');
assert.equal(formatVoyageDistance(9.4607e18), '1 Mly');
assert.match(formatVoyageDistance(9.4607e12 * 0.009), /AU$/);
assert.match(formatVoyageDistance(9.4607e18 * 0.009), /ly$/);
assert.match(formatVoyageDistance(0.00001 * 149_597_870.7), /km$/);
assert.equal(formatVoyageDistance(1), '1 km');
console.log('PASS geometric Solar System separation and adaptive km/AU/ly/Mly display');

const measured = makeRun();
const inFlight = until(measured, (s) => s.destinationId === 'moon'
  && s.phase.kind === 'cruise' && s.phase.elapsed >= s.phase.duration / 2);
const legKm = inFlight.odometer.leg.distanceKm;
assert.ok(legKm > 0);
assert.ok(Math.abs(measured.director.distanceTravelledKm
  - (inFlight.odometer.completedKm + legKm * inFlight.phase.elapsed / inFlight.phase.duration)) < 1e-3);
const beforePause = measured.director.distanceTravelledKm;
measured.director.update(5, true);
assert.equal(measured.director.distanceTravelledKm, beforePause);
const restoredFlight = makeRun(loadReachJourney({ read: () => JSON.stringify(inFlight), write() {} }, route, hasBody));
assert.equal(restoredFlight.director.distanceTravelledKm, beforePause);
const arrived = until(restoredFlight, (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby');
assert.equal(arrived.odometer.leg, null);
assert.ok(Math.abs(arrived.odometer.completedKm - (inFlight.odometer.completedKm + legKm)) < 1e-3);
for (let i = 0; i < 20; i++) step(restoredFlight);
assert.equal(restoredFlight.director.capture().odometer.completedKm, arrived.odometer.completedKm,
  'arrival commits its leg only once');
const restoredArrival = makeRun(loadReachJourney({ read: () => JSON.stringify(arrived), write() {} }, route, hasBody));
assert.equal(restoredArrival.director.distanceTravelledKm, arrived.odometer.completedKm);
assert.equal(restoredArrival.director.roundTrips, 0);
const futureCompleted = structuredClone(arrived);
futureCompleted.odometer.roundTrips = 2;
const restoredFutureCount = makeRun(loadReachJourney({ read: () => JSON.stringify(futureCompleted), write() {} }, route, hasBody));
assert.equal(restoredFutureCount.director.capture().odometer.roundTrips, 2,
  'a future authoritative completion count survives a restart');
assert.equal(parseReachJourney(JSON.stringify({ ...inFlight, odometer: {
  ...inFlight.odometer, leg: { ...inFlight.odometer.leg, toId: 'mars' },
} }), route, hasBody), null, 'mismatched leg cannot be restored');
console.log('PASS mid-flight progress, pause, restart, exactly-once arrival, and leg validation');

assert.equal(COUNTDOWN_POSITIONS.length, 6);
for (let index = 0; index < route.length; index++) {
  assert.equal(resolveCountdownPosition('auto', index), COUNTDOWN_POSITIONS[index % 6]);
  for (const fixed of COUNTDOWN_POSITIONS) assert.equal(resolveCountdownPosition(fixed, index), fixed);
  for (const setting of ['auto', ...COUNTDOWN_POSITIONS]) {
    const countdown = resolveCountdownPosition(setting, index);
    const odometer = resolveOdometerPosition(setting, index);
    assert.ok(COUNTDOWN_POSITIONS.includes(odometer));
    assert.notEqual(odometer, countdown);
    assert.notEqual(odometer.startsWith('top'), countdown.startsWith('top'));
    assert.notEqual(odometer, resolveOdometerPosition(setting, index + 1));
  }
}
assert.equal(resolveCountdownPosition('auto', 0), COUNTDOWN_POSITIONS[0], 'wrapped Earth returns to first anchor');
assert.equal(formatCountdown(221.1), '03:42');
assert.equal(formatCountdown(3600), '01:00:00');
for (const bad of [-10, Number.NaN, Infinity]) assert.equal(formatCountdown(bad), '00:00');
const pausedRun = makeRun();
const pausedCountdown = pausedRun.director.countdown;
pausedRun.director.update(5, true);
assert.deepEqual(pausedRun.director.countdown, pausedCountdown, 'pause retains the phase countdown');
const previousWindow = globalThis.window;
globalThis.window = {};
assert.deepEqual(readCountdownContract(true), { enabled: true, primaryDisplay: true, position: 'auto' },
  'primary voyage displays the destination countdown without host injection');
assert.deepEqual(readOdometerContract(true), { position: 'auto' },
  'primary voyage displays the odometer without host injection');
globalThis.window.__reachCountdown = null;
assert.equal(readCountdownContract(true), null, 'invalid explicit host configuration does not enable countdown');
assert.equal(readOdometerContract(true), null, 'invalid explicit host configuration does not enable odometer');
globalThis.window = { __reachCountdown: { enabled: true, primaryDisplay: true, position: 'auto' } };
assert.ok(readCountdownContract());
globalThis.window.__reachCountdown.primaryDisplay = false;
assert.equal(readCountdownContract(), null);
globalThis.window.__reachCountdown.primaryDisplay = true;
globalThis.window.__reachCountdown.enabled = false;
assert.equal(readCountdownContract(), null);
assert.equal(readCountdownContract(true), null, 'explicit host disable overrides the default');
assert.ok(readOdometerContract(), 'odometer remains visible if countdown is disabled');
globalThis.window.__reachCountdown.primaryDisplay = false;
assert.equal(readOdometerContract(), null, 'secondary monitors have no odometer');
globalThis.window = previousWindow;

let writes = 0;
const element = { dataset: {}, setAttribute() {}, get textContent() { return this._text ?? ''; },
  set textContent(value) { writes++; this._text = value; } };
const previousDocument = globalThis.document;
globalThis.document = { createElement: () => element, body: { appendChild() {} } };
const overlay = new ReachCountdownOverlay(circuit.director, 'auto');
overlay.update(0);
const firstPosition = element.dataset.position;
overlay.update(500);
assert.equal(writes, 1, 'no DOM writes between one-second updates');
assert.equal(element.dataset.position, firstPosition);
overlay.update(1000);
assert.equal(writes, 1, 'no DOM write when visible text is unchanged');
const odometerElement = { dataset: {}, setAttribute() {}, textContent: '' };
globalThis.document = { createElement: () => odometerElement, body: { appendChild() {} } };
const odometerOverlay = new ReachOdometerOverlay(circuit.director, 'auto');
odometerOverlay.update(0);
assert.match(odometerElement.textContent, /^Distance Travelled: .*$/);
assert.doesNotMatch(odometerElement.textContent, /Round-Trips/);
assert.notEqual(odometerElement.dataset.position, resolveCountdownPosition('auto', circuit.director.countdown.routeIndex));
globalThis.document = previousDocument;
console.log('PASS six anchors, auto rotation, display gating, formatting, and DOM update throttle');

const sessionId = 'a'.repeat(32);
const previousPanoramaWindow = globalThis.window;
globalThis.window = { location: { search: '?reach=1&panorama=1' } };
assert.throws(() => readReachPanorama(), /not injected/, 'multi-monitor launch must not become independent full-screen voyages');
globalThis.window.location.search = '?reach=1';
assert.equal(readReachPanorama(), null, 'single-monitor mode does not require a panorama contract');
globalThis.window = previousPanoramaWindow;
function panoramaView(monitor, desktop, isPrimaryDisplay) {
  return parseReachPanorama({
    schema: 1, sessionId, isPrimaryDisplay,
    monitorBounds: monitor, virtualDesktopBounds: desktop,
    viewportOffsetX: monitor.x - desktop.x, viewportOffsetY: monitor.y - desktop.y,
    viewportWidth: monitor.width, viewportHeight: monitor.height,
    totalPanoramaWidth: desktop.width, totalPanoramaHeight: desktop.height, devicePixelRatio: 1.5,
  });
}
function projectAt(view, desktopX, desktopY, fov = 50) {
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  applyPanoramaView(camera, view);
  const tangent = Math.tan(fov * Math.PI / 360);
  const x = (2 * desktopX / view.totalPanoramaWidth - 1) * tangent * view.totalPanoramaWidth / view.totalPanoramaHeight;
  const y = (1 - 2 * desktopY / view.totalPanoramaHeight) * tangent;
  const projected = new Vector3(x, y, -1).project(camera);
  return [(projected.x + 1) * view.viewportWidth / 2,
    (1 - projected.y) * view.viewportHeight / 2];
}
const desktop = { x: -3840, y: -720, width: 8320, height: 2160 };
const twoDesktop = { x: -2560, y: 0, width: 4480, height: 1440 };
const twoLeft = panoramaView({ x: -2560, y: 0, width: 2560, height: 1440 }, twoDesktop, false);
const twoRight = panoramaView({ x: 0, y: 0, width: 1920, height: 1080 }, twoDesktop, true);
assert.ok(Math.abs(projectAt(twoLeft, 2560, 500)[0] - 2560) < 1e-6);
assert.ok(Math.abs(projectAt(twoRight, 2560, 500)[0]) < 1e-6);
const left = panoramaView({ x: -3840, y: -720, width: 2560, height: 1440 }, desktop, false);
const primary = panoramaView({ x: 0, y: 0, width: 2560, height: 1440 }, desktop, true);
const right = panoramaView({ x: 2560, y: 360, width: 1920, height: 1080 }, desktop, false);
for (const view of [left, primary, right]) {
  const x = view.viewportOffsetX + view.viewportWidth / 2;
  const y = view.viewportOffsetY + view.viewportHeight / 2;
  const projected = projectAt(view, x, y);
  assert.ok(Math.abs(projected[0] - view.viewportWidth / 2) < 1e-6);
  assert.ok(Math.abs(projected[1] - view.viewportHeight / 2) < 1e-6);
}
const resizedCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
applyPanoramaView(resizedCamera, right);
const projectionBeforeResize = resizedCamera.projectionMatrix.clone();
resizedCamera.aspect = right.viewportWidth / right.viewportHeight;
applyPanoramaView(resizedCamera, right);
assert.deepEqual(resizedCamera.projectionMatrix.elements, projectionBeforeResize.elements,
  'resize must preserve the panorama projection');
resizedCamera.fov = 65;
resizedCamera.updateProjectionMatrix();
assert.equal(resizedCamera.view.offsetX, right.viewportOffsetX, 'FOV changes must preserve the view offset');
const seamPrimary = projectAt(primary, right.viewportOffsetX, right.viewportOffsetY + 440);
const seamRight = projectAt(right, right.viewportOffsetX, right.viewportOffsetY + 440);
assert.ok(Math.abs(seamPrimary[0] - primary.viewportWidth) < 1e-6);
assert.ok(Math.abs(seamRight[0]) < 1e-6);
assert.ok(Math.abs(seamPrimary[1] - 800) < 1e-6);
assert.ok(Math.abs(seamRight[1] - 440) < 1e-6);
const stackedDesktop = { x: -100, y: -1080, width: 2560, height: 2520 };
const above = panoramaView({ x: -100, y: -1080, width: 1920, height: 1080 }, stackedDesktop, false);
const below = panoramaView({ x: -100, y: 0, width: 2560, height: 1440 }, stackedDesktop, true);
assert.ok(Math.abs(projectAt(above, 900, 1080)[1] - 1080) < 1e-6);
assert.ok(Math.abs(projectAt(below, 900, 1080)[1]) < 1e-6);
const fourDesktop = { x: -1920, y: -1080, width: 5760, height: 2520 };
const fourMonitors = [
  { x: -1920, y: 200, width: 1920, height: 1080 },
  { x: 0, y: 0, width: 2560, height: 1440 },
  { x: 0, y: -1080, width: 1920, height: 1080 },
  { x: 2560, y: 300, width: 1280, height: 1024 },
].map((monitor, index) => panoramaView(monitor, fourDesktop, index === 1));
for (const view of fourMonitors) {
  const x = view.viewportOffsetX + view.viewportWidth / 2;
  const y = view.viewportOffsetY + view.viewportHeight / 2;
  assert.deepEqual(projectAt(view, x, y).map(Math.round),
    [view.viewportWidth / 2, view.viewportHeight / 2].map(Math.round));
}
assert.ok(localPanoramaFovRad(50, right) < localPanoramaFovRad(50, primary));
assert.throws(() => panoramaView({ x: -4000, y: 0, width: 200, height: 100 }, desktop, false));

const previousBroadcastChannel = globalThis.BroadcastChannel;
const previousSyncWindow = globalThis.window;
class TestChannel {
  static channels = [];
  constructor(name) { this.name = name; TestChannel.channels.push(this); }
  postMessage(data) { for (const channel of TestChannel.channels) if (channel !== this && channel.name === this.name)
    channel.onmessage?.({ data }); }
  close() {}
}
globalThis.BroadcastChannel = TestChannel;
globalThis.window = { addEventListener() {} };
const leader = new ReachPanoramaSync(primary);
const follower = new ReachPanoramaSync(right);
assert.equal(follower.latest, null);
const sharedFrame = { jd: 2460000, rate: 1, paused: false, starId: 'c0', position: [1, 2, 3],
  orientation: [0, Math.sin(Math.PI / 36), 0, Math.cos(Math.PI / 36)], referenceId: 'earth', targetId: 'earth',
  destinationId: 'earth', phase: 'DEPART', secondsLeft: 8 };
leader.publish(sharedFrame);
assert.equal(follower.latest?.sequence, 0);
assert.deepEqual(follower.latest?.position, [1, 2, 3]);
assert.deepEqual(follower.latest?.orientation, sharedFrame.orientation, 'follower receives the changing camera orientation');
leader.publish({ ...sharedFrame, starId: 'c64548', referenceId: 's64548-star', targetId: 's64548-star' });
assert.equal(follower.latest?.starId, 'c64548', 'followers receive the primary system frame');
follower.publish({ ...sharedFrame, destinationId: 'mars' });
assert.equal(follower.latest?.destinationId, 'earth', 'follower cannot publish another journey');
globalThis.BroadcastChannel = previousBroadcastChannel;
globalThis.window = previousSyncWindow;
console.log('PASS 1-4 display panorama fixtures, negative and stacked coordinates, and primary-only frame publication');

let productionDraws = 0;
const production = makeRun(null, { mode: 'production', random: () => { productionDraws++; return 0.37; } });
const originalDuration = production.director.capture().phase.duration;
assert.equal(productionDraws, 1);
for (let i = 0; i < 20; i++) step(production);
assert.equal(productionDraws, 1);
const savedProduction = production.director.capture();
let resumeDraws = 0;
const resumedProduction = makeRun(savedProduction, { mode: 'production', random: () => { resumeDraws++; return 1; } });
assert.equal(resumeDraws, 0);
assert.equal(resumedProduction.director.capture().phase.duration, originalDuration);
assert.equal(resumedProduction.director.capture().phase.elapsed, savedProduction.phase.elapsed);
assert.ok(resumedProduction.camera.position.distanceTo(production.camera.position) < 1e-8);
until(resumedProduction, (s) => s.destinationId === 'iss' && s.phase.kind === 'cruise');
assert.equal(resumeDraws, 1);
assert.equal(resumedProduction.director.capture().phase.duration, 900);
console.log('PASS production timing draws once per new phase and never rerolls on resume');

const testFlight = makeRun();
const savedFlight = until(testFlight, (s) => s.destinationId === 'moon'
  && s.phase.kind === 'cruise' && s.phase.elapsed >= 15);
let switchedDraws = 0;
const switched = makeRun(savedFlight, { mode: 'production', random: () => { switchedDraws++; return 1; } });
assert.equal(switchedDraws, 0);
assert.equal(switched.director.capture().phase.duration, 30);
assert.equal(switched.director.capture().phase.elapsed, savedFlight.phase.elapsed);
assert.ok(switched.camera.position.distanceTo(testFlight.camera.position) < 1e-8);
for (let i = 0; i < 100; i++) {
  step(testFlight);
  step(switched);
  assert.ok(switched.camera.position.distanceTo(testFlight.camera.position) < 1e-4);
}
until(switched, (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby');
assert.equal(switched.director.capture().phase.duration, 30);
assert.equal(switchedDraws, 1);
console.log('PASS test-to-production switch preserves active flight and applies to the next flyby');

const productionOpening = makeRun(null, { mode: 'production', random: () => 0.5 });
for (let i = 0; i < 20; i++) step(productionOpening);
const openingSave = productionOpening.director.capture();
const switchedToTest = makeRun(openingSave, { mode: 'test' });
assert.equal(switchedToTest.director.capture().phase.duration, openingSave.phase.duration);
assert.equal(switchedToTest.director.capture().phase.elapsed, openingSave.phase.elapsed);
assert.ok(switchedToTest.camera.position.distanceTo(productionOpening.camera.position) < 1e-8);
until(switchedToTest, (s) => s.destinationId === 'iss' && s.phase.kind === 'cruise');
assert.equal(switchedToTest.director.capture().phase.duration, 30);
until(switchedToTest, (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby');
assert.equal(switchedToTest.director.capture().phase.duration, 8);
console.log('PASS production-to-test switch retains observation, then uses 30-second travel and 8-second flyby');

const legacy = structuredClone(savedFlight);
delete legacy.odometer;
legacy.phase.duration = 32;
legacy.phase.elapsed = 16;
legacy.camera.flight.duration = 32;
legacy.camera.flight.elapsed = 16;
const parsedLegacy = parseReachJourney(JSON.stringify(legacy), route, hasBody);
assert.ok(parsedLegacy, 'legacy v1 checkpoint should parse without new timing fields');
let legacyDraws = 0;
const resumedLegacy = makeRun(parsedLegacy, { mode: 'production', random: () => { legacyDraws++; return 0.5; } });
assert.equal(legacyDraws, 0);
assert.equal(resumedLegacy.director.capture().phase.duration, 32);
assert.equal(resumedLegacy.director.capture().phase.elapsed, 16);
assert.ok(resumedLegacy.director.distanceTravelledKm > 0, 'legacy mid-flight save receives one current leg');
assert.equal(resumedLegacy.director.roundTrips, 0);
assert.ok(resumedLegacy.camera.position.distanceTo(new Vector3().fromArray(legacy.camera.position)) < 1e-8);
until(resumedLegacy, (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby');
assert.equal(resumedLegacy.director.capture().phase.duration, 21);
assert.equal(legacyDraws, 1);
console.log('PASS legacy v1 cruise retains its duration and adopts the selected profile afterward');

const v1Cruise = structuredClone(savedFlight);
v1Cruise.itinerary.version = 1;
v1Cruise.routeIndex = originalIds.indexOf('moon');
v1Cruise.odometer.completedKm = 123_456_789;
v1Cruise.odometer.roundTrips = 3;
v1Cruise.odometer.leg = { fromId: 'earth', toId: 'moon', distanceKm: 384_400,
  departureJd: v1Cruise.simulation.jd - 0.001 };
const migratedCruise = parseReachJourney(JSON.stringify(v1Cruise), route, hasBody);
assert.ok(migratedCruise, 'valid v1 cruise migrates');
assert.equal(migratedCruise.itinerary.version, 4);
assert.equal(migratedCruise.routeIndex, route.findIndex((stop) => stop.id === 'moon'));
assert.deepEqual(migratedCruise.odometer, v1Cruise.odometer, 'odometer history and active leg survive');
const migratedRun = makeRun(migratedCruise);
assert.equal(migratedRun.director.capture().phase.kind, 'cruise');
const migratedCheckpoint = migratedRun.director.capture();
assert.ok(parseReachJourney(JSON.stringify(migratedCheckpoint), route, hasBody),
  'migrated active legacy leg survives a second restart as route v4');
const noOdometer = structuredClone(v1Cruise);
delete noOdometer.odometer;
const restoredNoOdometer = makeRun(parseReachJourney(JSON.stringify(noOdometer), route, hasBody));
assert.equal(restoredNoOdometer.director.capture().odometer.leg.fromId, 'earth',
  'a legacy flight without an odometer reconstructs its original predecessor');
assert.ok(parseReachJourney(JSON.stringify(restoredNoOdometer.director.capture()), route, hasBody));
const migratedArrival = until(migratedRun, (s) => s.destinationId === 'moon' && s.phase.kind === 'flyby');
assert.equal(migratedArrival.odometer.completedKm, 123_456_789 + 384_400);
assert.equal(migratedArrival.odometer.roundTrips, 3);
const migratedDeparture = structuredClone(valid);
migratedDeparture.itinerary.version = 1;
migratedDeparture.phase.nextId = 'moon';
migratedDeparture.odometer.leg = { fromId: 'earth', toId: 'moon', distanceKm: 384_400,
  departureJd: migratedDeparture.simulation.jd };
const migratedDepartureState = parseReachJourney(JSON.stringify(migratedDeparture), route, hasBody);
assert.ok(migratedDepartureState, 'valid v1 departure migrates');
const oldLegRun = makeRun(migratedDepartureState);
assert.equal(until(oldLegRun, (s) => s.destinationId === 'moon' && s.phase.kind === 'cruise').destinationId,
  'moon', 'in-progress v1 leg reaches its original destination');
assert.equal(parseReachJourney(JSON.stringify({ ...v1Cruise, routeIndex: 40 }), route, hasBody), null,
  'mismatched v1 index is rejected');
assert.equal(parseReachJourney(JSON.stringify({ ...v1Cruise, odometer: { ...v1Cruise.odometer,
  leg: { ...v1Cruise.odometer.leg, fromId: 'jupiter' } } }), route, hasBody), null,
  'unrelated v1 leg is rejected');
console.log('PASS v1 route migration preserves active departure, cruise, index, odometer, and round trips');

const v2Ids = 'earth iss hubble moon jwst mars phobos deimos vesta ceres jupiter juno io europa ganymede callisto saturn mimas enceladus tethys dione rhea titan iapetus uranus miranda ariel umbriel titania oberon neptune triton pluto charon haumea makemake newhorizons eris pioneer11 pioneer10 voyager2 voyager1 halley sun parker mercury venus'.split(' ');
const historicalRoutes = [
  { id: valid.itinerary.id, version: 1, stops: originalIds.map((id) => route.find((stop) => stop.id === id)), repeat: true },
  { id: valid.itinerary.id, version: 2, stops: v2Ids.map((id) => route.find((stop) => stop.id === id)), repeat: true },
];
const phaseCases = [
  ['observe', (s) => s.destinationId === 'mars' && s.phase.kind === 'observe' && s.phase.elapsed >= 2],
  ['departure', (s) => s.destinationId === 'earth' && s.phase.kind === 'departure' && s.phase.elapsed >= 2],
  ['flyby', (s) => s.destinationId === 'phobos' && s.phase.kind === 'flyby' && s.phase.elapsed >= 2],
  ['cruise', (s) => s.destinationId === 'mars' && s.phase.kind === 'cruise' && s.phase.elapsed >= 2],
];
for (const oldRoute of historicalRoutes) {
  for (const [kind, match] of phaseCases) {
    const oldRun = makeRun(null, { selectedRoute: oldRoute });
    const saved = until(oldRun, match);
    saved.odometer.completedKm += 987_654_321;
    saved.odometer.roundTrips = 4;
    const migrated = parseReachJourney(JSON.stringify(saved), route, hasBody);
    assert.ok(migrated, `v${oldRoute.version} ${kind} migrates directly to v4`);
    assert.equal(migrated.itinerary.version, 4);
    assert.equal(migrated.routeIndex, approvedIds.indexOf(saved.destinationId));
    assert.deepEqual(migrated.phase, saved.phase);
    assert.deepEqual(migrated.simulation, saved.simulation);
    assert.deepEqual(migrated.camera, saved.camera);
    assert.deepEqual(migrated.odometer, saved.odometer);
    assert.equal(migrated.transitionFromVersion,
      kind === 'departure' || kind === 'cruise' ? oldRoute.version : undefined);
    const resumed = makeRun(migrated);
    assert.equal(resumed.director.countdown.destinationId, oldRun.director.countdown.destinationId);
    assert.equal(resumed.director.countdown.phase, oldRun.director.countdown.phase);
    assert.equal(resumed.director.countdown.secondsLeft, oldRun.director.countdown.secondsLeft);
    assert.equal(resumed.director.distanceTravelledKm,
      saved.odometer.completedKm + (kind === 'cruise'
        ? saved.odometer.leg.distanceKm * saved.phase.elapsed / saved.phase.duration : 0));
    const v4Checkpoint = resumed.director.capture();
    const reloaded = parseReachJourney(JSON.stringify(v4Checkpoint), route, hasBody);
    assert.ok(reloaded, `v${oldRoute.version} ${kind} reloads after migration`);
    assert.deepEqual(reloaded.phase, migrated.phase);
    assert.deepEqual(reloaded.odometer, migrated.odometer);
  }
}
console.log('PASS v1 and v2 observation, departure, flyby, and cruise migration to v4');

for (const oldRoute of historicalRoutes) {
  const fromId = oldRoute.version === 1 ? 'earth' : 'jwst';
  const targetId = oldRoute.version === 1 ? 'moon' : 'mars';
  const oldRun = makeRun(null, { selectedRoute: oldRoute });
  const departing = until(oldRun, (s) => s.destinationId === fromId
    && s.phase.kind === 'departure' && s.phase.elapsed >= 3);
  departing.odometer.completedKm = 321_000_000;
  departing.odometer.roundTrips = 7;
  const migrated = parseReachJourney(JSON.stringify(departing), route, hasBody);
  assert.ok(migrated);
  assert.equal(migrated.phase.nextId, targetId);
  const newRun = makeRun(migrated);
  const cruise = until(newRun, (s) => s.destinationId === targetId && s.phase.kind === 'cruise'
    && s.phase.elapsed >= 3);
  assert.equal(cruise.transitionFromVersion, oldRoute.version,
    'old-route marker survives departure to cruise');
  assert.equal(cruise.odometer.leg.fromId, fromId);
  assert.equal(cruise.odometer.leg.toId, targetId);
  const cruiseReload = parseReachJourney(JSON.stringify(cruise), route, hasBody);
  assert.ok(cruiseReload, 'old nonadjacent cruise remains valid after a v3 checkpoint');
  assert.equal(parseReachJourney(JSON.stringify({ ...cruise, transitionFromVersion: undefined }), route, hasBody), null,
    'old nonadjacent cruise needs its validated transition marker');
  const finalRun = makeRun(cruiseReload);
  assert.equal(finalRun.director.countdown.destinationId, targetId);
  assert.ok(Math.abs(finalRun.director.countdown.secondsLeft
    - (cruise.phase.duration - cruise.phase.elapsed)) < 1e-8);
  const completed = until(finalRun, (s) => s.destinationId === targetId
    && (s.phase.kind === 'observe' || s.phase.kind === 'flyby'));
  assert.equal(completed.transitionFromVersion, undefined);
  assert.equal(completed.odometer.leg, null);
  assert.ok(Math.abs(completed.odometer.completedKm
    - (321_000_000 + departing.odometer.leg.distanceKm)) < 1e-3);
  assert.equal(completed.odometer.roundTrips, 7);
  assert.ok(parseReachJourney(JSON.stringify(completed), route, hasBody),
    'completed transitional leg reloads under ordinary v3 adjacency');
  const next = until(finalRun, (s) => s.destinationId === approvedIds[approvedIds.indexOf(targetId) + 1]
    && s.phase.kind === 'cruise');
  assert.equal(next.odometer.leg.fromId, targetId,
    'the next leg follows the approved v3 successor');
}
console.log('PASS old nonadjacent legs, transitional reloads, countdown, odometer, and v3 successor');

assert.equal(reachPreviewRoute('missing'), null);
for (const id of ['iss', 'hubble', 'jwst', 'juno', 'newhorizons', 'parker', 'moon']) {
  const previewRoute = reachPreviewRoute(id);
  assert.deepEqual(previewRoute.stops.map((stop) => stop.id), ['earth', id]);
  const preview = makeRun(null, { mode: 'preview', selectedRoute: previewRoute });
  const reached = until(preview, (s) => s.destinationId === id
    && (s.phase.kind === 'observe' || s.phase.kind === 'flyby'));
  assert.equal(reached.phase.duration, 6);
  assert.equal(preview.director.distanceTravelledKm > 0, true);
  assert.equal(parseReachJourney(JSON.stringify(reached), route, hasBody), null,
    'preview state cannot be accepted as a production checkpoint');
}
const earthPreview = makeRun(null, { mode: 'preview', selectedRoute: reachPreviewRoute('earth') });
assert.equal(earthPreview.director.capture().phase.duration, 6);
console.log('PASS direct preview routes approach, observe, stop, and cannot restore as production saves');
