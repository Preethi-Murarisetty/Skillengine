import { createSubmission, fetchSubmission, type J0Submission } from '../api/judge0Api';
import type { CodingQuestion, CodingSubmission, ExecStatus, TestCaseResult } from '../types/assessment';

const LANGUAGE_IDS: Record<string, number> = {
  python: 71, python3: 71, javascript: 63, typescript: 74, java: 62, cpp: 54, 'c++': 54, c: 50, go: 60, ruby: 72,
};
export const languageId = (lang: string): number => LANGUAGE_IDS[lang.toLowerCase()] ?? 71;
export const monacoLanguage = (lang: string): string => (lang === 'python3' ? 'python' : lang === 'c++' ? 'cpp' : lang);

const norm = (s?: string | null) => (s ?? '').replace(/\r\n/g, '\n').trimEnd().split('\n').map((l) => l.trimEnd()).join('\n');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll a submission token until Judge0 finishes (status id > 2). */
export const getSubmissionResult = async (token: string, maxMs = 20000): Promise<J0Submission> => {
  const t0 = Date.now();
  for (;;) {
    const r = await fetchSubmission(token);
    if ((r.status?.id ?? 0) > 2) return r;
    if (Date.now() - t0 > maxMs) throw new Error('Execution timed out');
    await sleep(600);
  }
};

const toStatus = (r: J0Submission, matched: boolean): ExecStatus => {
  switch (r.status?.id) {
    case 3: return matched ? 'accepted' : 'wrong_answer';
    case 4: return 'wrong_answer';
    case 5: return 'time_limit';
    case 6: return 'compilation_error';
    case 13: case 14: return 'error';
    default: return 'runtime_error';
  }
};

/** Run code once against custom/sample stdin (no judging). */
export const runCode = async (code: string, language: string, stdin = ''): Promise<CodingSubmission> => {
  const token = await createSubmission({ source_code: code, language_id: languageId(language), stdin });
  const r = await getSubmissionResult(token);
  const status = toStatus(r, true);
  return {
    questionId: '', mode: 'run', status: status === 'accepted' ? 'accepted' : status,
    stdout: r.stdout ?? '', stderr: r.stderr ?? r.compile_output ?? r.message ?? '',
    results: [], passed: 0, total: 0,
    timeSec: r.time ? Number(r.time) : undefined, memoryKb: r.memory ?? undefined,
  };
};

/**
 * Judge all test cases. Hidden cases return pass/fail only — their input/expected/actual
 * are never placed in the result object.
 * NOTE: Hidden cases still reach the browser if the API sends them. For real security,
 * judge server-side (see README "Security notes").
 */
export const submitCode = async (q: CodingQuestion, code: string): Promise<CodingSubmission> => {
  const cases = q.test_cases;
  const results: TestCaseResult[] = [];
  let maxTime = 0, maxMem = 0, firstFail: ExecStatus | null = null, stderr = '';
  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    const token = await createSubmission({ source_code: code, language_id: languageId(q.language), stdin: tc.input });
    const r = await getSubmissionResult(token);
    const passed = r.status?.id === 3 && norm(r.stdout) === norm(tc.expected_output);
    if (!passed && !firstFail) { firstFail = toStatus(r, false); stderr = r.stderr ?? r.compile_output ?? r.message ?? ''; }
    maxTime = Math.max(maxTime, Number(r.time ?? 0));
    maxMem = Math.max(maxMem, r.memory ?? 0);
    results.push({
      id: tc.id, index: i + 1, passed, hidden: tc.hidden, status: r.status?.description ?? '',
      ...(tc.hidden ? {} : { input: tc.input, expected: tc.expected_output, actual: r.stdout ?? '' }),
      timeSec: r.time ? Number(r.time) : undefined, memoryKb: r.memory ?? undefined,
    });
    if (firstFail === 'compilation_error') break;
  }
  const passedCount = results.filter((r) => r.passed).length;
  return {
    questionId: q.id, mode: 'submit', results, passed: passedCount, total: cases.length,
    status: cases.length && passedCount === cases.length ? 'accepted' : firstFail ?? 'wrong_answer',
    stderr: q.test_cases.some((t) => t.hidden) ? '' : stderr,
    timeSec: maxTime, memoryKb: maxMem,
  };
};
