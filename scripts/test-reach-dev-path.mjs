import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { ReachVoyageDirector, REACH_ITINERARY, reachDestinationQueueRoute,
    reachDestinationTestRoute, reachPreviewRoute }
    from './src/reach/ReachVoyageDirector.ts';
  export { destinationRef, destinationSystem } from './src/reach/ReachDestinations.ts';
  export { parseReachJourney } from './src/reach/JourneyState.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
  export { createAlphaCentauriPreviewSystem } from './src/reach/ReachAlphaCentauri.ts';
  export { ReachPanoramaSync } from './src/reach/ReachPanorama.ts';
`;
const bundle = await rolldown({
  input: '\0reach-dev-path-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-dev-path-test',
    resolveId(id, importer) {
      if (id === '\0reach-dev-path-test') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-dev-path-test') return entry;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, fmtNum: String, localeTag: () => 'en' },
  module, module.exports,
);
const { ReachVoyageDirector, REACH_ITINERARY, reachDestinationQueueRoute,
  reachDestinationTestRoute, reachPreviewRoute,
  destinationRef, destinationSystem, parseReachJourney, CameraController,
  TimeSystem, Universe, StarCatalog, ReachTiming, createAlphaCentauriPreviewSystem,
  ReachPanoramaSync } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
function run(route, cruiseSeconds) {
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  const universe = new Universe(catalog, createAlphaCentauriPreviewSystem(catalog));
  universe.switchTo(destinationSystem(route.stops[0]), time.jd, time.t);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time,
    new ReachTiming('preview', () => 0.5, cruiseSeconds), null, undefined, route);
  director.startDeveloperDeparture();
  assert.equal(director.capture().phase.kind, 'departure');
  const seen = new Set(['departure']);
  for (let i = 0; i < (cruiseSeconds + 5) * 10; i++) {
    const dt = 0.1;
    time.advance(dt);
    universe.update(time.jd, time.t);
    if (director.directing) director.update(dt, false);
    else {
      camera.update(dt, input, 1920, 1080, Math.PI / 3);
      director.update(dt, false);
    }
    const state = director.capture();
    seen.add(state.phase.kind);
    assert.ok(camera.position.toArray().every(Number.isFinite));
    if (state.phase.kind === 'cruise') assert.equal(state.phase.duration, cruiseSeconds);
    if (state.destinationId === route.stops[1].id
      && (state.phase.kind === 'observe' || state.phase.kind === 'flyby')) {
      assert.deepEqual([...seen], ['departure', 'cruise', state.phase.kind]);
      assert.equal(state.frame.starId, destinationSystem(route.stops[1]));
      assert.equal(state.odometer.leg, null);
      assert.ok(parseReachJourney(JSON.stringify(state), route, (id) => {
        const stop = route.stops.find((candidate) => candidate.id === id);
        if (stop) {
          const ref = destinationRef(stop);
          if (ref.kind === 'landmark') return !!universe.landmark(id);
          const system = universe.system(ref.kind === 'star' ? ref.starId : ref.systemId);
          return !!(ref.kind === 'star' ? system.star : system.get(ref.bodyId));
        }
        return !!universe.get(id) || !!universe.system('c0').get(id) || !!universe.landmark(id);
      }));
      return;
    }
  }
  throw new Error(`Developer route did not reach ${route.stops[1].id}`);
}

const oldRoute = reachPreviewRoute('pluto-to-sgra');
assert.deepEqual(oldRoute.stops.map((stop) => stop.id), ['pluto', 'sgra']);
run(oldRoute, 8);
assert.equal(reachDestinationTestRoute(0, 0), null);
assert.equal(reachDestinationTestRoute(-1, 5), null);
assert.equal(reachDestinationTestRoute(59, 70), null);
assert.equal(reachDestinationTestRoute(0, 71), null);
const byId = (id) => REACH_ITINERARY.findIndex((stop) => stop.id === id);
run(reachDestinationTestRoute(byId('earth'), byId('mars')), 8);
run(reachDestinationTestRoute(byId('star:c83130'), byId('star:l17')), 12);
run(reachDestinationTestRoute(byId('earth'), byId('l-pleiades')), 8);
assert.deepEqual(reachDestinationQueueRoute(0, ['sgra', '70', '69', '4']).stops.map((stop) => stop.id),
  ['earth', 'sgra', 'star:l17', 'l-30dor', 'jwst']);
assert.throws(() => reachDestinationQueueRoute(0, []), /empty/);
assert.throws(() => reachDestinationQueueRoute(59, ['4']), /source/);
assert.throws(() => reachDestinationQueueRoute(0, ['bogus']), /destination 1.*unavailable/);
assert.throws(() => reachDestinationQueueRoute(0, ['71']), /destination 1.*unavailable/);
assert.throws(() => reachDestinationQueueRoute(0, ['0']), /destination 1.*repeats/);
assert.ok(!REACH_ITINERARY.some((stop) => stop.id === 'sgra'));

function runQueue(tokens, cruiseSeconds) {
  const route = reachDestinationQueueRoute(0, tokens);
  const time = new TimeSystem(new Date('2026-10-10T00:00:00Z'));
  const universe = new Universe(catalog, createAlphaCentauriPreviewSystem(catalog));
  universe.switchTo(destinationSystem(route.stops[0]), time.jd, time.t);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time,
    new ReachTiming('preview', () => 0.5, cruiseSeconds), null, undefined, route);
  director.startDeveloperDeparture();
  const arrivals = [];
  const cruises = [];
  let lastPhase = '';
  let observationStart = -1;
  for (let i = 0; i < 3000; i++) {
    const dt = 0.1;
    time.advance(dt);
    universe.update(time.jd, time.t);
    if (director.directing) director.update(dt, false);
    else {
      camera.update(dt, input, 1920, 1080, Math.PI / 3);
      director.update(dt, false);
    }
    const state = director.capture();
    const phase = state.phase.kind;
    if (phase !== lastPhase) {
      if (phase === 'cruise') cruises.push(state.phase.duration);
      if (phase === 'observe' || phase === 'flyby') {
        arrivals.push(state.destinationId);
        observationStart = i;
      }
      if (phase === 'departure' && lastPhase !== '') {
        assert.ok(observationStart >= 0);
        const previous = route.stops[arrivals.length];
        const required = previous.id === 'alpha-centauri-ab' ? 87.9
          : previous.profile === 'landmark' ? 89.9 : 5.9;
        assert.ok((i - observationStart) * dt >= required,
          `Departed ${arrivals.at(-1)} before its observation completed`);
      }
      lastPhase = phase;
    }
    assert.equal(director.queueStatus.count, tokens.length);
    if (director.queueStatus.complete) {
      assert.deepEqual(arrivals, route.stops.slice(1).map((stop) => stop.id));
      assert.deepEqual(cruises, tokens.map(() => cruiseSeconds));
      for (let j = 0; j < 30; j++) director.update(dt, false);
      assert.equal(director.queueStatus.complete, true);
      assert.equal(director.capture().phase.kind, phase);
      return;
    }
  }
  throw new Error(`Queue did not complete: ${tokens.join(',')}`);
}
runQueue(['5'], 8);
runQueue(['sgra', '70', '4'], 8);
runQueue(['2'], 8);
runQueue(['69'], 8);
runQueue(['48', '5'], 8);
const channels = new Map();
globalThis.window = { addEventListener() {} };
globalThis.BroadcastChannel = class {
  constructor(name) { this.name = name; channels.set(name, [...(channels.get(name) ?? []), this]); }
  postMessage(frame) {
    for (const peer of channels.get(this.name)) if (peer !== this) peer.onmessage?.({ data: frame });
  }
  close() {}
};
const sessionId = 'a'.repeat(32);
const primary = new ReachPanoramaSync({ sessionId, isPrimaryDisplay: true });
const left = new ReachPanoramaSync({ sessionId, isPrimaryDisplay: false });
const right = new ReachPanoramaSync({ sessionId, isPrimaryDisplay: false });
for (const [destinationId, phase] of [['sgra', 'CRUISE'], ['sgra', 'NEXT'],
  ['star:l17', 'DEPART'], ['star:l17', 'NEXT']]) {
  primary.publish({ jd: 2460000, rate: 1, paused: false, starId: 'b0',
    position: [1, 2, 3], orientation: [0, 0, 0, 1], referenceId: 'b0', targetId: destinationId,
    destinationId, phase, secondsLeft: 4, compositionShiftX: 12 });
  assert.equal(left.latest.destinationId, destinationId);
  assert.equal(right.latest.phase, phase);
  left.publish({ ...left.latest, destinationId: 'independent' });
  assert.equal(right.latest.destinationId, destinationId);
}
assert.equal(primary.latest, null);
console.log('PASS single and ordered queues, shared cruise, observation gate, terminal cases, invalid destinations, panorama sync');
