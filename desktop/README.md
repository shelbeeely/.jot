# Jot desktop (Tauri v2)

App delivery is tracked in the [Writer roadmap](../WRITER-ROADMAP.md#desktop-application-track); the [format roadmap](../specification/ROADMAP.md) owns document contracts. Format changes must include corresponding Writer updates under root `AGENTS.md`.

Jot for Linux, macOS and Windows, with Android and iOS build targets. It loads `site/dist/` and exposes native operations through
`window.jotDesktop` (`src-tauri/src/bridge.js`). Platform differences and verification limits are listed below.

## What the app adds

| | Website | App |
| --- | --- | --- |
| Data exports (Your life online) | Whole ZIPs load into memory: large ones need unzipping first | Any size, ZIP64 included: the app reads the ZIP's index, then one file at a time (`archive.rs`) |
| Hostile archives | Names are never used as paths | Also refused: files over 1 GiB unpacked, ZIP bombs (over 200 times their packed size), names that escape the archive |
| Downloads | The browser's download folder | A native Save dialog for every download on every page, written atomically (`files.rs`) |
| Network | Whatever the browser allows | Locked by the content security policy (`tauri.conf.json`): the listening services, OpenRouter, explicit pinned model downloads from Hugging Face and loopback model servers (explicit optional requests). Links to the web open in your own browser, never inside the app |
| Your journal files | Opened through the page's Open button | `.jotz` archives and `.jot` source are Jot's file types: they show the iota in the file manager and a double-click opens them in the writer (`opened.rs`) |
| Code | Served from the website each visit | Inside the app, the same every time, and it works with no network |

Files are read only after you pick them in a dialog or open them from the file manager, and written only where you choose: the
pages cannot call a file-system, shell or HTTP plugin, because there is none (`capabilities/default.json`), and they can read an
opened journal only once, by the number the app gave it.

Installers register `.jotz` archives and `.jot` source with document icons. Linux integration uses `linux/jot-mime.xml` and
`linux/jot.desktop`; installed MIME types, icons and default opening have been tested with the `.deb`.
Each file opening starts another window on Windows and Linux. Protected archives use the writer's normal unlock flow.

Planned next: saving back to the file you opened (in place), one window for many files, and keeping a lock's passphrase in the
operating system's keychain on request.

## Where the app differs from the website

The app uses each system's own web view: WebKitGTK on Linux, WebKit (WKWebView) on macOS and iOS, WebView2 (Edge) on Windows,
Android's WebView. Tested so far on Linux only.

- **Passkeys and security keys** for locked journals need WebAuthn, which WebKitGTK does not offer: on Linux the passkey button
  stays hidden and the passphrase and recovery code work as usual. macOS and Windows are untested.
- **Spotify sign-in** opens a pop-up window, which the app does not allow; Last.fm, ListenBrainz and manual listening notes work.
- Everything else checked (`test-desktop.cjs`): the writer, template editor, converter, guides and importer render; locking works
  (Web Crypto is there); the microphone API for voice practice is present.

## Build and run

Needs Rust (stable) and Node 20 or later, plus the system libraries Tauri lists for your platform
(https://v2.tauri.app/start/prerequisites/; on Debian or Ubuntu: `libwebkit2gtk-4.1-dev build-essential libxdo-dev libssl-dev
libayatana-appindicator3-dev librsvg2-dev`).

    cd desktop
    npm install                  # the Tauri command line, nothing else
    npm run dev                  # run it
    npm run build                # installers for this system (src-tauri/target/release/bundle/)

Only this folder has these dependencies; the website, parser and command-line tools are unchanged and still need none.

## Mobile

The app is a library with a mobile entry point (`src-tauri/src/lib.rs`), and the icons include Android and iOS sizes. To build:

    npx tauri android init && npx tauri android dev    # Android Studio, the Android SDK and NDK, Java 17
    npx tauri ios init && npx tauri ios dev            # macOS with Xcode

Not built or tested yet. On a phone the importer's file picking goes through the system's document picker; the downloads bridge
and archive reading are written to work there, but need checking on devices.

## Tests

    cd desktop/src-tauri && cargo test           # archive guards, file names, atomic writes (Rust)
    cd desktop && xvfb-run -a npm test            # the real app through WebDriver (Linux)

`test-desktop.cjs` drives a debug build through `tauri-driver` (`cargo install tauri-driver --locked`) and WebKitWebDriver
(`webkit2gtk-driver` on Debian or Ubuntu). Debug builds read `JOT_TEST_PICK` (paths to "pick") and `JOT_TEST_SAVE_DIR` (where to
"save") instead of opening dialogs; release builds ignore both. Each run uses a fresh profile.

## Files

- `src-tauri/src/lib.rs`: the app: window, bridge, navigation kept inside the app.
- `src-tauri/src/archive.rs`: opening exports (ZIPs or folders) and reading their files, with the guards.
- `src-tauri/src/files.rs`: native Save dialogs and atomic writes.
- `src-tauri/src/opened.rs`: journals opened from the file manager, waiting for the writer, readable once each.
- `src-tauri/linux/`: the Linux package's file types, their icon and its desktop entry.
- `src-tauri/src/bridge.js`: `window.jotDesktop` and downloads as saved files.
- `src-tauri/tauri.conf.json`: identity, the content security policy, bundling. `capabilities/default.json`: what pages may call.
- `app-icon.png`: the icon source, copied from `docs/brand/` (the Jot iota on cream paper); `npx tauri icon app-icon.png -o src-tauri/icons --ios-color '#fffdf6'` makes every size.

## Optional BYOK AI

Writer shares the web companion: explicit requests, session-only keys, reviewed Jot drafts and opt-in suggestions.
The CSP permits `https://openrouter.ai` and HTTP/HTTPS loopback hosts on user-selected ports. No general remote-host allowance
or HTTP proxy plugin is added. Local servers must allow the webview origin through CORS. The companion is tested in Chromium
with mocked responses; native webview and live-model compatibility remain unverified. See the
[AI companion guide](../docs/guide/ai-companion.md), including the OpenRouter ZDR toggle and privacy limits.

The v2 archive replacement removes the obsolete encrypted-file association and bundles SQLite WASM with wasm-unsafe-eval enabled
for local WebAssembly. Source/browser tests do not verify native webview execution or OS association installation. Rebuild and verify
platform installers, native webview execution and file associations after container/WASM/CSP changes.


## Voice writing

Writer's voice-writing dialog uses the bundled CPU WebAssembly engine and worker in this wrapper too; it does not install Python, run a native model sidecar or bundle model weights. Users explicitly download/import the size/SHA-256-pinned Whistle and Needle files, with opt-in public-weight caching. Local model imports work without Hugging Face connectivity. The CSP permits the model host and its CDN for explicit downloads; it does not send journal/audio data there. Required prose cleanup now defaults to a pinned embedded English SmolLM2 model through bundled CPU wllama WASM. After explicit model download/import it runs without an API key or separate server, including offline. Explicitly selected loopback writing servers and consented BYOK OpenRouter connections remain alternatives. No Python or new native inference bridge is required; native Rust acceleration remains future work.

Microphone, AudioWorklet, MediaRecorder, local-origin/CORS and wasm compatibility need physical platform checks. This change has browser/synthetic-microphone evidence; native builds were not available in the implementation environment. macOS microphone usage/entitlement metadata is supplied for builds; that alone does not establish macOS, iOS or Android microphone permission/recording support. Mobile platform permission integration remains a release check. Keep the existing voice-practice tool separate from transcription/optional recording.
