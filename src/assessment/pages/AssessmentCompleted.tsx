import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Clock, User, BookOpen, ChartNoAxesCombined } from 'lucide-react';
import Brand from '../components/assessment/Brand';
import { useAssessment } from '../hooks/useAssessment';
import { getAssessmentResults, type FullAssessmentResult } from '../api/assessmentApi';
import { getApiErrorMessage } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { recordAssessmentResult } from '../../utils/userProgress';
import {
  CORE_API_ENABLED,
  getAssessmentInterview,
  getExamReport,
  startAssessmentInterview,
} from '../../services/coreApi';
import AssessmentInterviewPanel from './AssessmentInterviewPanel';

interface CoreInterview {
  id: string;
  status: string;
  questions: Array<{
    id: string;
    skill: string;
    question: string;
    response?: string | null;
    evaluation?: Record<string, unknown> | null;
    score?: number | null;
    feedback?: string | null;
  }>;
}

const coreReportResult = (report: Record<string, any>): FullAssessmentResult => ({
  assessment: {
    id: String(report.assessment_id ?? ''),
    title: String(report.assessment_title ?? ''),
    passing_percentage: Number(report.passing_percentage ?? 0),
  },
  candidate: {
    id: String(report.candidate_id ?? ''),
    name: String(report.candidate_name ?? ''),
    email: String(report.candidate_email ?? ''),
  },
  attempt: {
    id: String(report.attempt_id ?? ''),
    status: String(report.assessment_status ?? ''),
    submitted_at: String(report.generated_at ?? ''),
  },
  result: {
    score: Number(report.assessment_score ?? 0),
    max_score: Number(report.max_score ?? 0),
    percentage: Number(report.percentage ?? 0),
    result: String(report.assessment_status ?? ''),
    passing_percentage: Number(report.passing_percentage ?? 0),
  },
});

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
  const [interview, setInterview] = useState<CoreInterview | null>(null);
  const [coreReport, setCoreReport] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!state.assessmentId) { setLoading(false); return; }
    const userEmail = String(user?.email || '').trim().toLowerCase();
    const verifiedCandidateEmail = String(state.assessment?.candidate?.email || '').trim().toLowerCase();
    if (
      !CORE_API_ENABLED &&
      state.status === 'COMPLETED' &&
      state.result?.percentage !== undefined &&
      userEmail &&
      verifiedCandidateEmail === userEmail
    ) {
      recordAssessmentResult(user, verifiedCandidateEmail, {
        assessmentId: state.assessmentId,
        attemptId: state.attemptId,
        candidateId: state.assessment?.candidate?.id,
        title: state.assessment?.title || 'Assessment',
        score: state.result.score,
        maxScore: state.result.total_marks,
        percentage: state.result.percentage,
        status: state.result.status || 'Completed',
        submittedAt: new Date().toISOString(),
      });
    }

    if (CORE_API_ENABLED) {
      let active = true;
      getExamReport(state.token)
        .then((response) => {
          if (!active) return;
          setCoreReport(response.data);
          setData(coreReportResult(response.data));
        })
        .catch((error) => {
          if (!active) return;
          const status = (error as { response?: { status?: number } }).response?.status;
          if (status !== 409) setInterviewStartError(getApiErrorMessage(error));
          setData(null);
        })
        .finally(() => { if (active) setLoading(false); });
      return () => { active = false; };
    }

    getAssessmentResults(state.assessmentId)
      .then((result) => {
        const returnedAttempts = result?.history?.length ? result.history : result ? [result] : [];
        const ownAttempts = returnedAttempts.filter((attempt) =>
          userEmail && String(attempt.candidate?.email || '').trim().toLowerCase() === userEmail,
        );
        const latestOwnAttempt = ownAttempts[0] || null;
        setData(latestOwnAttempt);

        if (state.status === 'COMPLETED') {
          ownAttempts.forEach((attempt) => {
            const score = attempt.result;
            if (!score?.percentage && score?.percentage !== 0) return;
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
  }, [state.assessmentId, state.attemptId, state.assessment?.title, state.assessment?.candidate?.email, state.assessment?.candidate?.id, state.result, state.status, state.token, user]);

  useEffect(() => {
    if (!CORE_API_ENABLED || !state.token) return;
    const interviewId = sessionStorage.getItem(`skillengine:assessment-interview:${state.token}`);
    if (!interviewId) return;
    getAssessmentInterview(interviewId, state.token)
      .then((response) => {
        const restored = response.data as CoreInterview;
        if (restored.status === 'completed') {
          return getExamReport(state.token).then((report) => {
            setCoreReport(report.data);
            setData(coreReportResult(report.data));
          });
        }
        setInterview(restored);
        return undefined;
      })
      .catch((error) => setInterviewStartError(getApiErrorMessage(error)));
  }, [state.token]);

  const handleStartInterview = async () => {
    if (startingInterview || state.status !== 'COMPLETED' || !state.assessmentId) return;
    setStartingInterview(true);
    setInterviewStartError('');

    try {
      if (!CORE_API_ENABLED) {
        throw new Error('Assessment interviews require the configured core assessment API.');
      }
      if (!state.attemptId) throw new Error('The assessment attempt ID is unavailable.');
      const response = await startAssessmentInterview(
        state.assessmentId,
        state.attemptId,
        state.token,
      );
      const started = response.data as CoreInterview;
      sessionStorage.setItem(`skillengine:assessment-interview:${state.token}`, started.id);
      setInterview(started);
    } catch (error) {
      console.error('Could not start interview after assessment:', error);
      setInterviewStartError(getApiErrorMessage(error));
    } finally {
      setStartingInterview(false);
    }
  };

  const handleInterviewComplete = async () => {
    const response = await getExamReport(state.token);
    setCoreReport(response.data);
    setData(coreReportResult(response.data));
    setInterview(null);
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
                {quizResult.correct_count !== undefined && <Row label="Correct" value={quizResult.correct_count} />}
                {quizResult.wrong_count !== undefined && <Row label="Wrong" value={quizResult.wrong_count} />}
                {quizResult.unanswered_count !== undefined && <Row label="Unanswered" value={quizResult.unanswered_count} />}
                {quizResult.message && <p className="mt-2 text-sm text-ink-soft">{quizResult.message}</p>}
                {quizResult.score === undefined && quizResult.total_marks === undefined && quizResult.percentage === undefined && !quizResult.status && !quizResult.message && quizResult.correct_count === undefined && quizResult.wrong_count === undefined && quizResult.unanswered_count === undefined && (
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

        {coreReport?.interview_evaluations?.length > 0 && (
          <section className="se-card space-y-3 p-5" aria-labelledby="interview-report-title">
            <h2 id="interview-report-title" className="text-sm font-bold">Assessment Interview Evaluation</h2>
            {coreReport?.interview_evaluations?.map((item: Record<string, any>, index: number) => (
              <article key={`${item.skill}-${index}`} className="border-b border-stone-100 pb-3 last:border-0">
                <p className="font-semibold">{String(item.skill ?? 'Skill')}</p>
                <p className="mt-1 text-sm">{String(item.question ?? '')}</p>
                <p className="mt-1 text-sm text-ink-soft">Response: {String(item.response ?? '')}</p>
                <p className="mt-1 text-sm">Score: {item.score ?? '—'}</p>
                {item.feedback && <p className="mt-1 text-sm text-ink-soft">{String(item.feedback)}</p>}
              </article>
            ))}
          </section>
        )}

        {interview && CORE_API_ENABLED && (
          <AssessmentInterviewPanel
            token={state.token}
            interview={interview}
            busy={startingInterview}
            onInterviewChange={setInterview}
            onComplete={handleInterviewComplete}
            onError={setInterviewStartError}
          />
        )}

        {interviewStartError && (
          <p role="alert" className="se-card p-4 text-sm text-red-700">{interviewStartError}</p>
        )}

        {state.status === 'COMPLETED' && !loading && !interview && (
          <div className="se-card p-5 text-center" role={interviewStartError ? 'alert' : 'status'}>
            {user?.email && String(state.assessment?.candidate?.email || '').trim().toLowerCase() === String(user.email).trim().toLowerCase() && (
              <button
                type="button"
                className="se-btn-secondary mb-3 inline-flex items-center gap-2"
                onClick={() => navigate('/performance')}
              >
                <ChartNoAxesCombined size={16} aria-hidden />View Performance
              </button>
            )}
            {CORE_API_ENABLED && fallback?.interview_eligible === true && !coreReport?.interview_evaluations?.length && (
              <button
                className="se-btn-primary"
                onClick={handleStartInterview}
                disabled={startingInterview || !state.assessmentId}
              >
                {startingInterview ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} aria-hidden />Starting interview…
                  </span>
                ) : 'Start Assessment Interview'}
              </button>
            )}
            {!CORE_API_ENABLED && (
              <p className="text-sm text-ink-soft">
                Assessment interview integration is unavailable. This assessment will not be redirected to Practice Interviews.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
