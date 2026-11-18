import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface Props { open: boolean; unanswered: number; submitting: boolean; onCancel: () => void; onConfirm: () => void }

export default function SubmitModal({ open, unanswered, submitting, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !submitting) onCancel(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, submitting, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="submit-title">
      <div className="se-card w-full max-w-md animate-pop p-6">
        <div className="flex items-center gap-2"><AlertTriangle className="text-brand" aria-hidden /><h2 id="submit-title" className="text-lg font-bold">Submit Assessment?</h2></div>
        {unanswered > 0 ? (
          <p className="mt-3 text-sm">You still have <strong className="text-brand-dark">{unanswered} unanswered {unanswered === 1 ? 'question' : 'questions'}</strong>.</p>
        ) : <p className="mt-3 text-sm">All questions have been answered.</p>}
        <p className="mt-2 text-sm text-ink-soft">Are you sure you want to submit? You cannot change your answers afterwards.</p>
        <div className="mt-6 flex justify-end gap-2">
          <button ref={cancelRef} className="se-btn-outline" onClick={onCancel} disabled={submitting}>Cancel</button>
          <button className="se-btn-primary" onClick={onConfirm} disabled={submitting}>
            {submitting && <Loader2 size={16} className="animate-spin" aria-hidden />}Submit Assessment
          </button>
        </div>
      </div>
    </div>
  );
}
