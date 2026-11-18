import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import type { CodingSubmission, ExecStatus } from '../../types/assessment';

const LABEL: Record<ExecStatus, string> = {
  idle: 'Not run', running: 'Running', submitted: 'Submitted', accepted: 'Accepted', wrong_answer: 'Wrong Answer',
  compilation_error: 'Compilation Error', runtime_error: 'Runtime Error', time_limit: 'Time Limit Exceeded', error: 'Execution Error',
};

export default function TestResults({ result }: { result: CodingSubmission | null }) {
  if (!result) return <p className="text-sm text-ink-soft">Run your code to see output here.</p>;
  if (result.status === 'running')
    return <p className="flex items-center gap-2 text-sm font-semibold text-amber-700" role="status"><Loader2 size={16} className="animate-spin" aria-hidden />⏳ Running</p>;

  const ok = result.status === 'accepted';
  const submitted = result.status === 'submitted';
  const isSubmit = result.mode === 'submit';
  return (
    <section aria-label="Test results" aria-live="polite" className="space-y-3">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-sm font-semibold ${ok ? 'bg-green-50 text-green-800' : submitted ? 'bg-blue-50 text-blue-800' : 'bg-red-50 text-red-800'}`}>
        {ok || submitted ? <CheckCircle2 size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
        <span>{ok || submitted ? '✓' : '✗'} {LABEL[result.status]}</span>
        {result.timeSec !== undefined && <span className="flex items-center gap-1 font-normal"><Clock size={14} aria-hidden />Execution Time: {result.timeSec}s</span>}
        {result.memoryKb !== undefined && <span className="font-normal">Memory Used: {Math.round(result.memoryKb)} KB</span>}
      </div>
      {result.message && <p className={`text-sm ${submitted ? 'text-blue-700' : 'text-red-700'}`}>{result.message}</p>}

      {isSubmit && !submitted && (
        <>
          <p className="text-sm font-semibold">
            Test Cases Passed: {result.passed} / {result.total}
            <span className="ml-3 font-normal text-ink-soft">Failed: {result.total - result.passed}</span>
          </p>
          <ul className="space-y-1.5">
            {result.results.map((r) => (
              <li key={r.id} className="rounded-lg border border-stone-200 px-3 py-1.5 text-sm">
                <div className="flex items-center gap-2">
                  {r.passed ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}
                  <span className="font-medium">Test Case {r.index}</span>
                  {r.hidden && <span className="text-xs text-ink-soft">(hidden)</span>}
                </div>
                {/* Hidden test data is never rendered. */}
                {!r.hidden && !r.passed && (
                  <dl className="mt-1 grid gap-1 font-mono text-xs">
                    <div><dt className="inline font-semibold">Input: </dt><dd className="inline whitespace-pre-wrap">{r.input}</dd></div>
                    <div><dt className="inline font-semibold">Expected: </dt><dd className="inline whitespace-pre-wrap">{r.expected}</dd></div>
                    <div><dt className="inline font-semibold">Actual: </dt><dd className="inline whitespace-pre-wrap">{r.actual}</dd></div>
                  </dl>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {!isSubmit && (
        <div className="space-y-2 font-mono text-xs">
          <div><p className="mb-1 font-sans text-sm font-semibold">Output</p><pre className="max-h-40 overflow-auto rounded-lg bg-stone-900 p-3 text-stone-100">{result.stdout || '(no output)'}</pre></div>
          {result.stderr && <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950 p-3 text-red-100">{result.stderr}</pre>}
        </div>
      )}
      {isSubmit && result.stderr && result.status === 'compilation_error' && (
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-red-950 p-3 font-mono text-xs text-red-100">{result.stderr}</pre>
      )}
    </section>
  );
}
