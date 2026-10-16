import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { rolldown } from 'rolldown';
import * as THREE from 'three';

const entry = `
  export { applyPanoramaView, reachCompositionTarget } from './src/reach/ReachPanorama.ts';
  export { OrbitLines } from './src/render/OrbitLines.ts';
  export { Universe } from './src/core/Universe.ts';
  export { StarCatalog } from './src/data/StarCatalog.ts';
  export { TimeSystem } from './src/core/TimeSystem.ts';
  export { CameraController } from './src/camera/CameraController.ts';
  export { ReachVoyageDirector, reachPreviewRoute } from './src/reach/ReachVoyageDirector.ts';
  export { ReachTiming } from './src/reach/ReachTiming.ts';
`;
const bundle = await rolldown({
  input: '\0reach-framing-orbits',
  external: (id) => id === 'three' || id.includes('i18n'),
  plugins: [{
    name: 'reach-framing-orbits',
    resolveId(id, importer) {
      if (id === '\0reach-framing-orbits') return id;
      if (id.endsWith('?raw') && importer) return `${resolve(dirname(importer), id.slice(0, -4))}?raw`;
    },
    load(id) {
      if (id === '\0reach-framing-orbits') return entry;
      if (id.endsWith('?raw')) return `export default ${JSON.stringify(readFileSync(id.slice(0, -4), 'utf8'))};`;
    },
  }],
});
const output = await bundle.generate({ format: 'cjs' });
const module = { exports: {} };
new Function('require', 'module', 'exports', output.output[0].code)(
  (id) => id === 'three' ? THREE : { _: (text) => text, fixed: String, localeTag: () => 'en' },
  module, module.exports,
);
const { applyPanoramaView, reachCompositionTarget, OrbitLines, Universe, StarCatalog,
  TimeSystem, CameraController, ReachVoyageDirector, reachPreviewRoute, ReachTiming } = module.exports;
const bin = readFileSync('public/data/stars.bin');
const names = JSON.parse(readFileSync('public/data/star-names.json', 'utf8'));
const catalog = new StarCatalog(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength), names);
const input = { flush: () => ({ dx: 0, dy: 0, wheel: 0, pinch: 0, panX: 0, panY: 0 }), down: () => false };
const cases = [
  ['pioneer11', 'pioneer11'], ['pioneer10', 'pioneer10'], ['sirius', 'star:c29786'],
  ['ross-248', 'star:c109365'], ['epsilon-eridani', 'star:c15247'],
];
const primary = { x: 3840, y: 720, width: 2560, height: 1440 };
const desktop = { width: 8320, height: 2160 };
const monitors = [
  { x: 0, y: 0, width: 3840, height: 2160 }, primary,
  { x: 6400, y: 1080, width: 1920, height: 1080 },
];
const project = (camera, point, viewport) => viewport.x + (point.clone().project(camera).x + 1) * viewport.width / 2;
const positions = new Set();

