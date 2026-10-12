import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { ReachVoyageDirector } from './src/reach/ReachVoyageDirector.ts';
  export { REACH_PROXIMA_PILOT, reachPilotStarBlend, reachPilotStarHideIndex,
    reachPilotStarAppearance } from './src/reach/ReachDestinations.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { StarPoints } from './src/render/StarPoints.ts';
  export { ReachTiming, REACH_TIMING } from './src/reach/ReachTiming.ts';
  export { ReachOdometerOverlay, readOdometerContract, formatVoyageDistance, resolveOdometerPosition } from './src/reach/ReachOdometer.ts';
  export { readCountdownContract } from './src/reach/ReachCountdownOverlay.ts';
  export { parseReachJourney } from './src/reach/JourneyState.ts';
  export { PARSEC_KM } from './src/core/constants.ts';
  export { ReachArrivalTrace } from './src/reach/ReachArrivalTrace.ts';
  export { suppressProximaPlanetMeshes } from './src/reach/ReachPlanetMeshIsolation.ts';
  export { preparePlanetResources } from './src/reach/ReachPlanetResourcePreparation.ts';
`;
const bundle = await rolldown({
  input: '\0reach-interstellar-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-interstellar-test',
    resolveId(id, importer) {
      if (id === '\0reach-interstellar-test') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-interstellar-test') return entry;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' }, module, module.exports,
);
const { ReachVoyageDirector, REACH_PROXIMA_PILOT, reachPilotStarBlend, reachPilotStarHideIndex,
  reachPilotStarAppearance, CameraController, TimeSystem,
  Universe, StarCatalog, StarPoints, ReachTiming, REACH_TIMING, ReachOdometerOverlay, readOdometerContract,
  formatVoyageDistance, resolveOdometerPosition, readCountdownContract,
  parseReachJourney, PARSEC_KM, ReachArrivalTrace,
  suppressProximaPlanetMeshes, preparePlanetResources } = module.exports;
const starView = { body: { id: 's64548-star' }, group: { visible: true },
  atmosphere: undefined, meshVisible: true };
const planetView = { body: { id: 's64548-p6' }, group: { visible: true },
  atmosphere: { visible: true }, meshVisible: true };
const moonView = { body: { id: 's64548-p1-m1' }, group: { visible: true },
  atmosphere: undefined, meshVisible: true };
for (let frame = 0; frame < 2; frame++) {
  planetView.group.visible = true;
  planetView.atmosphere.visible = true;
  planetView.meshVisible = true;
  moonView.group.visible = true;
  moonView.meshVisible = true;
  suppressProximaPlanetMeshes([starView, planetView, moonView], starView.body.id);
  assert.equal(starView.group.visible, true, 'the Proxima star remains drawable');
  assert.equal(planetView.group.visible, false, 'planet surface and group children cannot draw');
  assert.equal(planetView.atmosphere.visible, false, 'detached planet atmosphere cannot draw');
  assert.equal(planetView.meshVisible, false, 'planet first-draw visibility transition is suppressed');
  assert.equal(moonView.group.visible, false, 'generated moon meshes are also suppressed');
}
const sharedGeometry = new THREE.SphereGeometry(1, 4, 4);
const sharedMaterial = new THREE.ShaderMaterial({ vertexShader: 'void main(){gl_Position=vec4(position,1.);}',
  fragmentShader: 'void main(){gl_FragColor=vec4(1.);}' });
const bodyGroup = new THREE.Group();
const bodySurface = new THREE.Mesh(sharedGeometry, sharedMaterial);
const bodyAtmosphere = new THREE.Mesh(sharedGeometry, new THREE.ShaderMaterial({
  vertexShader: sharedMaterial.vertexShader, fragmentShader: sharedMaterial.fragmentShader,
}));
bodyGroup.add(bodySurface);
const preparedIds = [];
let drawCount = 0;
let currentTarget = null;
const fakeRenderer = {
  info: { memory: { geometries: 1, textures: 0 }, programs: [1] },
  compileAsync: async (scene) => {
    assert.ok(scene.children.some((child) => child.geometry === sharedGeometry
      && child.material === sharedMaterial), 'preparation shares the actual draw resources');
    assert.ok(scene.children.some((child) => child.material === bodyAtmosphere.material),
      'the detached atmosphere is prepared with the planet');
  },
  getRenderTarget: () => currentTarget,
  setRenderTarget: (target) => { currentTarget = target; },
  render: () => { drawCount++; assert.ok(currentTarget, 'first draw targets an offscreen buffer'); },
};
await preparePlanetResources([{ body: { id: 'star' }, surface: bodySurface, group: bodyGroup },
  { body: { id: 'planet' }, surface: bodySurface, group: bodyGroup, atmosphere: bodyAtmosphere }],
  'star', fakeRenderer,
new THREE.Scene(), new AbortController().signal, (step) => preparedIds.push(step));
assert.equal(drawCount, 1, 'only the destination planet is drawn during preparation');
assert.equal(preparedIds[0].id, 'planet');
assert.equal(currentTarget, null, 'the live render target is restored');
const trace = new ReachArrivalTrace();
const tracePosition = new THREE.Vector3();
const traceOrientation = new THREE.Quaternion();
const info = console.info;
console.info = () => {};
for (const [ms, intervalMs, visibleMeshes, programs] of [
  [1000, 16, 's64548-star', 10],
  [1016, 16, 's64548-star,s64548-p6', 11],
  [1388, 372, 's64548-star,s64548-p6', 11],
  [1777, 389, 's64548-star,s64548-p6,s64548-p1', 12],
  [1793, 16, 's64548-star,s64548-p6,s64548-p1', 12],
]) trace.frame({ ms, intervalMs, frameMs: 2, cameraMs: 0.2, bodiesMs: 0.2,
  galaxyMs: 0, orbitMs: 0.1, visibleOrbits: 0, visibleMeshes, eligibleMeshes: visibleMeshes,
  visiblePlanetMeshes: visibleMeshes.replace('s64548-star', '').replace(/^,/, ''), geometries: 10,
  textures: 3, programs, drawCalls: 10, renderMs: 1, distanceKm: 71_000_000,
  radiusPx: 0.82, point: true, pointOpacity: 0.5, corona: true,
  coronaIntensity: 0.87, mesh: true, phase: 'NEXT', flightS: 8.53,
  visibility: 'visible' }, tracePosition, traceOrientation);
console.info = info;
const traceReport = JSON.parse(trace.report());
assert.equal(traceReport.gaps.length, 2, 'both significant arrival gaps survive the bounded report');
assert.equal(traceReport.gapContexts.length, 2, 'each gap retains adjacent frames');
assert.ok(traceReport.stateChanges.some((f) => f.visibleMeshes.includes('s64548-p6') && f.programs === 11),
  'mesh and shader-program transitions remain visible beside the gaps');
assert.equal(JSON.parse(new ReachArrivalTrace(false, true).report()).disablePlanetMeshes, true,
  'the exported report identifies the planet-mesh isolation configuration');
const isolatedTrace = new ReachArrivalTrace(false, true);
for (const [ms, eligibleMeshes] of [[1000, 's64548-star'], [1016, 's64548-star,s64548-p6']]) {
  isolatedTrace.frame({ ms, intervalMs: 16, frameMs: 2, cameraMs: 0.2, bodiesMs: 0.2,
    galaxyMs: 0, orbitMs: 0.1, visibleOrbits: 0, visibleMeshes: 's64548-star', eligibleMeshes,
    visiblePlanetMeshes: '',
    geometries: 10, textures: 3, programs: 10, drawCalls: 10, renderMs: 1,
    distanceKm: 71_000_000, radiusPx: 0.82, point: true, pointOpacity: 0.5,
    corona: true, coronaIntensity: 0.87, mesh: true, phase: 'NEXT', flightS: 8.53,
    visibility: 'visible' }, tracePosition, traceOrientation);
}
const isolatedReport = JSON.parse(isolatedTrace.report());
assert.ok(isolatedReport.stateChanges.some((f) => f.eligibleMeshes.includes('s64548-p6')
  && f.visibleMeshes === 's64548-star'), 'threshold crossing is retained without a planet first draw');
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
assert.ok(catalog.count > 64548);
assert.match(catalog.nameOf(64548), /Proxima/i);
assert.equal(reachPilotStarHideIndex(64548, 0.1, true), -1, 'distant Proxima remains a catalogue point');
assert.equal(reachPilotStarHideIndex(64548, 1.5, true), 64548, 'local disc takes over once resolved');
assert.equal(reachPilotStarHideIndex(64548, 0.1, false), 64548, 'other views retain normal star hiding');
assert.equal(reachPilotStarBlend(0.15), 0, 'pilot point is full strength before the corona blend');
assert.ok(reachPilotStarBlend(0.75) > 0 && reachPilotStarBlend(0.75) < 1, 'pilot handoff blends between renderers');
assert.equal(reachPilotStarBlend(1.5), 1, 'pilot corona is full strength at point removal');
const blended = reachPilotStarAppearance(64548, 0.82, true, false);
const isolated = reachPilotStarAppearance(64548, 0.82, true, true);
assert.equal(blended.hideIndex, isolated.hideIndex, 'isolation retains the pilot point cutoff');
assert.equal(isolated.targetIndex, 64548, 'isolation keeps the distant catalogue point');
assert.equal(isolated.pointOpacity, 1, 'isolation does not fade the catalogue point');
assert.equal(isolated.coronaScale, 1, 'isolation leaves the ordinary corona intensity alone');
assert.ok(blended.pointOpacity < 1 && blended.coronaScale < 1, 'default pilot blend remains active');
assert.equal(reachPilotStarAppearance(64548, 1.5, true, true).hideIndex, 64548,
  'isolation still removes the point when the local disc resolves');
assert.deepEqual(reachPilotStarAppearance(0, 0.82, false, true),
  { hideIndex: 0, targetIndex: -1, pointOpacity: 1, coronaScale: 1 },
  'isolation cannot change ordinary global star rendering');
const pilot = REACH_PROXIMA_PILOT;
const hasDestination = (universe) => (id) => {
  if (id === 'earth') return !!universe.system('c0').get('earth');
  if (id === 'star:c64548') return !!universe.system('c64548').star;
  return !!universe.system('c0').get(id) || !!universe.system('c64548').get(id);
};
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
function makeRun(saved = null) {
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog);
  if (saved && saved.frame.starId !== 'c0') universe.switchTo(saved.frame.starId, time.jd, time.t);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time, new ReachTiming('test'), saved, undefined, pilot);
  return { universe, camera, director, time };
}
function step(run) {
  const dt = 0.1;
  run.time.advance(dt);
  run.universe.update(run.time.jd, run.time.t);
  if (run.director.directing) run.director.update(dt, false);
  else {
    run.camera.update(dt, input, 1920, 1080, Math.PI / 3);
    run.director.update(dt, false);
  }
}
function until(run, match, limit = 2000) {
  for (let i = 0; i < limit; i++) {
    step(run);
    const saved = run.director.capture();
    if (match(saved)) return saved;
  }
  throw new Error('Pilot phase did not arrive');
}
const fresh = makeRun();
assert.equal(fresh.universe.current.starId, 'c0');
const departure = until(fresh, (s) => s.phase.kind === 'departure' && s.phase.elapsed > 2);
assert.equal(departure.odometer.completedKm, 0);
assert.equal(departure.odometer.leg.toId, 'star:c64548');
const expectedKm = catalog.position(64548).multiplyScalar(PARSEC_KM)
  .distanceTo(fresh.universe.system('c0').get('earth').position);
assert.ok(Math.abs(departure.odometer.leg.distanceKm - expectedKm) / expectedKm < 1e-12);
assert.ok(expectedKm > 3.5e13 && expectedKm < 4.5e13, `unexpected Proxima separation ${expectedKm}`);
assert.ok(parseReachJourney(JSON.stringify(departure), pilot, hasDestination(fresh.universe)));
const resumedDeparture = makeRun(departure);
assert.equal(resumedDeparture.universe.current.starId, 'c0');
assert.deepEqual(REACH_TIMING.test.travel.interstellar, [28, 28]);
const finalDeparture = until(resumedDeparture, (s) => s.phase.kind === 'departure' && s.phase.elapsed >= 9.9);
const beforeSwitchWorld = resumedDeparture.camera.position.clone().add(resumedDeparture.universe.current.origin);
const beforeSwitchOrientation = resumedDeparture.camera.quaternion.clone();
const targetDirection = resumedDeparture.universe.starRelative('c64548', resumedDeparture.camera.position).normalize();
const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(beforeSwitchOrientation);
assert.ok(forward.angleTo(targetDirection) < 0.01, 'departure faces Proxima before cruise begins');
const earth = resumedDeparture.universe.current.get('earth');
assert.ok(earth.radius / resumedDeparture.camera.position.distanceTo(earth.position) < 1 / 250,
  'Earth is reduced to a small disk before the frame switch');
assert.equal(finalDeparture.frame.starId, 'c0');
step(resumedDeparture);
assert.equal(resumedDeparture.director.capture().phase.kind, 'cruise');
const afterSwitchWorld = resumedDeparture.camera.position.clone().add(resumedDeparture.universe.current.origin);
assert.ok(afterSwitchWorld.distanceTo(beforeSwitchWorld) < earth.radius,
  'frame conversion preserves camera world position');
assert.ok(resumedDeparture.camera.quaternion.angleTo(beforeSwitchOrientation) < 0.01,
  'the frame conversion does not snap camera orientation');
assert.equal(resumedDeparture.camera.autopilot.duration, 28);
const cruise = until(resumedDeparture, (s) => s.phase.kind === 'cruise' && s.phase.elapsed > 5);
assert.equal(cruise.frame.starId, 'c64548');
assert.equal(cruise.camera.referenceId, 's64548-star');
assert.ok(resumedDeparture.director.distanceTravelledKm > 0);
assert.match(formatVoyageDistance(resumedDeparture.director.distanceTravelledKm), / (AU|LY)$/);
assert.ok(parseReachJourney(JSON.stringify(cruise), pilot, hasDestination(resumedDeparture.universe)));
const previousWindow = globalThis.window;
const previousDocument = globalThis.document;
globalThis.window = {};
assert.deepEqual(readCountdownContract(true), { enabled: true, primaryDisplay: true, position: 'auto' },
  'primary Reach page supplies the missing countdown contract');
assert.equal(readCountdownContract(), null, 'an optional fallback still requires the primary Reach caller');
assert.deepEqual(readOdometerContract(true), { position: 'auto' }, 'primary Reach page displays existing HUD');
assert.equal(readOdometerContract(), null, 'an optional fallback still requires the primary Reach caller');
globalThis.window.__reachCountdown = { enabled: true, primaryDisplay: false, position: 'auto' };
assert.equal(readCountdownContract(true), null, 'secondary display never gets a pilot countdown');
assert.equal(readOdometerContract(true), null, 'secondary display never gets an odometer');
const element = { dataset: {}, setAttribute() {}, textContent: '' };
globalThis.document = { createElement: () => element, body: { appendChild() {} } };
const hud = new ReachOdometerOverlay(resumedDeparture.director, 'auto');
hud.update(0);
assert.match(element.textContent, /^Distance Travelled: .+$/);
assert.equal(element.dataset.position, resolveOdometerPosition('auto', resumedDeparture.director.countdown.routeIndex));
globalThis.window = previousWindow;
globalThis.document = previousDocument;
const resumedCruise = makeRun(cruise);
assert.equal(resumedCruise.universe.current.starId, 'c64548');
assert.ok(Math.abs(resumedCruise.director.distanceTravelledKm - resumedDeparture.director.distanceTravelledKm) < 1);
const beforePause = resumedCruise.director.distanceTravelledKm;
resumedCruise.director.update(5, true);
assert.equal(resumedCruise.director.distanceTravelledKm, beforePause);
const midCruise = until(resumedCruise, (s) => s.phase.kind === 'cruise' && s.phase.elapsed > 14);
assert.equal(midCruise.phase.duration, 28);
assert.ok(resumedCruise.director.distanceTravelledKm > beforePause,
  'interstellar odometer rises during the complete timed cruise');
const flickerPosition = until(resumedCruise, (s) => s.phase.kind === 'cruise' && s.phase.elapsed >= 19.47);
const preciseDirection = resumedCruise.universe.star.position.clone().sub(resumedCruise.camera.position).normalize();
const cameraPc = resumedCruise.universe.toParsecs(resumedCruise.camera.position);
const catalogPc = catalog.position(64548);
const gpuDirection = new THREE.Vector3(
  Math.fround(catalogPc.x) - Math.fround(cameraPc.x),
  Math.fround(catalogPc.y) - Math.fround(cameraPc.y),
  Math.fround(catalogPc.z) - Math.fround(cameraPc.z)).normalize();
const quantizedErrorDeg = preciseDirection.angleTo(gpuDirection) * 180 / Math.PI;
assert.ok(quantizedErrorDeg > 0.5, `near-arrival GPU parsec subtraction shifts Proxima by ${quantizedErrorDeg} degrees`);
const pilotPoints = new StarPoints(catalog, new THREE.Scene());
pilotPoints.update(cameraPc, -1, 64548, 0.5, preciseDirection);
assert.ok(pilotPoints.points.material.uniforms.uReachTargetDirection.value.angleTo(preciseDirection) < 1e-6,
  'the existing catalogue point receives the precise local direction');
assert.equal(pilotPoints.points.material.defines.QUADRATIC_STAR_POINTS, 1,
  'the pilot point retains the corrected energy-preserving footprint');
const nearArrival = until(resumedCruise, (s) => s.phase.kind === 'cruise' && s.phase.elapsed >= 27.9);
assert.equal(nearArrival.frame.starId, 'c64548', 'no arrival-time system switch');
const arrival = until(resumedCruise, (s) => s.phase.kind === 'observe');
assert.ok(arrival.simulation.jd - nearArrival.simulation.jd < 0.3 / 86400,
  'arrival observation follows cruise without a logical hold');
assert.equal(arrival.destinationId, 'star:c64548');
assert.equal(arrival.odometer.completedKm, departure.odometer.leg.distanceKm);
assert.equal(arrival.odometer.leg, null);
assert.equal(arrival.odometer.roundTrips, 0);
for (let i = 0; i < 200; i++) step(resumedCruise);
assert.equal(resumedCruise.director.capture().destinationId, 'star:c64548');
assert.equal(resumedCruise.director.capture().odometer.completedKm, arrival.odometer.completedKm);
const invalid = { ...cruise, destinationId: 'star:c999999' };
assert.equal(parseReachJourney(JSON.stringify(invalid), pilot, hasDestination(resumedCruise.universe)), null);
assert.equal(parseReachJourney(JSON.stringify({ ...cruise, frame: { starId: 'c0' } }),
  pilot, hasDestination(resumedCruise.universe)), null);
assert.equal(parseReachJourney(JSON.stringify(cruise), pilot, () => false), null);
console.log('PASS real Proxima catalogue, Solar departure, frame switch, arrival, resume, distance, invalid recovery');
