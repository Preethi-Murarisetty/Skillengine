import { ArrowRight, Check, Lock } from 'lucide-react';
import type { AssessmentSection } from '../../types/assessment';

interface Props {
  sections: AssessmentSection[]; activeIdx: number; completed: string[];
  isUnlocked: (i: number) => boolean; onSelect: (i: number) => void; horizontal?: boolean;
}

export default function SectionNavigation({ sections, activeIdx, completed, isUnlocked, onSelect, horizontal }: Props) {
  return (
    <nav aria-label="Sections">
      <h2 className="mb-2 text-sm font-bold">Sections</h2>
      <ul className={horizontal ? 'flex gap-2 overflow-x-auto pb-1' : 'space-y-1.5'}>
        {sections.map((s, i) => {
          const done = completed.includes(s.id);
          const locked = !isUnlocked(i);
          const active = i === activeIdx;
          const Icon = done ? Check : locked ? Lock : active ? ArrowRight : ArrowRight;
          return (
            <li key={s.id} className={horizontal ? 'shrink-0' : ''}>
              <button disabled={locked} onClick={() => onSelect(i)} aria-current={active ? 'step' : undefined}
                title={locked ? 'Complete the previous section to unlock' : s.name}
                className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                  active ? 'border-brand bg-brand-light text-brand-dark' : 'border-stone-200 bg-white hover:bg-stone-50'} ${locked ? 'cursor-not-allowed opacity-60' : ''}`}>
                <Icon size={16} aria-hidden className={done ? 'text-green-600' : locked ? 'text-stone-400' : 'text-brand'} />
                <span className="truncate">{s.name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
