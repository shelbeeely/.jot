//! Data exports of any size, read a file at a time. A browser page has to load a whole ZIP into memory; here only the ZIP's index
//! is read when it is opened, and each file the importer asks for is decompressed on its own, so a 20 GB Takeout costs about as much
//! memory as its largest posts file. ZIP64 (archives over 4 GB) is supported. Folders work the same way.
//!
//! Guards against hostile or broken archives: names that would escape the archive are listed as warnings and never read; one file
//! may be at most 1 GiB once decompressed; a large file that would decompress more than 200 times its packed size is refused (a
//! "ZIP bomb"); a ZIP inside the ZIP (Tumblr's posts.zip) is opened only up to 512 MiB; at most two million files are listed.
//! Only archives the person picked in a dialog are opened.

use serde::Serialize;
use std::collections::HashMap;
use std::fs::File;
use std::io::{Cursor, Read, Seek};
use std::path::{Component, Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use tauri::ipc::Response;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

pub const MAX_ENTRY: u64 = 1 << 30;
const MAX_NESTED: u64 = 512 << 20;
const MAX_RATIO: u64 = 200;
const RATIO_FROM: u64 = 64 << 20;
const MAX_ENTRIES: usize = 2_000_000;

enum Source {
    Zip {
        archive: zip::ZipArchive<File>,
        nested: Vec<(String, zip::ZipArchive<Cursor<Vec<u8>>>)>,
    },
    Dir {
        root: PathBuf,
    },
}

#[derive(Default)]
pub struct Archives {
    next: AtomicU32,
    open: Mutex<HashMap<u32, Source>>,
}

#[derive(Serialize)]
pub struct Opened {
    id: u32,
    name: String,
    entries: Vec<String>,
    warnings: Vec<String>,
}

/// One file from a ZIP, with the size and ratio guards.
fn read_entry<R: Read + Seek>(
    archive: &mut zip::ZipArchive<R>,
    name: &str,
) -> Result<Vec<u8>, String> {
    let index = archive
        .index_for_name(name)
        .ok_or_else(|| format!("{name} is not in the archive"))?;
    let entry = archive
        .by_index(index)
        .map_err(|e| format!("{name}: {e}"))?;
    let (size, packed) = (entry.size(), entry.compressed_size().max(1));
    if size > MAX_ENTRY {
        return Err(format!("{name} is over 1 GiB unpacked; it was left out"));
    }
    if size > RATIO_FROM && size / packed > MAX_RATIO {
        return Err(format!("{name} would unpack to {size} bytes from {packed}: that looks like a ZIP bomb, so it was left out"));
    }
    let mut out = Vec::with_capacity(size as usize);
    entry
        .take(MAX_ENTRY + 1)
        .read_to_end(&mut out)
        .map_err(|e| format!("{name}: {e}"))?;
    if out.len() as u64 > MAX_ENTRY {
        return Err(format!("{name} is over 1 GiB unpacked; it was left out"));
    }
    Ok(out)
}

/// The files in a ZIP, as forward-slash paths, leaving out folders and any name that would escape the archive.
fn list_zip<R: Read + Seek>(
    archive: &mut zip::ZipArchive<R>,
    prefix: &str,
    entries: &mut Vec<String>,
    warnings: &mut Vec<String>,
) -> Vec<(usize, String)> {
    let mut inner = Vec::new();
    for i in 0..archive.len() {
        if entries.len() >= MAX_ENTRIES {
            warnings.push("More than two million files: the rest were not listed.".into());
            break;
        }
        let Ok(f) = archive.by_index_raw(i) else {
            continue;
        };
        if f.is_dir() {
            continue;
        }
        let name = f.name().replace('\\', "/");
        if f.enclosed_name().is_none() {
            warnings.push(format!(
                "{name}: a name that points outside the archive, never read"
            ));
            continue;
        }
        if name.to_lowercase().ends_with(".zip") && f.size() <= MAX_NESTED {
            inner.push((i, name.clone()));
        }
        entries.push(format!("{prefix}{name}"));
    }
    inner
}

fn open_zip(path: &Path) -> Result<(Source, Vec<String>, Vec<String>), String> {
    let file = File::open(path).map_err(|e| e.to_string())?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("not a ZIP this can read ({e})"))?;
    let (mut entries, mut warnings) = (Vec::new(), Vec::new());
    let inner = list_zip(&mut archive, "", &mut entries, &mut warnings);
    let mut nested = Vec::new();
    for (_, name) in inner {
        let Ok(bytes) = read_entry(&mut archive, &name) else {
            continue;
        };
        let Ok(mut z) = zip::ZipArchive::new(Cursor::new(bytes)) else {
            continue;
        };
        let prefix = match name.rfind('/') {
            Some(i) => name[..=i].to_string(),
            None => String::new(),
        };
        list_zip(&mut z, &prefix, &mut entries, &mut warnings);
        nested.push((prefix, z));
    }
    Ok((Source::Zip { archive, nested }, entries, warnings))
}

