@AGENTS.md

## Claude Code

Shared project guidance lives in `AGENTS.md` (above) and in `parser/AGENTS.md`, `site/AGENTS.md` and `vscode/AGENTS.md`, which Claude Code loads through the `CLAUDE.md` beside each. Edit those files, not this one, for anything Codex should also follow; keep only Claude-specific setup here.

`.claude/settings.json` adds:

- A Stop hook (`.claude/hooks/check-generated.mjs`) that runs `node tools/check-generated.mjs` when Claude finishes a turn with changes. If it reports a stale file, regenerate it as `AGENTS.md` describes.
- A PreToolUse hook (`.claude/hooks/guard-generated.mjs`) that refuses edits to generated files and copies and names the source to change.
- A SessionStart hook (`.claude/hooks/session-start.sh`) that runs `npm install` in cloud sessions, for the linter and browser suites.
- A deny rule for `.ics` calendar files (personal data).

`/verify` runs the full verification list from `AGENTS.md`. Put personal notes in `CLAUDE.local.md` (gitignored).
