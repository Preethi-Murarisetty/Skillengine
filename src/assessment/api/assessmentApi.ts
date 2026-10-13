import { api, setSessionToken } from './axios';
import { resolve, isConfigured } from './endpoints';
import type {
  Assessment,
  AssessmentResult,
  AssessmentSection,
  AssessmentSubmissionSnapshot,
  Candidate,
  Question,
} from '../types/assessment';
import { isRec, num, str } from '../utils/sanitize';
import { normalizeQuestion } from './questionApi';
import { languageId } from '../services/judge0Service';

const unwrap = (data: unknown): Record<string, unknown> => {
  if (isRec(data) && isRec(data.data)) return data.data;
  return isRec(data) ? data : {};
};

export const normalizeSection = (
  r: Record<string, unknown>,
  i: number,
): AssessmentSection => ({
  id: str(r.id ?? r.section_id, `section-${i + 1}`),
  name: str(r.name ?? r.section_name, `Section ${i + 1}`),
  description: str(r.description) || undefined,
  sequence: num(r.sequence) ?? i + 1,
  duration_seconds: num(r.duration_seconds),
  question_count: num(r.question_count) ?? 0,
  total_marks: num(r.total_marks) ?? 0,
  negative_marks: num(r.negative_marks),
  section_type: (r.section_type ?? r.type) === 'coding' ? 'coding' : 'mcq',
  unlock_rule: r.unlock_rule === 'previous_completed'
    ? 'previous_completed'
    : 'immediate',
  difficulty: str(r.difficulty) || undefined,
});

export const normalizeAssessment = (data: unknown): Assessment => {
  const body = unwrap(data);
  const a = isRec(body.assessment) ? body.assessment : body;

  const sections = Array.isArray(a.sections)
    ? a.sections
    : Array.isArray(body.sections)
      ? body.sections
      : [];

  const candidateData = isRec(body.candidate)
    ? body.candidate
    : isRec(a.candidate)
      ? a.candidate
      : undefined;

  const candidate: Candidate | undefined = candidateData
    ? {
        id: str(
          candidateData.id ??
          candidateData.student_id ??
          candidateData.candidate_id,
        ) || undefined,
        name: str(
          candidateData.name ??
          candidateData.full_name,
        ) || undefined,
        email: str(candidateData.email) || undefined,
      }
    : undefined;

  return {
    id: str(
      a.id ??
      a.assessment_id ??
      a.assessmentId ??
      body.assessment_id ??
      body.assessmentId,
    ),
    title: str(
      a.title ??
      a.name,
      'Assessment',
    ),
    description: str(a.description) || undefined,
    instructions: str(a.instructions) || undefined,
    duration_seconds: num(
      a.duration_seconds ??
      a.duration ??
      body.duration_seconds,
    ) ?? 0,
    passing_percentage: num(a.passing_percentage),
    result_status: str(a.result_status) || undefined,
    starts_at: str(a.starts_at) || undefined,
    ends_at: str(a.ends_at) || undefined,
    sections: sections
      .filter(isRec)
      .map(normalizeSection)
      .sort((x, y) => x.sequence - y.sequence),
    candidate,
  };
};

export interface GenerateKeyResult {
  success: boolean;
  verificationKey?: string;
  key?: string;
  expiresAt?: string;
  expiresIn?: number;
  message?: string;
}

/**
 * CONFIRMED BACKEND API:
 * POST /api/assessment/{token}/generate-key
 */
export const generateKey = async (
  token: string,
): Promise<GenerateKeyResult> => {
  const ep = resolve('GENERATE_KEY', { token });

  const res = await api.request({
    method: ep.method,
    url: ep.url,
  });

  const body = unwrap(res.data);

  const key = str(
    body.verification_key ??
    body.verificationKey ??
    body.key ??
    body.code,
  ) || undefined;

  return {
    success: body.success !== false,
    verificationKey: key,
    key,
    expiresAt: str(
      body.expires_at ??
      body.expiresAt,
    ) || undefined,
    expiresIn: num(
      body.expires_in ??
      body.expiresIn,
    ),
    message: str(body.message) || undefined,
  };
};

