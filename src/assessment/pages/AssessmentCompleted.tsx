import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock, User, BookOpen } from 'lucide-react';
import Brand from '../components/assessment/Brand';
import { useAssessment } from '../hooks/useAssessment';
import { getAssessmentResults, type FullAssessmentResult } from '../api/assessmentApi';
import { getApiErrorMessage, startAIInterview } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { recordAssessmentResult } from '../../utils/userProgress';

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex justify-between gap-4 py-1.5 text-sm border-b border-stone-100 last:border-0">
    <span className="text-ink-soft">{label}</span>
    <span className="font-semibold text-right">{value}</span>
  </div>
);

export default function AssessmentCompleted() {
  const { state } = useAssessment();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<FullAssessmentResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [startingInterview, setStartingInterview] = useState(false);
  const [interviewStartError, setInterviewStartError] = useState('');

  useEffect(() => {
    if (!state.assessmentId) { setLoading(false); return; }
    getAssessmentResults(state.assessmentId)
      .then((result) => {
        const returnedAttempts = result?.history?.length ? result.history : result ? [result] : [];
        const userEmail = String(user?.email || '').trim().toLowerCase();
        const ownAttempts = returnedAttempts.filter((attempt) =>
          userEmail && String(attempt.candidate?.email || '').trim().toLowerCase() === userEmail,
        );
        const latestOwnAttempt = ownAttempts[0] || null;
        setData(latestOwnAttempt);

        if (state.status === 'COMPLETED') {
          ownAttempts.forEach((attempt) => {
            const score = attempt.result;
            if (!score) return;
            recordAssessmentResult(user, attempt.candidate?.email, {
              assessmentId: attempt.assessment?.id || state.assessmentId,
              attemptId: attempt.attempt?.id || '',
              attemptNumber: attempt.attempt?.attempt_number,
              candidateId: attempt.candidate?.id,
              title: attempt.assessment?.title || state.assessment?.title || 'Assessment',
              score: score.score,
              maxScore: score.max_score,
              percentage: score.percentage,
              status: score.result || attempt.attempt?.status || 'Completed',
              submittedAt: attempt.attempt?.submitted_at,
              sections: attempt.sections || [],
            });
          });
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [state.assessmentId, state.attemptId, state.assessment?.title, state.status, user]);

  const handleStartInterview = async () => {
    if (startingInterview || state.status !== 'COMPLETED' || !state.assessmentId) return;
    const cacheKey = `assessmentInterviewStart:${state.assessmentId}:${state.attemptId || 'attempt'}`;
    setStartingInterview(true);
    setInterviewStartError('');

    try {
      let cached: { response?: Record<string, unknown>; topic?: string; level?: string } | null = null;
      try {
        const stored = sessionStorage.getItem(cacheKey);
        cached = stored ? JSON.parse(stored) : null;
      } catch {
        cached = null;
      }

      let interviewData = cached?.response;
      let topic = cached?.topic;
      let level = cached?.level;

      if (!interviewData?.session_id) {
        topic = state.assessment?.title
          || sessionStorage.getItem('aiInterviewTopic')
          || 'Technical Interview';
        level = sessionStorage.getItem('aiInterviewLevel')
          || state.assessment?.sections?.find((section) => section.difficulty)?.difficulty
          || 'Easy';

        const response = await startAIInterview({
          topic,
          level,
          previous_questions: [],
          question_number: 0,
          last_candidate_answer: '',
          next_question_type: 'basic',
        });
        interviewData = response?.data || response || {};

        if (interviewData.status === 'error' || !interviewData.session_id) {
          throw new Error(interviewData.message || 'The interview service did not return a session ID.');
        }

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ response: interviewData, topic, level }));
        } catch {
          // The response is also passed through router state for this navigation.
        }
      }

      let totalQuestions = 15;
      try {
        const interviewConfig = JSON.parse(localStorage.getItem('assessmentInterviewConfig') || '{}');
        const selectedCount = Number(interviewConfig.numberOfQuestions);
        if (Number.isInteger(selectedCount) && selectedCount > 0) totalQuestions = selectedCount;
      } catch {
        // Use the standard interview length when no valid choice is saved.
      }

      navigate('/interview', {
        state: { prestartedInterview: interviewData, topic, level, totalQuestions, assessmentId: state.assessmentId },
      });
    } catch (error) {
      console.error('Could not start interview after assessment:', error);
      setInterviewStartError(getApiErrorMessage(error));
    } finally {
      setStartingInterview(false);
    }
  };

  // Prefer endAssessment/GET results for the overall attempt while keeping the
  // independent evaluateQuiz response available for its own result block.
  const fallback = state.result;
  const quizResult = state.quizEvaluation?.normalized;
  const hasMcqQuestions = Object.values(state.questions).flat().some((question) => question.kind === 'mcq');
  const status = (fallback?.status ?? data?.result?.result)?.toLowerCase();
  const percentage = fallback?.percentage ?? data?.result?.percentage;
  const passingPercentage = data?.assessment?.passing_percentage ?? state.assessment?.passing_percentage ?? 50;
  const passed = status === 'pass' || status === 'passed'
    ? true
    : status === 'fail' || status === 'failed'
      ? false
      : percentage !== undefined
        ? percentage >= passingPercentage
        : undefined;
  const resultLabel = passed === undefined
    ? fallback?.status ?? data?.result?.result ?? 'Result available'
    : passed ? 'PASS' : 'FAIL';
  const resultBackground = passed === undefined ? '#f5f5f4' : passed ? '#dcfce7' : '#fee2e2';

  return (
    <main className="min-h-screen bg-cream py-10 px-4">
      <div className="mx-auto w-full max-w-xl space-y-4">

        {/* Header card */}
        <div className="se-card p-8 text-center">
          <div className="flex justify-center"><Brand size="lg" /></div>
          <CheckCircle2 className="mx-auto mt-6 text-green-600" size={52} aria-hidden />
          <h1 className="mt-3 text-2xl font-extrabold">Assessment Submitted</h1>
          {data?.assessment?.title && (
            <p className="mt-1 text-base font-semibold">{data.assessment.title}</p>
          )}
          {data?.assessment?.description && (
            <p className="mt-1 text-sm text-ink-soft">{data.assessment.description}</p>
          )}
        </div>

        {loading && (
          <div className="se-card p-8 flex justify-center">
            <Loader2 className="animate-spin text-brand" aria-label="Loading results" />
          </div>
        )}

        {!loading && hasMcqQuestions && (
          <section className="se-card p-5" aria-labelledby="mcq-result-title">
            <h2 id="mcq-result-title" className="mb-3 text-sm font-bold flex items-center gap-2">
              <BookOpen size={15} aria-hidden />MCQ Evaluation
            </h2>
            {quizResult ? (
              <>
                {quizResult.score !== undefined && quizResult.total_marks !== undefined && (
                  <Row label="MCQ Score" value={`${quizResult.score} / ${quizResult.total_marks}`} />
                )}
                {quizResult.percentage !== undefined && <Row label="MCQ Percentage" value={`${quizResult.percentage}%`} />}
                {quizResult.status && <Row label="MCQ Status" value={<span className="capitalize">{quizResult.status}</span>} />}
                {quizResult.message && <p className="mt-2 text-sm text-ink-soft">{quizResult.message}</p>}
                {quizResult.score === undefined && quizResult.total_marks === undefined && quizResult.percentage === undefined && !quizResult.status && !quizResult.message && (
                  <p className="text-sm text-ink-soft">MCQ evaluation returned no score details.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-ink-soft">
                {state.quizEvaluationError ?? 'MCQ evaluation result is unavailable.'}
              </p>
            )}
          </section>
        )}

        {!loading && data && (
          <>
            {/* Candidate & Attempt */}
            <div className="se-card p-5">
              <h2 className="mb-3 text-sm font-bold flex items-center gap-2"><User size={15} />Candidate</h2>
              <Row label="Name" value={data.candidate?.name ?? '—'} />
              <Row label="Email" value={data.candidate?.email ?? '—'} />
              <Row label="Attempt #" value={data.attempt?.attempt_number ?? '—'} />
              <Row label="Status" value={<span className="capitalize">{data.attempt?.status ?? '—'}</span>} />
            </div>

            <div className="se-card p-5">
              <h2 className="mb-3 text-sm font-bold flex items-center gap-2"><Clock size={15} />Timing</h2>
              <Row label="Started" value={fmt(data.attempt?.started_at)} />
              <Row label="Submitted" value={fmt(data.attempt?.submitted_at)} />
            </div>

            {/* Score summary: prefer the end response, then enrich it from the results endpoint. */}
            {(data.result || fallback) && (
              <div className="se-card p-5">
                <h2 className="mb-3 text-sm font-bold flex items-center gap-2"><BookOpen size={15} />Result</h2>
                <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: resultBackground }}>
                  <span className="font-bold text-base capitalize">{resultLabel}</span>
                  {passed === true
                    ? <CheckCircle2 className="text-green-600" size={24} />
                    : passed === false
                      ? <XCircle className="text-red-500" size={24} />
                      : null}
                </div>
                {(fallback?.score ?? data.result?.score) !== undefined && (fallback?.total_marks ?? data.result?.max_score) !== undefined && (
                  <Row label="Score" value={`${fallback?.score ?? data.result?.score} / ${fallback?.total_marks ?? data.result?.max_score}`} />
                )}
                {percentage !== undefined && <Row label="Percentage" value={`${percentage}%`} />}
                {fallback?.status && <Row label="Status" value={<span className="capitalize">{fallback.status}</span>} />}
                {(data.result?.passing_percentage ?? state.assessment?.passing_percentage) !== undefined && (
                  <Row label="Passing %" value={`${data.result?.passing_percentage ?? state.assessment?.passing_percentage}%`} />
                )}
                {data.result && <>
                  {data.result.correct_count !== undefined && <Row label="Correct" value={data.result.correct_count} />}
                  {data.result.wrong_count !== undefined && <Row label="Wrong" value={data.result.wrong_count} />}
                  {data.result.unanswered_count !== undefined && <Row label="Unanswered" value={data.result.unanswered_count} />}
                </>}
                {fallback?.message && <p className="mt-2 text-sm text-ink-soft">{fallback.message}</p>}
              </div>
            )}

            {/* Section breakdown */}
            {data.sections && data.sections.length > 0 && (
              <div className="se-card p-5">
                <h2 className="mb-3 text-sm font-bold">Section Breakdown</h2>
                <div className="space-y-3">
                  {data.sections
                    .slice()
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((s) => (
                      <div key={s.section_id} className="rounded-xl border border-stone-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold capitalize">{s.section_name}</span>
                          <span className="text-xs text-ink-soft uppercase">{s.section_type}</span>
                        </div>
                        {/* Score bar */}
                        {s.score !== undefined && s.max_score !== undefined && s.max_score > 0 && (
                          <div className="h-2 w-full rounded-full bg-stone-200 mb-3">
                            <div
                              className="h-2 rounded-full bg-brand"
                              style={{ width: `${Math.min(100, Math.max(0, (s.score / s.max_score) * 100))}%` }}
                            />
                          </div>
                        )}
                        {s.score !== undefined && s.max_score !== undefined && <Row label="Score" value={`${s.score} / ${s.max_score}`} />}
                        {s.percentage !== undefined && <Row label="Percentage" value={`${s.percentage}%`} />}
                        {s.correct_count !== undefined && <Row label="Correct" value={s.correct_count} />}
                        {s.wrong_count !== undefined && <Row label="Wrong" value={s.wrong_count} />}
                        {s.unanswered_count !== undefined && <Row label="Unanswered" value={s.unanswered_count} />}
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}

        {!loading && !data && fallback && (
          <div className="se-card p-5">
            <h2 className="mb-3 text-sm font-bold flex items-center gap-2"><BookOpen size={15} />Result</h2>
            <div className="mb-4 flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: resultBackground }}>
              <span className="font-bold text-base capitalize">{resultLabel}</span>
              {passed === true
                ? <CheckCircle2 className="text-green-600" size={24} />
                : passed === false
                  ? <XCircle className="text-red-500" size={24} />
                  : null}
            </div>
            {fallback.score !== undefined && fallback.total_marks !== undefined && (
              <Row label="Score" value={`${fallback.score} / ${fallback.total_marks}`} />
            )}
            {fallback.percentage !== undefined && (
              <Row label="Percentage" value={`${fallback.percentage}%`} />
            )}
            {fallback.status && (
              <Row label="Status" value={<span className="capitalize">{fallback.status}</span>} />
            )}
            {fallback.message && (
              <p className="mt-2 text-sm text-ink-soft">{fallback.message}</p>
            )}
          </div>
        )}

        {!loading && !data && !fallback && (
          <div className="se-card p-6 text-center text-sm text-ink-soft">
            Your result will be available according to the assessment settings.
          </div>
        )}

        {state.status === 'COMPLETED' && !loading && (
          <div className="se-card p-5 text-center" role={interviewStartError ? 'alert' : 'status'}>
            {interviewStartError && (
              <p className="mb-3 text-sm text-red-700">Interview could not be started: {interviewStartError}</p>
            )}
            <button
              className="se-btn-primary"
              onClick={handleStartInterview}
              disabled={startingInterview || !state.assessmentId}
            >
              {startingInterview ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="animate-spin" size={16} aria-hidden />Starting interview…
                </span>
              ) : interviewStartError ? 'Retry interview start' : 'Start Interview'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
