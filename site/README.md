# Jot workspace

A browser-based document scanner. Images are processed in browser memory; no image upload, analytics, OCR service or account integration is included. Hosted privately with Sites.

## Features

- Device camera and local photo import, plus drag-and-drop.
- Automatic page suggestions from high-contrast light page regions or dark connected borders, with manual correction and keyboard-accessible corner handles.
- Projective (homography) rectification with bilinear sampling.
- Named paper sizes, custom dimensions (10–5,000 mm), portrait/landscape, or estimated photo proportions.
- Color, grayscale and thresholded ink output with brightness adjustment.
- PNG/JPEG download and up to 20 reordered pages in a locally generated PDF. Known physical sizes set the PDF MediaBox; auto mode uses an 11-inch height and estimated aspect ratio.

## Limits

This is a flat-page perspective scanner, not curved-page dewarping or handwriting recognition. Edge detection is heuristic; always check corners. No QR or brand-specific code is required. Camera permission and HTTPS are required for live camera use; file import is the fallback. Photos are capped at 60 MB per file, decoded input at a 2,800 px edge and output at 2,600 px. Browser decoding may still require memory for the original photo. Extremely narrow pages and unreadable/hidden corners require user adjustment and sufficient image detail. Scans are held in memory for this tab session only; download before reload/close. Ink mode uses a global threshold and may discard faint marks; color preserves more detail.

## Source

The root is the Jot writing workspace; `/scan/` is a distinct scanner/handwriting tool.

`dist/` is buildless HTML, CSS and JavaScript. `scanner-core.js` exposes pure geometry/image functions both to browsers and CommonJS tests. `app.js` owns camera lifecycle, image handling and client-side PDF output. No external runtime dependencies are fetched.

Jot's text parser is a separate deliverable; this scanner does not treat a photograph as parsed journal text.

The writing workspace uses the separate Jot parser with Marked for Markdown, safe DOM-only previews, browser spellcheck, optional pattern hints, a 55-method catalogue, local text autosave and a visible roadmap. Diagram engine rendering and handwriting OCR are not yet implemented.


## Template editor (`dist/editor/`)

A separate editor just for Jot: build the structure of a journal and download it as a plain-text `.jot` to fill in by hand (a keyboard,
a phone or InkDeck). It has nothing from print: no page layout, paper sizes, scan codes or drawing blocks.

- **Five zones:** before the days, each week begins, each day, each week ends, after the days.
- **Blocks:** writing space, prompt (several questions take turns, one a day), checkboxes, task lines, scale, ratings, fill-in blanks,
  choose words, list, time blocks, table, words to keep, record, page title. Six starters (daily check-in, rapid log, morning pages,
  gratitude, day planner, empty).
- **Files:** one for the month, or a file a week or a day (InkDeck opens 16 KB a file). The page checks its own output with the Jot
  parser and says when a file is over that size.
- **The file:** `### YYYY-MM-DD | Weekday` entries, `#### ` headings to write under, `[ ] ` boxes, `[[a · b]]` choices, and ratings as
  `measurement` / `observation` records with empty values, their scales declared once at the top. Typed text never changes the
  structure: line markers are escaped, record field names that collide with reserved Jot fields get `x-`.
- **Undo / Redo** (buttons, or Ctrl+Z / Ctrl+Shift+Z outside a text field; typing in one field is one step).
- **Reorder:** drag a block by its handle (⠿), within a zone or to another one (a red line where it can't go), or use ↑ / ↓ and the
  **Zone** control in its options from the keyboard.
- **Every .jot carries its template**, in a hidden Jot comment at the end (`/*` · `jot-template: {...}` · `*/`), which readers do not
  show. **More → Open a .jot or a template** brings it back from any downloaded file (plain or packaged, filled in or not), or from a
  saved template `.json`. A `.jot` made elsewhere has none, and the editor says so.
- **More → Import a print day layout (daypage.json):** a day layout from Journalwright's print editor becomes the **Each day** blocks
  (`import.mjs` maps all 77 print blocks: 53 to Jot blocks, and the printed data and paper-only blocks are named as left out). Undo takes
  it back.
- The template stays in this browser (localStorage). **More → Save template** downloads it as JSON. Everything opened is checked field by
  field, never trusted. Nothing is sent anywhere.

`template.mjs` is the model and generator (pure, no DOM); `import.mjs` the daypage.json importer; `app.mjs` the page; `editor.css` light and dark, 44 px targets, one column on
phones. Tests:

    node --test test-editor.mjs      # the generator: every block, starters, splits, escaping, the template in a .jot, the import
    node test-editor-ui.cjs          # the page in Chromium: editing, undo, dragging, zones, downloads, reopening a .jot, the import,
                                     # persistence, 390 px, axe (light and dark)

## Guides (`dist/guide/`)

The user guides are written in `../docs/guide/*.md` (readable on GitHub) and built into pages here with the parser's Markdown library:

    node build-guides.mjs            # after editing a guide; the pages are committed
    node --test test-guides.mjs      # pages current, every Jot example valid, every link real, the guide matches the editor

`test-editor-ui.cjs` also opens the guide pages at 390 px in light and dark and runs axe on them.