for (const [preview, id] of cases) {
  const route = reachPreviewRoute(preview);
  assert.equal(route.stops[1].id, id);
  const time = new TimeSystem(new Date('2026-10-11T00:00:00Z'));
  const universe = new Universe(catalog);
  universe.update(time.jd, time.t);
  const camera = new CameraController(universe);
  const director = new ReachVoyageDirector(universe, camera, time,
    new ReachTiming('preview', () => 0.5), null, undefined, route);
  let approach = false;
  let observation = false;
  for (let frame = 0; frame < 9000 && !observation; frame++) {
    time.advance(0.1);
    universe.update(time.jd, time.t);
    if (director.directing) director.update(0.1, false);
    else { camera.update(0.1, input, 2560, 1440, Math.PI / 4); director.update(0.1, false); }
    if (camera.autopilot && camera.autopilot.t > camera.autopilot.duration * 0.7 && !approach) {
      verifyPosition('approach');
      approach = true;
    }
    if (director.observation?.stop.id === id) {
      verifyPosition('observation');
      observation = true;
    }
  }
  assert.ok(approach && observation, `${id} reached approach and observation`);

  function verifyPosition(phase) {
    const target = camera.target?.position;
    assert.ok(target, `${id} ${phase} has a body target`);
    const localTarget = target.clone().sub(camera.position);
    const shift = reachCompositionTarget(id, primary.width, primary.x + primary.width / 2, desktop.width);
    const unshifted = new THREE.PerspectiveCamera(50, desktop.width / desktop.height, 0.001, 1e20);
    unshifted.quaternion.copy(camera.quaternion);
    unshifted.updateMatrixWorld();
    applyPanoramaView(unshifted, {
      totalPanoramaWidth: desktop.width, totalPanoramaHeight: desktop.height,
      viewportOffsetX: primary.x, viewportOffsetY: primary.y,
      viewportWidth: primary.width, viewportHeight: primary.height,
    });
    const oldFraction = (project(unshifted, localTarget, primary) - primary.x) / primary.width;
    assert.ok(oldFraction < 0.2, `${id} ${phase} reproduces old left-biased crop`);
    const globalPositions = monitors.map((viewport) => {
      const renderCamera = new THREE.PerspectiveCamera(50, desktop.width / desktop.height, 0.001, 1e20);
      renderCamera.quaternion.copy(camera.quaternion);
      renderCamera.updateMatrixWorld();
      applyPanoramaView(renderCamera, {
        totalPanoramaWidth: desktop.width, totalPanoramaHeight: desktop.height,
        viewportOffsetX: viewport.x, viewportOffsetY: viewport.y,
        viewportWidth: viewport.width, viewportHeight: viewport.height,
      }, shift);
      return project(renderCamera, localTarget, viewport);
    });
    assert.ok(globalPositions.every((x) => Math.abs(x - globalPositions[0]) < 0.001),
      `${id} ${phase} panorama slices share a projection`);
    const fraction = (globalPositions[1] - primary.x) / primary.width;
    assert.ok(fraction > 0.3 && fraction < 0.7, `${id} ${phase} primary x=${fraction}`);
    positions.add(Math.round(fraction * 10));
    console.log(`${id} ${phase} primary fraction ${fraction.toFixed(3)}`);
    const single = new THREE.PerspectiveCamera(50, 1920 / 1080, 0.001, 1e20);
    single.quaternion.copy(camera.quaternion);
    single.updateMatrixWorld();
    const singleShift = reachCompositionTarget(id, 1920, 960, 1920);
    single.setViewOffset(1920, 1080, -singleShift, 0, 1920, 1080);
    const singleFraction = project(single, localTarget, { x: 0, width: 1920 }) / 1920;
    assert.ok(singleFraction > 0.3 && singleFraction < 0.7,
      `${id} ${phase} single x=${singleFraction}`);
  }
  console.log(`PASS ${id}: primary and three-monitor ${approach ? 'approach' : ''}/observation framing`);
}
assert.ok(positions.size >= 3, 'left, center, and right composition variation');

const solar = new Universe(catalog).current;
solar.update(2451545, 0);
const orbits = new OrbitLines(new THREE.Scene());
orbits.setSystem(solar);
assert.ok(orbits.lines.length > 0, 'authored Solar System has orbit renderers');
const sun = solar.star;
for (const [phase, distance] of [
  ['approach', 150_000_000], ['observation', sun.radius * 40], ['departure', 150_000_000],
]) {
  const position = sun.position.clone().add(new THREE.Vector3(0, 0, distance));
  orbits.update(position, true, false, 1544, () => 0, null, true);
  const visible = orbits.lines.filter((line) => line.line.visible && line.material.uniforms.uOpacity.value > 0);
  assert.ok(visible.length > 0, `${phase} retains authored orbits`);
  console.log(`PASS Solar ${phase}: ${visible.length} existing orbital lines active`);
}
orbits.update(sun.position.clone(), false, false, 1544, () => 0, null, true);
assert.ok(orbits.lines.every((line) => !line.line.visible), 'system gate still hides all lines');
