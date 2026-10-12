import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `export { marsTerrainHeight, marsPreviewPose, buildMarsTerrainGeometry,
  marsPreviewDaylightJd, MARS_PATCH_RADIUS_KM, MARS_GLOBE_HIDE_ALTITUDE_KM } from './src/reach/PerseveranceSurfacePreview.ts';
  export { StarSystem } from './src/core/StarSystem.ts';
  export { SOLAR_SYSTEM } from './src/data/solarSystem.ts';`;
const bundle = await rolldown({
  input: '\0mars-surface-test',
  external: (id) => id === 'three' || id.includes('BodyRenderer') || id.includes('i18n'),
  plugins: [{
    name: 'mars-surface-test',
    resolveId(id) { if (id === '\0mars-surface-test') return id; },
    load(id) { if (id === '\0mars-surface-test') return entry; },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : id.includes('i18n')
    ? { _: (value) => value, fixed: String }
    : { loadReachSpacecraftModel() { throw new Error('not used'); } },
  module, module.exports,
);
const { marsTerrainHeight, marsPreviewPose, buildMarsTerrainGeometry,
  marsPreviewDaylightJd, MARS_PATCH_RADIUS_KM, MARS_GLOBE_HIDE_ALTITUDE_KM,
  StarSystem, SOLAR_SYSTEM } = module.exports;
const marsRadius = 3387.6;

const geometry = buildMarsTerrainGeometry(marsRadius);
const positions = geometry.getAttribute('position');
assert.ok(positions.count > 12_000, 'local terrain has near and distant samples');
assert.ok(positions.array.every(Number.isFinite), 'terrain vertices are finite');
assert.ok(geometry.getAttribute('normal').array.every(Number.isFinite), 'terrain normals are finite');
for (const [x, z] of [[0, 0], [0.02, 0.01], [2.5, -1.5], [100, 80], [450, 0]]) {
  assert.equal(marsTerrainHeight(x, z, marsRadius), marsTerrainHeight(x, z, marsRadius),
    'terrain is deterministic');
}
assert.equal(marsTerrainHeight(0, 0, marsRadius), 0, 'rover sits on a flat local datum');
assert.ok(Math.abs(marsTerrainHeight(450, 0, marsRadius)
  - (Math.sqrt(marsRadius ** 2 - 450 ** 2) - marsRadius)) < 1e-8,
  'outer edge meets the unchanged curved Mars globe');
const normals = geometry.getAttribute('normal');
assert.ok(normals.getY(0) > 0, 'terrain faces the sky at the rover');
geometry.dispose();
console.log('PASS deterministic local terrain, finite geometry, and curved globe edge');

let previous = marsPreviewPose(0);
let covered = false;
for (let tick = 1; tick <= 4000; tick++) {
  const seconds = tick / 100;
  const pose = marsPreviewPose(seconds);
  const shift = Math.hypot(pose.x - previous.x, pose.y - previous.y, pose.z - previous.z);
  assert.ok(shift < 3, `camera path is continuous at ${seconds}s`);
  const clearance = pose.y - marsTerrainHeight(pose.x, pose.z, marsRadius);
  assert.ok(clearance >= 0.005, `camera clears terrain at ${seconds}s`);
  if (!pose.globeVisible) {
    assert.equal(pose.terrainOpacity, 1, 'local terrain is opaque before globe hides');
    assert.ok(clearance <= MARS_GLOBE_HIDE_ALTITUDE_KM + 0.1);
    const horizon = Math.sqrt(2 * marsRadius * MARS_GLOBE_HIDE_ALTITUDE_KM
      + MARS_GLOBE_HIDE_ALTITUDE_KM ** 2);
    assert.ok(MARS_PATCH_RADIUS_KM > horizon, 'terrain cap covers the local horizon at handoff');
    covered = true;
  }
  previous = pose;
}
assert.ok(covered);
assert.equal(marsPreviewPose(12).phase, 'handoff');
assert.equal(marsPreviewPose(20).phase, 'descent');
assert.equal(marsPreviewPose(32).phase, 'orbit');
console.log('PASS orbital approach, opaque handoff, terrain clearance, and continuous low orbit');

const system = new StarSystem('sol', 'c0', 0, new THREE.Vector3(), SOLAR_SYSTEM, [], []);
const startJd = 2461323.5;
const sunlight = (jd) => {
  system.update(jd, (jd - 2451545) * 86400);
  const mars = system.get('mars'), rover = system.get('perseverance');
  return new THREE.Vector3().subVectors(rover.position, mars.position).normalize()
    .dot(new THREE.Vector3().subVectors(system.star.position, mars.position).normalize());
};
const daylightJd = marsPreviewDaylightJd(startJd, system.get('mars').displayRotationHours, sunlight);
assert.ok(sunlight(daylightJd) > 0.65, 'landing site faces the Sun in the preview');
assert.ok(daylightJd >= startJd && daylightJd <= startJd + 1.1,
  'preview only advances within one Mars day');
console.log('PASS Perseverance site daylight selection using the catalogue rotation and Sun');

const app = readFileSync('src/main.ts', 'utf8');
assert.match(app, /import\.meta\.env\.DEV && REACH_MODE[\s\S]*?reachSurface/);
assert.match(app, /!REACH_PREVIEW_ROUTE && !REACH_SURFACE_PREVIEW/);
assert.match(app, /REACH_PREVIEW_ROUTE \|\| REACH_SURFACE_PREVIEW \? null/);
assert.match(app, /if \(REACH_SURFACE_PREVIEW\) \{[\s\S]*?this\.reach = null/);
assert.match(app, /REACH_SURFACE_PREVIEW && \([\s\S]*?__reachPanorama/);
console.log('PASS development gate, checkpoint isolation, and standalone preview guard');
