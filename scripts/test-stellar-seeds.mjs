import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const bundle = await rolldown({
  input: '\0stellar-seed-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'stellar-seed-test',
    resolveId(id) { if (id === '\0stellar-seed-test') return id; },
    load(id) {
      if (id === '\0stellar-seed-test') return `
        export { stellarSurfaceSeed } from './src/gen/StellarSeed.ts';
        export { starBody, BLACK_HOLES } from './src/data/blackholes.ts';
        export { LANDMARKS, landmarkStarBodies } from './src/data/landmarks.ts';
        export { generateSystem } from './src/gen/SystemGenerator.ts';
      `;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (value) => value, fixed: String,
    fmtNum: String, localeTag: () => 'en' },
  module, module.exports,
);
const { stellarSurfaceSeed, starBody, BLACK_HOLES, LANDMARKS, landmarkStarBodies, generateSystem } = module.exports;
const targets = [
  ['l-etacar', 'Eta Carinae', 2395],
  ['l-r136a1', 'R136a1', 7025],
  ['l-wohg64', 'WOH G64', 6261],
];
const actual = targets.map(([id, name, expected]) => {
  const def = LANDMARKS.find((item) => item.id === id);
  assert.equal(def?.name, name);
  const seed = landmarkStarBodies(def)[0].appearance.seed;
  assert.equal(seed, expected);
  assert.equal(seed, stellarSurfaceSeed(id));
  return seed;
});
assert.equal(new Set(actual).size, targets.length);
assert.equal(starBody('ab', 'test', 1, 1, 5800, '', {}).appearance.seed ===
  starBody('cd', 'test', 1, 1, 5800, '', {}).appearance.seed, false);
assert.ok(actual.every((seed) => seed >= 1024 && seed < 17408 && Math.fround(seed) === seed));

const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalogStar = (index, proper) => ({
  index, hip: 0, name: proper || `HYG ${index}`, names: proper ? { proper } : null,
  massKg: 1.988e30, massSolar: 1, radiusKm: 696340, luminosity: 1,
  temperature: 5772, lumClass: 5, isWhiteDwarf: false, spectral: 'G2V',
});
const catalogSeed = (index, proper) => generateSystem(catalogStar(index, proper)).bodies[0].appearance.seed;
assert.equal(catalogSeed(25822, 'Betelgeuse'), 900);
assert.equal(catalogSeed(65262, 'Rigil Kentaurus'), 65262 % 997 + 3);
assert.equal(catalogSeed(65259, 'Toliman'), 65259 % 997 + 3);
assert.equal(catalogSeed(1000, ''), 1000 % 997 + 3);
assert.equal(catalogSeed(29786, 'Sirius'), stellarSurfaceSeed('s29786-star'));
assert.equal(catalogSeed(83130, 'Vega'), stellarSurfaceSeed('s83130-star'));

const named = names.filter(([index, proper]) => index !== 0 && proper);
const collisions = new Map();
let namedChanged = 0;
for (const [index, proper] of named) {
  const seed = catalogSeed(index, proper);
  if (seed !== index % 997 + 3) namedChanged++;
  const group = collisions.get(seed) ?? [];
  group.push(proper);
  collisions.set(seed, group);
}
const duplicateGroups = [...collisions].filter(([, group]) => group.length > 1);
const authoredStars = [
  ...LANDMARKS.filter((def) => def.star || def.pulsar).flatMap((def) => landmarkStarBodies(def))
    .filter((body) => body.type === 'star'),
  ...BLACK_HOLES.filter((entry) => entry.bodies).flatMap((entry) => entry.bodies())
    .filter((body) => body.type === 'star'),
];
const pulsars = LANDMARKS.filter((def) => def.pulsar)
  .map((def) => landmarkStarBodies(def)[0]);
const pulsarSeeds = new Map();
for (const body of pulsars) {
  const group = pulsarSeeds.get(body.appearance.seed) ?? [];
  group.push(body.id);
  pulsarSeeds.set(body.appearance.seed, group);
}
const pulsarDuplicateGroups = [...pulsarSeeds].filter(([, group]) => group.length > 1);
assert.equal(pulsarDuplicateGroups.length, 0);
assert.ok(pulsars.every((body) => body.appearance.seed === stellarSurfaceSeed(body.id)));
const pulsarChanges = pulsars.map((body) => [body.id,
  (body.id.length * 17) % 991 + 3, body.appearance.seed]);
const authoredBySeed = new Map();
let authoredChanged = 0;
for (const body of authoredStars) {
  if (body.appearance.seed !== (body.id.length * 31) % 997 + 5) authoredChanged++;
  const group = authoredBySeed.get(body.appearance.seed) ?? [];
  group.push(body.id);
  authoredBySeed.set(body.appearance.seed, group);
}
const authoredDuplicateGroups = [...authoredBySeed].filter(([, group]) => group.length > 1);
const crossGroups = [...authoredBySeed].filter(([seed]) => collisions.has(seed))
  .map(([seed, ids]) => [seed, ids, collisions.get(seed)]);
const pulsarCrossGroups = [...pulsarSeeds].filter(([seed]) => authoredBySeed.has(seed) || collisions.has(seed));
assert.equal(authoredDuplicateGroups.length, 0);
assert.equal(duplicateGroups.length, 0);
assert.equal(pulsarCrossGroups.length, 0);
const report = { targets: Object.fromEntries(targets.map(([, name], i) => [name, actual[i]])),
  authoredStarCount: authoredStars.length, authoredChanged, authoredCollisionGroups: authoredDuplicateGroups,
  namedCatalogCount: named.length, namedChanged, namedCatalogCollisionGroups: duplicateGroups,
  crossGroupCollisions: crossGroups, pulsarChanges,
  pulsarCollisionGroups: pulsarDuplicateGroups };
if (process.argv.includes('--inventory')) {
  const inventory = {
    authored: authoredStars.map((body) => ({ id: body.id, name: body.name,
      oldSeed: (body.id.length * 31) % 997 + 5, newSeed: body.appearance.seed })),
    catalogProper: named.map(([index, proper]) => ({ id: `s${index}-star`, name: proper,
      oldSeed: index % 997 + 3, newSeed: catalogSeed(index, proper) })),
    pulsars: pulsars.map((body) => ({ id: body.id, name: body.name,
      oldSeed: (body.id.length * 17) % 991 + 3, newSeed: body.appearance.seed })),
  };
  process.stdout.write(JSON.stringify(inventory, null, 2));
} else if (process.argv.includes('--snapshot')) {
  process.stdout.write(JSON.stringify(report));
} else {
  const launches = Array.from({ length: 2 }, () => spawnSync(process.execPath,
    [fileURLToPath(import.meta.url), '--snapshot'], { cwd: process.cwd(), encoding: 'utf8' }));
  for (const launch of launches) assert.equal(launch.status, 0, launch.error ?? launch.stderr);
  assert.equal(launches[0].stdout, launches[1].stdout);
  assert.equal(launches[0].stdout, JSON.stringify(report));
  console.log(JSON.stringify(report, null, 2));
  console.log('Stellar seed regression passed across two independent launches.');
}
