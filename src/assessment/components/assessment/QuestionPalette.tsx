import { Star } from 'lucide-react';

export type PaletteState = 'answered' | 'not_answered' | 'marked' | 'not_visited';
interface Item { id: string; state: PaletteState }
interface Props { items: Item[]; currentIdx: number; onSelect: (i: number) => void; compact?: boolean }

const STYLE: Record<PaletteState, string> = {
  answered: 'bg-green-600 border-green-600 text-white',
  not_answered: 'bg-red-50 border-red-300 text-red-700',
  marked: 'bg-amber-50 border-gold text-amber-800',
  not_visited: 'bg-white border-stone-300 text-ink-soft',
};

export default function QuestionPalette({ items, currentIdx, onSelect, compact }: Props) {
  return (
    <section aria-label="Question palette">
      {!compact && <h2 className="mb-2 mt-4 text-sm font-bold">Question Palette</h2>}
      <div className={`flex flex-wrap gap-2 ${compact ? '' : 'mb-3'}`}>
        {items.map((it, i) => (
          <button key={it.id} onClick={() => onSelect(i)} aria-label={`Question ${i + 1}, ${it.state.replace('_', ' ')}`}
            aria-current={i === currentIdx ? 'true' : undefined}
            className={`relative grid h-9 w-9 place-items-center rounded-lg border text-sm font-semibold ${STYLE[it.state]} ${i === currentIdx ? 'ring-2 ring-brand ring-offset-1' : ''}`}>
            {i + 1}
            {it.state === 'marked' && <Star size={10} className="absolute -right-1 -top-1 fill-gold text-gold" aria-hidden />}
          </button>
        ))}
      </div>
      {!compact && (
        <ul className="space-y-1 text-xs text-ink-soft">
          <li><span className="mr-2 inline-block h-3 w-3 rounded bg-green-600 align-middle" />Answered</li>
          <li><span className="mr-2 inline-block h-3 w-3 rounded border border-red-300 bg-red-50 align-middle" />Not answered</li>
          <li><span className="mr-2 inline-block h-3 w-3 rounded border border-gold bg-amber-50 align-middle" />Marked for review</li>
          <li><span className="mr-2 inline-block h-3 w-3 rounded border border-stone-300 bg-white align-middle" />Not visited</li>
        </ul>
      )}
    </section>
  );
}
