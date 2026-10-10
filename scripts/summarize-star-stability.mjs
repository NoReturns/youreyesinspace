import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = join(process.cwd(), 'validation', 'star-stability');
const normalCapture = /^(catalogue|procedural|cloud)-(x|y|still)-bloom[01]-scale(?:1|05)-(?:1280x720|2560x1440)(?:-raw)?\.json$/;
// An exploratory cloud half-scale capture replaced the bloom-off baseline;
// compare only the intact bloom-on pair for that case.
const names = (await readdir(join(root, 'after')))
  .filter((name) => normalCapture.test(name) && name !== 'cloud-x-bloom0-scale05-2560x1440.json')
  .sort();
const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const variance = (values) => {
  const center = mean(values);
  return mean(values.map((value) => (value - center) ** 2));
};
const stats = (values) => ({
  mean: mean(values), variance: variance(values), cv: Math.sqrt(variance(values)) / Math.max(mean(values), 1e-9),
  min: Math.min(...values), max: Math.max(...values),
  maxAdjacentDelta: Math.max(...values.slice(1).map((value, index) => Math.abs(value - values[index]))),
});
const summarize = (report) => {
  const samples = report.samples;
  const stars = samples[0].stars.map((_, index) => ({
    peak: stats(samples.map((frame) => frame.stars[index].peak)),
    integral: stats(samples.map((frame) => frame.stars[index].integral)),
    brightPixels: stats(samples.map((frame) => frame.stars[index].pixels)),
    motion: {
      x: samples.at(-1).stars[index].x - samples[0].stars[index].x,
      y: samples.at(-1).stars[index].y - samples[0].stars[index].y,
    },
  }));
  return {
    frames: samples.length, stepPx: report.stepPx, visiblePoints: stats(samples.map((frame) => frame.visible)),
    totalLuminance: stats(samples.map((frame) => frame.integral)), stars,
  };
};
const comparisons = [];
for (const name of names) {
  const before = JSON.parse(await readFile(join(root, 'before', name), 'utf8'));
  const after = JSON.parse(await readFile(join(root, 'after', name), 'utf8'));
  if (before.samples.length !== after.samples.length) throw new Error(`Frame count mismatch: ${name}`);
  comparisons.push({ name, before: summarize(before), after: summarize(after) });
}
await writeFile(join(root, 'summary.json'), JSON.stringify(comparisons, null, 2));
for (const result of comparisons) {
  const percent = (value) => `${(value * 100).toFixed(2)}%`;
  console.log(`${result.name}: luminance CV ${percent(result.before.totalLuminance.cv)} -> ${percent(result.after.totalLuminance.cv)}, visible points ${result.before.visiblePoints.min}-${result.before.visiblePoints.max} -> ${result.after.visiblePoints.min}-${result.after.visiblePoints.max}`);
}
