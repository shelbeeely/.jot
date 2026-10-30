"""motion.py <brand dir> <raw pen svg of iota.json>: the iota being written, then dotted, as an animated SVG.

The stroke's centre line (iota.json) is mapped onto the finished symbol by matching the ink's bounds, then used as a growing mask
over the finished shape: the pen moves down and flicks off, and the dot lands afterwards. With reduced motion, the mark is
simply shown. The result is jot-symbol-written.svg (ink blue) beside the other masters."""
import json, re, sys
out, raw = sys.argv[1], sys.argv[2]
spec = json.load(open(f'{out}/source/iota.json'))
# bounds of the raw pen drawing (circles and the dot's polygon), in the spec's coordinates
r = open(raw).read(); xs, ys = [], []
for cx, cy, rad in re.findall(r'<circle cx="([-\d.]+)" cy="([-\d.]+)" r="([-\d.]+)"', r):
    cx, cy, rad = float(cx), float(cy), float(rad); xs += [cx - rad, cx + rad]; ys += [cy - rad, cy + rad]
for pts in re.findall(r'points="([^"]+)"', r):
    for p in pts.split():
        x, y = map(float, p.split(',')); xs.append(x); ys.append(y)
rx0, rx1, ry0, ry1 = min(xs), max(xs), min(ys), max(ys)
# bounds of the finished symbol's path (control points are close enough for an affine match)
sym = open(f'{out}/jot-symbol.svg').read(); d = re.search(r' d="([^"]+)"', sym).group(1)
nums = list(map(float, re.findall(r'-?\d+\.?\d*', d))); fx, fy = nums[0::2], nums[1::2]
k = ((max(fx) - min(fx)) / (rx1 - rx0) + (max(fy) - min(fy)) / (ry1 - ry0)) / 2
T = lambda x, y: (min(fx) + (x - rx0) * k, min(fy) + (y - ry0) * k)
pen, dot = spec['marks'][0], spec['marks'][1]
P = [T(*p) for p in pen['pen']]
line = f'M{P[0][0]:.1f} {P[0][1]:.1f}' + ''.join(f'C{P[i][0]:.1f} {P[i][1]:.1f} {P[i+1][0]:.1f} {P[i+1][1]:.1f} {P[i+2][0]:.1f} {P[i+2][1]:.1f}' for i in range(1, len(P) - 2, 3))
dx, dy = T(*dot['dot']); dr = dot['r'] * k * 1.25
INK = '#1f3a8a'
open(f'{out}/jot-symbol-written.svg', 'w').write(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><title>Jot</title>
<style>
.pen{{stroke-dasharray:1;stroke-dashoffset:1;animation:write .9s cubic-bezier(.45,0,.25,1) .15s forwards}}
.dot{{opacity:0;transform-origin:{dx:.1f}px {dy:.1f}px;transform:scale(.4);animation:dot .22s ease-out 1.2s forwards}}
@keyframes write{{to{{stroke-dashoffset:0}}}}
@keyframes dot{{to{{opacity:1;transform:scale(1)}}}}
@media (prefers-reduced-motion:reduce){{.pen{{animation:none;stroke-dashoffset:0}}.dot{{animation:none;opacity:1;transform:none}}}}
</style>
<defs>
<mask id="stroke" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256"><path class="pen" d="{line}" pathLength="1" fill="none" stroke="#fff" stroke-width="{pen['w'] * k * 1.6:.1f}" stroke-linecap="round" stroke-linejoin="round"/></mask>
<mask id="dotonly" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256"><circle class="dot" cx="{dx:.1f}" cy="{dy:.1f}" r="{dr:.1f}" fill="#fff"/></mask>
<mask id="nodotarea" maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256"><rect width="256" height="256" fill="#fff"/><circle cx="{dx:.1f}" cy="{dy:.1f}" r="{dr:.1f}" fill="#000"/></mask>
</defs>
<g mask="url(#nodotarea)"><path d="{d}" fill="{INK}" mask="url(#stroke)"/></g>
<path d="{d}" fill="{INK}" mask="url(#dotonly)"/>
</svg>
''')
print('written iota (motion) written')
