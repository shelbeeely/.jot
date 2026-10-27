@AGENTS.md

## Claude Code

Shared project guidance lives in `AGENTS.md` (above) and in `site/AGENTS.md` and `vscode/AGENTS.md`, which Claude Code loads through the `CLAUDE.md` beside each. Edit those files, not this one, for anything Codex should also follow; keep only Claude-specific setup here.

- `.claude/settings.json` runs `.claude/hooks/check-generated.mjs` when Claude finishes a turn: the fast generated-file checks (manifest, extension copies, handwriting CSS, guides, roadmap). If it reports a stale file, regenerate it as `AGENTS.md` describes.
- `/verify` runs the full verification list from `AGENTS.md`.
