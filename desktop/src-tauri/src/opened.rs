//! Opening journals from the file manager: a double-clicked .jot, .jotz or .jotlock starts the app with its path (Windows and
//! Linux pass it as an argument; macOS, iOS and Android send RunEvent::Opened). The paths wait here until the writer takes them
//! (bridge.js), and the writer can read only those files, once each: the page never names a path of its own.

use serde::Serialize;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::ipc::Response;
use tauri::State;

/// The largest journal the writer opens (as on the website).
const MAX_BYTES: u64 = 64 * 1024 * 1024;
const KINDS: [&str; 3] = ["jot", "jotz", "jotlock"];

#[derive(Default)]
pub struct Opened {
    waiting: Mutex<Vec<PathBuf>>,
    readable: Mutex<HashMap<u32, PathBuf>>,
    next: Mutex<u32>,
}

#[derive(Serialize)]
pub struct OpenedFile {
    id: u32,
    name: String,
}

/// A journal the app was asked to open: one of Jot's kinds, an existing file.
pub fn is_journal(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| KINDS.iter().any(|k| e.eq_ignore_ascii_case(k)))
        && path.is_file()
}

impl Opened {
    pub fn add(&self, paths: impl IntoIterator<Item = PathBuf>) -> usize {
        let mut waiting = self.waiting.lock().unwrap();
        let before = waiting.len();
        waiting.extend(paths.into_iter().filter(|p| is_journal(p)));
        waiting.len() - before
    }
}

/// The journals waiting to be opened, each with an id the writer reads it by; taking them empties the queue.
#[tauri::command]
pub fn take_opened(state: State<'_, Opened>) -> Vec<OpenedFile> {
    let paths: Vec<PathBuf> = state.waiting.lock().unwrap().drain(..).collect();
    let mut readable = state.readable.lock().unwrap();
    let mut next = state.next.lock().unwrap();
    paths
        .into_iter()
        .map(|p| {
            *next += 1;
            let name = p
                .file_name()
                .map(|n| n.to_string_lossy().into_owned())
                .unwrap_or_default();
            readable.insert(*next, p);
            OpenedFile { id: *next, name }
        })
        .collect()
}

/// The bytes of a journal handed out by take_opened, once.
#[tauri::command]
pub fn read_opened(state: State<'_, Opened>, id: u32) -> Result<Response, String> {
    let path = state
        .readable
        .lock()
        .unwrap()
        .remove(&id)
        .ok_or("that file was not opened by the app")?;
    let size = std::fs::metadata(&path).map_err(|e| e.to_string())?.len();
    if size > MAX_BYTES {
        return Err("Jot opens journals up to 64 MiB".into());
    }
    std::fs::read(&path)
        .map(Response::new)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_journals_wait() {
        let dir = std::env::temp_dir().join(format!("jot-opened-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let (jot, txt, gone) = (dir.join("a.JOT"), dir.join("b.txt"), dir.join("c.jotz"));
        std::fs::write(&jot, "### 2026-10-29").unwrap();
        std::fs::write(&txt, "not a journal").unwrap();
        let opened = Opened::default();
        assert_eq!(opened.add([jot.clone(), txt, gone, dir.clone()]), 1);
        assert_eq!(opened.waiting.lock().unwrap().as_slice(), [jot]);
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
