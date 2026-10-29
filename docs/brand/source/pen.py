"""Simulated pen: a round nib stamped along cubic centre lines, with pressure (width profile) and slight tremor.
usage: python3 pen.py spec.json out.svg   (build.sh then traces the result into smooth curves)
marks: {"pen":[p0,c1,c2,p1, c1,c2,p2 ...], "w":38, "start":0.85, "end":0.3}
       {"loop":[cx,cy], "r":22, "w":14, "from":-60, "sweep":380, "squash":0.95, "start":0.8, "end":0.6}
       {"dot":[cx,cy], "r":24, "squash":0.92, "angle":-20}"""
import json, math, random, sys
spec = json.load(open(sys.argv[1])); rnd = random.Random(spec.get('seed', 7))
def noise(amp):
    waves = [(rnd.uniform(1.5, 4.5), rnd.uniform(0, 6.28), rnd.uniform(.4, 1)) for _ in range(3)]
    return lambda t: amp * sum(a * math.sin(f * t * 6.28 + p) for f, p, a in waves) / 2
def bez(p0, p1, p2, p3, t):
    u = 1 - t; return [u**3*p0[i] + 3*u*u*t*p1[i] + 3*u*t*t*p2[i] + t**3*p3[i] for i in (0, 1)]
out = []
def stroke(cl, w, st, en, prof=None, nib=None):
    L = [0]
    for i in range(1, len(cl)): L.append(L[-1] + math.dist(cl[i], cl[i-1]))
    tot = L[-1]; wn = noise(w * .05); jx = noise(w * .025); jy = noise(w * .025)
    for i, p in enumerate(cl):
        t = L[i] / tot
        if prof:  # explicit pressure: [[t, factor], ...], linear between points
            k = next(i for i in range(1, len(prof)) if prof[i][0] >= t or i == len(prof) - 1); (t0, f0), (t1, f1) = prof[k-1], prof[k]
            f = f0 + (f1 - f0) * (0 if t1 == t0 else max(0, min(1, (t - t0) / (t1 - t0))))
        else:
            a = st + (1 - st) * min(1, t / .12); b = 1 - (1 - en) * max(0, (t - .7) / .3) ** 1.6; f = min(a, b)
        r = max(.5, w / 2 * f + wn(t) / 2 * f)
        x, y = p[0] + jx(t), p[1] + jy(t)
        if nib:  # a flat nib held at a fixed angle: thick across it, thin along it
            out.append(f'<ellipse cx="{x:.2f}" cy="{y:.2f}" rx="{r:.2f}" ry="{max(.6, r * nib[1]):.2f}" transform="rotate({nib[0]} {x:.2f} {y:.2f})"/>')
        else:
            out.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{r:.2f}"/>')
for m in spec['marks']:
    if 'dot' in m:
        cx, cy = m['dot']; r = m['r']; s = m.get('squash', .92); a = math.radians(m.get('angle', -20)); nz = noise(r * .05); pts = []
        for k in range(90):
            t = k / 90; th = t * 6.283; rr = r + nz(t); x, y = rr * math.cos(th), rr * s * math.sin(th)
            pts.append(f'{cx + x*math.cos(a) - y*math.sin(a):.2f},{cy + x*math.sin(a) + y*math.cos(a):.2f}')
        out.append(f'<polygon points="{" ".join(pts)}"/>')
    elif 'loop' in m:
        cx, cy = m['loop']; r = m['r']; s = m.get('squash', .95); f0 = math.radians(m.get('from', -60)); sw = math.radians(m.get('sweep', 380))
        n = 400; cl = [[cx + r*math.cos(f0 - sw*k/n), cy + r*s*math.sin(f0 - sw*k/n)] for k in range(n + 1)]
        stroke(cl, m['w'], m.get('start', .8), m.get('end', .6), m.get('profile'), m.get('nib'))
    else:
        P = m['pen']; cl = []
        for i in range(0, len(P) - 3, 3):
            seg = P[i:i+4]; n = max(20, int(math.dist(seg[0], seg[3]) * 2))
            cl += [bez(*seg, k / n) for k in range(n)]
        cl.append(P[-1]); stroke(cl, m['w'], m.get('start', .85), m.get('end', .3), m.get('profile'), m.get('nib'))
vw, vh = spec['viewBox']
open(sys.argv[2], 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">{"".join(out)}</svg>\n')
