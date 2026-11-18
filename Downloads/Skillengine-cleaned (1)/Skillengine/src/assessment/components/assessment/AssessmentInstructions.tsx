import { Loader2, Play } from 'lucide-react';
import type { Assessment } from '../../types/assessment';
import { formatMinutes } from '../../utils/timer';

interface Props { assessment: Assessment; starting: boolean; onStart: () => void }

export default function AssessmentInstructions({ assessment: a, starting, onStart }: Props) {
  const lines = (a.instructions ?? '').split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return (
    <div className="se-card mx-auto w-full max-w-2xl p-6 sm:p-8">
      <h1 className="text-2xl font-extrabold">{a.title}</h1>
      {a.description && <p className="mt-1 text-sm text-ink-soft">{a.description}</p>}

      <dl className="mt-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-ink-soft">Duration</dt><dd className="text-lg font-bold">{Math.round(a.duration_seconds / 60)} minutes</dd></div>
        {a.passing_percentage !== undefined && <div className="rounded-xl bg-cream p-3"><dt className="text-xs text-ink-soft">Passing percentage</dt><dd className="text-lg font-bold">{a.passing_percentage}%</dd></div>}
      </dl>

      <h2 className="mt-6 font-bold">Sections</h2>
      <ol className="mt-2 space-y-2">
        {a.sections.map((s, i) => (
          <li key={s.id} className="rounded-xl border border-stone-200 p-3 text-sm">
            <p className="font-semibold">{i + 1}. {s.name}</p>
            <p className="text-ink-soft">{s.question_count} questions • {s.total_marks} marks • {formatMinutes(s.duration_seconds)}
              {s.unlock_rule === 'previous_completed' && ' • unlocks after the previous section'}</p>
          </li>
        ))}
      </ol>

      {lines.length > 0 && (<>
        <h2 className="mt-6 font-bold">Instructions</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul>
      </>)}

      <button className="se-btn-primary mt-8 w-full py-3 text-base" onClick={onStart} disabled={starting}>
        {starting ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Play size={18} aria-hidden />}Start Assessment
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">The timer starts when you press this button.</p>
    </div>
  );
}
