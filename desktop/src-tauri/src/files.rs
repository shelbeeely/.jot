//! Saving: every download on every page (a .jot, a .jotz, a .jotlock, an export) goes through a native Save dialog, and is written
//! to a temporary file beside the target and then renamed over it, so a crash or a full disk never leaves half a journal.

use std::path::{Path, PathBuf};
use tauri::ipc::{InvokeBody, Request};
use tauri::AppHandle;
use tauri_plugin_dialog::DialogExt;

/// A file name from the page, kept to a plain name (no folders, no control characters).
fn plain_name(encoded: &str) -> String {
    let bytes = encoded.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let Ok(b) = u8::from_str_radix(&encoded[i + 1..i + 3], 16) {
                out.push(b);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    let name: String = String::from_utf8_lossy(&out)
        .chars()
        .filter(|c| !c.is_control() && !matches!(c, '/' | '\\' | ':'))
        .collect();
    let name = name.trim().trim_start_matches('.').to_string();
    if name.is_empty() {
        "jot-download".into()
    } else {
        name.chars().take(200).collect()
    }
}

pub fn write_atomically(path: &Path, data: &[u8]) -> std::io::Result<()> {
    let dir = path.parent().unwrap_or(Path::new("."));
    let tmp = dir.join(format!(
        ".{}.jot-saving",
        path.file_name()
            .map(|n| n.to_string_lossy())
            .unwrap_or_default()
    ));
    std::fs::write(&tmp, data)?;
    std::fs::rename(&tmp, path).inspect_err(|_| {
        let _ = std::fs::remove_file(&tmp);
    })
}

/// Where to save: a Save dialog, or (debug builds only, for the automated tests) the folder in JOT_TEST_SAVE_DIR.
fn target(app: &AppHandle, name: &str) -> Option<PathBuf> {
    #[cfg(debug_assertions)]
    if let Ok(dir) = std::env::var("JOT_TEST_SAVE_DIR") {
        return Some(PathBuf::from(dir).join(name));
    }
    app.dialog()
        .file()
        .set_file_name(name)
        .blocking_save_file()
        .and_then(|p| p.into_path().ok())
}

/// The bytes of a download (the request body) and its suggested name (the x-jot-name header). Returns where it was saved, or
/// nothing if the person cancelled.
#[tauri::command]
pub async fn save_file(app: AppHandle, request: Request<'_>) -> Result<Option<String>, String> {
    let InvokeBody::Raw(data) = request.body() else {
        return Err("nothing to save".into());
    };
    let name = plain_name(
        request
            .headers()
            .get("x-jot-name")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("jot-download"),
    );
    let Some(path) = target(&app, &name) else {
        return Ok(None);
    };
    write_atomically(&path, data).map_err(|e| format!("could not save {}: {e}", path.display()))?;
    Ok(Some(path.display().to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_stay_plain() {
        assert_eq!(plain_name("life-online-2014.jot"), "life-online-2014.jot");
        assert_eq!(plain_name("caf%C3%A9%20notes.jot"), "café notes.jot");
        assert_eq!(plain_name("..%2F..%2Fetc%2Fpasswd"), "etcpasswd");
        assert_eq!(plain_name("%2e%2e"), "jot-download");
        assert_eq!(plain_name(""), "jot-download");
    }

    #[test]
    fn writes_atomically() {
        let dir = std::env::temp_dir().join(format!("jot-files-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let p = dir.join("j.jot");
        write_atomically(&p, b"one").unwrap();
        write_atomically(&p, b"two").unwrap();
        assert_eq!(std::fs::read(&p).unwrap(), b"two");
        assert_eq!(
            std::fs::read_dir(&dir).unwrap().count(),
            1,
            "no temporary file left"
        );
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
