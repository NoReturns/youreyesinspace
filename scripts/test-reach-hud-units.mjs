import assert from 'node:assert/strict';
import { rolldown } from 'rolldown';

const entry = `
  export { formatVoyageDistance, formatApproxSpeed, ReachOdometerOverlay } from './src/reach/ReachOdometer.ts';
  export { AU_KM, LIGHT_YEAR_KM } from './src/core/constants.ts';
`;
const bundle = await rolldown({
  input: '\0reach-hud-units-test',
  external: (id) => id === 'three',
  plugins: [{
    name: 'reach-hud-units-test',
    resolveId(id) { if (id === '\0reach-hud-units-test') return id; },
    load(id) { if (id === '\0reach-hud-units-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => { if (id === 'three') return {}; throw new Error(`unexpected require ${id}`); }, module, module.exports,
);
const { formatVoyageDistance, formatApproxSpeed, ReachOdometerOverlay, AU_KM, LIGHT_YEAR_KM } = module.exports;
const MLY_KM = LIGHT_YEAR_KM * 1_000_000;
const GLY_KM = LIGHT_YEAR_KM * 1_000_000_000;

assert.equal(formatVoyageDistance(0), '0 km');
assert.equal(formatVoyageDistance(-1), '0 km');
assert.match(formatVoyageDistance(12_345), /km$/);
assert.ok(!formatVoyageDistance(0.005 * AU_KM).includes('AU'), 'sub-0.01 AU uses km');
assert.equal(formatVoyageDistance(42.681 * AU_KM), '42.681 AU');
assert.equal(formatVoyageDistance(LIGHT_YEAR_KM), '1 LY');
assert.match(formatVoyageDistance(999 * AU_KM), /AU$/);
assert.match(formatVoyageDistance(1000 * AU_KM), /LY$/);
assert.equal(formatVoyageDistance(MLY_KM), '1 million LY');
assert.equal(formatVoyageDistance(GLY_KM), '1 billion LY');
assert.match(formatVoyageDistance(LIGHT_YEAR_KM * 0.009), /AU$/);
assert.equal(formatVoyageDistance(0.3663 * MLY_KM), '366,300 LY');
assert.equal(formatVoyageDistance(MLY_KM - LIGHT_YEAR_KM), '999,999 LY');
assert.ok(!formatVoyageDistance(1e-6 * AU_KM).includes('0.000000'), 'no long fractional AU');

assert.equal(formatApproxSpeed(0), 'Approx Speed: 0 km/s');
assert.equal(formatApproxSpeed(-5), 'Approx Speed: 0 km/s');
assert.match(formatApproxSpeed(0.1), /km\/s$/);
assert.equal(formatApproxSpeed(1e-9), 'Approx Speed: < 0.000001 km/s');
assert.match(formatApproxSpeed(5), /km\/s$/);
assert.equal(formatApproxSpeed(AU_KM), 'Approx Speed: 1 AU/s');
assert.equal(formatApproxSpeed(LIGHT_YEAR_KM), 'Approx Speed: 1 LY/s');

const element = { dataset: {}, setAttribute() {}, textContent: '' };
globalThis.document = { createElement: () => element, body: { appendChild() {} } };
const director = { countdown: { routeIndex: 38, phase: 'NEXT' },
  distanceTravelledKm: 0.3663 * MLY_KM, activeLegDistanceKm: 10_000,
  odometerStationary: false };
const overlay = new ReachOdometerOverlay(director, 'auto');
overlay.update(0);
director.activeLegDistanceKm += 500;
overlay.update(1000);
assert.match(element.textContent, /Distance Travelled: 366,300 LY\nApprox Speed: 500 km\/s$/,
  'a Solar System leg on top of interstellar cumulative distance retains its speed');
director.countdown = { routeIndex: 39, phase: 'CRUISE' };
director.activeLegDistanceKm = null;
overlay.update(2000);
assert.doesNotMatch(element.textContent, /Approx Speed/, 'departure has no measured speed');
director.countdown = { routeIndex: 39, phase: 'NEXT' };
director.activeLegDistanceKm = 0;
overlay.update(3000);
assert.doesNotMatch(element.textContent, /Approx Speed/, 'handoff cannot create a speed spike');
director.activeLegDistanceKm = 0.0001;
overlay.update(4000);
assert.match(element.textContent, /Approx Speed: 0.0001 km\/s$/);
director.odometerStationary = true;
director.countdown = { routeIndex: 39, phase: 'DEPART' };
overlay.update(5000);
assert.match(element.textContent, /Approx Speed: 0 km\/s$/);

console.log('PASS adaptive voyage distance and approx speed HUD units');
