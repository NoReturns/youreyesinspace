import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { ORBIT_REFERENCES, selectOrbitReference, orbitRadiusPx, scalePreviewEnabled,
    ReachScaleComparison } from './src/reach/ReachScaleComparison.ts';
  export { reachPreviewRoute, REACH_PRODUCTION_ROUTE } from './src/reach/ReachVoyageDirector.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { LANDMARKS } from './src/data/landmarks.ts';
  export { AU_KM } from './src/core/constants.ts';
  export { SUN_RADIUS_KM } from './src/astro/stellar.ts';
`;
const bundle = await rolldown({
  input: '\0reach-scale-comparison-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-scale-comparison-test',
    resolveId(id, importer) {
      if (id === '\0reach-scale-comparison-test') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-scale-comparison-test') return entry;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const testModule = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' },
  testModule, testModule.exports,
);
const { ORBIT_REFERENCES, selectOrbitReference, orbitRadiusPx, scalePreviewEnabled,
  ReachScaleComparison, reachPreviewRoute, REACH_PRODUCTION_ROUTE, StarCatalog, LANDMARKS,
  AU_KM, SUN_RADIUS_KM } = testModule.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const betelRadiusKm = catalog.info(25822).radiusKm;
const woh = LANDMARKS.find((entry) => entry.id === 'l-wohg64');
assert.ok(woh?.star, 'WOH G64 must have a physical stellar radius');
const wohRadiusKm = woh.star.radiusSolar * SUN_RADIUS_KM;

assert.deepEqual(ORBIT_REFERENCES.map((reference) => reference.id), ['earth', 'jupiter', 'neptune']);
assert.ok(Math.abs(ORBIT_REFERENCES[0].radiusKm / AU_KM - 1) < 0.001);
assert.ok(Math.abs(ORBIT_REFERENCES[1].radiusKm / AU_KM - 5.2) < 0.01);
assert.ok(Math.abs(ORBIT_REFERENCES[2].radiusKm / AU_KM - 30.1) < 0.05);
assert.equal(selectOrbitReference(betelRadiusKm)?.id, 'earth');
assert.equal(selectOrbitReference(wohRadiusKm)?.id, 'jupiter');
assert.equal(selectOrbitReference(30 * AU_KM)?.id, 'neptune');
assert.equal(selectOrbitReference(0), null);
assert.equal(selectOrbitReference(Number.NaN), null);
for (const radiusKm of [betelRadiusKm, wohRadiusKm]) {
  const reference = selectOrbitReference(radiusKm);
  const starPx = 150;
  const ringPx = orbitRadiusPx(starPx, radiusKm, reference.radiusKm);
  assert.ok(Math.abs(ringPx / starPx - reference.radiusKm / radiusKm) < 1e-12);
  assert.ok(ringPx < starPx, 'selected reference fits inside the physical stellar disc');
}

const betelRoute = reachPreviewRoute('betelgeuse');
const wohRoute = reachPreviewRoute('woh-g64');
assert.equal(betelRoute?.stops[1].ref.starId, 'c25822');
assert.equal(wohRoute?.stops[1].ref.starId, `l${LANDMARKS.indexOf(woh)}`);
assert.equal(betelRoute?.repeat, false);
assert.equal(wohRoute?.repeat, false);
assert.equal(REACH_PRODUCTION_ROUTE.stops.some((stop) =>
  stop.id === betelRoute.stops[1].id), true);
assert.equal(REACH_PRODUCTION_ROUTE.stops.some((stop) =>
  stop.id === wohRoute.stops[1].id), true);
assert.equal(reachPreviewRoute('proxima')?.id, 'preview:proxima');
assert.equal(scalePreviewEnabled(true, true, 'betelgeuse', '1', true), true);
assert.equal(scalePreviewEnabled(true, true, 'woh-g64', '1', true), true);
for (const args of [
  [false, true, 'betelgeuse', '1', true], [true, false, 'betelgeuse', '1', true],
  [true, true, 'betelgeuse', null, true], [true, true, 'betelgeuse', '1', false],
  [true, true, 'proxima', '1', true], [true, true, null, '1', true],
]) assert.equal(scalePreviewEnabled(...args), false, 'other modes cannot construct the overlay');

const circles = [];
const ctx = {
  save() {}, restore() {}, setTransform() {}, beginPath() {}, stroke() {}, fillRect() {}, fillText() {},
  moveTo() {}, lineTo() {}, measureText(text) { return { width: text.length * 7 }; },
  arc(x, y, radius) { circles.push({ x, y, radius }); },
};
const overlay = new ReachScaleComparison({ getContext: () => ctx });
const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.001, 1e10);
camera.updateProjectionMatrix();
const distance = betelRadiusKm * 5;
const height = 1080;
const apparentRadiusPx = betelRadiusKm / distance * height / 2 / Math.tan(25 * Math.PI / 180);
overlay.draw({ body: { radius: betelRadiusKm }, distance, apparentRadiusPx,
  relPos: new THREE.Vector3(0, 0, -distance) }, camera, 1920, height, 1);
assert.equal(circles.length, 1);
assert.ok(Math.abs(circles[0].x - 960) < 1e-8 && Math.abs(circles[0].y - 540) < 1e-8);
const expectedDiscPx = apparentRadiusPx / Math.sqrt(1 - (betelRadiusKm / distance) ** 2);
assert.ok(Math.abs(circles[0].radius
  - expectedDiscPx * selectOrbitReference(betelRadiusKm).radiusKm / betelRadiusKm) < 1e-8);

console.log('PASS Reach scale references, both stars, projection ratio, and opt-in isolation');
