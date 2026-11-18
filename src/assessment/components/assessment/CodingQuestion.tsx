import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Play, Send, Star, Terminal } from 'lucide-react';
import CodeEditor from './CodeEditor';
import TestResults from './TestResults';
import { useCoding } from '../../hooks/useCoding';
import type { CodingQuestion as Q } from '../../types/assessment';

const Block = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mt-4"><h3 className="mb-1 text-sm font-bold">{title}</h3>{children}</section>
);

interface Props { question: Q; marked: boolean; onMark: () => void }

export default function CodingQuestion({ question: q, marked, onMark }: Props) {
  const { code, setCode, result, busy, run, submit } = useCoding(q);
  const samples = q.test_cases.filter((t) => !t.hidden);
  const [stdin, setStdin] = useState(samples[0]?.input ?? '');
  const [tab, setTab] = useState<'input' | 'output'>('input');
  const [problemOpen, setProblemOpen] = useState(true);

  const handleRun = async () => {
    setTab('output');
    await run(stdin);
  };

  const handleSubmit = async () => {
    setTab('output');
    await submit();
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="se-card flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="truncate text-base font-bold">{q.title}</h2>
          {q.marks !== undefined && <span className="shrink-0 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">{q.marks} marks</span>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-stone-100 px-2 py-0.5 font-mono text-xs text-ink-soft">{q.language}</span>
          <button
            className={`se-btn-outline !px-2 !py-1 text-xs ${marked ? 'border-gold bg-amber-50' : ''}`}
            onClick={onMark} aria-pressed={marked}
          >
            <Star size={12} className={marked ? 'fill-gold text-gold' : ''} aria-hidden />Mark
          </button>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {/* Left: Problem panel */}
        <div className="se-card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-bold hover:bg-stone-50"
            onClick={() => setProblemOpen((o) => !o)}
            aria-expanded={problemOpen}
          >
            Problem Statement
            {problemOpen ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
          </button>
          {problemOpen && (
            <div className="max-h-[calc(100vh-16rem)] overflow-auto px-4 pb-4">
              {q.description
                ? <Block title="Description"><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{q.description}</p></Block>
                : <p className="mt-4 text-sm text-ink-soft italic">No description available.</p>
              }
              {q.input_format && <Block title="Input Format"><p className="whitespace-pre-wrap text-sm">{q.input_format}</p></Block>}
              {q.output_format && <Block title="Output Format"><p className="whitespace-pre-wrap text-sm">{q.output_format}</p></Block>}
              {q.constraints.length > 0 && (
                <Block title="Constraints">
                  <ul className="list-disc pl-5 font-mono text-sm">{q.constraints.map((c, i) => <li key={i}>{c}</li>)}</ul>
                </Block>
              )}
              {samples.length > 0 && (
                <Block title="Sample Tests">
                  <div className="space-y-2">
                    {samples.map((t, i) => (
                      <div key={t.id} className="rounded-lg border border-stone-200 p-2 font-mono text-xs">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-sans font-semibold">Sample {i + 1}</span>
                          <button
                            className="text-xs text-brand hover:underline"
                            onClick={() => { setStdin(t.input); setTab('input'); }}
                          >Use as input</button>
                        </div>
                        <p className="text-ink-soft">Input</p><pre className="whitespace-pre-wrap">{t.input}</pre>
                        <p className="mt-1 text-ink-soft">Expected Output</p><pre className="whitespace-pre-wrap">{t.expected_output}</pre>
                      </div>
                    ))}
                  </div>
                </Block>
              )}
            </div>
          )}
        </div>

        {/* Right: Editor + Terminal */}
        <div className="flex flex-col gap-3">
          <CodeEditor value={code} language={q.language} onChange={setCode} />

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button className="se-btn-outline" onClick={handleRun} disabled={busy !== null}>
              {busy === 'run' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}
              Run Code
            </button>
            <button
              className="se-btn-primary"
              onClick={handleSubmit}
              disabled={busy !== null || q.test_cases.length === 0}
              title={q.test_cases.length === 0 ? 'No test cases available' : undefined}
            >
              {busy === 'submit' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Send size={16} aria-hidden />}
              Submit Code
            </button>
          </div>

          {/* Terminal panel */}
          <div className="se-card overflow-hidden">
            {/* Tab bar */}
            <div className="flex items-center border-b border-stone-200 bg-stone-50">
              <Terminal size={14} className="ml-3 text-ink-soft" aria-hidden />
              <button
                className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === 'input' ? 'border-b-2 border-brand text-brand' : 'text-ink-soft hover:text-ink'}`}
                onClick={() => setTab('input')}
              >Input</button>
              <button
                className={`px-4 py-2 text-xs font-semibold transition-colors ${tab === 'output' ? 'border-b-2 border-brand text-brand' : 'text-ink-soft hover:text-ink'}`}
                onClick={() => setTab('output')}
              >
                Output
                {result && result.status !== 'running' && (
                  <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${result.status === 'accepted' ? 'bg-green-500' : result.status === 'error' || result.status === 'compilation_error' ? 'bg-red-500' : 'bg-amber-500'}`} />
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="p-3">
              {tab === 'input' ? (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-ink-soft" htmlFor={`stdin-${q.id}`}>
                    Custom Input (stdin)
                  </label>
                  <textarea
                    id={`stdin-${q.id}`}
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    rows={5}
                    placeholder="Enter input for your program..."
                    className="w-full rounded-lg border border-stone-300 bg-stone-900 p-3 font-mono text-sm text-stone-100 placeholder:text-stone-500"
                    spellCheck={false}
                  />
                </div>
              ) : (
                <TestResults result={result} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
