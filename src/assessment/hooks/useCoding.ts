import { useCallback, useState } from 'react';
import { runCodingCode, submitCodingCode } from '../api/assessmentApi';
import { useAssessment } from './useAssessment';
import { languageId } from '../services/judge0Service';
import type { CodingQuestion, CodingSubmission } from '../types/assessment';

const toExecStatus = (s: string): CodingSubmission['status'] => {
  const l = s.toLowerCase();
  if (l.includes('submit') || ['success', 'ok', 'completed'].includes(l)) return 'submitted';
  if (l.includes('accept')) return 'accepted';
  if (l.includes('wrong')) return 'wrong_answer';
  if (l.includes('compile')) return 'compilation_error';
  if (l.includes('runtime') || l.includes('run_time')) return 'runtime_error';
  if (l.includes('time_limit') || l.includes('tle')) return 'time_limit';
  return 'error';
};

export function useCoding(q: CodingQuestion) {
  const { state, patch, setCode } = useAssessment();
  const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const result = state.submissions[q.id] ?? null;
  const code = state.code[q.id] ?? q.starter_code;

  const put = useCallback(
    (r: CodingSubmission) =>
      patch((s) => ({ submissions: { ...s.submissions, [q.id]: r } })),
    [patch, q.id],
  );

  const run = useCallback(async (stdin: string) => {
    setBusy('run');
    put({ questionId: q.id, mode: 'run', status: 'running', results: [], passed: 0, total: 0 });
    try {
      if (!q.attemptQuestionId) {
        throw new Error('Cannot run this coding question because attempt_question_id is missing.');
      }
      const r = await runCodingCode(state.assessmentId, {
        attempt_id: q.attemptId ?? state.attemptId,
        attempt_question_id: q.attemptQuestionId,
        question_id: q.id,
        language: q.language,
        language_id: languageId(q.language),
        source_code: code,
        stdin,
      });
      const runStatus: CodingSubmission['status'] = r.passed === true
        ? 'accepted'
        : r.passed === false
          ? 'wrong_answer'
          : !r.status || r.status.toLowerCase() === 'unknown' || ['success', 'ok'].includes(r.status.toLowerCase())
            ? 'accepted'
            : toExecStatus(r.status);
      put({
        questionId: q.id, mode: 'run',
        status: runStatus,
        stdout: r.stdout,
        stderr: r.stderr ?? r.compile_output,
        message: r.message,
        results: [], passed: 0, total: 0,
        timeSec: r.time ? Number(r.time) : undefined,
        memoryKb: r.memory ?? undefined,
      });
    } catch (e: unknown) {
      put({ questionId: q.id, mode: 'run', status: 'error', message: (e as Error).message ?? 'Run failed', results: [], passed: 0, total: 0 });
    } finally {
      setBusy(null);
    }
  }, [code, q.language, q.id, q.attemptId, q.attemptQuestionId, state.assessmentId, state.attemptId, put]);

  const submit = useCallback(async () => {
    setBusy('submit');
    put({ questionId: q.id, mode: 'submit', status: 'running', results: [], passed: 0, total: 0 });
    try {
      if (!q.attemptQuestionId) {
        throw new Error('Cannot submit this coding question because attempt_question_id is missing.');
      }
      const r = await submitCodingCode(state.assessmentId, {
        attempt_id: q.attemptId ?? state.attemptId,
        attempt_question_id: q.attemptQuestionId,
        question_id: q.id,
        language: q.language,
        language_id: languageId(q.language),
        source_code: code,
      });
      const results = (r.results ?? []).map((tc, i) => ({
        id: tc.id ?? `tc-${i + 1}`,
        index: i + 1,
        passed: tc.passed,
        hidden: tc.hidden ?? false,
        status: tc.status ?? '',
        ...(tc.hidden ? {} : { input: tc.input, expected: tc.expected, actual: tc.actual }),
        timeSec: tc.time ? Number(tc.time) : undefined,
        memoryKb: tc.memory ?? undefined,
      }));
      put({
        questionId: q.id, mode: 'submit',
        status: toExecStatus(r.status),
        message: r.message,
        results,
        passed: r.passed ?? results.filter((x) => x.passed).length,
        total: r.total ?? results.length,
      });
    } catch (e: unknown) {
      put({ questionId: q.id, mode: 'submit', status: 'error', message: (e as Error).message ?? 'Submission failed', results: [], passed: 0, total: 0 });
    } finally {
      setBusy(null);
    }
  }, [q, code, state.assessmentId, state.attemptId, put]);

  return { code, setCode: (c: string) => setCode(q.id, c), result, busy, run, submit };
}
