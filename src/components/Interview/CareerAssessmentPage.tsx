import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import {
  CORE_API_ENABLED,
  type CoreCareerInterview,
  type CoreLearningPlan,
  completeCareerInterview,
  generateLearningPlan,
  getCareerInterview,
  getCareerReport,
  getCareerSkillGaps,
  getMyLearningPlan,
  getMySubscription,
  startCareerInterview,
  submitCareerResponse,
  updateLearningProgress,
} from '../../services/coreApi';

interface CareerQuestion {
  id: string;
  sequence: number;
  skill: string;
  concept: string;
  question: string;
  response?: string | null;
  evaluation?: Record<string, unknown> | null;
  score?: number | null;
  feedback?: string | null;
}

interface LearningItem {
  id: string;
  week_number: number;
  skill: string;
  focus: string;
  status: 'pending' | 'in_progress' | 'completed';
}

const errorMessage = (error: unknown) => {
  const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
  const detail = response?.data?.detail ?? response?.data?.message;
  return typeof detail === 'string'
    ? detail
    : error instanceof Error ? error.message : 'The career assessment request failed.';
};

export default function CareerAssessmentPage() {
  const { analysisId = '' } = useParams<{ analysisId: string }>();
  const [analysis, setAnalysis] = useState<Record<string, unknown> | null>(null);
  const [interview, setInterview] = useState<CoreCareerInterview | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [subscription, setSubscription] = useState<{ eligible: boolean } | null>(null);
  const [plan, setPlan] = useState<CoreLearningPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [savingQuestion, setSavingQuestion] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async (interviewId: string) => {
    const response = await getCareerReport(interviewId);
    setReport(response.data);
    const subscriptionResponse = await getMySubscription();
    const access = subscriptionResponse.data;
    setSubscription(access);
    if (access.eligible) {
      const planResponse = await getMyLearningPlan();
      const currentPlan = planResponse.data.plan ?? null;
      setPlan(currentPlan);
    } else {
      setPlan(null);
    }
  }, []);

  useEffect(() => {
    if (!CORE_API_ENABLED) {
      setError('The persistent career assessment API is not enabled.');
      setLoading(false);
      return;
    }
    if (!analysisId) {
      setError('The selected career goal is missing.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    Promise.all([
      getCareerSkillGaps(analysisId),
      Promise.resolve(sessionStorage.getItem(`skillengine:career-interview:${analysisId}`)),
    ])
      .then(async ([analysisResponse, interviewId]) => {
        if (!active) return;
        setAnalysis(analysisResponse.data);
        if (!interviewId) return;
        const interviewResponse = await getCareerInterview(interviewId);
        if (!active) return;
        const restored = interviewResponse.data;
        if (restored.status === 'completed') {
          await loadReport(restored.id);
        } else {
          setInterview(restored);
          setResponses(Object.fromEntries(restored.questions.map((question) => [
            question.id,
            question.response ?? '',
          ])));
        }
      })
      .catch((loadError: unknown) => {
        if (active) setError(errorMessage(loadError));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [analysisId, loadReport]);

  const startInterview = async () => {
    if (!analysisId || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await startCareerInterview(analysisId);
      const started = response.data;
      sessionStorage.setItem(`skillengine:career-interview:${analysisId}`, started.id);
      setInterview(started);
      setResponses(Object.fromEntries(started.questions.map((question) => [question.id, ''])));
      setReport(null);
    } catch (startError) {
      setError(errorMessage(startError));
    } finally {
      setBusy(false);
    }
  };

  const evaluateResponse = async (question: CareerQuestion) => {
    if (!interview || savingQuestion) return;
    const responseText = (responses[question.id] ?? '').trim();
    if (!responseText) return;
    setSavingQuestion(question.id);
    setError('');
    try {
      const response = await submitCareerResponse(interview.id, question.id, responseText);
      const evaluation = response.data as {
        evaluation: Record<string, unknown>;
        score: number;
        feedback?: string;
      };
      setInterview((current) => current ? {
        ...current,
        questions: current.questions.map((item) => item.id === question.id
          ? {
              ...item,
              response: responseText,
              evaluation: evaluation.evaluation,
              score: evaluation.score,
              feedback: evaluation.feedback,
            }
          : item),
      } : current);
    } catch (evaluationError) {
      setError(errorMessage(evaluationError));
    } finally {
      setSavingQuestion('');
    }
  };

  const completeInterview = async () => {
    if (!interview || busy) return;
    if (!interview.questions.length || interview.questions.some((question) => !question.evaluation)) {
      setError('Evaluate every skill-specific response before completing this interview.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await completeCareerInterview(interview.id);
      await loadReport(interview.id);
      setInterview(null);
    } catch (completionError) {
      setError(errorMessage(completionError));
    } finally {
      setBusy(false);
    }
  };

  const createPlan = async () => {
    if (!analysisId || !subscription?.eligible || busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await generateLearningPlan(analysisId, 4);
      setPlan(response.data);
    } catch (planError) {
      setError(errorMessage(planError));
    } finally {
      setBusy(false);
    }
  };

  const updateProgress = async (item: LearningItem) => {
    if (!plan) return;
    const status = item.status === 'completed' ? 'in_progress' : 'completed';
    setError('');
    try {
      await updateLearningProgress(plan.id, item.id, status);
      setPlan((current) => current ? {
        ...current,
        items: current.items.map((row) => row.id === item.id ? { ...row, status } : row),
      } : current);
    } catch (progressError) {
      setError(errorMessage(progressError));
    }
  };

  const reportSkills = report?.skill_evaluations as Record<string, {
    score?: number;
    max_score?: number;
    strengths?: string[];
    improvements?: string[];
    feedback?: string[];
  }> | undefined;

  if (loading) {
    return <main className="mx-auto max-w-4xl p-8 text-center"><Loader2 className="mx-auto animate-spin" aria-label="Loading career assessment" /></main>;
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <header className="se-card p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand">Individual Career Assessment</p>
        <h1 className="mt-2 text-2xl font-bold">{String(analysis?.role ?? 'Career goal')}</h1>
      </header>

      {error && <p role="alert" className="se-card p-4 text-sm text-red-700">{error}</p>}

      {!interview && !report && analysis && (
        <section className="se-card p-6">
          <h2 className="text-lg font-bold">Your role-based skill gaps</h2>
          <p className="mt-3 text-sm">Required skills: {((analysis.required_skills as string[]) ?? []).join(', ') || '—'}</p>
          <p className="mt-2 text-sm">Matched skills: {((analysis.matching_skills as string[]) ?? []).join(', ') || '—'}</p>
          <p className="mt-2 text-sm">Missing skills: {((analysis.missing_skills as string[]) ?? []).join(', ') || '—'}</p>
          <p className="mt-2 text-sm">Weak skills: {((analysis.weak_skills as string[]) ?? []).join(', ') || '—'}</p>
          <button type="button" className="se-btn-primary mt-5" onClick={() => void startInterview()} disabled={busy}>
            {busy ? 'Generating skill-wise interview…' : 'Start role-based skill interview'}
          </button>
        </section>
      )}

      {interview && (
        <section className="se-card space-y-5 p-6">
          <div>
            <h2 className="text-lg font-bold">Skill-by-skill interview</h2>
            <p className="mt-1 text-sm text-ink-soft">Each response is saved and evaluated for its specific skill.</p>
          </div>
          {interview.questions.map((question, index) => (
            <article key={question.id} className="rounded-xl border border-stone-200 p-4">
              <p className="text-xs font-semibold uppercase text-brand">{question.skill} · {question.concept}</p>
              <p className="mt-2 font-semibold">{question.question}</p>
              {question.evaluation ? (
                <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
                  <p className="font-semibold">Score: {question.score ?? '—'}</p>
                  {question.feedback && <p className="mt-1">{question.feedback}</p>}
                </div>
              ) : (
                <>
                  <label className="mt-3 block text-sm font-medium" htmlFor={`career-answer-${question.id}`}>Your response</label>
                  <textarea
                    id={`career-answer-${question.id}`}
                    value={responses[question.id] ?? ''}
                    onChange={(event) => setResponses((current) => ({ ...current, [question.id]: event.target.value }))}
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
                    {savingQuestion === question.id ? 'Evaluating…' : `Save and evaluate response ${index + 1}`}
                  </button>
                </>
              )}
            </article>
          ))}
          <button
            type="button"
            className="se-btn-primary inline-flex items-center gap-2"
            onClick={() => void completeInterview()}
            disabled={busy || interview.questions.some((question) => !question.evaluation)}
          >
            {busy ? <><Loader2 size={16} className="animate-spin" />Generating report…</> : 'Complete interview and generate report'}
          </button>
        </section>
      )}

      {report && (
        <>
          <section className="se-card space-y-4 p-6">
            <h2 className="text-lg font-bold">Consolidated performance report</h2>
            <p>Career goal: <strong>{String(report.role ?? '')}</strong></p>
            <p>Overall interview score: <strong>{String(report.overall_score ?? '—')}</strong></p>
            {Object.entries(reportSkills ?? {}).map(([skill, result]) => (
              <article key={skill} className="rounded-xl border border-stone-200 p-4">
                <h3 className="font-semibold">{skill} · {result.score ?? '—'} / {result.max_score ?? 10}</h3>
                {!!result.strengths?.length && <p className="mt-2 text-sm">Strengths: {result.strengths.join(', ')}</p>}
                {!!result.improvements?.length && <p className="mt-2 text-sm">Skill gaps to improve: {result.improvements.join(', ')}</p>}
                {!!result.feedback?.length && <p className="mt-2 text-sm text-ink-soft">{result.feedback.join(' ')}</p>}
              </article>
            ))}
            <p>Missing skills: {((report.missing_skills as string[]) ?? []).join(', ') || 'None recorded'}</p>
            <p>Weak skills: {((report.weak_skills as string[]) ?? []).join(', ') || 'None recorded'}</p>
            <p>Recommendations: {((report.recommendations as string[]) ?? []).join(', ') || 'No additional recommendations'}</p>
          </section>

          <section className="se-card space-y-3 p-6">
            <h2 className="text-lg font-bold">Personalized learning plan</h2>
            {subscription?.eligible ? (
              plan ? (
                <div className="space-y-3">
                  <p className="text-sm">{plan.weeks}-week plan based on this career goal and recorded skill gaps.</p>
                  {plan.items.map((item) => (
                    <label key={item.id} className="flex items-start gap-3 rounded-lg border border-stone-200 p-3">
                      <input
                        type="checkbox"
                        checked={item.status === 'completed'}
                        onChange={() => void updateProgress(item)}
                      />
                      <span>
                        <strong>Week {item.week_number}: {item.skill}</strong>
                        <span className="block text-sm text-ink-soft">{item.focus}</span>
                        <span className="block text-xs capitalize">{item.status.replace('_', ' ')}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <button type="button" className="se-btn-primary" onClick={() => void createPlan()} disabled={busy}>
                  {busy ? 'Generating plan…' : 'Generate weekly learning plan'}
                </button>
              )
            ) : (
              <p className="text-sm text-ink-soft">An active subscription is required. Access is checked by the server.</p>
            )}
          </section>

          <button type="button" className="se-btn-secondary" onClick={() => void startInterview()} disabled={busy}>
            <CheckCircle2 size={16} className="mr-2 inline" />Practice and reassess
          </button>
        </>
      )}
    </main>
  );
}