export interface VerifyResult {
  assessment?: Assessment;
  assessmentId?: string;
  sessionToken?: string;
}

/**
 * CONFIRMED BACKEND API:
 * POST /api/assessment/{token}/verify-key
 *
 * Body:
 * { verification_key: "<entered key>" }
 */
export const verifyKey = async (
  token: string,
  key: string,
): Promise<VerifyResult> => {
  const ep = resolve('VERIFY_KEY', { token });

  const res = await api.request({
    method: ep.method,
    url: ep.url,
    data: {
      verification_key: key,
    },
  });

  const body = unwrap(res.data);

  const sessionToken = str(
    body.session_token ??
    body.access_token ??
    body.token,
  ) || undefined;

  if (sessionToken) {
    setSessionToken(sessionToken);
  }

  const hasAssessment =
    isRec(body.assessment) ||
    Boolean(
      body.assessment_id ||
      body.assessmentId ||
      body.title ||
      body.name ||
      Array.isArray(body.sections),
    );

  return {
    assessment: hasAssessment
      ? normalizeAssessment(body)
      : undefined,
    assessmentId: str(
      body.assessment_id ??
      body.assessmentId ??
      body.id ??
      (isRec(body.assessment)
        ? (body.assessment.id ?? body.assessment.assessment_id ?? body.assessment.assessmentId)
        : undefined),
    ) || undefined,
    sessionToken,
  };
};

export const canFetchDetails = () =>
  isConfigured('ASSESSMENT_DETAILS');

export const getAssessmentDetails = async (
  token: string,
  assessmentId = '',
): Promise<Assessment> => {
  const ep = resolve(
    'ASSESSMENT_DETAILS',
    { token, assessmentId },
  );

  const res = await api.request({
    method: ep.method,
    url: ep.url,
  });

  return normalizeAssessment(res.data);
};

export interface StartResult {
  startedAt?: number;
  endsAt?: number;
  remainingSeconds?: number;
  assessmentId?: string;
  attemptId?: string;
  assessment?: Assessment;
  questions?: Record<string, Question[]>;
}

const timestamp = (
  value: unknown,
): number | undefined => {
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? undefined : t;
  }

  if (typeof value === 'number') {
    return value;
  }

  return undefined;
};

/**
 * Parse a flat or sectioned question list into Record<sectionId, Question[]>.
 * Handles three shapes:
 *   1. [{section_id, questions:[...]}, ...]   — sectioned
 *   2. [{section_id, question_text, ...}, ...]  — flat with section_id
 *   3. [{question_text, ...}, ...]              — flat, no section_id (uses fallbackSectionId)
 */
export const parseQuestions = (
  raw: unknown[],
  fallbackSectionId = '',
): Record<string, Question[]> => {
  const out: Record<string, Question[]> = {};
  raw.filter(isRec).forEach((row, i) => {
    if (Array.isArray(row.questions)) {
      // Shape 1: sectioned block
      const sid = str(row.section_id ?? row.id ?? `section-${i + 1}`);
      out[sid] = (row.questions as unknown[])
        .filter(isRec)
        .map((q, j) => normalizeQuestion(q, sid, j));
    } else {
      // Shape 2 / 3: flat question row
      // Backend sends section as a nested object: { id, name, type, ... }
      const sectionObj = isRec(row.section) ? row.section : null;
      const sid = str(
        row.section_id ??
        row.attempt_section_id ??
        row.sectionId ??
        row.attemptSectionId ??
        sectionObj?.id,
        fallbackSectionId,
      );
      if (sid) {
        // Merge section type hint so normalizeQuestion can detect coding
        const enriched = sectionObj
          ? { ...row, question_type: row.question_type ?? sectionObj.type }
          : row;
        (out[sid] ??= []).push(
          normalizeQuestion(enriched, sid, out[sid]?.length ?? 0),
        );
      }
    }
  });
  return out;
};