fn open_dir(root: &Path) -> Result<(Source, Vec<String>, Vec<String>), String> {
    let (mut entries, mut warnings) = (Vec::new(), Vec::new());
    let mut stack = vec![(root.to_path_buf(), String::new())];
    while let Some((dir, rel)) = stack.pop() {
        let Ok(list) = std::fs::read_dir(&dir) else {
            continue;
        };
        for e in list.flatten() {
            let Ok(kind) = e.file_type() else { continue };
            let name = format!("{rel}{}", e.file_name().to_string_lossy());
            if kind.is_symlink() {
                continue;
            } else if kind.is_dir() {
                stack.push((e.path(), format!("{name}/")));
            } else if kind.is_file() {
                if entries.len() >= MAX_ENTRIES {
                    warnings.push("More than two million files: the rest were not listed.".into());
                    return Ok((
                        Source::Dir {
                            root: root.to_path_buf(),
                        },
                        entries,
                        warnings,
                    ));
                }
                entries.push(name);
            }
        }
    }
    entries.sort();
    Ok((
        Source::Dir {
            root: root.to_path_buf(),
        },
        entries,
        warnings,
    ))
}

fn read_dir_entry(root: &Path, rel: &str) -> Result<Vec<u8>, String> {
    let rel_path = Path::new(rel);
    if rel_path
        .components()
        .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err(format!("{rel}: not a path inside the folder"));
    }
    let path = root.join(rel_path);
    let meta = std::fs::symlink_metadata(&path).map_err(|e| format!("{rel}: {e}"))?;
    if !meta.is_file() {
        return Err(format!("{rel}: not a file"));
    }
    if meta.len() > MAX_ENTRY {
        return Err(format!("{rel} is over 1 GiB; it was left out"));
    }
    std::fs::read(&path).map_err(|e| format!("{rel}: {e}"))
}

/// The paths to open: from a dialog, or (in debug builds only, for the automated tests) from JOT_TEST_PICK, one path a line.
fn chosen(app: &AppHandle, folder: bool) -> Vec<PathBuf> {
    #[cfg(debug_assertions)]
    if let Ok(list) = std::env::var("JOT_TEST_PICK") {
        return list
            .lines()
            .filter(|l| !l.is_empty())
            .map(PathBuf::from)
            .collect();
    }
    let dialog = app.dialog().file();
    let picked = if folder {
        dialog
            .set_title("Choose an unzipped export")
            .blocking_pick_folder()
            .map(|p| vec![p])
    } else {
        dialog
            .set_title("Choose your data exports")
            .add_filter("ZIP archives", &["zip"])
            .blocking_pick_files()
    };
    picked
        .unwrap_or_default()
        .into_iter()
        .filter_map(|p| p.into_path().ok())
        .collect()
}

