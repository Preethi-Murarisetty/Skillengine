import { Send, User } from 'lucide-react';
import Brand from './Brand';
import AssessmentTimer from './AssessmentTimer';
import type { Candidate } from '../../types/assessment';

interface Props {
  title: string; sectionName?: string; questionNo?: number; totalQuestions?: number;
  seconds: number; warning: boolean; candidate?: Candidate; onSubmit: () => void; disabled?: boolean;
}

export default function AssessmentHeader({ title, sectionName, questionNo, totalQuestions, seconds, warning, candidate, onSubmit, disabled }: Props) {
  return (
    <header className="sticky top-0 z-30 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2 sm:px-6">
        <Brand />
        <div className="order-3 w-full min-w-0 sm:order-none sm:w-auto sm:flex-1">
          <h1 className="truncate text-sm font-bold sm:text-base">{title}</h1>
          <p className="truncate text-xs text-ink-soft">
            {sectionName}{questionNo && totalQuestions ? ` • Question ${questionNo} of ${totalQuestions}` : ''}
          </p>
        </div>
        {candidate?.name && (
          <div className="hidden items-center gap-1.5 text-xs text-ink-soft md:flex"><User size={14} aria-hidden />{candidate.name}</div>
        )}
        <div className="ml-auto flex items-center gap-2 sm:ml-0">
          <AssessmentTimer seconds={seconds} warning={warning} />
          <button className="se-btn-primary" onClick={onSubmit} disabled={disabled}>
            <Send size={16} aria-hidden /><span className="hidden sm:inline">Submit Assessment</span><span className="sm:hidden">Submit</span>
          </button>
        </div>
      </div>
      {warning && (
        <div role="alert" className="bg-red-600 px-4 py-1 text-center text-xs font-semibold text-white">
          Less than 5 minutes remaining. Your assessment is submitted automatically when time runs out.
        </div>
      )}
    </header>
  );
}
