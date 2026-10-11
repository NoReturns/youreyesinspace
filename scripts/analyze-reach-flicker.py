import json
import math
from pathlib import Path


root = Path('validation/flicker')


def report(path, target):
    data = json.loads(path.read_text())
    print(f'{path}: {data["width"]}x{data["height"]}, {len(data["samples"])} frames')
    for variant in ('all', 'GalaxyCloud', 'GalaxySprites', 'LandmarkSprites',
                    'NebulaClouds', 'NebulaImages', 'StarPoints', 'ProcStarPoints'):
        values = [sample['variants'][variant][target] for sample in data['samples']]
        if any(value is None for value in values):
            continue
        steps = [values[i] - values[i - 1] for i in range(1, len(values))]
        print(f'  {variant}: range {min(values):.3f}-{max(values):.3f}, '
              f'max adjacent {max(steps, key=abs):+.3f}')
    return data


before = report(root / 'before/halley-raw-capture.json', 'lmc')
after = report(root / 'halley-raw-capture.json', 'lmc')
report(root / 'before/halley-capture.json', 'lmc')
report(root / 'halley-capture.json', 'lmc')
report(root / 'before/m27-capture.json', 'm27')
report(root / 'm27-capture.json', 'm27')

for label, data in (('before', before), ('after', after)):
    samples = data['samples']
    angles = []
    motion = []
    for previous, current in zip(samples, samples[1:]):
        dot = abs(sum(a * b for a, b in zip(previous['camera'], current['camera'])))
        angles.append(2 * math.degrees(math.acos(min(1, dot))))
        p, q = previous['targets'][0], current['targets'][0]
        motion.append(math.hypot(q[0] - p[0], q[1] - p[1]))
    print(f'{label} camera: maximum quaternion step {max(angles):.5f} degrees, '
          f'LMC projected movement {max(motion):.3f} px')
