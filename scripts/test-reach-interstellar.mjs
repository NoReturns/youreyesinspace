import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { ReachVoyageDirector, reachPreviewRoute } from './src/reach/ReachVoyageDirector.ts';
  export { REACH_PROXIMA_PILOT, reachPilotStarBlend, reachPilotStarHideIndex, reachStarVisualDrift,
    reachPilotStarAppearance, REACH_NEARBY_STAR_PREVIEWS, REACH_NEARBY_OBSERVATION_RADII
  } from './src/reach/ReachDestinations.ts';
  export { REACH_PRODUCTION_ROUTE } from './src/reach/ReachVoyageDirector.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { StarPoints } from './src/render/StarPoints.ts';
  export { BodyPoints } from './src/render/BodyPoints.ts';
  export { ALPHA_A_INDEX, ALPHA_B_INDEX, ALPHA_SYSTEM_ID, ALPHA_BARY_ID, ALPHA_ORBIT,
    createAlphaCentauriPreviewSystem, alphaPointDirection }
    from './src/reach/ReachAlphaCentauri.ts';
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
  transform: { define: { 'import.meta.env.DEV': 'true' } },
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
const { ReachVoyageDirector, reachPreviewRoute, REACH_PRODUCTION_ROUTE, REACH_PROXIMA_PILOT,
  REACH_NEARBY_STAR_PREVIEWS, REACH_NEARBY_OBSERVATION_RADII, reachPilotStarBlend, reachPilotStarHideIndex,
  reachStarVisualDrift,
  reachPilotStarAppearance, CameraController, TimeSystem,
  Universe, StarCatalog, StarPoints, BodyPoints, ALPHA_A_INDEX, ALPHA_B_INDEX,
  ALPHA_SYSTEM_ID, ALPHA_BARY_ID, ALPHA_ORBIT, createAlphaCentauriPreviewSystem, alphaPointDirection,
  ReachTiming, REACH_TIMING, ReachOdometerOverlay, readOdometerContract,
  formatVoyageDistance, resolveOdometerPosition, readCountdownContract,
  parseReachJourney, PARSEC_KM, ReachArrivalTrace,
  suppressProximaPlanetMeshes, preparePlanetResources } = module.exports;
const pointLayer = new BodyPoints(new THREE.Scene());
pointLayer.setViews([{ body: { id: 'planet', data: { type: 'planet', albedo: 0.9,
  appearance: { kind: 'terrestrial', landMid: [0.7, 0.6, 0.5] } },
  radius: 1000, position: new THREE.Vector3(1000, 0, 0) },
  relPos: new THREE.Vector3(1000, 0, 0), distance: 1000, apparentRadiusPx: 0.1 }]);
pointLayer.update(new THREE.Vector3(), new THREE.Vector3(), 1);
assert.ok(pointLayer.points.geometry.attributes.alpha.array[0] > 0, 'ordinary generated points remain available');
pointLayer.update(new THREE.Vector3(), new THREE.Vector3(), 1, true);
assert.equal(pointLayer.points.geometry.attributes.alpha.array[0], 0, 'the encounter hides incidental points');
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
assert.ok(blended.pointOpacity < 1 && blended.coronaScale < 1 && blended.discScale < 1,
  'point, corona, and disc share the same handoff');
assert.equal(blended.pointOpacity + blended.discScale, 1, 'handoff has no duplicate full-strength star');
assert.equal(reachPilotStarAppearance(64548, 0.15, true, false).discScale, 0,
  'the unresolved local disc does not duplicate the catalogue point');
assert.equal(reachPilotStarAppearance(64548, 1.5, true, false).discScale, 1,
  'the resolved local disc is fully visible when the catalogue point disappears');
assert.equal(reachPilotStarAppearance(64548, 1.5, true, true).hideIndex, 64548,
  'isolation still removes the point when the local disc resolves');
assert.deepEqual(reachPilotStarAppearance(0, 0.82, false, true),
  { hideIndex: 0, targetIndex: -1, pointOpacity: 1, coronaScale: 1, discScale: 1 },
  'isolation cannot change ordinary global star rendering');
