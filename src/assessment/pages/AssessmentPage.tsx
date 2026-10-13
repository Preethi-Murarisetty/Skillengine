import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import AssessmentHeader from '../components/assessment/AssessmentHeader';
import SectionNavigation from '../components/assessment/SectionNavigation';
import QuestionPalette, { type PaletteState } from '../components/assessment/QuestionPalette';
import MCQQuestion from '../components/assessment/MCQQuestion';
import CodingQuestion from '../components/assessment/CodingQuestion';
import SubmitModal from '../components/assessment/SubmitModal';
import { useAssessment } from '../hooks/useAssessment';
import { useAssessmentTimer } from '../hooks/useAssessmentTimer';
import { getCodingQuestion } from '../api/assessmentApi';
import { normalizeQuestion } from '../api/questionApi';

export default function AssessmentPage() {
  const a = useAssessment();
  const { state, assessment, sections, section, sectionQuestions, question, questionIdx, sectionIdx } = a;
  const [confirm, setConfirm] = useState(false);
  const restored = useRef(false);
  const fetchedCodingIds = useRef(new Set<string>());
  const submitting = state.status === 'SUBMITTING';

  const timer = useAssessmentTimer(state.endsAt, state.status === 'IN_PROGRESS' || state.status === 'SECTION_COMPLETED', () => { setConfirm(false); void a.submit(); });

  // Refresh recovery: re-call /start to get questions back.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    if (Object.keys(state.questions).length === 0) void a.restore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch full coding question details on navigation to a coding question.
  useEffect(() => {
    if (question?.kind !== 'coding') return;
    const codingQ = question;
    if (codingQ.description || !codingQ.attemptQuestionId || !state.assessmentId) return;
    if (fetchedCodingIds.current.has(codingQ.attemptQuestionId)) return;
    fetchedCodingIds.current.add(codingQ.attemptQuestionId);
    const { sectionId, id: qid, attemptQuestionId } = codingQ;
    getCodingQuestion(state.assessmentId, attemptQuestionId)
      .then((raw) => {
        const full = normalizeQuestion(
          { ...raw, attempt_question_id: attemptQuestionId, question_type: 'coding' },
          sectionId, 0,
        );
        if (full.kind !== 'coding') return;
        a.patch((s) => ({
          questions: {
            ...s.questions,
            [sectionId]: (s.questions[sectionId] ?? []).map((sq) =>
              sq.id === qid ? { ...sq, ...full, id: sq.id } : sq
            ),
          },
        }));
      })
      .catch((e) => { console.error('[getCodingQuestion] error:', e); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, state.assessmentId]);

  // Warn before leaving / closing / back navigation while active.
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = 'Are you sure you want to leave the assessment? Your progress may be affected.'; };
    const pop = () => {
      if (!window.confirm('Are you sure you want to leave the assessment?\nYour progress may be affected.')) window.history.pushState(null, '', window.location.href);
      else window.history.back();
    };
    window.history.pushState(null, '', window.location.href);
    window.addEventListener('beforeunload', before);
    window.addEventListener('popstate', pop);
    return () => { window.removeEventListener('beforeunload', before); window.removeEventListener('popstate', pop); };
  }, []);

  // Mark current question visited.
  const { patch } = a;
  useEffect(() => {
    if (!question) return;
    patch((s) => (s.visited.includes(question.id) ? {} : { visited: [...s.visited, question.id] }));
  }, [question, patch]);

  const paletteItems = useMemo(() => sectionQuestions.map((q) => {
    const answered = q.kind === 'mcq' ? Boolean(a.answers[q.id]?.selectedOptionId) : Boolean(state.code[q.id] && state.code[q.id] !== q.starter_code) || Boolean(state.submissions[q.id]);
    let s: PaletteState = 'not_visited';
    if (a.marked.includes(q.id)) s = 'marked';
    else if (answered) s = 'answered';
    else if (a.visited.includes(q.id)) s = 'not_answered';
    return { id: q.id, state: s };
  }), [sectionQuestions, a.answers, a.marked, a.visited, state.code, state.submissions]);

  const next = useCallback(() => {
    if (questionIdx < sectionQuestions.length - 1) {
      a.goTo(sectionIdx, questionIdx + 1);
    } else if (sectionIdx < sections.length - 1) {
      a.finishSection();
    } else {
      void a.submit();
    }
  }, [a, questionIdx, sectionQuestions.length, sectionIdx, sections.length]);
  const prev = () => questionIdx > 0 && a.goTo(sectionIdx, questionIdx - 1);
  const isLast = questionIdx === sectionQuestions.length - 1;
  const isFinalQuestion = isLast && sectionIdx === sections.length - 1;
  const sectionDone = section ? state.completedSections.includes(section.id) : false;
  const loading = sectionQuestions.length === 0 && !state.error;

  return (
    <div className="min-h-screen">
      <AssessmentHeader title={assessment?.title ?? 'Assessment'} sectionName={section?.name}
        questionNo={question ? questionIdx + 1 : undefined} totalQuestions={sectionQuestions.length || undefined}
        seconds={timer.remaining} warning={timer.warning} candidate={assessment?.candidate}
        onSubmit={() => setConfirm(true)} disabled={submitting} />

      {state.error && state.status !== 'SUBMITTING' && (
        <p role="alert" className="mx-auto mt-4 max-w-[1500px] px-3 text-sm font-medium text-red-700 sm:px-6">
          {state.error.message}
        </p>
      )}

      <div className="mx-auto max-w-[1500px] p-3 sm:p-6">
        <div className="mb-3 lg:hidden">
          <SectionNavigation horizontal sections={sections} activeIdx={sectionIdx} completed={state.completedSections} isUnlocked={a.isUnlocked} onSelect={(i) => a.goTo(i, 0)} />
        </div>

        {state.status === 'SECTION_COMPLETED' ? (
          <div className="se-card mx-auto mt-8 max-w-lg animate-pop p-8 text-center">
            <CheckCircle2 className="mx-auto text-green-600" size={48} aria-hidden />
            <h2 className="mt-3 text-xl font-bold">{section?.name} completed</h2>
            <p className="mt-1 text-sm text-ink-soft">Next up: {sections[sectionIdx + 1]?.name}</p>
            <button className="se-btn-primary mt-6" onClick={a.continueToNext}>Continue to {sections[sectionIdx + 1]?.name}<ArrowRight size={16} aria-hidden /></button>
          </div>
        ) : loading ? (
          <div className="grid place-items-center py-24" role="status"><Loader2 className="animate-spin text-brand" aria-label="Loading questions" /></div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
            <aside className="order-2 lg:order-1">
              <div className="se-card p-4 lg:sticky lg:top-24">
                <div className="hidden lg:block">
                  <SectionNavigation sections={sections} activeIdx={sectionIdx} completed={state.completedSections} isUnlocked={a.isUnlocked} onSelect={(i) => a.goTo(i, 0)} />
                </div>
                <QuestionPalette items={paletteItems} currentIdx={questionIdx} onSelect={(i) => a.goTo(sectionIdx, i)} />
              </div>
            </aside>
            <main className="order-1 min-w-0 lg:order-2" key={question?.id}>
              {question?.kind === 'mcq' && (
                <MCQQuestion question={question} index={questionIdx} total={sectionQuestions.length}
                  selected={a.answers[question.id]?.selectedOptionId ?? null} marked={a.marked.includes(question.id)}
                  onSelect={(optionId) => a.selectAnswer(question.id, optionId)} onClear={() => a.selectAnswer(question.id, null)}
                  onMark={() => a.toggleMark(question.id)} onPrev={prev} onNext={next} isFirst={questionIdx === 0} isLast={isLast} isFinalQuestion={isFinalQuestion} submitting={submitting} />
              )}
              {question?.kind === 'coding' && (
                <>
                  <CodingQuestion question={question} marked={a.marked.includes(question.id)} onMark={() => a.toggleMark(question.id)} />
                  <div className="mt-4 flex items-center gap-2">
                    <button className="se-btn-outline" onClick={prev} disabled={questionIdx === 0}><ChevronLeft size={16} aria-hidden />Previous</button>
                    {!isLast && <button className="se-btn-outline ml-auto" onClick={next}>Next question<ChevronRight size={16} aria-hidden /></button>}
                    {isLast && !sectionDone && sectionIdx < sections.length - 1 && <button className="se-btn-primary ml-auto" onClick={next}>Finish section</button>}
                    {isFinalQuestion && <button className="se-btn-primary ml-auto" onClick={next} disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Assessment'}</button>}
                  </div>
                </>
              )}
            </main>
          </div>
        )}
      </div>

      <SubmitModal open={confirm && !submitting} unanswered={a.unanswered} submitting={submitting} onCancel={() => setConfirm(false)} onConfirm={() => { setConfirm(false); void a.submit(); }} />

      {(submitting || timer.expired) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-white/80 p-4" role="alertdialog" aria-live="assertive" aria-label="Submitting assessment">
          <div className="se-card max-w-sm p-6 text-center">
            {state.error ? (
              <>
                <p className="font-semibold text-red-700">{state.error.message}</p>
                <button className="se-btn-primary mt-4" onClick={() => void a.submit()}>Retry submission</button>
              </>
            ) : (
              <><Loader2 className="mx-auto animate-spin text-brand" aria-hidden /><p className="mt-3 font-semibold">Submitting your assessment…</p></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