/**
 * CONFIRMED BACKEND API:
 * POST /api/assessment/{token}/start
 *
 * Expected response shape:
 * { success, message, data: { attempt: { started_at, ends_at, remaining_seconds, ... }, questions: [...] } }
 */
export const startAssessment = async (
  token: string,
): Promise<StartResult> => {
  const ep = resolve('START', { token });

  const res = await api.request({
    method: ep.method,
    url: ep.url,
  });

  // Start APIs may wrap the response object or return the question array in data.
  const responsePayload = isRec(res.data) && res.data.data !== undefined
    ? res.data.data
    : res.data;
  const body = isRec(responsePayload) ? responsePayload : {};

  // Attempt / timing — backend puts this in data.attempt
  const attempt = isRec(body.attempt) ? body.attempt : body;

  // Assessment metadata
  let assessment =
    isRec(body.assessment) ||
    Array.isArray(body.sections) ||
    body.assessment_id ||
    body.title
      ? normalizeAssessment(body)
      : undefined;

  // Questions — try every known location in the response
  const questionCandidates = [
    Array.isArray(responsePayload) ? responsePayload : undefined,
    body.questions,
    body.attempt_questions,
    body.assigned_questions,
    body.question_list,
    attempt.questions,
    attempt.attempt_questions,
    attempt.assigned_questions,
    isRec(body.assessment) ? body.assessment.questions : undefined,
    body.sections,
  ].filter((candidate) => candidate !== undefined && candidate !== null);
  const hasQuestionRows = (candidate: unknown) =>
    Array.isArray(candidate)
      ? candidate.length > 0
      : isRec(candidate) && Object.values(candidate).some(
          (value) => Array.isArray(value) && value.length > 0,
        );
  const rawQuestions: unknown =
    questionCandidates.find(hasQuestionRows) ?? questionCandidates[0] ?? [];
  const rawQ = Array.isArray(rawQuestions)
    ? rawQuestions
    : isRec(rawQuestions)
      ? Array.isArray(rawQuestions.questions)
        ? rawQuestions.questions
        : Array.isArray(rawQuestions.sections)
          ? rawQuestions.sections
          : Array.isArray(rawQuestions.items)
            ? rawQuestions.items
          : undefined
      : undefined;

  // Build sections from the flat question list when the response has no explicit sections array.
  // Each question carries a `section` object: { id, name, sequence, type }.
  let derivedSections = assessment?.sections ?? [];
  if (!derivedSections.length && rawQ?.length) {
    const seen = new Map<string, Record<string, unknown>>();
    rawQ.filter(isRec).forEach((q) => {
      const nestedSection = isRec(q.section) ? q.section : undefined;
      const sid = str(
        nestedSection?.id ??
        q.section_id ??
        q.attempt_section_id ??
        q.sectionId ??
        q.attemptSectionId,
      );
      if (sid && !seen.has(sid)) {
        seen.set(sid, nestedSection ?? {
          id: sid,
          section_name: q.section_name,
          section_type: q.section_type ?? q.question_type ?? q.type,
        });
      }
    });
    if (seen.size) {
      derivedSections = Array.from(seen.values()).map((s, i) => normalizeSection(s, i));
      if (assessment) {
        assessment = { ...assessment, sections: derivedSections };
      }
    }
  }

  const fallbackSectionId = derivedSections[0]?.id ?? '';
  let questions = rawQ?.length ? parseQuestions(rawQ, fallbackSectionId) : undefined;
  if (!questions && isRec(rawQuestions)) {
    const groupedQuestions: Record<string, Question[]> = {};
    Object.entries(rawQuestions).forEach(([sectionId, sectionRows]) => {
      if (!Array.isArray(sectionRows)) return;
      groupedQuestions[sectionId] = sectionRows
        .filter(isRec)
        .map((question, i) => normalizeQuestion(question, sectionId, i));
    });
    if (Object.keys(groupedQuestions).length) questions = groupedQuestions;
  }

  return {
    startedAt: timestamp(
      attempt.started_at ??
      attempt.start_time ??
      body.started_at,
    ),
    endsAt: timestamp(
      attempt.ends_at ??
      attempt.end_time ??
      body.ends_at,
    ),
    remainingSeconds: num(
      attempt.remaining_seconds ??
      body.remaining_seconds,
    ),
    assessmentId: str(
      body.assessment_id ??
      body.assessmentId ??
      attempt.assessment_id ??
      attempt.assessmentId ??
      assessment?.id,
    ) || undefined,
    attemptId: str(
      attempt.id ??
      attempt.attempt_id ??
      attempt.attemptId ??
      body.attempt_id ??
      body.attemptId,
    ) || undefined,
    assessment,
    questions,
  };
};

