//! Jot as a desktop (and, later, mobile) app. The pages are the website's own (site/dist), unchanged; this adds what a web page
//! cannot have, through a small bridge (bridge.js, injected into every page as `window.jotDesktop`):
//!
//! - archives of any size, read a file at a time from disk (archive.rs), with guards against hostile ZIPs;
//! - native Save dialogs for every download (files.rs), written atomically;
//! - .jot, .jotz and .jotlock files opened from the file manager straight into the writer (opened.rs);
//! - a network locked down by the content security policy in tauri.conf.json (only the listening tool's services), and
//!   navigation kept inside the app: a link to the web opens in the person's own browser.
//!
//! Files are read only after the person picks them in a dialog, and written only where they choose: there is no file-system,
//! shell or HTTP plugin for the pages to call.

mod archive;
mod files;
mod opened;

use tauri::{WebviewUrl, WebviewWindowBuilder};

const BRIDGE: &str = include_str!("bridge.js");

/// Pages may load from the app itself; anything else is the web, opened in the person's browser instead.
fn inside_app(url: &tauri::Url) -> bool {
    match url.scheme() {
        "tauri" | "asset" => true,
        "http" | "https" => {
            url.host_str() == Some("tauri.localhost")
                || (cfg!(debug_assertions) && url.host_str() == Some("localhost"))
        }
        "about" | "blob" | "data" => true,
        _ => false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(archive::Archives::default())
        .manage(opened::Opened::default())
        .invoke_handler(tauri::generate_handler![
            archive::pick_archives,
            archive::archive_read,
            archive::archive_close,
            files::save_file,
            opened::take_opened,
            opened::read_opened,
        ])
        .setup(|app| {
            // Windows and Linux pass a double-clicked journal as an argument; anything else there is ignored
            use tauri::Manager;
            app.state::<opened::Opened>()
                .add(std::env::args_os().skip(1).map(std::path::PathBuf::from));
            let handle = app.handle().clone();
            let builder =
                WebviewWindowBuilder::new(app, "main", WebviewUrl::App("write/index.html".into()))
                    .initialization_script(BRIDGE)
                    .on_navigation(move |url| {
                        if inside_app(url) {
                            return true;
                        }
                        if matches!(url.scheme(), "http" | "https" | "mailto") {
                            use tauri_plugin_opener::OpenerExt;
                            let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                        }
                        false
                    });
            #[cfg(desktop)]
            let builder = builder
                .title("Jot")
                .inner_size(1200.0, 860.0)
                .min_inner_size(360.0, 480.0);
            builder.build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("Jot could not start")
        .run(|_app, _event| {
            // macOS, iOS and Android send journals opened from the file manager as an event, at launch or later
            #[cfg(any(target_os = "macos", target_os = "ios", target_os = "android"))]
            if let tauri::RunEvent::Opened { urls } = _event {
                use tauri::{Emitter, Manager};
                let paths = urls.iter().filter_map(|u| u.to_file_path().ok());
                if _app.state::<opened::Opened>().add(paths) > 0 {
                    let _ = _app.emit("jot-opened", ());
                }
            }
        });
}
