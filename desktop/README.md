# Jot desktop (Tauri v2)

Jot as an app for Linux, macOS and Windows, set up to build for Android and iOS too. The pages are the website's own
(`site/dist/`), loaded unchanged, so the app has the website's features; the app adds what a web page cannot have, through a small
bridge injected into every page as `window.jotDesktop` (`src-tauri/src/bridge.js`). On the website the bridge does not exist and
the pages behave as they always have.

## What the app adds

| | Website | App |
| --- | --- | --- |
| Data exports (Your life online) | Whole ZIPs load into memory: large ones need unzipping first | Any size, ZIP64 included: the app reads the ZIP's index, then one file at a time (`archive.rs`) |
| Hostile archives | Names are never used as paths | Also refused: files over 1 GiB unpacked, ZIP bombs (over 200 times their packed size), names that escape the archive |
| Downloads | The browser's download folder | A native Save dialog for every download on every page, written atomically (`files.rs`) |
| Network | Whatever the browser allows | Locked by the content security policy (`tauri.conf.json`): only the listening tool's services (Spotify, Last.fm, ListenBrainz). Links to the web open in your own browser, never inside the app |
| Code | Served from the website each visit | Inside the app, the same every time, and it works with no network |

Files are read only after you pick them in a dialog, and written only where you choose: the pages cannot call a file-system,
shell or HTTP plugin, because there is none (`capabilities/default.json`).

Planned next: opening and saving `.jot`, `.jotz` and `.jotlock` files in place (with file associations, so a double-click opens
them), and keeping a lock's passphrase in the operating system's keychain on request.

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
- `src-tauri/src/bridge.js`: `window.jotDesktop` and downloads as saved files.
- `src-tauri/tauri.conf.json`: identity, the content security policy, bundling. `capabilities/default.json`: what pages may call.
- `app-icon.png`: the icon source (`npx tauri icon app-icon.png -o src-tauri/icons` makes every size).
