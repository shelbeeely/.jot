#!/usr/bin/env python3
"""Package the to-jot skill and canonical CLI dependency closure for offline use."""
import argparse
from pathlib import Path
import re
import shutil
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, required=True, help='Destination ZIP file')
args = parser.parse_args()
with tempfile.TemporaryDirectory() as temp:
    skill = Path(temp) / 'to-jot'
    shutil.copytree(ROOT / '.agents/skills/to-jot', skill)
    pending = [ROOT / 'cli/jot.mjs']
    copied = set()
    while pending:
        source = pending.pop().resolve()
        if source in copied:
            continue
        source.relative_to(ROOT)
        copied.add(source)
        destination = skill / 'runtime' / source.relative_to(ROOT)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, destination)
        for ref in re.findall(r'''(?:from\s*|import\s*)['"](\.[^'"]+)['"]''', source.read_text()):
            pending.append(source.parent / ref)
    for license_file in (ROOT / 'parser/vendor').glob('*LICENSE*'):
        shutil.copy2(license_file, skill / 'runtime/parser/vendor' / license_file.name)
    shutil.copy2(ROOT / 'specification/profiles.json', skill / 'reference/profiles.json')
    shutil.copy2(ROOT / 'docs/guide/writing-jot.md', skill / 'reference/writing-jot.md')
    (skill / 'INSTALL.md').write_text('''# Install to-jot

Requires Node.js 22 or later. No npm install, account or network access is needed for validation.

Unzip so the to-jot folder is in your agent's skills directory (for example, ~/.codex/skills/to-jot for Codex,
or .claude/skills/to-jot in a Claude Code project). Reload the agent's skill list if needed.

Ask: "Use to-jot to create a weekly journal template and strictly validate the saved file."

Run directly from any directory:

    node /path/to/to-jot/scripts/validate.mjs /path/to/journal.jot

The bundled runtime is copied from the canonical Jot CLI and parser. It reports syntax/package diagnostics;
it does not establish factual accuracy or full method-profile compliance. See SKILL.md for the review steps.
''')
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'w', zipfile.ZIP_DEFLATED) as archive:
        for file in sorted(skill.rglob('*')):
            if file.is_file():
                archive.write(file, file.relative_to(skill.parent))
print(args.output)
