// A writing look is a browser preference, never a change to journal source.
export const WRITER_FONTS = [
  { value: 'script-05', label: 'Handwriting · fine' },
  { value: 'script-07', label: 'Handwriting · medium' },
  { value: 'script-10', label: 'Handwriting · bold' },
  { value: 'sans', label: 'Plain sans' },
  { value: 'mono', label: 'Typewriter (mono)' },
];
const STORAGE_KEY = 'jot-writing-font-v1';

export function setupWriterFonts({ editor, surface }) {
  const doc = editor.ownerDocument, root = doc.documentElement;
  if (!doc.getElementById('writer-fonts-css')) {
    const sheet = doc.createElement('link'); sheet.id = 'writer-fonts-css'; sheet.rel = 'stylesheet';
    sheet.href = new URL('./writer-fonts.css', import.meta.url).href; doc.head.append(sheet);
  }
  let choice = 'script-07';
  try {
    const saved = doc.defaultView.localStorage.getItem(STORAGE_KEY);
    if (WRITER_FONTS.some(font => font.value === saved)) choice = saved;
  } catch { /* The chosen look still works when browser storage is unavailable. */ }
  root.dataset.writerFont = choice;
  const existing = doc.getElementById('writerFont');
  if (existing) return existing;
  const label = doc.createElement('label'); label.className = 'writer-fonts'; label.htmlFor = 'writerFont';
  const caption = doc.createElement('span'); caption.textContent = 'Font'; label.append(caption);
  const select = doc.createElement('select'); select.id = 'writerFont'; select.setAttribute('aria-label', 'Writing font');
  select.setAttribute('aria-controls', surface.id);
  for (const font of WRITER_FONTS) {
    const option = doc.createElement('option'); option.value = font.value; option.textContent = font.label; select.append(option);
  }
  select.value = choice; label.append(select);
  const actions = doc.querySelector('.writer-file-actions'), commands = doc.getElementById('writerCommandsBtn');
  if (actions) actions.insertBefore(label, commands?.parentNode === actions ? commands : null);
  else surface.before(label);
  select.addEventListener('change', () => {
    if (!WRITER_FONTS.some(font => font.value === select.value)) return;
    root.dataset.writerFont = select.value;
    try { doc.defaultView.localStorage.setItem(STORAGE_KEY, select.value); } catch { /* Browser preference only. */ }
  });
  const mode = () => {
    select.disabled = root.dataset.editorMode === 'source';
    select.title = select.disabled ? 'Source editing uses a monospace font' : 'Choose the look of your writing';
  };
  editor.addEventListener('jotmodechange', mode); mode();
  return select;
}
