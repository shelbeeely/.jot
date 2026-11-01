# Jot font design rules

All original Jot fonts replicate the appearance of Pilot G2 gel-pen strokes.
This applies to Sans, Script, Mono and future original families. Use the supplied
writing references for round nibs, gentle ink buildup and nearly even strokes.
Keep their identities distinct: printed Sans, pen-lift Script with optional connected forms, fixed-width Mono.
The tip labels describe appearance rather than calibrated physical line widths.

- Draw original centerlines. Never trace or rename another font.
- Fit and vary centerlines before expanding the nib; avoid stretched ink.
- Preserve smooth joins, open counters, round terminals and complete ink bounds.
- Keep variation deterministic and restrained; no per-frame or DOM letter jitter.
- Mono must retain one advance for visible characters and spaces, zero advance
  for combining marks, no kerning, and aligned columns with shaping enabled.
- Alternates must have 8–25% symmetric ink-outline difference relative to their
  base, measured after compilation. Use local curve/proportion changes, not just
  cloning with a small translation. Preserve identity, nib width and advances.
- Preserve Unicode, native selection, source offsets and standalone export.
- Edit source generators, regenerate artifacts and distribute them with
  `npm run fonts:build`, then run `python3 fonts/test.py` and relevant browser tests.
- Synchronize extension assets and parser ZIP; regenerate the root manifest last.
- Do not weaken clipping, smoothness, shaping, contrast or reproducibility checks.