/**
 * GET /api/assessment/:assessmentId/questions — NOT implemented on this backend.
 * Kept as a no-op stub so nothing breaks if it is called.
 * Questions are sourced exclusively from POST /api/assessment/:jwt/start.
 */
export const fetchAssessmentQuestions = async (
  _assessmentId: string,
  _sections: { id: string }[],
): Promise<Record<string, Question[]>> => {
  return {};
};

/**
 * POST /api/assessment/:assessmentId/assign-questions
 * Assigns questions to the assessment attempt immediately after verification.
 */
export const assignQuestions = async (
  assessmentId: string,
): Promise<void> => {
  if (!assessmentId) throw new Error('assignQuestions: assessmentId is required');
  // Use the assessmentId directly — it is a plain UUID, no encoding needed.
  console.log('[assignQuestions] POST /api/assessment/' + assessmentId + '/assign-questions');
  await api.post(`/assessment/${assessmentId}/assign-questions`);
};

export interface QuizAnswer {
  questionId: string;
  selectedOptionId: string;
}

const normalizeSubmissionResult = (data: unknown): AssessmentResult | null => {
  const body = unwrap(data);
  const r = isRec(body.result) ? body.result : body;
  const result: AssessmentResult = {
    score: num(r.score ?? r.obtained_marks),
    total_marks: num(r.total_marks ?? r.max_score),
    percentage: num(r.percentage),
    status: str(r.result_status ?? r.status) || undefined,
    message: str(r.message) || undefined,
  };

  return result.score !== undefined ||
    result.total_marks !== undefined ||
    result.percentage !== undefined ||
    result.status !== undefined ||
    result.message !== undefined
    ? result
    : null;
};

/**
 * POST /api/assessment/evaluateQuiz
 * Body: { assessmentId, attemptId, answers: [{ questionId, selectedOptionId }] }
 */
export const evaluateQuiz = async (
  assessmentId: string,
  attemptId: string,
  answers: QuizAnswer[],
): Promise<AssessmentSubmissionSnapshot> => {
  const res = await api.post(
    '/assessment/evaluateQuiz',
    {
      assessmentId,
      attemptId,
      answers,
    },
  );

  return {
    normalized: normalizeSubmissionResult(res.data),
    payload: res.data,
  };
};

export interface EndAssessmentPayload {
  assessmentId: string;
  attemptId: string;
  answers: QuizAnswer[];
}

/**
 * POST /api/assessment/{token}/end
 * Finalizes a mixed assessment and evaluates its stored MCQ answers.
 */
export const endAssessment = async (
  token: string,
  payload: EndAssessmentPayload,
): Promise<AssessmentSubmissionSnapshot> => {
  const ep = resolve('END', { token });

  const res = await api.request({
    method: ep.method,
    url: ep.url,
    data: payload,
  });

  return {
    normalized: normalizeSubmissionResult(res.data),
    payload: res.data,
  };
};

export const getResult = async (
  token: string,
  assessmentId: string,
): Promise<AssessmentResult | null> => {
  if (!isConfigured('RESULT')) return null;

  const ep = resolve(
    'RESULT',
    { token, assessmentId },
  );

  const res = await api.request({
    method: ep.method,
    url: ep.url,
  });

  const body = unwrap(res.data);

  return {
    score: num(body.score),
    total_marks: num(body.total_marks),
    percentage: num(body.percentage),
    status: str(body.status) || undefined,
  };
};

