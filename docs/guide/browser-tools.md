# Offline writing, sharing and annotated pages

Open **Tools → Offline, sharing and nearby transfer** in Writer. These tools are optional. They never start Bluetooth discovery,
connect to a journal service or send writing automatically. Browsers and devices support different capabilities; downloads and
ordinary journal editing remain available when an optional API is missing.

## Install and work offline

Open Writer online once, let its application files finish preparing, then use **Install Jot** or the browser's Install app / Add
to Home Screen menu. Reopen the installed app once before going offline. Writer caches its own public application code, page
styles, guides, libraries and fonts. Journals, attachments, exports, keys, provider responses and models do not enter that cache.
Local drafts and attachments use the existing separate browser storage; locked journals keep their encrypted storage path.

An offline update waits while old Jot tabs remain open. Finish any drawing, save/download your writing, then close all Jot tabs
and reopen. Jot does not force an update while you write. An unsuccessful installation leaves the previous offline version intact.
The desktop app already bundles its application files and does not install a web service worker.

**Protect local storage** asks the browser to retain this site's storage and reports approximate usage. The browser can refuse;
its storage is not a backup and can still be cleared. Keep downloaded `.jot`, `.jotz` or `.jotlock` copies.

**Keep screen awake this session** starts off. If supported, it keeps the screen on while Writer is visible. Hiding the page
releases the wake lock; returning tries again while the session option remains enabled. Locking/replacing the journal or leaving
the page turns it off. Operating-system power policies can release it too.

## Send and receive writing

Choose a complete journal, the text selection captured when opening the tool, or checked dated sections. Repeated dates are
separate sections. Choose **Prepare for review**, inspect the source and attachment names, then **Share…** or **Download copy**.
The system share sheet chooses the destination; the receiving app may send the content elsewhere. Cancellation leaves the original.

A complete journal includes all current attachments, including retained unused ones. Selected excerpts include only explicitly
referenced assets and an editable drawing's background dependency. Missing attachments block preparing that excerpt. References
to writing you did not select may be unresolved; Jot does not include other entries to repair them automatically.

Complete locked journals stay encrypted. Selected excerpts are plaintext `.jot` or unencrypted `.jotz`; the review explains this.
There is no automatic unlock or background sharing. Unsupported file sharing falls back to downloading a copy.

Incoming system sharing requires an installed app with a controlling service worker and browser support for a web share target.
Jot advertises that target only after its worker controls the page. Reopen Writer after installing or clearing site data before
sharing into it. Platform delivery is an HTTP POST intercepted by the local worker; if that worker is removed or unavailable,
the host may receive the POST instead. **Import a shared file** is the local file-picker alternative when that delivery boundary
is unsuitable or the platform does not support incoming system sharing. Pairing files and nearby transfers do not use that POST.

Received text, links and files wait in a **temporary local inbox**, separate from the journal. Pending items do not have its
passphrase protection. They survive reloads until you add or discard them; browser data clearing can remove them. Download
originals from the inbox if you need to retain them. No preview runs imported HTML or automatically follows shared links.

Choose **Review**, edit the incoming writing if desired, and **Add reviewed content**. The caret is captured when reviewing;
if the journal changes, choose a fresh caret before adding. Close the tool to place the caret in the writing, then reopen and
review again. Locked journals must be unlocked first. Metadata-bearing journals and record-ID conflicts must be opened separately
or edited explicitly before adding. **Open original separately** opens the original file, preserving its existing contents rather
than edits in the review textarea; opening does not remove its inbox copy. Discard inbox copy does not undo writing already added.

The inbox item is removed only after source and attachments persist. If saving fails, it stays available. Retrying the same item
repairs/saves the existing insertion rather than inserting it twice. A failed or unsupported import never silently replaces the
current journal. Inbox privacy is independent of journal locking; discard pending items when using a shared device.

## Nearby laptop-to-phone transfer

Both devices need Jot open, with its files already available, on the same Wi-Fi or hotspot. WebRTC data channels provide an
encrypted connection. This mode has no internet pairing service, STUN or TURN configuration, account, automatic merge or background
sync. Some browsers, firewalls, guest networks and client-isolated hotspots cannot make a local connection; use file sharing then.

1. On one device, choose **Create invitation**.
2. On the other, scan the invitation QR or import its `.jot-pair.json` file. It creates a response.
3. Scan/import that response on the inviting device. Files are a fallback for large QR codes or devices without a camera.
4. Compare the six-digit code on both devices and confirm it on each. Do not send if the codes differ.
5. Prepare/review the outgoing journal or excerpt, then choose **Send reviewed outgoing copy**.
6. On the receiving device, review the inbox item before adding it or opening it separately.

Pairing expires after ten minutes. Pairing files contain temporary connection credentials, not journal content; discard them after
use. QR scanning starts the camera only after **Scan pairing QR**, never captures audio, and stops after a code, Stop, hiding the
page, closing the tool or locking the journal. Camera access is not needed when using pairing files.

Transfers show byte progress and verify the complete payload's SHA-256 before keeping it. A receipt means it reached the other
device's inbox, not that it was merged or backed up elsewhere. Originals remain on the sender. Interrupted, malformed or oversized
transfers are discarded; retrying the same prepared transfer does not duplicate its inbox item. Disconnect/close/lock ends the
session. Nearby transfer uses local host candidates only and never changes to an internet relay on failure.

## Write over a page

Choose **Tools → Annotate page**. This opens an inline editor in the journal flow, not a separate drawing dialog. Choose a preview
page number and **Capture page**. Jot freezes a local image of that formatted page; app controls are not included. This is a
marked-up copy, not a live layer attached to the original typed text. Later text edits or reflow do not move marks on the copy.

Draw with Pen or Eraser, select ink color/width, and use Undo stroke / Redo stroke. Pen only starts on; turn it off for touch or
mouse. Pressure is used when supplied by the pen. Zoom and the scroll area help with small screens; normal scrolling remains
available outside the canvas. Palm rejection and hardware pen behavior vary and need real-device checks.

**Done** adds a composed PNG, immutable background PNG and editable `jot-ink` JSON inside the journal's `.jotz`. The source contains
an ordinary image and a link to the strokes. **Cancel** drops the uncommitted drawing. The original typed writing is not replaced.
If the journal changed while drawing, use **Insert copy at current caret** to choose a fresh insertion point. Document replacement
or relocking clears the unfinished canvas; finish it before those operations. A storage failure offers Retry save and retains the
in-memory copy; download the journal if browser storage remains unavailable.

Use **Edit handwriting** beside a saved stroke link in live editing to reopen it. Done creates new assets and replaces that
reference, preserving earlier assets for source Undo. Print and formatted exports show the composed image. An older stroke file
without a frozen background remains an attachment; create a new annotated copy to write over a page. There is no OCR, model call
or inferred transcription. Only locally available page resources are captured. A failed or excessively large capture leaves the
journal unchanged.

Automated checks cover Chromium interactions and synthetic input, including a real local WebRTC channel between browser contexts.
They do not establish physical pen/palm behavior, native system share-sheet delivery, installed Android/iOS share registration,
hotspot compatibility or native desktop-webview support. Test those on intended devices before describing them as verified.
