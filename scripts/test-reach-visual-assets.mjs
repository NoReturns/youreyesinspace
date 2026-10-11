import assert from 'node:assert/strict';
import { rolldown } from 'rolldown';

const bundle = await rolldown({ input: 'src/reach/ReachVisualAssets.ts' });
const output = await bundle.generate({ format: 'es' });
const source = Buffer.from(output.output[0].code).toString('base64');
const { selectReachAsset, reachImagery } = await import(`data:text/javascript;base64,${source}`);
globalThis.window = { innerWidth: 1920, devicePixelRatio: 1 };

const assets = [
  { assetId: 'mars-day-4k', destinationBodyId: 'mars', width: 4096 },
  { assetId: 'mars-day-2k', destinationBodyId: 'mars', width: 2048 },
  { assetId: 'moon-day-high', destinationBodyId: 'moon', width: 4096 },
  { assetId: 'venus-radar-synthetic-color-2k', destinationBodyId: 'venus', width: 2048 },
];
const enhanced = { mode: 'enhanced', assets };
assert.equal(selectReachAsset('mars', enhanced, 1920)?.assetId, 'mars-day-2k');
assert.equal(selectReachAsset('mars', enhanced, 3840)?.assetId, 'mars-day-4k');
assert.equal(selectReachAsset('moon', enhanced, 1920)?.assetId, 'moon-day-high');
assert.equal(selectReachAsset('venus', enhanced, 3840)?.assetId, 'venus-radar-synthetic-color-2k');
assert.equal(selectReachAsset('mars', { mode: 'basic', assets }, 3840), undefined);
assert.equal(selectReachAsset('mercury', enhanced, 3840), undefined);
assert.equal(reachImagery('mercury', { mode: 'enhanced', assets: [] }), undefined);
assert.equal(reachImagery('ceres', { mode: 'enhanced', assets: [] }), undefined);
console.log('PASS Reach enhanced imagery selects 2K/4K tiers, available alternatives, and procedural fallback');
