import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  completeAssessmentInterview,
  submitAssessmentInterviewResponse,
} from '../../services/coreApi';

interface InterviewQuestion {
  id: string;
  skill: string;
  question: string;
  response?: string | null;
  evaluation?: Record<string, unknown> | null;
  score?: number | null;
  feedback?: string | null;
}

interface AssessmentInterview {
  id: string;
  status: string;
  questions: InterviewQuestion[];
}

interface Props {
  token: string;
  interview: AssessmentInterview;
  busy: boolean;
  onInterviewChange: (interview: AssessmentInterview) => void;
  onComplete: () => Promise<void>;
  onError: (message: string) => void;
}

export default function AssessmentInterviewPanel({
  token,
  interview,
  busy,
  onInterviewChange,
  onComplete,
  onError,
}: Props) {
  const [responses, setResponses] = useState<Record<string, string>>(() =>
    Object.fromEntries(interview.questions.map((question) => [
      question.id,
      question.response ?? '',
    ])),
  );
  const [savingQuestion, setSavingQuestion] = useState<string | null>(null);
  const allEvaluated = interview.questions.length > 0
    && interview.questions.every((question) => question.evaluation);

  const evaluateResponse = async (question: InterviewQuestion) => {
    const response = (responses[question.id] ?? '').trim();
    if (!response || savingQuestion) return;
    setSavingQuestion(question.id);
    onError('');
    try {
      const result = await submitAssessmentInterviewResponse(
        interview.id,
        question.id,
        token,
        response,
      );
      onInterviewChange({
        ...interview,
        questions: interview.questions.map((item) => item.id === question.id
          ? {
              ...item,
              response,
              evaluation: result.data.evaluation,
              score: result.data.score,
              feedback: result.data.feedback,
            }
          : item),
      });
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The response could not be evaluated.');
    } finally {
      setSavingQuestion(null);
    }
  };

  const finishInterview = async () => {
    if (!allEvaluated || busy) return;
    onError('');
    try {
      await completeAssessmentInterview(interview.id, token);
      await onComplete();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'The interview could not be completed.');
    }
  };

  return (
    <section className="se-card space-y-5 p-6" aria-labelledby="assessment-interview-title">
      <div>
        <h2 id="assessment-interview-title" className="text-lg font-bold">
          Assessment Interview
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          Answer each skill-specific question and evaluate it before completing the interview.
        </p>
      </div>
      {interview.questions.map((question, index) => (
        <article key={question.id} className="rounded-xl border border-stone-200 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">
            {question.skill} · Question {index + 1}
          </p>
          <p className="mt-2 font-semibold">{question.question}</p>
          {question.evaluation ? (
            <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
              <p className="font-semibold">Evaluation: {question.score ?? 'Complete'}</p>
              {question.feedback && <p className="mt-1">{question.feedback}</p>}
            </div>
          ) : (
            <>
              <label className="mt-3 block text-sm font-medium" htmlFor={`answer-${question.id}`}>
                Your response
              </label>
              <textarea
                id={`answer-${question.id}`}
                value={responses[question.id] ?? ''}
                onChange={(event) => setResponses((current) => ({
                  ...current,
                  [question.id]: event.target.value,
                }))}
                rows={4}
                className="se-input mt-1 w-full"
                disabled={Boolean(savingQuestion) || busy}
              />
              <button
                type="button"
                className="se-btn-secondary mt-3"
                onClick={() => void evaluateResponse(question)}
                disabled={!responses[question.id]?.trim() || Boolean(savingQuestion) || busy}
              >
                {savingQuestion === question.id
                  ? <span className="inline-flex items-center gap-2"><Loader2 size={15} className="animate-spin" />Evaluating…</span>
                  : 'Save and evaluate response'}
              </button>
            </>
          )}
        </article>
      ))}
      <button
        type="button"
        className="se-btn-primary inline-flex items-center gap-2"
        onClick={() => void finishInterview()}
        disabled={!allEvaluated || busy}
      >
        {busy
          ? <><Loader2 size={16} className="animate-spin" />Completing interview…</>
          : <><CheckCircle2 size={16} />Complete interview and generate report</>}
      </button>
    </section>
  );
}
