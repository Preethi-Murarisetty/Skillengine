import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';

/** Pull the token out of a pasted assessment link, or accept a bare token. */
export const extractToken = (input: string): string | null => {
  const v = input.trim();
  if (!v) return null;
  const m = v.match(/\/(?:assessment|exam)\/([^/?#\s]+)/i);
  const token = (m ? m[1] : v).replace(/\/(?:generate-key|verify-key|start|end)$/i, '');
  return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) ? token : null; // JWT shape only; not decoded
};

/** Assessment landing inside the signed-in dashboard: paste the link you were sent. */
export default function AssessmentEntry() {
  const nav = useNavigate();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const open = (e: FormEvent) => {
    e.preventDefault();
    const t = extractToken(value);
    if (!t) { setError('That does not look like an assessment link. Paste the full link you received.'); return; }
    nav(`/exam/${encodeURIComponent(t)}`);
  };

  return (
    <main className="dashboard-main">
      <section className="dashboard-card mx-auto max-w-xl p-6">
        <div className="flex items-center gap-2"><ClipboardCheck className="text-orange-600" aria-hidden /><h1 className="text-xl font-bold">Assessment</h1></div>
        <p className="mt-2 text-sm text-gray-600">
          Assessments are timed and scored. Open the assessment link you received from your instructor,
          or paste it below. Use Practice in the sidebar for untimed quizzes and coding.
        </p>
        <form onSubmit={open} className="mt-5" noValidate>
          <label htmlFor="assessment-link" className="text-sm font-semibold">Assessment link</label>
          <input id="assessment-link" value={value} onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="http://localhost:5173/exam/…" spellCheck={false} autoComplete="off"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm" aria-invalid={Boolean(error)} />
          {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          <button type="submit" className="mt-4 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">Open assessment</button>
        </form>
      </section>
    </main>
  );
}
