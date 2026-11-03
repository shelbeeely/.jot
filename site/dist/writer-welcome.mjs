// A calm way in for an empty journal. Shown only while the writing is empty; nothing is counted or remembered
// except an explicit "Don't show this again" (browser storage, wrapped in try/catch).
// Research: docs/methods/prompt-journaling.md, lines 44 and 333 (short, skippable prompts; choose from a few);
// docs/methods/low-demand-check-in.md, lines 15 and 236 (a line is a complete entry; no streaks or catch-up prompts).

// Light questions, written for Jot. Each is optional; "Another question" swaps it.
export const STARTER_QUESTIONS = Object.freeze([
  'What is one thing you noticed today?',
  'What was the best thing you ate or drank today?',
  'What went more smoothly than you expected?',
  'What helped today, even a little?',
  'Where did you go today, even if it was only from one room to another?',
  'What is on your mind right now?',
  'Who did you talk to today, and what about?',
  'What would make tomorrow a little easier?',
  'Sum up today in a handful of words.',
  'What are you looking forward to, however small?'
]);

const HIDE_KEY = 'jot-writer-welcome-hidden';

export function setupWriterWelcome({ editor, openVoice, openMethods, openTools = () => {}, addToday, insertText }) {
  const doc = editor.ownerDocument, win = doc.defaultView, root = doc.documentElement;
  const pane = doc.querySelector('.writing-pane');
  if (!pane) return { refresh() {} };
  let hidden = false;
  try { hidden = win.localStorage.getItem(HIDE_KEY) === '1'; } catch { /* Showing it again is harmless. */ }
  let question = Math.floor(Math.random() * STARTER_QUESTIONS.length);

  const el = (tag, text, attributes = {}) => {
    const node = doc.createElement(tag);
    if (text !== undefined) node.textContent = text;
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  };
  const panel = el('section', undefined, { class: 'writer-welcome', 'aria-labelledby': 'writerWelcomeTitle' });
  panel.hidden = true;
  const head = el('div', undefined, { class: 'writer-welcome-head' });
  head.append(el('h2', 'Start wherever you like.', { id: 'writerWelcomeTitle' }));
  const close = el('button', '✕', { type: 'button', class: 'writer-welcome-close', 'aria-label': 'Hide these suggestions' });
  head.append(close);
  panel.append(head, el('p', 'Nothing to set up and nothing to keep up with. Type on the line above, or pick one of these.', { class: 'writer-welcome-intro' }));

  const choices = el('div', undefined, { class: 'writer-welcome-choices' });
  const choice = (id, icon, title, detail, run) => {
    const button = el('button', undefined, { type: 'button', id, class: 'writer-welcome-choice' });
    // Icons are static markup; titles and details are text.
    const mark = el('span', undefined, { class: 'writer-welcome-icon', 'aria-hidden': 'true' });
    mark.innerHTML = icon;
    const words = el('span', undefined, { class: 'writer-welcome-words' });
    words.append(el('strong', title), el('span', detail));
    button.append(mark, words);
    button.onclick = run;
    choices.append(button);
    return button;
  };
  const svg = path => '<svg viewBox="0 0 24 24" width="24" height="24" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + '</svg>';
  choice('welcomeToday', svg('<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>'), 'Write about today', "Adds today's date. Then write whatever comes.", () => { addToday(); });
  choice('welcomeSpeak', svg('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>'), 'Say it out loud', 'Speak, then check the words before they go in.', () => { openVoice(); });
  const questionChoice = choice('welcomeQuestion', svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14"/><path d="M12 17h.01"/>'), 'Answer a small question', '', () => {
    addToday();
    insertText('> ' + STARTER_QUESTIONS[question] + '\n\n');
  });
  choice('welcomeMethods', svg('<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4Z"/><path d="M20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6Z"/>'), 'Try a journaling method', 'Gratitude, morning pages, a bullet journal and more. Each one is optional.', () => { openMethods(); });
  const questionText = questionChoice.querySelector('.writer-welcome-words span');
  const another = el('button', 'Another question', { type: 'button', class: 'writer-welcome-link', id: 'welcomeAnother' });
  another.onclick = () => { question = (question + 1) % STARTER_QUESTIONS.length; showQuestion(); };
  function showQuestion() { questionText.textContent = '“' + STARTER_QUESTIONS[question] + '”'; }
  showQuestion();

  const foot = el('div', undefined, { class: 'writer-welcome-foot' });
  const hideForever = el('button', "Don't show this again", { type: 'button', class: 'writer-welcome-link' });
  const allTools = el('button', 'See every tool', { type: 'button', class: 'writer-welcome-link', id: 'welcomeTools' });
  allTools.onclick = () => openTools();
  foot.append(another, allTools, hideForever);
  panel.append(choices, foot,
    el('p', 'Your writing stays in this browser until you choose Save. Skipped days are fine: start from today whenever you like. Every other tool is under Tools, at the top of the page and, on a phone, at the bottom of the screen.', { class: 'writer-welcome-note' }));
  // Below the writing line: anyone ready to type starts at the top, and the ways in sit underneath.
  const footer = pane.querySelector('.writing-footer');
  if (footer) pane.insertBefore(panel, footer); else pane.append(panel);

  let dismissed = false;
  close.onclick = () => { dismissed = true; refresh(); editor.focus(); };
  hideForever.onclick = () => {
    hidden = true;
    try { win.localStorage.setItem(HIDE_KEY, '1'); } catch { /* Hidden for this visit only. */ }
    refresh(); editor.focus();
  };

  function refresh() {
    const empty = !/\S/.test(editor.value) && !editor.readOnly;
    root.toggleAttribute('data-writer-empty', empty);
    // Typing then clearing the page brings the suggestions back, unless they were closed.
    panel.hidden = !empty || hidden || dismissed;
  }
  editor.addEventListener('input', refresh);
  // Opening, locking or replacing a journal sets the source without an input event.
  win.setInterval(refresh, 800);
  refresh();
  return { refresh };
}