const pilot = REACH_PROXIMA_PILOT;
const proximaPresentation = pilot.stops[1].starPresentation;
assert.ok(proximaPresentation, 'the pilot alone owns the closer star presentation');
assert.equal(proximaPresentation.observationDistanceRadii, 6.95);
assert.ok(proximaPresentation.surfaceMotion > 0 && proximaPresentation.coronaMotion > 0);
assert.ok(proximaPresentation.colorWarmth > 0 && proximaPresentation.colorWarmth <= 1);
const visualEpoch = 1_791_763_200;
const driftStart = reachStarVisualDrift(visualEpoch);
const driftNextFrame = reachStarVisualDrift(visualEpoch + 1 / 60);
const driftAfterObservation = reachStarVisualDrift(visualEpoch + 6);
assert.deepEqual(reachStarVisualDrift(visualEpoch), driftStart,
  'panorama windows receive the same visual phase at the same wall-clock time');
assert.ok(driftStart.every((value) => Number.isFinite(value) && Math.abs(value) <= 1));
assert.ok(driftStart.every((value, index) => Math.abs(value - driftNextFrame[index]) < 0.002),
  'the visual phase changes smoothly between frames');
assert.ok(driftStart.some((value, index) => Math.abs(value - driftAfterObservation[index]) > 0.03),
  'the surface changes over the six-second observation');
const hasDestination = (universe) => (id) => {
  if (id === 'earth') return !!universe.system('c0').get('earth');
  if (id === 'star:c64548') return !!universe.system('c64548').star;
  return !!universe.system('c0').get(id) || !!universe.system('c64548').get(id);
};
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
function makeRun(saved = null, route = pilot, timingMode = 'test') {
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  if (saved) { time.setRate(saved.simulation.rate); time.jd = saved.simulation.jd; }
  const universe = new Universe(catalog, route.id === 'preview:alpha-centauri'
    ? createAlphaCentauriPreviewSystem(catalog) : null);
  if (saved && saved.frame.starId !== 'c0') universe.switchTo(saved.frame.starId, time.jd, time.t);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time, new ReachTiming(timingMode), saved, undefined, route);
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
const preview = reachPreviewRoute('proxima');
assert.ok(preview && preview !== pilot && preview.stops === pilot.stops);
assert.equal(preview.id, 'preview:proxima');
assert.equal(preview.repeat, false);
assert.equal(reachPreviewRoute('alpha-centauri')?.id, 'preview:alpha-centauri');
const shortRun = makeRun(null, preview, 'preview');
const shortDeparture = until(shortRun, (s) => s.phase.kind === 'departure');
assert.equal(shortDeparture.phase.duration, 2);
assert.equal(shortDeparture.odometer.leg.toId, 'star:c64548');
const shortCruise = until(shortRun, (s) => s.phase.kind === 'cruise');
assert.equal(shortCruise.phase.duration, 8);
assert.equal(shortCruise.frame.starId, 'c64548');
assert.equal(shortCruise.camera.referenceId, 's64548-star');
assert.ok(shortRun.camera.position.distanceTo(shortRun.universe.star.position) > shortRun.universe.star.radius,
  'the preview camera remains outside the star after the frame switch');
assert.equal(shortRun.camera.autopilot.dist1,
  shortRun.universe.star.radius * proximaPresentation.observationDistanceRadii,
  'the generalized star flight uses the stop-specific observation distance');
let previousStarDistance = shortRun.camera.position.distanceTo(shortRun.universe.star.position);
for (let i = 0; i < 40; i++) {
  step(shortRun);
  const starDistance = shortRun.camera.position.distanceTo(shortRun.universe.star.position);
  assert.ok(starDistance <= previousStarDistance * (1 + 1e-12), 'approach distance decreases continuously');
  assert.ok(starDistance > shortRun.universe.star.radius * 4.5,
    'the camera stays outside the rendered corona extent');
  previousStarDistance = starDistance;
  const toStar = shortRun.universe.star.position.clone().sub(shortRun.camera.position).normalize();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shortRun.camera.quaternion);
  assert.ok(forward.angleTo(toStar) < 0.1, 'the star stays inside the approach framing');
}
let shortArrival = null;
for (let i = 0; i < 80 && !shortArrival; i++) {
  step(shortRun);
  const starDistance = shortRun.camera.position.distanceTo(shortRun.universe.star.position);
  assert.ok(starDistance <= previousStarDistance * (1 + 1e-12),
    'the final approach does not reverse or jump outward');
  assert.ok(starDistance > shortRun.universe.star.radius * 4.5,
    'the final approach remains outside the rendered corona');
  previousStarDistance = starDistance;
  const toStar = shortRun.universe.star.position.clone().sub(shortRun.camera.position).normalize();
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shortRun.camera.quaternion);
  assert.ok(forward.angleTo(toStar) < 0.1, 'the star remains framed through arrival');
  const saved = shortRun.director.capture();
  if (saved.phase.kind === 'observe' && saved.destinationId === 'star:c64548') shortArrival = saved;
}
assert.ok(shortArrival, 'the short preview reaches Proxima observation');
assert.equal(shortArrival.phase.duration, 6);
assert.equal(shortRun.director.countdownLabel, 'Proxima Centauri');
assert.equal(shortRun.director.terminalObservation, true);
assert.equal(shortArrival.odometer.completedKm, shortDeparture.odometer.leg.distanceKm);
const arrivalRadii = shortRun.camera.position.distanceTo(shortRun.universe.star.position)
  / shortRun.universe.star.radius;
