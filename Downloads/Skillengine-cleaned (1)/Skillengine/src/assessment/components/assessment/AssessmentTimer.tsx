import { Clock } from 'lucide-react';
import { formatHMS } from '../../utils/timer';

export default function AssessmentTimer({ seconds, warning }: { seconds: number; warning: boolean }) {
  return (
    <div role="timer" aria-label={`Time remaining ${formatHMS(seconds)}`}
      className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 font-mono text-lg font-semibold tabular-nums sm:text-xl ${
        warning ? 'animate-pulseWarn border-red-300 bg-red-50 text-red-700' : 'border-orange-200 bg-brand-light text-brand-dark'}`}>
      <Clock size={18} aria-hidden />
      {formatHMS(seconds)}
    </div>
  );
}
