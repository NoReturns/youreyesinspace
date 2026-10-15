import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import { Vector3 } from 'three';
import * as THREE from 'three';

const bundle = await rolldown({
  input: '\0landmark-classification-test',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'landmark-classification-test',
    resolveId(id) { if (id === '\0landmark-classification-test') return id; },
    load(id) {
      if (id === '\0landmark-classification-test') return `
        export { LANDMARKS, landmarkStarInfo } from './src/data/landmarks.ts';
        export { syntheticInfo } from './src/data/blackholes.ts';
        export { starCardMetadata } from './src/data/StarCatalog.ts';
      `;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (value) => value }, module, module.exports,
);
const { LANDMARKS, landmarkStarInfo, syntheticInfo, starCardMetadata } = module.exports;
const position = new Vector3(1, 2, 3);
const cases = [
  ['l-etacar', 'Parlak mavi değişen (LBV)', 'LBV'],
  ['l-r136a1', 'Wolf-Rayet (WN5h)', 'WN5h'],
  ['l-wohg64', 'Evrimleşmiş süperdev', 'M7.5 I'],
  ['l-m31v1', 'Klasik Sefeid', 'F–G Ib'],
];
for (const [id, classification, spectral] of cases) {
  const def = LANDMARKS.find((item) => item.id === id);
  assert.ok(def?.star, `${id} has authored stellar metadata`);
  const info = landmarkStarInfo(def, position);
  const card = starCardMetadata(info);
  assert.equal(card.classification, classification, `${id} card classification`);
  assert.equal(card.spectral, spectral, `${id} card spectral row`);
  assert.equal(info.lumClass, 5, `${id} does not alter the shared synthetic default`);
}

const woh = LANDMARKS.find((item) => item.id === 'l-wohg64');
const wohCard = starCardMetadata(landmarkStarInfo(woh, position));
assert.match(wohCard.note, /M7\.5 I tarihsel katalog tayfıdır/);
assert.match(wohCard.note, /sarı hiperdev/);
assert.match(wohCard.note, /hâlâ kırmızı süperdev/);
assert.match(woh.description, /tarihsel olarak kırmızı süperdev/);

const host = syntheticInfo('Gaia BH1', position, 0.93, 0.99, 5850, 1, 'G V');
assert.equal(host.classification, undefined);
assert.equal(starCardMetadata(host).classification, 'Anakol (cüce)');
assert.equal(starCardMetadata(host).spectral, 'G V');

const ui = readFileSync('src/ui/UI.ts', 'utf8');
assert.match(ui, /const card = starCardMetadata\(s\)/);
assert.match(ui, /this\.infoType\.textContent = isBH \?[^\n]*_\(card\.classification\)/);
assert.match(ui, /rows\.push\(\['Spektral sınıf', card\.spectral\]\)/);
assert.match(ui, /if \(card\.note\) this\.infoDesc\.textContent \+=/);
for (const locale of ['en', 'de', 'es', 'fr']) {
  const dict = JSON.parse(readFileSync(`src/i18n/locales/${locale}/data.json`, 'utf8'));
  for (const key of ['Evrimleşmiş süperdev', 'Wolf-Rayet (WN5h)', woh.star.classificationNote, woh.description])
    assert.ok(dict[key], `${locale} translates ${key.slice(0, 24)}`);
}

console.log('PASS landmark metadata, card classification, historical spectrum, scientific note, and synthetic default');
