"""flatten.py traced.svg out.svg [--box W H] [--pad P] [--fill F] [--title T]
Potrace output (a group transform over relative path commands) to one plain path in a clean viewBox, fitted to the ink."""
import re, sys
args = sys.argv[1:]; src, out = args[0], args[1]
opt = lambda k, d: args[args.index(k) + 1] if k in args else d
W = H = None
if '--box' in args: W, H = float(args[args.index('--box') + 1]), float(args[args.index('--box') + 2])
pad = float(opt('--pad', 0)); fill = opt('--fill', 'currentColor'); title = opt('--title', 'Jot')
s = open(src).read()
tr = re.search(r'translate\(([-\d.]+),([-\d.]+)\) scale\(([-\d.]+),([-\d.]+)\)', s); tx, ty, sx, sy = map(float, tr.groups())
pts_all, subpaths = [], []
for d in re.findall(r'<path d="([^"]+)"', s):
    toks = re.findall(r'[MmCcLlZz]|-?\d+\.?\d*', d); i = 0; cx = cy = 0; cmd = None; cur = []
    def T(x, y): return (tx + sx * x, ty + sy * y)
    while i < len(toks):
        t = toks[i]
        if t in 'MmCcLlZz': cmd = t; i += 1
        if cmd in 'Zz': cur.append(('Z',)); subpaths.append(cur); cur = []; continue
        n = {'M': 2, 'm': 2, 'L': 2, 'l': 2, 'C': 6, 'c': 6}[cmd]; v = [float(x) for x in toks[i:i+n]]; i += n
        rel = cmd.islower()
        if cmd in 'Mm':
            if cur: subpaths.append(cur); cur = []
            cx, cy = (cx + v[0], cy + v[1]) if rel else (v[0], v[1]); cur.append(('M', T(cx, cy))); cmd = 'l' if rel else 'L'
        elif cmd in 'Ll':
            cx, cy = (cx + v[0], cy + v[1]) if rel else (v[0], v[1]); cur.append(('L', T(cx, cy)))
        else:
            p = [(cx + v[k], cy + v[k+1]) if rel else (v[k], v[k+1]) for k in (0, 2, 4)]; cx, cy = p[2]; cur.append(('C',) + tuple(T(*q) for q in p))
    if cur: subpaths.append(cur)
for sp in subpaths:
    for c in sp: pts_all += list(c[1:])
xs = [p[0] for p in pts_all]; ys = [p[1] for p in pts_all]; x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
if W is None: W, H = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
k = min((W - 2 * pad) / (x1 - x0), (H - 2 * pad) / (y1 - y0)); ox = (W - k * (x1 - x0)) / 2 - k * x0; oy = (H - k * (y1 - y0)) / 2 - k * y0
f = lambda p: f'{ox + k * p[0]:.1f} {oy + k * p[1]:.1f}'
d = ''.join(''.join({'M': lambda c: 'M' + f(c[1]), 'L': lambda c: 'L' + f(c[1]), 'C': lambda c: 'C' + ' '.join(f(q) for q in c[1:]), 'Z': lambda c: 'Z'}[c[0]](c) for c in sp) for sp in subpaths)
d = re.sub(r'\.0(?=[ A-Z]|$)', '', d)
open(out, 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}"><title>{title}</title><path fill="{fill}" d="{d}"/></svg>\n')
print(out, f'{W:g}x{H:g}', len(d), 'bytes of path')
