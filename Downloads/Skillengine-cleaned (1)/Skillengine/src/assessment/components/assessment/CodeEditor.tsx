import { useEffect, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import { Loader2 } from 'lucide-react';
import { monacoLanguage } from '../../services/judge0Service';

interface Props { value: string; language: string; onChange: (v: string) => void; readOnly?: boolean }

const BOX = 'h-[340px] overflow-hidden rounded-xl border border-stone-300 sm:h-[400px] lg:h-[420px]';

export default function CodeEditor({ value, language, onChange, readOnly }: Props) {
  const [monacoReady, setMonacoReady] = useState(false);
  const [plainEditorEngaged, setPlainEditorEngaged] = useState(false);

  // Load Monaco from the installed npm package, not its default CDN. Import it lazily
  // so the editor bundle is only requested when a coding question is opened.
  useEffect(() => {
    let alive = true;
    import('monaco-editor')
      .then((monaco) => {
        globalThis.MonacoEnvironment = {
          getWorker: () => new EditorWorker(),
        };
        loader.config({ monaco });
        return loader.init();
      })
      .then(() => { if (alive) setMonacoReady(true); })
      .catch((error: unknown) => {
        console.error('[CodeEditor] local Monaco failed to initialize:', error);
      });
    return () => { alive = false; };
  }, []);

  if (monacoReady && !plainEditorEngaged) {
    return (
      <div className={BOX}>
        <Editor
          value={value}
          language={monacoLanguage(language)}
          theme="vs-dark"
          onChange={(v) => onChange(v ?? '')}
          loading={<div className="flex h-full items-center justify-center text-stone-400"><Loader2 className="animate-spin" aria-label="Loading editor" /></div>}
          options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: '"JetBrains Mono", monospace', automaticLayout: true, wordWrap: 'on', scrollBeyondLastLine: false, readOnly, tabSize: 4, padding: { top: 12 } }}
        />
      </div>
    );
  }

  return (
    <div className={BOX}>
      <p className="bg-stone-800 px-3 py-1 text-xs text-stone-300" role="status">
        Code editor ready. Type your solution and use Run Code to execute it.
      </p>
      <textarea
        value={value}
        onFocus={() => setPlainEditorEngaged(true)}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        spellCheck={false}
        aria-label="Code editor"
        wrap="off"
        onKeyDown={(e) => {
          if (e.key !== 'Tab') return;
          e.preventDefault();
          const el = e.currentTarget;
          const start = el.selectionStart;
          const end = el.selectionEnd;
          onChange(value.slice(0, start) + '    ' + value.slice(end));
          requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + 4; });
        }}
        className="h-[calc(100%-1.75rem)] w-full resize-none bg-stone-900 p-3 font-mono text-sm leading-6 text-stone-100 outline-none"
      />
    </div>
  );
}
