import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';

const bundle = await rolldown({
  input: '\0reach-info-card-test',
  plugins: [{
    name: 'reach-info-card-test',
    resolveId(id) { if (id === '\0reach-info-card-test') return id; },
    load(id) {
      if (id === '\0reach-info-card-test')
        return "export { reachInfoTarget, reachInfoSide, reachInfoPlacement, reachInfoOpacity } from './src/reach/ReachInfoCard.ts';";
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('module', 'exports', output.output[0].code)(module, module.exports);
const { reachInfoTarget, reachInfoSide, reachInfoPlacement, reachInfoOpacity } = module.exports;

assert.equal(reachInfoSide(-0.6, null), 'right');
assert.equal(reachInfoSide(0.6, null), 'left');
assert.equal(reachInfoSide(0, null), 'left');
assert.equal(reachInfoSide(0, 'right'), 'left');
assert.equal(reachInfoSide(-0.1, 'right'), 'right');
assert.equal(reachInfoSide(-0.1, 'left'), 'left');
assert.equal(reachInfoSide(-0.2, 'left'), 'right');
assert.deepEqual(reachInfoPlacement(-0.5, 0, 30, 1200, 800, null),
  { side: 'right', vertical: 'center', width: 400, availableHeight: 688 });
assert.deepEqual(reachInfoPlacement(0.5, 0, 30, 1200, 800, null),
  { side: 'left', vertical: 'center', width: 400, availableHeight: 688 });
assert.deepEqual(reachInfoPlacement(0, 0, 30, 1200, 800, null),
  { side: 'left', vertical: 'center', width: 400, availableHeight: 688 });
assert.equal(reachInfoPlacement(0, 0.5, 90, 320, 600, null).vertical, 'bottom');

const earth = { stop: { id: 'earth', profile: 'planet' }, elapsed: 0, remaining: 30, departing: true };
const star = { stop: { id: 'star:c64548', profile: 'star',
  ref: { kind: 'star', starId: 'c64548' } }, elapsed: 8, remaining: 20, departing: true };
const resolve = (stop) => stop.ref ?? { kind: 'body', systemId: 'c0', bodyId: stop.id };
assert.deepEqual(reachInfoTarget(earth, true, resolve), { kind: 'body', systemId: 'c0', bodyId: 'earth' });
assert.deepEqual(reachInfoTarget(star, true, resolve), { kind: 'star', starId: 'c64548' });
assert.equal(reachInfoTarget(star, false, resolve), null);
assert.equal(reachInfoTarget(null, true, resolve), null);
assert.equal(reachInfoTarget(null, false, resolve), null);
assert.equal(reachInfoOpacity(earth), 0);
assert.equal(reachInfoOpacity({ ...earth, elapsed: 2 }), 0.4);
assert.equal(reachInfoOpacity({ ...star, remaining: 2 }), 0.4);
assert.equal(reachInfoOpacity(star), 1);
assert.equal(reachInfoOpacity(null), 0);
assert.equal(reachInfoOpacity({ ...star, remaining: 0 }), 0);
assert.equal(reachInfoOpacity({ ...star, remaining: 0, departing: false }), 1);

// Keep the explorer's original controls and update path while Reach uses the passive card.
const html = readFileSync('index.html', 'utf8');
const main = readFileSync('src/main.ts', 'utf8');
const css = readFileSync('src/style.css', 'utf8');
for (const id of ['act-goto', 'act-center', 'act-follow', 'info-close', 'info-expand'])
  assert.ok(html.includes(`id="${id}"`), `explorer control ${id} retained`);
assert.match(main, /if \(!REACH_MODE\) this\.ui\.update\(/);
assert.match(main, /this\.panorama\?\.isPrimaryDisplay !== false/);
assert.match(css, /body\.reach-mode #info \.info-actions \{ display: none !important; \}/);
assert.match(css, /body\.reach-mode #info \.info-head-btns,/);
assert.match(css, /body\.reach-mode #info \{[\s\S]*?max-height: none; overflow-y: visible;/);

console.log('PASS Reach card position, phase fade, identity, monitor isolation, and explorer controls');
