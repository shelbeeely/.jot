"""variants.py <brand dir> [tight small symbol]: the ink-blue versions, the favicon and the app icon from the masters.
The wordmark "ιot" already begins with the symbol, so there is no separate symbol-and-wordmark lockup."""
import re, sys
out = sys.argv[1]
def part(name):
    return re.search(r'<path[^>]*/>', open(f'{out}/{name}').read()).group(0)
sym = part('jot-symbol.svg')

INK, INK_DARK, PAPER = '#1f3a8a', '#cbd5eb', '#fffdf6'
for name in ('jot-symbol', 'jot-wordmark'):
    src = open(f'{out}/{name}.svg').read()
    open(f'{out}/{name}-ink.svg', 'w').write(src.replace('fill="currentColor"', f'fill="{INK}"'))
# Favicon: the small cut, tight in its square; ink blue, or the light ink in a dark browser
if len(sys.argv) > 2:
    t = open(sys.argv[2]).read(); vb = re.search(r'viewBox="([^"]+)"', t).group(1); p = re.search(r'<path[^>]*/>', t).group(0)
    open(f'{out}/favicon.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>Jot</title><style>path{{fill:{INK}}}@media(prefers-color-scheme:dark){{path{{fill:{INK_DARK}}}}}</style>{p.replace(' fill="currentColor"', '')}</svg>\n')
# App icon (1024): cream paper on a rounded square inside Apple's grid margin, the iota in ink blue
open(f'{out}/app-icon.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><title>Jot</title><rect x="100" y="100" width="824" height="824" rx="185" fill="{PAPER}"/><g transform="translate(166 160) scale(2.7)">{sym.replace('fill="currentColor"', f'fill="{INK}"')}</g></svg>\n')
print('colour versions, favicon and app icon written')

# Around the logo: the wordmark in the light ink (dark backgrounds, such as GitHub's dark mode), the iota as VS Code's
# icon for .jot files (light and dark themes), and a social preview: the wordmark on dot-grid paper, no type to fall back.
word = part('jot-wordmark.svg')
open(f'{out}/jot-wordmark-light.svg', 'w').write(open(f'{out}/jot-wordmark.svg').read().replace('fill="currentColor"', f'fill="{INK_DARK}"'))
if len(sys.argv) > 2:
    for name, fill in (('jot-file-light', INK), ('jot-file-dark', INK_DARK)):
        open(f'{out}/{name}.svg', 'w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}"><title>Jot file</title>{p.replace('fill="currentColor"', f'fill="{fill}"')}</svg>\n')
EDGE = '#d2cbbc'
open(f'{out}/social-preview.svg', 'w').write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 640"><title>Jot</title>'
    f'<defs><pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="16" cy="16" r="2" fill="{EDGE}"/></pattern></defs>'
    f'<rect width="1280" height="640" fill="{PAPER}"/><rect width="1280" height="640" fill="url(#dots)"/>'
    f'<g transform="translate(396 140) scale(1.4)">{word.replace('fill="currentColor"', f'fill="{INK}"')}</g></svg>\n')
print('wordmark in light ink, file icons and social preview written')
