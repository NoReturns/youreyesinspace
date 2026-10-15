import assert from 'node:assert/strict';
import { rolldown } from 'rolldown';
import { Vector3 } from 'three';

const bundle = await rolldown({
  input: './src/render/StellarConvection.ts',
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('module', 'exports', output.output[0].code)(module, module.exports);
const { stellarConvection, setStellarConvectionPhase } = module.exports;
assert.equal(stellarConvection('l-wohg64'), 'woh-g64');
assert.equal(stellarConvection('s25822-star'), 'betelgeuse');
for (const id of ['sun', 'l-etacar', 'l-r136a1', 'l-wohg64-comp']) {
  assert.equal(stellarConvection(id), null);
}
const phase = (kind, seconds) => {
  const value = new Vector3();
  setStellarConvectionPhase(kind, seconds, value);
  return value;
};
for (const seconds of [0, 10, 30, 3600]) {
  const betelgeuse = phase('betelgeuse', seconds);
  assert.equal(betelgeuse.x, Math.cos(seconds * 0.035));
  assert.equal(betelgeuse.y, Math.sin(seconds * 0.035));
  assert.equal(betelgeuse.z, Math.sin(seconds * 0.061));
  const woh = phase('woh-g64', seconds);
  assert.equal(woh.x, Math.cos(seconds * 0.024));
  assert.equal(woh.y, Math.sin(seconds * 0.024));
  assert.equal(woh.z, Math.sin(seconds * 0.038));
}
assert.notDeepEqual(phase('woh-g64', 0).toArray(), phase('woh-g64', 30).toArray());
console.log('WOH G64 convection identity and wall-clock phase regression passed.');