/// Ask the person for exports (ZIPs, or a folder), open each, and list its files. Nothing is read yet.
#[tauri::command]
pub async fn pick_archives(
    app: AppHandle,
    state: State<'_, Archives>,
    folder: bool,
) -> Result<Vec<Opened>, String> {
    let mut opened = Vec::new();
    for path in chosen(&app, folder) {
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_else(|| path.display().to_string());
        let result = if path.is_dir() {
            open_dir(&path)
        } else {
            open_zip(&path)
        };
        let (source, entries, warnings) = result.map_err(|e| format!("{name}: {e}"))?;
        let id = state.next.fetch_add(1, Ordering::Relaxed) + 1;
        state.open.lock().map_err(|_| "busy")?.insert(id, source);
        opened.push(Opened {
            id,
            name,
            entries,
            warnings,
        });
    }
    Ok(opened)
}

/// One file from an opened export, as raw bytes.
#[tauri::command]
pub async fn archive_read(
    state: State<'_, Archives>,
    id: u32,
    path: String,
) -> Result<Response, String> {
    let mut open = state.open.lock().map_err(|_| "busy")?;
    let source = open.get_mut(&id).ok_or("that export is no longer open")?;
    let bytes = match source {
        Source::Dir { root } => read_dir_entry(root, &path)?,
        Source::Zip { archive, nested } => {
            if archive.index_for_name(&path).is_some() {
                read_entry(archive, &path)?
            } else {
                let found = nested.iter_mut().find(|(p, z)| {
                    path.starts_with(p.as_str()) && z.index_for_name(&path[p.len()..]).is_some()
                });
                match found {
                    Some((p, z)) => {
                        let inner = path[p.len()..].to_string();
                        read_entry(z, &inner)?
                    }
                    None => return Err(format!("{path} is not in the archive")),
                }
            }
        }
    };
    Ok(Response::new(bytes))
}

#[tauri::command]
pub async fn archive_close(state: State<'_, Archives>, id: u32) -> Result<(), String> {
    state.open.lock().map_err(|_| "busy")?.remove(&id);
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn zip_of(files: &[(&str, Vec<u8>)]) -> zip::ZipArchive<Cursor<Vec<u8>>> {
        let mut w = zip::ZipWriter::new(Cursor::new(Vec::new()));
        let opts = zip::write::SimpleFileOptions::default()
            .compression_method(zip::CompressionMethod::Deflated);
        for (name, data) in files {
            w.start_file(*name, opts).unwrap();
            w.write_all(data).unwrap();
        }
        zip::ZipArchive::new(Cursor::new(w.finish().unwrap().into_inner())).unwrap()
    }

    #[test]
    fn reads_a_file_and_lists_only_safe_names() {
        let mut z = zip_of(&[
            ("data/tweets.js", b"window.YTD = []".to_vec()),
            ("../outside.txt", b"no".to_vec()),
        ]);
        let (mut entries, mut warnings) = (Vec::new(), Vec::new());
        list_zip(&mut z, "", &mut entries, &mut warnings);
        assert_eq!(entries, vec!["data/tweets.js"]);
        assert_eq!(warnings.len(), 1);
        assert_eq!(
            read_entry(&mut z, "data/tweets.js").unwrap(),
            b"window.YTD = []"
        );
        assert!(read_entry(&mut z, "missing.json").is_err());
    }

    #[test]
    fn refuses_a_zip_bomb() {
        let mut z = zip_of(&[("data/tweets.js", vec![0u8; 80 << 20])]);
        let err = read_entry(&mut z, "data/tweets.js").unwrap_err();
        assert!(err.contains("ZIP bomb"), "{err}");
    }

    #[test]
    fn a_folder_reads_only_inside_itself() {
        let dir = std::env::temp_dir().join(format!("jot-archive-test-{}", std::process::id()));
        std::fs::create_dir_all(dir.join("Keep")).unwrap();
        std::fs::write(dir.join("Keep/note.json"), b"{}").unwrap();
        let (_, entries, _) = open_dir(&dir).unwrap();
        assert_eq!(entries, vec!["Keep/note.json"]);
        assert_eq!(read_dir_entry(&dir, "Keep/note.json").unwrap(), b"{}");
        assert!(read_dir_entry(&dir, "../etc/passwd").is_err());
        assert!(read_dir_entry(&dir, "/etc/passwd").is_err());
        std::fs::remove_dir_all(&dir).unwrap();
    }
}