assert.ok(Math.abs(arrivalRadii - proximaPresentation.observationDistanceRadii) < 0.01,
  'observation ends at the authored camera distance');
assert.ok(arrivalRadii > 4.5, 'the observation camera remains outside the rendered corona');
const discHeightFraction = 1 / (Math.sqrt(arrivalRadii ** 2 - 1) * Math.tan(50 * Math.PI / 360));
assert.ok(discHeightFraction >= 0.30 && discHeightFraction <= 0.33,
  `the 50-degree preview projects the disc to ${(discHeightFraction * 100).toFixed(1)}% of viewport height`);
for (let i = 0; i < 100; i++) {
  step(shortRun);
  assert.ok(shortRun.camera.position.distanceTo(shortRun.universe.star.position)
    > shortRun.universe.star.radius * 4.5, 'terminal observation stays outside the rendered corona');
}
assert.equal(shortRun.director.capture().destinationId, 'star:c64548', 'the preview stops after observation');
assert.equal(shortRun.director.capture().odometer.leg, null);
assert.equal(shortRun.director.roundTrips, 0);
const nearbyIds = {
  barnard: 80155, 'wolf-359': 108500, 'lalande-21185': 49269, sirius: 29786,
  'ross-248': 109365, 'epsilon-eridani': 15247, 'tau-ceti': 7458, vega: 83130,
};
assert.equal(REACH_PRODUCTION_ROUTE.stops.length, 57);
assert.deepEqual(Object.keys(REACH_NEARBY_STAR_PREVIEWS), Object.keys(nearbyIds));
const temperatures = new Set();
const radii = new Set();
for (const [name, index] of Object.entries(nearbyIds)) {
  const starId = `c${index}`;
  const route = reachPreviewRoute(name);
  assert.equal(route?.id, `preview:${name}`);
  assert.equal(route.repeat, false);
  assert.deepEqual(route.stops.map((stop) => stop.id), ['earth', `star:${starId}`]);
  assert.deepEqual(route.stops[1].ref, { kind: 'star', starId });
  assert.equal(route.stops[1].starPresentation.observationDistanceRadii, REACH_NEARBY_OBSERVATION_RADII);
  const info = catalog.info(index);
  assert.ok(info.radiusKm > 0 && info.temperature > 0, `${name} has physical catalogue parameters`);
  temperatures.add(Math.round(info.temperature));
  radii.add(Math.round(info.radiusKm));
  const run = makeRun(null, route, 'preview');
  const system = run.universe.system(starId);
  const star = system.star;
  if (name === 'sirius') {
    assert.equal(route.stops[1].label, 'Sirius A');
    assert.equal(system.bodies.filter((body) => body.data.type === 'star').length, 1,
      'the Sirius preview resolves only the catalogue primary');
  }
  assert.ok(Math.abs(star.radius - info.radiusKm) / info.radiusKm < 1e-12,
    `${name} uses its catalogue radius`);
  assert.equal(star.data.temperature, info.temperature, `${name} uses its catalogue temperature`);
  const departure = until(run, (s) => s.phase.kind === 'departure');
  assert.equal(departure.odometer.leg.toId, `star:${starId}`);
  const cruise = until(run, (s) => s.phase.kind === 'cruise');
  assert.equal(cruise.frame.starId, starId);
  assert.equal(cruise.camera.referenceId, star.id);
  assert.equal(run.camera.autopilot.dist1, star.radius * REACH_NEARBY_OBSERVATION_RADII);
  assert.ok(run.camera.position.distanceTo(star.position) > star.radius * 4.5,
    `${name} frame handoff clears the corona`);
  const appearance = reachPilotStarAppearance(index, 0.82, true, false);
  assert.equal(appearance.targetIndex, index);
  assert.ok(appearance.pointOpacity > 0 && appearance.pointOpacity < 1);
  assert.equal(appearance.pointOpacity + appearance.discScale, 1);
  const arrival = until(run, (s) => s.phase.kind === 'observe' && s.destinationId === `star:${starId}`);
  const distanceRadii = run.camera.position.distanceTo(star.position) / star.radius;
  assert.ok(Math.abs(distanceRadii - REACH_NEARBY_OBSERVATION_RADII) < 0.01);
  assert.ok(distanceRadii > 4.5, `${name} observation clears the corona`);
  assert.equal(run.director.terminalObservation, true);
  assert.equal(run.director.countdownLabel, REACH_NEARBY_STAR_PREVIEWS[name][1]);
  assert.equal(parseReachJourney(JSON.stringify(arrival), REACH_PRODUCTION_ROUTE,
    hasDestination(run.universe)), null, `${name} preview is not a production checkpoint`);
  for (let i = 0; i < 70; i++) step(run);
  assert.equal(run.director.capture().destinationId, `star:${starId}`);
}
assert.ok(temperatures.size >= 4 && radii.size >= 4, 'the previews retain distinct stellar physics');
const nearbyDiscFraction = 1 / (Math.sqrt(REACH_NEARBY_OBSERVATION_RADII ** 2 - 1)
  * Math.tan(50 * Math.PI / 360));
