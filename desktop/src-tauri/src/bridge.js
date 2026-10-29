// Injected by the Jot desktop app into every page (lib.rs), before the page's own scripts. The pages are the website's, unchanged;
// this gives them what the app adds, as window.jotDesktop, and turns their downloads into native Save dialogs. On the website
// none of this exists, and the pages work as they always do.
(() => {
  if (window.jotDesktop) return;
  const invoke = (cmd, args, options) => window.__TAURI__.core.invoke(cmd, args, options);

  /** A data export opened by the app: the same { name, list, read } shape the importer reads from a ZIP or a folder. */
  const source = (o) => ({
    name: o.name,
    warnings: o.warnings,
    list: () => o.entries,
    read: async (path) => new Uint8Array(await invoke('archive_read', { id: o.id, path })),
    close: () => invoke('archive_close', { id: o.id }),
  });

  async function save(name, bytes) {
    const where = await invoke('save_file', bytes, { headers: { 'x-jot-name': encodeURIComponent(name) } });
    document.dispatchEvent(new CustomEvent('jot-desktop-saved', { detail: { name, where } }));
    return where;
  }

  window.jotDesktop = Object.freeze({
    app: 'tauri',
    /** Exports of any size, read a file at a time by the app: ZIPs (folder false) or an unzipped folder (folder true). */
    pickArchives: async (folder = false) => (await invoke('pick_archives', { folder })).map(source),
    /** Save bytes through a native Save dialog; resolves to where they went, or null if the person cancelled. */
    save,
  });

  // A journal opened from the file manager (opened.rs) goes to the writer through its own Open path, as if picked there: a locked
  // one asks for a way in, and replacing unsaved writing asks first. On any other page, the writer opens and takes it.
  async function openWaiting() {
    const input = document.getElementById('openFile');
    if (!input) { location.href = new URL('../write/index.html', location.href).href; return; }
    const [first] = await invoke('take_opened');
    if (!first) return;
    const bytes = new Uint8Array(await invoke('read_opened', { id: first.id }));
    const files = new DataTransfer(); files.items.add(new File([bytes], first.name));
    input.files = files.files; input.dispatchEvent(new Event('change'));
  }
  window.addEventListener('load', () => {
    if (document.getElementById('openFile')) openWaiting().catch(() => {});
    window.__TAURI__.event.listen('jot-opened', () => openWaiting().catch(() => {}));
  });

  // Every download on every page (<a download> clicked, by a person or by a script) goes to a Save dialog instead.
  window.addEventListener('click', async (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[download]');
    if (!a || !a.href) return;
    e.preventDefault(); e.stopImmediatePropagation();
    try {
      const bytes = new Uint8Array(await (await fetch(a.href)).arrayBuffer());
      await save(a.getAttribute('download') || 'download', bytes);
    } catch (err) { document.dispatchEvent(new CustomEvent('jot-desktop-saved', { detail: { name: a.getAttribute('download'), error: String(err && err.message || err) } })); }
  }, true);
})();
