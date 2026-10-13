import { Check, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import type { MCQQuestion as Q } from '../../types/assessment';

interface Props {
  question: Q; index: number; total: number; selected: string | null; marked: boolean;
  onSelect: (optionId: string) => void; onClear: () => void; onMark: () => void;
  onPrev: () => void; onNext: () => void; isFirst: boolean; isLast: boolean; isFinalQuestion: boolean; submitting: boolean;
}

export default function MCQQuestion({ question, index, total, selected, marked, onSelect, onClear, onMark, onPrev, onNext, isFirst, isLast, isFinalQuestion, submitting }: Props) {
  return (
    <article className="se-card p-4 sm:p-6" aria-labelledby="q-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="q-title" className="text-sm font-semibold text-brand-dark">Question {index + 1} of {total}</h2>
        <div className="flex items-center gap-3 text-xs text-ink-soft">
          {question.marks !== undefined && <span>{question.marks} {question.marks === 1 ? 'mark' : 'marks'}</span>}
          {selected && <span className="flex items-center gap-1 text-green-700"><Check size={14} aria-hidden />Saved</span>}
        </div>
      </div>
      {/* Rendered as plain text: React escapes content, so no HTML injection. */}
      <p className="whitespace-pre-wrap break-words text-base font-medium leading-relaxed sm:text-lg">{question.text}</p>
      {question.imageUrl && <img src={question.imageUrl} alt="Question illustration" className="mt-4 max-h-72 max-w-full rounded-lg border border-stone-200" referrerPolicy="no-referrer" />}

      <fieldset className="mt-5 space-y-2.5">
        <legend className="sr-only">Answer options</legend>
        {question.options.map((o, i) => {
          const on = selected === o.id;
          return (
            <label key={o.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors ${on ? 'border-brand bg-brand-light' : 'border-stone-200 hover:bg-stone-50'}`}>
              <input type="radio" name={`q-${question.id}`} checked={on} onChange={() => onSelect(o.id)} className="mt-1 h-4 w-4 accent-brand" />
              <span className="font-semibold text-ink-soft">{String.fromCharCode(65 + i)}.</span>
              <span className="whitespace-pre-wrap break-words">{o.text}</span>
            </label>
          );
        })}
      </fieldset>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button className="se-btn-outline" onClick={onPrev} disabled={isFirst}><ChevronLeft size={16} aria-hidden />Previous</button>
        <button className={`se-btn-outline ${marked ? 'border-gold bg-amber-50 text-amber-800' : ''}`} onClick={onMark} aria-pressed={marked}>
          <Star size={16} aria-hidden className={marked ? 'fill-gold text-gold' : ''} />{marked ? 'Marked' : 'Mark for Review'}
        </button>
        {selected && <button className="se-btn-ghost" onClick={onClear}>Clear answer</button>}
        <button className="se-btn-primary ml-auto" onClick={onNext} disabled={isFinalQuestion && submitting}>
          {isFinalQuestion ? submitting ? 'Submitting…' : 'Submit Assessment' : isLast ? 'Save & Finish Section' : 'Save & Next'}
          <ChevronRight size={16} aria-hidden />
        </button>
      </div>
    </article>
  );
}