assert.ok(Math.abs(nearbyDiscFraction - 0.30) < 0.005);
assert.equal(reachPreviewRoute('alpha-centauri-a'), null);
assert.equal(reachPreviewRoute('alpha-centauri-b'), null);
assert.equal(reachPreviewRoute('toString'), null);
const binaryRoute = reachPreviewRoute('alpha-centauri');
assert.deepEqual(binaryRoute.stops.map((stop) => stop.id),
  ['earth', 'alpha:establish', 'alpha:a', 'alpha:b', 'alpha:departure']);
assert.equal(binaryRoute.repeat, false);
assert.equal(ALPHA_A_INDEX, 65262);
assert.equal(ALPHA_B_INDEX, 65259);
assert.match(catalog.nameOf(ALPHA_A_INDEX), /Rigil Kentaurus/);
assert.match(catalog.nameOf(ALPHA_B_INDEX), /Toliman/);
assert.equal(ALPHA_ORBIT.periodYears, 79.91);
const binaryRun = makeRun(null, binaryRoute, 'preview');
const binary = binaryRun.universe.system(ALPHA_SYSTEM_ID);
assert.equal(binary.starId, ALPHA_SYSTEM_ID);
assert.equal(binary.roots.length, 1);
assert.equal(binary.roots[0].id, ALPHA_BARY_ID);
assert.deepEqual(binary.bodies.map((body) => body.data.type), ['barycenter', 'star', 'star']);
const alphaA = binary.get(`s${ALPHA_A_INDEX}-star`);
const alphaB = binary.get(`s${ALPHA_B_INDEX}-star`);
assert.equal(alphaA.parent, binary.roots[0]);
assert.equal(alphaB.parent, binary.roots[0]);
assert.ok(alphaA.radius > alphaB.radius && alphaA.data.temperature > alphaB.data.temperature);
assert.ok(alphaA.data.mass > alphaB.data.mass);
const epochJd = binaryRun.time.jd;
for (const years of [0, 20, 40, 79.91]) {
  binary.update(epochJd + years * 365.25, 0);
  const separationAu = alphaA.position.distanceTo(alphaB.position) / 149_597_870.7;
  assert.ok(separationAu >= 11 && separationAu <= 36, `binary separation ${separationAu} AU`);
  const center = alphaA.position.clone().multiplyScalar(alphaA.data.mass)
    .addScaledVector(alphaB.position, alphaB.data.mass).divideScalar(binary.roots[0].data.mass);
  assert.ok(center.length() < 1e-5, 'both stars orbit the shared barycenter');
}
binary.update(epochJd, 0);
assert.equal(binary.bodies.filter((body) => body.data.type === 'planet').length, 0);
const earthOrigin = binaryRun.universe.current.origin;
const distantA = alphaPointDirection(binary, alphaA, earthOrigin, new THREE.Vector3());
const distantB = alphaPointDirection(binary, alphaB, earthOrigin, new THREE.Vector3());
assert.ok(distantA.angleTo(distantB) < 0.001,
  'pre-arrival catalogue points use the real orbit and remain unresolved from Earth');