// ─── Coding run/submit payload ────────────────────────────────────────────

export interface CodingRunPayload {
  attempt_id: string;
  attempt_question_id: string;
  question_id: string;
  language: string;
  language_id: number;
  source_code: string;
  stdin?: string;
}

const ensureCodingLanguageId = (payload: CodingRunPayload): CodingRunPayload => ({
  ...payload,
  language_id:
    Number.isInteger(payload.language_id) && payload.language_id > 0
      ? payload.language_id
      : languageId(payload.language),
});

export interface CodingRunResult {
  status: string;
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  time?: string;
  memory?: number;
  passed?: boolean;
}

export interface CodingSubmitResult {
  status: string;
  score?: number;
  total_marks?: number;
  passed?: number;
  total?: number;
  message?: string;
  results?: Array<{
    id?: string;
    passed: boolean;
    hidden?: boolean;
    status?: string;
    input?: string;
    expected?: string;
    actual?: string;
    time?: string;
    memory?: number;
  }>;
}

/**
 * GET /api/assessment/:assessmentId/coding/:attemptQuestionId
 * Fetches full coding question details (description, test cases, starter code).
 */
export const getCodingQuestion = async (
  assessmentId: string,
  attemptQuestionId: string,
): Promise<Record<string, unknown>> => {
  const res = await api.get(`/assessment/${assessmentId}/coding/${attemptQuestionId}`);
  const body = unwrap(res.data);
  return isRec(body.question) ? body.question : body;
};

/**
 * POST /api/assessment/:assessmentId/coding/run
 * Runs code against test cases without finalising the submission.
 */
export const runCodingCode = async (
  assessmentId: string,
  payload: CodingRunPayload,
): Promise<CodingRunResult> => {
  const res = await api.post(
    `/assessment/${assessmentId}/coding/run`,
    ensureCodingLanguageId(payload),
    { timeout: 60000 },
  );
  const responseBody = unwrap(res.data);
  const body = isRec(responseBody.result) ? responseBody.result : responseBody;
  const testResults = Array.isArray(body.results) ? body.results.filter(isRec) : [];
  const passed = typeof body.all_passed === 'boolean'
    ? body.all_passed
    : typeof body.passed === 'boolean'
      ? body.passed
      : testResults.length > 0
        ? testResults.every((result) => result.passed === true)
        : undefined;
  const failedResult = testResults.find((result) => result.passed === false);
  const caseStatus = isRec(failedResult?.status)
    ? str(failedResult.status.description)
    : str(failedResult?.status);
  const caseOutputs = testResults
    .filter((result) => result.is_hidden !== true && result.hidden !== true && result.is_sample !== false)
    .map((result) => str(result.actual_output ?? result.actual ?? result.stdout ?? result.output).trimEnd())
    .filter(Boolean);
  const resolvedStatus = str(body.status ?? body.result_status ?? caseStatus)
    || (passed === true ? 'Accepted' : 'unknown');

  return {
    status: resolvedStatus,
    stdout: str(body.stdout ?? body.output ?? body.output_text) || caseOutputs.join('\n') || undefined,
    stderr: str(body.stderr ?? body.error) || testResults.map((result) => str(result.stderr)).filter(Boolean).join('\n') || undefined,
    compile_output: str(body.compile_output) || testResults.map((result) => str(result.compile_output)).filter(Boolean).join('\n') || undefined,
    message: body.success === false ? str(body.message) || undefined : undefined,
    time: str(body.time ?? testResults[0]?.time) || undefined,
    memory: num(body.memory ?? testResults[0]?.memory),
    passed,
  };
};

/**
 * POST /api/assessment/:assessmentId/coding/submit
 * Submits the candidate's final code for scoring against hidden test cases.
 */
