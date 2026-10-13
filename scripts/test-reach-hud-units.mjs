import assert from 'node:assert/strict';
import { rolldown } from 'rolldown';

const entry = `
  export { formatVoyageDistance, formatApproxSpeed } from './src/reach/ReachOdometer.ts';
  export { AU_KM, C_KM_S, LIGHT_YEAR_KM } from './src/core/constants.ts';
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
const { formatVoyageDistance, formatApproxSpeed, AU_KM, C_KM_S, LIGHT_YEAR_KM } = module.exports;
const MLY_KM = LIGHT_YEAR_KM * 1_000_000;
const GLY_KM = LIGHT_YEAR_KM * 1_000_000_000;

assert.equal(formatVoyageDistance(0), '0 km');
assert.equal(formatVoyageDistance(-1), '0 km');
assert.match(formatVoyageDistance(12_345), /km$/);
assert.ok(!formatVoyageDistance(0.005 * AU_KM).includes('AU'), 'sub-0.01 AU uses km');
assert.equal(formatVoyageDistance(42.681 * AU_KM), '42.681 AU');
assert.equal(formatVoyageDistance(LIGHT_YEAR_KM), '1 ly');
assert.equal(formatVoyageDistance(MLY_KM), '1 Mly');
assert.equal(formatVoyageDistance(GLY_KM), '1 Gly');
assert.match(formatVoyageDistance(LIGHT_YEAR_KM * 0.009), /AU$/);
assert.match(formatVoyageDistance(MLY_KM * 0.009), /ly$/);
assert.ok(!formatVoyageDistance(1e-6 * AU_KM).includes('0.000000'), 'no long fractional AU');

assert.equal(formatApproxSpeed(0), 'APPROX SPEED: 0');
assert.equal(formatApproxSpeed(-5), 'APPROX SPEED: 0');
assert.match(formatApproxSpeed(0.1), /km\/h$/);
assert.ok(formatApproxSpeed(0.001) !== 'APPROX SPEED: 0 c', 'tiny speed not shown as 0 c');
assert.match(formatApproxSpeed(5), /km\/s$/);
assert.match(formatApproxSpeed(C_KM_S * 0.05), /% c$/);
assert.equal(formatApproxSpeed(C_KM_S), 'APPROX SPEED: 1 c');
assert.match(formatApproxSpeed(C_KM_S * 1.82e6), /million c$/);
assert.match(formatApproxSpeed(C_KM_S * 2.5e9), /billion c$/);

console.log('PASS adaptive voyage distance and approx speed HUD units');