const localCamera = new THREE.Vector3(0, 3e9, 0);
for (const star of [alphaA, alphaB]) {
  const globalCamera = binary.origin.clone().add(localCamera);
  const globalDirection = alphaPointDirection(binary, star, earthOrigin, globalCamera);
  const localDirection = alphaPointDirection(binary, star, binary.origin, localCamera);
  assert.ok(globalDirection.distanceTo(localDirection) < 0.01,
    'the catalogue point stays fixed through the frame switch');
}
const binaryPoints = new StarPoints(catalog, new THREE.Scene());
binaryPoints.update(new THREE.Vector3(), -1, ALPHA_A_INDEX, 0.6, new THREE.Vector3(1, 0, 0),
  { index: ALPHA_B_INDEX, opacity: 0.4, direction: new THREE.Vector3(0, 1, 0) });
const pointUniforms = binaryPoints.points.material.uniforms;
assert.equal(pointUniforms.uReachTargetIndex.value, ALPHA_A_INDEX);
assert.equal(pointUniforms.uReachSecondIndex.value, ALPHA_B_INDEX);
assert.equal(pointUniforms.uReachSecondOpacity.value, 0.4);
assert.equal(pointUniforms.uReachTargetMaxPx.value, 7, 'binary points stay small in wide shots');
binaryPoints.update(new THREE.Vector3(), 0);
assert.equal(pointUniforms.uReachSecondIndex.value, -1, 'ordinary skies clear the second target');
assert.equal(pointUniforms.uReachTargetMaxPx.value, 30, 'ordinary star points keep their existing size');
const establish = until(binaryRun, (s) => s.destinationId === 'alpha:establish' && s.phase.kind === 'observe');
assert.equal(establish.frame.starId, ALPHA_SYSTEM_ID);
assert.equal(establish.camera.referenceId, ALPHA_BARY_ID);
assert.equal(binaryRun.director.alphaCinematic.stage, 'establish');
const wideCamera = binaryRun.camera.position.clone();
const toA = alphaA.position.clone().sub(wideCamera);
const toB = alphaB.position.clone().sub(wideCamera);
assert.ok(toA.angleTo(toB) > 0.2 && toA.angleTo(toB) < 50 * Math.PI / 180,
  'the establishing shot resolves both stars inside the 50-degree view');
const forwardWide = new THREE.Vector3(0, 0, -1).applyQuaternion(binaryRun.camera.quaternion);
assert.ok(forwardWide.angleTo(toA) < 25 * Math.PI / 180);
assert.ok(forwardWide.angleTo(toB) < 25 * Math.PI / 180);
assert.ok(alphaA.radius / toA.length() < 0.001 && alphaB.radius / toB.length() < 0.001,
  'wide-shot stellar discs retain physical angular size');
const projectionCamera = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 1e12);
function projected(star) {
  projectionCamera.quaternion.copy(binaryRun.camera.quaternion);
  projectionCamera.updateMatrixWorld();
  return star.position.clone().sub(binaryRun.camera.position).normalize().multiplyScalar(1e10).project(projectionCamera);
}
for (const star of [alphaA, alphaB]) {
  const p = projected(star);
  assert.ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.7 && p.z < 1,
    'both physical stars appear comfortably inside the establishing frustum');
}
const lmcIndex = Array.from({ length: binaryRun.universe.galaxies.catalogCount }, (_, i) => i)
  .find((i) => binaryRun.universe.galaxies.rawName(i).includes('Büyük Macellan'));
assert.notEqual(lmcIndex, undefined);
const lmcDirection = binaryRun.universe.galaxies.position(lmcIndex)
  .sub(binary.origin.clone().add(binaryRun.camera.position).divideScalar(PARSEC_KM)).normalize();
assert.ok(forwardWide.angleTo(lmcDirection) > 0.65,
  'the composed sight line clears the nearby Large Magellanic Cloud sprite');
