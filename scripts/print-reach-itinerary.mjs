import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const bundle = await rolldown({
  input: '\0reach-itinerary-list',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-itinerary-list',
    resolveId(id, importer) {
      if (id === '\0reach-itinerary-list') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-itinerary-list') return `
        export { REACH_PRODUCTION_ROUTE } from './src/reach/ReachVoyageDirector.ts';
        export { destinationRef } from './src/reach/ReachDestinations.ts';`;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, fmtNum: String },
  module, module.exports,
);
const { REACH_PRODUCTION_ROUTE, destinationRef } = module.exports;
const stops = REACH_PRODUCTION_ROUTE.stops.map((stop, index) => ({
  index,
  id: stop.id,
  name: stop.label ?? stop.id.replace(/(^|[-:])([a-z])/g,
    (_, separator, letter) => `${separator === ':' ? ' ' : separator}${letter.toUpperCase()}`),
  fromSupported: destinationRef(stop).kind !== 'landmark',
}));
process.stdout.write(JSON.stringify({ version: REACH_PRODUCTION_ROUTE.version, stops }));
