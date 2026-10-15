import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { ReachSagittariusPreview } from './src/reach/ReachSagittariusPreview.ts';
  export { reachPreviewRoute, REACH_PRODUCTION_ROUTE } from './src/reach/ReachVoyageDirector.ts';
`;
const bundle = await rolldown({
  input: '\0reach-sgra-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-sgra-test',
    resolveId(id) { if (id === '\0reach-sgra-test') return id; },
    load(id) { if (id === '\0reach-sgra-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String,
    fmtNum: String, localeTag: () => 'en' },
  module, module.exports,
);
const { Universe, StarCatalog, CameraController, ReachSagittariusPreview,
  reachPreviewRoute, REACH_PRODUCTION_ROUTE } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const universe = new Universe(catalog);
universe.switchTo('b0', 2460000, 0);
universe.update(2460000, 0);
const body = universe.get('sgra');
assert.ok(body && body.data.appearance.kind === 'blackhole');
const route = reachPreviewRoute('sgra');
assert.equal(route.stops.length, 1);
assert.deepEqual(route.stops[0].ref, { kind: 'body', systemId: 'b0', bodyId: 'sgra' });
assert.equal(REACH_PRODUCTION_ROUTE.stops.some((stop) => stop.id === 'sgra'), false);
const camera = new CameraController(universe);
const preview = new ReachSagittariusPreview(body, camera);
const first = camera.position.clone();
let minRadius = Infinity;
let maxStep = 0;
let maxTurn = 0;
let previous = camera.position.clone();
let previousOrientation = camera.quaternion.clone();
for (let i = 0; i <= preview.duration * 60; i++) {
  preview.update(1 / 60);
  const radius = camera.position.distanceTo(body.position) / body.radius;
  minRadius = Math.min(minRadius, radius);
  maxStep = Math.max(maxStep, camera.position.distanceTo(previous) / body.radius);
  maxTurn = Math.max(maxTurn, camera.quaternion.angleTo(previousOrientation) * 180 / Math.PI);
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
  const target = body.position.clone().sub(camera.position).normalize();
  assert.ok(forward.dot(target) > 0.99999, 'camera points at the black hole');
  previous.copy(camera.position);
  previousOrientation.copy(camera.quaternion);
}
assert.ok(minRadius >= 19.999, 'camera clears the disk and event horizon');
assert.ok(maxStep < 0.2, `adjacent frame positions are continuous (${maxStep} r_s)`);
assert.ok(maxTurn < 0.5, `adjacent frame orientations are continuous (${maxTurn} degrees)`);
assert.ok(camera.position.distanceTo(first) / body.radius < 0.001, 'round trip has no seam');
console.log(`PASS Sagittarius preview route, ${minRadius.toFixed(1)} r_s clearance, continuous ${preview.duration}s camera loop`);
