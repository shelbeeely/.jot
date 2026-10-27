"""Builds site/dist/docs/jot-parser.zip (the site's "Get the JavaScript parser" download) from parser/, with fixed timestamps so the
same files always make the same zip.   python3 tools/build-parser-zip.py [--check]"""
import pathlib, sys, zipfile, io
ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC, OUT = ROOT / 'parser', ROOT / 'site/dist/docs/jot-parser.zip'
AGENT_NOTES = {'AGENTS.md', 'CLAUDE.md', 'CLAUDE.local.md'}  # repository guidance for coding agents, not part of the download
files = sorted(p for p in SRC.rglob('*') if p.is_file() and 'node_modules' not in p.parts and p.name not in AGENT_NOTES)
def build():
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        for p in files:
            info = zipfile.ZipInfo('jot-parser/' + p.relative_to(SRC).as_posix(), date_time=(2026, 10, 26, 0, 0, 0))
            info.compress_type, info.external_attr = zipfile.ZIP_DEFLATED, 0o644 << 16
            z.writestr(info, p.read_bytes())
    return buf.getvalue()
data = build()
if '--check' in sys.argv:
    old = OUT.read_bytes() if OUT.exists() else b''
    if old != data:
        sys.exit('jot-parser.zip is out of date: run python3 tools/build-parser-zip.py')
    print(f'jot-parser.zip: {len(files)} files current')
else:
    OUT.write_bytes(data); print(f'jot-parser.zip: {len(files)} files, {len(data) // 1024} KB')
