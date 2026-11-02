import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { history, undo, redo } from '@codemirror/commands';
import { draftly } from 'draftly/editor';
import { createEssentialPlugins } from 'draftly/plugins';
import { defaultMarkdownParser, defaultMarkdownSerializer } from 'prosemirror-markdown';
import { Editor, rootCtx, defaultValueCtx } from '@milkdown/kit/core';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { getMarkdown } from '@milkdown/kit/utils';
const { document, window } = globalThis;
const fixtures = {
  prose: '### 2026-11-01\n\nA __quiet__ *morning*.\n\n[ ] Take a walk.\n\n',
  record: ':::record note #remember\nlabel: A note\nfuture-field: keep this exactly\nbody: |\n  first line\n  second line\n:::\n\n',
  opaque: '<!-- Keep this comment exactly -->\n\n~~~text\nliteral *marks*\n~~~\n',
  crlf: '\ufeff---\r\ntitle: Journal\r\n---\r\n\r\n### 2026-11-01\r\n\r\nAn entry.\r\n',
  mixed: 'One.\r\n\r\nTwo.\n\nThree.\r'
};
const host = () => { const root = document.createElement('div'); document.body.append(root); return root; };
window.runProbe = async () => {
  const results = [];
  for (const [fixture, text] of Object.entries(fixtures)) {
    for (const [library, extensions] of [['CodeMirror', []], ['Draftly', [draftly({plugins:createEssentialPlugins()})]]]) {
      const root = host();
      const eol = text.includes('\r\n') ? '\r\n' : '\n';
      try {
        const view = new EditorView({ parent: root, state: EditorState.create({ doc: text, extensions: [EditorState.lineSeparator.of(eol), history(), ...extensions] }) });
        const unchanged = view.state.sliceDoc();
        const before = view.state.sliceDoc(); const logicalLines = view.state.doc.lines, internalLength = view.state.doc.length;
        view.dispatch({changes:{from:0,to:0,insert:'Test '}});
        const edited = view.state.sliceDoc();
        const undone = undo(view), restored = view.state.sliceDoc() === before;
        const redone = redo(view), repeat = view.state.sliceDoc() === edited;
        results.push({library,fixture,exact:unchanged === text,logicalLines,physicalLines:text.split(/\r\n|\r|\n/).length,internalLength,sourceLength:text.length,undo:undone && restored,redo:redone && repeat,output:unchanged === text ? undefined : unchanged});
        view.destroy();
      } catch(error) {results.push({library,fixture,error:error.message});}
      root.remove();
    }
    try { const output = defaultMarkdownSerializer.serialize(defaultMarkdownParser.parse(text)); results.push({library:'ProseMirror Markdown default',fixture,exact:output === text,output:output === text ? undefined : output}); } catch(error) { results.push({library:'ProseMirror Markdown default',fixture,error:error.message}); }
    const root = host();
    try {
      const editor = await Editor.make().config(ctx => {ctx.set(rootCtx,root);ctx.set(defaultValueCtx,text);}).use(commonmark).create();
      const output = editor.action(getMarkdown());
      results.push({library:'Milkdown CommonMark default',fixture,exact:output === text,output:output === text ? undefined : output});
      await editor.destroy();
    } catch(error) {results.push({library:'Milkdown CommonMark default',fixture,error:error.message});}
    root.remove();
  }
  return results;
};
