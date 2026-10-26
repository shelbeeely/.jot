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