let previousPosition = binaryRun.camera.position.clone();
let previousDirection = forwardWide.clone();
let crossedAu = 0;
let sawCross = false;
let sawA = false;
let sawB = false;
const stages = new Set();
for (let i = 0; i < 1500 && !binaryRun.director.terminalObservation; i++) {
    step(binaryRun);
    assert.equal(binaryRun.universe.current.starId, ALPHA_SYSTEM_ID);
    const movement = binaryRun.camera.position.distanceTo(previousPosition);
    assert.ok(movement < alphaA.position.distanceTo(alphaB.position) * 0.04,
      'the binary camera changes position continuously');
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(binaryRun.camera.quaternion);
    assert.ok(direction.angleTo(previousDirection) < 0.04,
      'the binary camera does not snap to an unrelated sky direction');
    assert.ok(binaryRun.camera.position.distanceTo(alphaA.position) > alphaA.radius * 4.5);
    assert.ok(binaryRun.camera.position.distanceTo(alphaB.position) > alphaB.radius * 4.5);
    const shot = binaryRun.director.alphaCinematic;
    stages.add(shot.stage);
    const toTarget = shot.target.sub(binaryRun.camera.position).normalize();
    assert.ok(direction.angleTo(toTarget) < 0.005, 'the camera keeps its intended target projected');
    if (shot.stage === 'approach-a' || shot.stage === 'approach-b') {
      const p = projected(shot.stage === 'approach-a' ? alphaA : alphaB);
      assert.ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.7,
        'the active star stays in frame throughout its approach');
    }
    if (shot.stage === 'cross-to-b') { sawCross = true; crossedAu += movement / 149_597_870.7; }
    if (shot.stage === 'observe-a') {
      sawA = true;
      assert.ok(Math.abs(binaryRun.camera.position.distanceTo(alphaA.position) / alphaA.radius
        - REACH_NEARBY_OBSERVATION_RADII) < 0.01);
      assert.ok(Math.abs(projected(alphaA).x) < 0.01 && Math.abs(projected(alphaA).y) < 0.01);
    }
    if (shot.stage === 'observe-b') {
      sawB = true;
      assert.ok(Math.abs(binaryRun.camera.position.distanceTo(alphaB.position) / alphaB.radius
        - REACH_NEARBY_OBSERVATION_RADII) < 0.01);
      assert.ok(Math.abs(projected(alphaB).x) < 0.01 && Math.abs(projected(alphaB).y) < 0.01);
    }
    previousPosition.copy(binaryRun.camera.position);
    previousDirection.copy(direction);
}
assert.ok(sawA && sawB && sawCross && crossedAu > 1, 'the camera observes both stars and crosses the system');
assert.deepEqual([...stages], ['establish', 'approach-a', 'observe-a', 'retract-a',
  'cross-to-b', 'approach-b', 'observe-b', 'retract-b', 'final-overview']);
const handoff = reachPilotStarAppearance(ALPHA_B_INDEX, 0.82, true, false);
assert.ok(handoff.pointOpacity > 0 && handoff.pointOpacity < 1);
assert.equal(handoff.pointOpacity + handoff.discScale, 1);
const terminal = binaryRun.director.capture();
assert.equal(terminal.frame.starId, ALPHA_SYSTEM_ID);
assert.equal(binaryRun.director.terminalObservation, true);
const finalA = alphaA.position.clone().sub(binaryRun.camera.position);
const finalB = alphaB.position.clone().sub(binaryRun.camera.position);
assert.ok(finalA.angleTo(finalB) > 0.2 && finalA.angleTo(finalB) < 50 * Math.PI / 180);
for (const star of [alphaA, alphaB]) {
  const p = projected(star);
  assert.ok(Math.abs(p.x) < 0.95 && Math.abs(p.y) < 0.7 && p.z < 1,
    'both stars remain inside the final overview frustum');
}
const heldPosition = binaryRun.camera.position.clone();
const heldOrientation = binaryRun.camera.quaternion.clone();
for (let i = 0; i < 100; i++) step(binaryRun);
assert.ok(binaryRun.camera.position.distanceTo(heldPosition) < 1e-8);
assert.ok(binaryRun.camera.quaternion.angleTo(heldOrientation) < 1e-8);
assert.equal(binaryRun.director.capture().destinationId, 'alpha:departure');
assert.equal(binaryRun.director.roundTrips, 0);
assert.equal(parseReachJourney(JSON.stringify(terminal), REACH_PRODUCTION_ROUTE, () => true), null);
console.log('PASS real Proxima catalogue, Solar departure, frame switch, arrival, resume, distance, invalid recovery');
console.log('PASS isolated short preview, handoff state, generated-body points, and terminal observation');
console.log('PASS eight nearby catalogue stars, preview routes, clearance, handoff, observation and save isolation');
console.log('PASS Alpha Centauri barycentric orbit, two-star framing, A/B close-ups and terminal preview isolation');
