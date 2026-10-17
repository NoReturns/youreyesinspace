import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PerspectiveCamera, Vector3, Vector4 } from 'three';

const shader = readFileSync('src/render/shaders/blackhole.frag', 'utf8');
const pass = readFileSync('src/render/BlackHolePass.ts', 'utf8');
assert.match(shader, /uProjectionInverse\s*\*\s*vec4\(uv\s*\*\s*2\.0\s*-\s*1\.0,\s*-1\.0,\s*1\.0\)/);
assert.match(shader, /uProjection\s*\*\s*vec4\(v,\s*0\.0\)/);
assert.doesNotMatch(shader, /uTanHalfFov|uAspect/);
assert.match(pass, /copy\(camera\.projectionMatrix\)/);
assert.match(pass, /copy\(camera\.projectionMatrixInverse\)/);

const EPS = 1e-6;
function close(actual, expected, label) {
  assert.ok(Math.abs(actual - expected) < EPS, `${label}: ${actual} vs ${expected}`);
}
// These two functions reproduce the shader's homogeneous-coordinate operations.
function ray(camera, u, v) {
  const point = new Vector4(2 * u - 1, 2 * v - 1, -1, 1)
    .applyMatrix4(camera.projectionMatrixInverse);
  return new Vector3(point.x / point.w, point.y / point.w, point.z / point.w).normalize();
}
function lookup(camera, direction) {
  const clip = new Vector4(direction.x, direction.y, direction.z, 0)
    .applyMatrix4(camera.projectionMatrix);
  return [(clip.x / clip.w + 1) / 2, (clip.y / clip.w + 1) / 2];
}
function checkRays(camera, label) {
  for (const [u, v] of [[0, 0], [0.5, 0.5], [1, 1], [0.18, 0.76]]) {
    const actual = ray(camera, u, v);
    const expected = new Vector3(2 * u - 1, 2 * v - 1, -1).unproject(camera).normalize();
    close(actual.distanceTo(expected), 0, `${label} inverse projection`);
    const [sampleU, sampleV] = lookup(camera, actual);
    close(sampleU, u, `${label} background u`);
    close(sampleV, v, `${label} background v`);
  }
}

const centered = new PerspectiveCamera(50, 1920 / 1080, 0.01, 1e9);
centered.updateMatrixWorld();
checkRays(centered, 'centered');
for (const [u, v] of [[0, 0], [0.5, 0.5], [1, 1], [0.18, 0.76]]) {
  const oldRay = new Vector3((2 * u - 1) * Math.tan(25 * Math.PI / 180) * centered.aspect,
    (2 * v - 1) * Math.tan(25 * Math.PI / 180), -1).normalize();
  close(ray(centered, u, v).distanceTo(oldRay), 0, 'single-monitor equivalence');
}

const desktop = { width: 6080, height: 1440 };
const monitors = [
  { name: 'left', x: 0, y: 360, width: 1920, height: 1080 },
  { name: 'primary', x: 1920, y: 0, width: 2560, height: 1440 },
  { name: 'right', x: 4480, y: 540, width: 1600, height: 900 },
];
const shiftX = monitors[1].x + monitors[1].width / 2 - desktop.width / 2;
const views = monitors.map((monitor) => {
  const camera = new PerspectiveCamera(50, monitor.width / monitor.height, 0.01, 1e9);
  camera.setViewOffset(desktop.width, desktop.height, monitor.x - shiftX, monitor.y,
    monitor.width, monitor.height);
  camera.updateMatrixWorld();
  checkRays(camera, monitor.name);
  return camera;
});
const hole = new Vector3(0, 0, -1);
const containing = views.map((camera) => {
  const [u, v] = lookup(camera, hole);
  return u >= 0 && u <= 1 && v >= 0 && v <= 1;
});
assert.deepEqual(containing, [false, true, false], 'one panorama slice contains the shadow center');
const [primaryU, primaryV] = lookup(views[1], hole);
close(primaryU, 0.5, 'shadow at primary horizontal center');
close(primaryV, 0.5, 'shadow at primary vertical center');
for (const [index, camera] of views.entries()) {
  const centerRay = ray(camera, 0.5, 0.5);
  if (index === 1) close(centerRay.distanceTo(hole), 0, 'primary center ray');
  else assert.ok(centerRay.distanceTo(hole) > 0.1,
    `${monitors[index].name} center ray must not be a duplicate`);
}
console.log('PASS black-hole centered and unequal three-monitor projection rays, lookup, and single shadow');
