"""lockups.py <brand dir> [tight small symbol]: lockups, colour versions, the favicon and the app icon from the masters."""
import re, sys
out = sys.argv[1]
def part(name):
    s = open(f'{out}/{name}').read(); w, h = (float(v) for v in re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', s).group(1, 2))
    return w, h, re.search(r'<path[^>]*/>', s).group(0)
sw, sh, sym = part('jot-symbol.svg'); ww, wh, word = part('jot-wordmark.svg')
# Horizontal: the symbol, then the wordmark at 68 % of its height, its baseline on the symbol's
k = .68; W = 236 + ww * k
open(f'{out}/jot-lockup.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:.0f} 256"><title>Jot</title>{sym}<g transform="translate(214 {256 * (1 - k) / 2 + 26:.0f}) scale({k})">{word}</g></svg>\n')
# Stacked: symbol above, wordmark below, centred
k2 = .62; W2 = max(256, ww * k2)
open(f'{out}/jot-lockup-stacked.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W2:.0f} 420"><title>Jot</title><g transform="translate({(W2 - 256) / 2:.0f} 0)">{sym}</g><g transform="translate({(W2 - ww * k2) / 2:.0f} 250) scale({k2})">{word}</g></svg>\n')
print('lockups written')

INK, INK_DARK, PAPER = '#1f3a8a', '#cbd5eb', '#fffdf6'
for name in ('jot-symbol', 'jot-wordmark', 'jot-lockup', 'jot-lockup-stacked'):
    src = open(f'{out}/{name}.svg').read()
    open(f'{out}/{name}-ink.svg', 'w').write(src.replace('fill="currentColor"', f'fill="{INK}"'))
# Favicon: the small cut, tight in its square; ink blue, or the light ink in a dark browser
if len(sys.argv) > 2:
    t = open(sys.argv[2]).read(); vb = re.search(r'viewBox="([^"]+)"', t).group(1); p = re.search(r'<path[^>]*/>', t).group(0)
    open(f'{out}/favicon.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>Jot</title><style>path{{fill:{INK}}}@media(prefers-color-scheme:dark){{path{{fill:{INK_DARK}}}}}</style>{p.replace(' fill="currentColor"', '')}</svg>\n')
# App icon (1024): cream paper on a rounded square inside Apple's grid margin, the iota in ink blue
open(f'{out}/app-icon.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Jot</title><rect x="100" y="100" width="824" height="824" rx="185" fill="{PAPER}"/><g transform="translate(166 160) scale(2.7)">{sym.replace('fill="currentColor"', f'fill="{INK}"')}</g></svg>\n')
print('colour versions, favicon and app icon written')