export const submitCodingCode = async (
  assessmentId: string,
  payload: CodingRunPayload,
): Promise<CodingSubmitResult> => {
  const res = await api.post(
    `/assessment/${assessmentId}/coding/submit`,
    ensureCodingLanguageId(payload),
    { timeout: 60000 },
  );
  const responseBody = unwrap(res.data);
  const body = isRec(responseBody.result) ? responseBody.result : responseBody;
  const rawResults = Array.isArray(body.results) ? body.results.filter(isRec) : [];
  const results = rawResults.map((r, index) => {
    const hidden = r.hidden === true || r.is_hidden === true || r.is_sample === false;
    const testStatus = isRec(r.status) ? str(r.status.description) : str(r.status);
    return {
      id: str(r.test_case_id ?? r.id, `tc-${index + 1}`),
      passed: r.passed === true,
      hidden,
      status: testStatus || undefined,
      ...(!hidden ? {
        input: str(r.input) || undefined,
        expected: str(r.expected_output ?? r.expected) || undefined,
        actual: str(r.actual_output ?? r.actual ?? r.stdout) || undefined,
      } : {}),
      time: str(r.time) || undefined,
      memory: num(r.memory),
    };
  });
  const total = num(body.total_test_cases ?? body.total) ?? results.length;
  const passed = num(body.passed_test_cases ?? body.passed)
    ?? results.filter((result) => result.passed).length;
  const allPassed = typeof body.all_passed === 'boolean'
    ? body.all_passed
    : total > 0
      ? passed === total
      : undefined;
  const failedStatus = results.find((result) => !result.passed)?.status;
  const status = str(body.status ?? body.result_status)
    || (allPassed === true ? 'Accepted' : failedStatus ?? 'unknown');

  return {
    status,
    score: num(body.score),
    total_marks: num(body.total_marks),
    passed,
    total,
    message: str(body.message) || undefined,
    results,
  };
};

// ─── Results page ─────────────────────────────────────────────────────────

export interface FullAssessmentResult {
  assessment?: { id?: string; title?: string; description?: string; passing_percentage?: number; duration_seconds?: number };
  candidate?: { id?: string; name?: string; email?: string };
  attempt?: { id?: string; attempt_number?: number; status?: string; started_at?: string; submitted_at?: string };
  result?: {
    score?: number; max_score?: number; percentage?: number; passing_percentage?: number;
    result: string; correct_count?: number; wrong_count?: number; unanswered_count?: number;
  };
  sections?: Array<{
    section_id: string; section_name: string; section_type: string; sequence: number;
    score?: number; max_score?: number; percentage?: number;
    correct_count?: number; wrong_count?: number; unanswered_count?: number;
  }>;
  history?: FullAssessmentResult[];
}

/**
 * GET /api/assessment/:assessmentId/results
 * Response: { success, data: { assessment, summary, results: [{ candidate, attempt, result, sections }] } }
 */
