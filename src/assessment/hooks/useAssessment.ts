import { useCallback, useMemo, useRef } from 'react';
import {
  assignQuestions, endAssessment, evaluateQuiz,
  generateKey, startAssessment, verifyKey,
} from '../api/assessmentApi';
import { saveCodingSubmission } from '../api/questionApi';
import { useAssessmentStore } from '../store/assessmentStore';
import type { AssessmentSection, AssessmentSubmissionSnapshot, Question } from '../types/assessment';
import { classifyError } from '../utils/errors';
import { clearSession } from '../utils/storage';
import { remainingSeconds } from '../utils/timer';

export function useAssessment() {
  const { state, patch, transition } = useAssessmentStore();
  const { assessment, questions, sectionIdx, questionIdx, answers, marked, visited, completedSections } = state;

  const sections: AssessmentSection[] = assessment?.sections ?? [];
  const section = sections[sectionIdx];
  const sectionQuestions: Question[] = section ? questions[section.id] ?? [] : [];
  const question = sectionQuestions[questionIdx];

  const fail = useCallback((e: unknown, to: 'ERROR' | 'EXPIRED' = 'ERROR') => {
    const err = classifyError(e);
    transition(err.kind === 'expired' ? 'EXPIRED' : to, { error: err });
    return err;
  }, [transition]);

  const isUnlocked = useCallback((idx: number): boolean => {
    const s = sections[idx];
    if (!s) return false;
    if (s.unlock_rule === 'immediate') return true;
    const prev = sections[idx - 1];
    return !prev || completedSections.includes(prev.id);
  }, [sections, completedSections]);

  /** Ask the backend to generate/issue a verification key. */
  const requestKey = useCallback(async () => {
    return await generateKey(state.token);
  }, [state.token]);

  /** VERIFYING → VERIFIED → (assign questions) → INSTRUCTIONS. */
  const verify = useCallback(async (key: string): Promise<boolean> => {
    let assessmentId = '';

    // Step 1: verify the key — this can legitimately fail (wrong key)
    try {
      const v = await verifyKey(state.token, key);
      console.log('[verify] raw verifyKey result:', v);

      const a = v.assessment;
      if (!a) {
        throw new Error('Verification succeeded, but the server did not return assessment details.');
      }

      assessmentId = v.assessmentId || a.id || '';
      console.log('[verify] assessmentId:', assessmentId);

      transition('VERIFIED', {
        assessment: { ...a, id: assessmentId },
        assessmentId,
        questionsAssigned: false,
      });
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status;
      if (status === 400 || status === 401 || status === 422) return false;
      fail(e);
      return false;
    }

    // Step 2: assign questions — runs AFTER verify succeeds, errors here do NOT block the candidate
    if (assessmentId) {
      try {
        console.log('[verify] calling assign-questions for:', assessmentId);
        await assignQuestions(assessmentId);
        patch({ questionsAssigned: true });
        console.log('[verify] assign-questions succeeded');
      } catch (assignErr: unknown) {
        const status = (assignErr as { response?: { status?: number } }).response?.status;
        console.error('[verify] assign-questions error, status:', status, assignErr);
        // 409 = already assigned — treat as success
        if (status === 409) patch({ questionsAssigned: true });
        // All other errors: log and continue — /start is the authoritative source
      }
    } else {
      console.error('[verify] assessmentId is empty — skipping assign-questions');
    }

    // Step 3: move to instructions regardless of assign-questions outcome
    transition('INSTRUCTIONS', { error: null });
    return true;
  }, [state.token, transition, patch, fail]);

  const start = useCallback(async () => {
    if (!assessment || !transition('STARTING')) return;

    try {
      // Questions come exclusively from POST /api/assessment/:jwt/start
      const r = await startAssessment(state.token);

      const activeAssessment = r.assessment ?? assessment;
      const assessmentId = r.assessmentId ?? r.assessment?.id ?? state.assessmentId;
      const attemptId = r.attemptId ?? state.attemptId;
      const startedAssessment = { ...activeAssessment, id: assessmentId };
      let questions = r.questions && Object.keys(r.questions).length
        ? r.questions
        : state.questions;
      const questionGroups = Object.entries(questions).filter(([, items]) => items.length > 0);
      const sectionIds = startedAssessment.sections.map((s) => s.id);
      const hasSectionMatch = questionGroups.some(([id]) => sectionIds.includes(id));
      if (
        !hasSectionMatch &&
        questionGroups.length > 0 &&
        questionGroups.length === sectionIds.length
      ) {
        questions = Object.fromEntries(
          questionGroups.map(([, items], index) => [
            sectionIds[index],
            items.map((item) => ({ ...item, sectionId: sectionIds[index] })),
          ]),
        );
      }
      const hasQuestions = Object.values(questions).some((sectionQuestions) => sectionQuestions.length > 0);
      if (!hasQuestions) {
        throw new Error('The assessment started, but the server did not return any questions. Please try again or contact your administrator.');
      }

      const now = Date.now();
      const endsAt =
        r.endsAt ??
        (
          r.remainingSeconds !== undefined
            ? now + r.remainingSeconds * 1000
            : (r.startedAt ?? now) + activeAssessment.duration_seconds * 1000
        );

      if (!startedAssessment.sections.length) {
        throw new Error(
          'The start API did not return assessment sections or questions.',
        );
      }

      transition('IN_PROGRESS', {
        assessment: startedAssessment,
        assessmentId,
        attemptId,
        questions,
        startedAt: r.startedAt ?? now,
        endsAt,
        sectionIdx: 0,
        questionIdx: 0,
        error: null,
      });
    } catch (e) {
      const err = classifyError(e);
      transition(err.kind === 'expired' ? 'EXPIRED' : 'ERROR', { error: err });
    }
  }, [
    assessment,
    state.token,
    state.assessmentId,
    transition,
    patch,
  ]);

  /** Refresh recovery: re-call /start to get questions back (idempotent — same attempt). */
  const restore = useCallback(async () => {
    if (!['IN_PROGRESS', 'SECTION_COMPLETED'].includes(state.status)) return;
    try {
      const r = await startAssessment(state.token);
      const assessmentId = r.assessmentId ?? r.assessment?.id ?? state.assessmentId;
      patch({
        ...(r.assessment ? { assessment: { ...r.assessment, id: assessmentId } } : {}),
        ...(assessmentId ? { assessmentId } : {}),
        ...(r.attemptId ? { attemptId: r.attemptId } : {}),
        ...(r.questions && Object.keys(r.questions).length ? { questions: r.questions } : {}),
      });
    } catch (e) { fail(e); }
  }, [state.status, state.token, state.assessmentId, patch, fail]);

  const goTo = useCallback((sIdx: number, qIdx: number) => {
    if (!isUnlocked(sIdx)) return;
    const q = questions[sections[sIdx]?.id]?.[qIdx];
    patch((s) => ({ sectionIdx: sIdx, questionIdx: qIdx, visited: q && !s.visited.includes(q.id) ? [...s.visited, q.id] : s.visited }));
  }, [isUnlocked, questions, sections, patch]);

  const selectAnswer = useCallback((questionId: string, selectedOptionId: string | null) => {
    patch((s) => ({
      answers: {
        ...s.answers,
        [questionId]: { questionId, selectedOptionId, savedAt: Date.now() },
      },
    }));
  }, [patch]);

  const toggleMark = useCallback((qid: string) => {
    patch((s) => ({ marked: s.marked.includes(qid) ? s.marked.filter((m) => m !== qid) : [...s.marked, qid] }));
  }, [patch]);

  const setCode = useCallback((qid: string, code: string) => {
    patch((s) => ({ code: { ...s.code, [qid]: code } }));
  }, [patch]);

  const persistCode = useCallback((q: Question, code: string) => {
    if (q.kind !== 'coding') return;
    saveCodingSubmission(state.token, state.assessmentId, q.id, code, q.language).catch(() => undefined);
  }, [state.token, state.assessmentId]);

  const finishSection = useCallback(() => {
    if (!section) return;
    const done = completedSections.includes(section.id) ? completedSections : [...completedSections, section.id];
    const hasNext = sectionIdx < sections.length - 1;
    if (hasNext) transition('SECTION_COMPLETED', { completedSections: done });
    else patch({ completedSections: done });
  }, [section, completedSections, sectionIdx, sections.length, transition, patch]);

  const continueToNext = useCallback(() => {
    if (transition('IN_PROGRESS')) {
      const next = sectionIdx + 1;
      patch({ sectionIdx: next, questionIdx: 0 });
    }
  }, [transition, patch, sectionIdx]);

  const unanswered = useMemo(() => {
    let n = 0;
    sections.forEach((s) => (questions[s.id] ?? []).forEach((q) => {
      if (q.kind === 'mcq' ? !answers[q.id]?.selectedOptionId : !(state.code[q.id] && state.code[q.id] !== q.starter_code)) n++;
    }));
    return n;
  }, [sections, questions, answers, state.code]);

  const submissionInFlight = useRef(false);
  const submit = useCallback(async () => {
    if (submissionInFlight.current || state.status === 'COMPLETED') return;
    if (!['IN_PROGRESS', 'SECTION_COMPLETED', 'SUBMITTING', 'ERROR'].includes(state.status)) return;

    if (!state.assessmentId || !state.attemptId || !state.token) {
      console.error('Missing assessmentId, attemptId, or assessment token');
      patch({ error: { kind: 'unknown', message: 'Unable to submit this assessment because its session details are missing. Please contact support.' } });
      return;
    }

    if (state.status !== 'SUBMITTING' && !transition('SUBMITTING', { error: null })) return;
    submissionInFlight.current = true;
    patch({ error: null });

    try {
      const allQuestions = Object.values(state.questions).flat();
      const answers = Object.values(state.answers)
        .filter((answer) => Boolean(answer.selectedOptionId))
        .map((answer) => ({
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId as string,
        }));
      const hasCodingQuestions = allQuestions.some((question) => question.kind === 'coding');
      const hasMcqQuestions = allQuestions.some((question) => question.kind === 'mcq');

      // Persist code before finalizing so the end endpoint can include coding scores.
      if (hasCodingQuestions) {
        const codingFlush = allQuestions
          .filter((question) => question.kind === 'coding' && state.code[question.id])
          .map((question) => question.kind === 'coding'
            ? saveCodingSubmission(state.token, state.assessmentId, question.id, state.code[question.id], question.language)
            : Promise.resolve());
        await Promise.allSettled(codingFlush);
      }

      // Evaluate MCQ before finalization and retain its response separately.
      let quizEvaluation: AssessmentSubmissionSnapshot | null = null;
      let quizEvaluationError: string | null = null;
      if (hasMcqQuestions) {
        try {
          quizEvaluation = await evaluateQuiz(state.assessmentId, state.attemptId, answers);
        } catch (quizError) {
          quizEvaluationError = classifyError(quizError).message;
          console.error('Quiz evaluation API error:', quizError);
        }
      }

      // Even if MCQ evaluation fails, still finalize coding/mixed attempts.
      const endAssessmentResponse = hasCodingQuestions
        ? await endAssessment(state.token, {
            assessmentId: state.assessmentId,
            attemptId: state.attemptId,
            answers,
          })
        : null;
      const result = endAssessmentResponse?.normalized ?? quizEvaluation?.normalized ?? null;

      if (!result) throw new Error('Assessment submission returned no result.');
      transition('COMPLETED', {
        result,
        quizEvaluation,
        endAssessmentResponse,
        quizEvaluationError,
        answers: {},
        code: {},
        marked: [],
        visited: [],
        error: null,
      });
    } catch (e) {
      console.error('Assessment submission API error:', e);
      const err = classifyError(e);
      patch({ error: err });
    } finally {
      submissionInFlight.current = false;
    }
  }, [state, transition, patch]);

  const reset = useCallback(() => {
    clearSession(state.token);
    transition('VERIFYING', {
      assessmentId: '', attemptId: '', status: 'VERIFYING', sectionIdx: 0, questionIdx: 0,
      answers: {}, marked: [], visited: [], completedSections: [], code: {},
      startedAt: null, endsAt: null, questionsAssigned: false, assessment: null,
      questions: {}, submissions: {}, result: null, quizEvaluation: null, endAssessmentResponse: null, quizEvaluationError: null, error: null,
    });
  }, [state.token, transition]);

  const remainingNow = () => remainingSeconds(state.endsAt);

  return {
    state, assessment, sections, section, sectionQuestions, question, isUnlocked, unanswered,
    marked, visited, answers,
    requestKey, verify, start, restore, goTo, selectAnswer, toggleMark, setCode, persistCode,
    finishSection, continueToNext, submit, reset, remainingNow,
    questionIdx, sectionIdx, patch,
  };
}
