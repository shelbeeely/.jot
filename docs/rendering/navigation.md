# Touch and button navigation

Use one document index and action controller with two input adapters. This is a proposed reader design. The original
X4 has buttons; touch-capable boards use their own display/input profile. See [rendering](epaper.md) and [media](media-and-links.md).

## Reading model

Open a journal from Library, then read pages. Reader controls offer Contents, Dates when present, Find, Bookmarks,
Links, Attachments, Fields and Settings. Every view returns to its caller with Back.

Contents follows source order. Undated writing is valid; offer Start of writing when there are no dated entries.
Entries and physical pages differ: an entry can span pages, repeated dates remain distinct, and `===` changes pagination.
Ordinary headings get reader locators, not invented Jot record IDs.

## Input mappings

| Action | Touch | Buttons |
| --- | --- | --- |
| Previous/next page | Visible controls; optional swipe/edge taps | Left/right |
| Reader controls | Menu target | Confirm in ordinary reading |
| Select a menu/list item | Tap its row | Up/down, Confirm |
| Page a long list | Previous/Next list controls | Left/right |
| Follow a link | Tap its target or use Links | Controls → Links → select → Confirm |
| Open an attachment | Tap image or use Attachments | Controls → Attachments → select → Confirm |
| Back | Visible Back control | Back |
| Text size / bookmark / clean refresh | Labelled menu action | Same menu through focus/Confirm |

In ordinary reading, Confirm always opens controls. Buttons use the Links list rather than an invisible inline focus.
Page turns do not add Back-history entries; deliberate jumps do. Back cancels an input/dialog, closes a subsidiary
view, follows jump history, then returns to Library. Power/sleep is separate.

All essential touch actions have visible tap alternatives; no required swipe, pinch, drag or long press. All button
actions work through focus/Confirm/Back without chords. A search keyboard must support both inputs.

Resolve overlay and link hits before page-turn zones. Activate once on a resolved tap/release; cancelling or moving
away must not activate a newly displayed target. Reading a task checkbox does not change its stored state.

Use labelled, generously spaced targets and visible focus. Measure physical size on the panel: CSS-pixel guidance is
not a panel-pixel minimum. At 219 PPI, 44 panel pixels are about 5.1 mm. Test with intended readers.

## Images and data

An image opens separately with Fit, Zoom in/out, Caption and Back. Confirm opens image controls; up/down selects;
Back closes controls to the image, then closes the image to its caller. At magnification, directional keys pan;
touch can use dragging or visible directional controls. Fit resets zoom without leaving.

Charts and wide tables need navigable data views rather than hover-only values or clipped columns. Fields/source
reaches complete ordered records, hidden scale definitions and sync receipts. Unsupported attachments show file
information and retain their bytes. External URLs show destination information before any optional handoff.

## Page layout and index

Reserve chrome before composing content. For example, a 480×800 page with a 64-pixel header and 80-pixel footer has
656 pixels left before content padding. The tutorial uses the entire page; overlaying a footer would cover writing.
Different chrome/font/rotation choices produce different cache keys and pagination.

A raster page needs a derived index containing:

- Source/package revision and layout key.
- Page files and source coverage, including split blocks.
- Contents/date/record targets and logical hit rectangles for links and attachments.
- Searchable displayed text mapped back to locations, within the selected export scope.

Keep hit rectangles in upright logical coordinates, even when native pixel bytes are rotated. Validate paths, bounds
and revision before using an index. It is adapter data, not a new `.jotz` requirement.

## Reading position and links

Save a record ID or entry/heading locator plus local source position, tied to the source revision. AST offsets are
UTF-8 bytes, not JavaScript string indexes. Store page numbers only as layout-specific hints. Resolve the same location
after changing font size; if edited source invalidates it, show a recovery notice rather than reuse a stale offset.

Dates may repeat. A date link selects the first target, with record-ID precedence; a date include can select every
matching entry. Cross-file links recognize `.jot`/`.jotz`, while includes accept supplied `.jot` text under their own
limits. Included local links need separate scope handling. See [link rules](media-and-links.md).

## FreeInk input adapter

At the pinned SDK revision, Up/Down maps to focusPrev/focusNext, Left/Right to prev/next and Confirm/Back to their
matching intents. Jot page bounds, menus, history and persistence remain application responsibilities.

Inside the polling function, with initialized input and a target using the current framebuffer:

```cpp
#include <InputManager.h>
#include <FreeInkUIDisplayTarget.h>
#include <FreeInkUIInputManager.h>

auto device = target.deviceContext();
device.hasTouch = input.hasTouch();
input.update();
auto snapshot = freeink::ui::snapshotFrom(input, device);
```

Hardware input applies board mounting corrections into native coordinates; the orientation-aware adapter maps them
to logical coordinates. Do not apply either transform twice. Test corner taps. The basic snapshot does not synthesize
swipe intents; map their endpoints into logical coordinates explicitly. Tap zones also need separate button bindings.

Choose synchronous polling or the SDK's asynchronous queue ownership, not both. Suppress tap-on-release after a handled
long press. During refresh, resolve queued touches against the displayed revision or discard stale targets; bound page
requests and publish the new reading position only after a successful frame presentation.

## Verification

Use the [shared checks](README.md#acceptance-checks). Include undated/repeated dates, first/last pages, image return,
repagination/resume, corner alignment, cancelled gestures, queued input and failed page reads. Test simple taps alone
and buttons alone. Browser/controller tests do not establish physical input accuracy.

## Sources and scope

Primary SDK source checked at commit
[`0dbf8cc5c32e3d3672365e497d6ee9163ac6b120`](https://github.com/Free-Ink/freeink-sdk/tree/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120),
3 November 2026:

- [Input adapter and button bindings](https://github.com/Free-Ink/freeink-sdk/blob/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120/libs/ui/FreeInkUI/include/FreeInkUIInputManager.h).
- [UI device context, snapshots and action routing](https://github.com/Free-Ink/freeink-sdk/blob/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120/libs/ui/FreeInkUI/include/FreeInkUICore.h).
- [Display target and logical coordinates](https://github.com/Free-Ink/freeink-sdk/blob/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120/libs/ui/FreeInkUI/include/FreeInkUIDisplayTarget.h).
- [InputManager and asynchronous input ownership](https://github.com/Free-Ink/freeink-sdk/blob/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120/libs/hardware/InputManager/include/InputManager.h).
- [Tap-zone bindings](https://github.com/Free-Ink/freeink-sdk/blob/0dbf8cc5c32e3d3672365e497d6ee9163ac6b120/libs/ui/FreeInkUI/include/components/bars/tap-zones.h).
- W3C's [dragging alternatives](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html),
  [pointer cancellation](https://www.w3.org/WAI/WCAG22/Understanding/pointer-cancellation.html), and
  [target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): useful interaction
  guidance, not evidence that an untested physical layout is accessible.
- [Jot entry boundaries and links](../../specification/Jot-Complete-Specification.md), sections 2.3 and 4.2.2;
  [parser AST and link resolution](../../parser/jot.mjs).
- [E-ink research](../methods/e-ink-templates.md), sections 9, 19 and 25: useful design guidance, with the inherited
  Journalwright implementation claims distinguished from Jot features. The interaction decisions in this document
  are proposals to test, not experimentally established findings.

No touch hardware, button firmware or physical panel was tested for this navigation reference.