export const getAssessmentResults = async (
  assessmentId: string,
): Promise<FullAssessmentResult | null> => {
  try {
    const res = await api.get(`/assessment/${assessmentId}/results`);
    const body = unwrap(res.data);
    const candidateEntries = Array.isArray(body.candidates)
      ? body.candidates.filter(isRec)
      : [];
    const resultEntries = Array.isArray(body.results)
      ? body.results.filter(isRec)
      : [];
    const entries = resultEntries.length
      ? resultEntries
      : candidateEntries.length
        ? candidateEntries
        : [body];

    const normalizeEntry = (entry: Record<string, unknown>): FullAssessmentResult => {
      const asmData = isRec(body.assessment)
        ? body.assessment
        : isRec(entry.assessment)
          ? entry.assessment
          : undefined;
      const candData = isRec(entry.candidate) ? entry.candidate : undefined;
      const attData = isRec(entry.attempt) ? entry.attempt : undefined;
      const resData = isRec(entry.result) ? entry.result : undefined;
      const sections = Array.isArray(entry.sections)
        ? entry.sections.filter(isRec).map((s, i) => {
          const score = num(s.score);
          const maxScore = num(s.max_score ?? s.total_marks);
          const correctCount = num(s.correct_count);
          const wrongCount = num(s.wrong_count);
          const unansweredCount = num(s.unanswered_count);
          return {
            section_id: str(s.section_id ?? s.id, `${num(s.sequence) ?? i + 1}-${str(s.section_name ?? s.name, 'section')}`),
            section_name: str(s.section_name ?? s.name, `Section ${i + 1}`),
            section_type: str(s.section_type ?? s.type),
            sequence: num(s.sequence) ?? i + 1,
            score,
            max_score: maxScore,
            percentage: num(s.percentage) ?? (maxScore !== undefined && maxScore > 0 && score !== undefined ? (score / maxScore) * 100 : undefined),
            correct_count: correctCount,
            wrong_count: wrongCount,
            unanswered_count: unansweredCount,
          };
        })
        : undefined;
      const score = num(resData?.score ?? resData?.total_score ?? resData?.obtained_marks);
      const maxScore = num(resData?.max_score ?? resData?.total_marks);
      return {
        assessment: asmData ? {
          id: str(asmData.id ?? asmData.assessment_id) || undefined,
          title: str(asmData.title) || undefined,
          description: str(asmData.description) || undefined,
          passing_percentage: num(asmData.passing_percentage),
          duration_seconds: num(asmData.duration_seconds ?? (num(asmData.duration_minutes) !== undefined ? Number(asmData.duration_minutes) * 60 : undefined)),
        } : undefined,
        candidate: candData ? {
          id: str(candData.id ?? candData.candidate_id) || undefined,
          name: str(candData.name ?? candData.full_name) || undefined,
          email: str(candData.email) || undefined,
        } : undefined,
        attempt: attData ? {
          id: str(attData.id ?? attData.attempt_id) || undefined,
          attempt_number: num(attData.attempt_number),
          status: str(attData.status) || undefined,
          started_at: str(attData.started_at) || undefined,
          submitted_at: str(attData.submitted_at ?? attData.completed_at) || undefined,
        } : undefined,
        result: resData ? {
          score,
          max_score: maxScore,
          percentage: num(resData.percentage) ?? (maxScore !== undefined && maxScore > 0 && score !== undefined ? (score / maxScore) * 100 : undefined),
          passing_percentage: num(resData.passing_percentage ?? asmData?.passing_percentage),
          result: str(resData.result ?? resData.result_status, ''),
          correct_count: num(resData.correct_count) ?? (sections?.some((section) => section.correct_count !== undefined) ? sections.reduce((sum, section) => sum + (section.correct_count || 0), 0) : undefined),
          wrong_count: num(resData.wrong_count) ?? (sections?.some((section) => section.wrong_count !== undefined) ? sections.reduce((sum, section) => sum + (section.wrong_count || 0), 0) : undefined),
          unanswered_count: num(resData.unanswered_count) ?? (sections?.some((section) => section.unanswered_count !== undefined) ? sections.reduce((sum, section) => sum + (section.unanswered_count || 0), 0) : undefined),
        } : undefined,
        sections,
      };
    };

    const normalizedHistory = entries
      .map(normalizeEntry)
      .filter((entry) => {
        const status = String(entry.attempt?.status || '').trim().toLowerCase();
        return Boolean(entry.result) && !['cancelled', 'canceled', 'incomplete', 'in_progress', 'started', 'expired', 'invalid'].includes(status);
      });
    normalizedHistory.sort((left, right) => {
      const leftTime = Date.parse(left.attempt?.submitted_at || left.attempt?.started_at || '');
      const rightTime = Date.parse(right.attempt?.submitted_at || right.attempt?.started_at || '');
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) return rightTime - leftTime;
      return (right.attempt?.attempt_number ?? -1) - (left.attempt?.attempt_number ?? -1);
    });

    const normalizedLatest = normalizedHistory[0] ?? normalizeEntry(body);
    return {
      ...normalizedLatest,
      history: normalizedHistory.length ? normalizedHistory : [normalizedLatest],
    };
  } catch (e: unknown) {
    if ((e as { response?: { status?: number } }).response?.status === 404) return null;
    throw e;
  }
};
