import { api } from './axios';
import { isConfigured, resolve } from './endpoints';
import type { CodingQuestion, MCQQuestion, Question, TestCase } from '../types/assessment';
import { isRec, num, safeImageUrl, str } from '../utils/sanitize';

const toOptions = (v: unknown): MCQQuestion['options'] => {
  if (!Array.isArray(v)) return [];

  return v.flatMap((option) => {
    if (!isRec(option)) return [];

    const id = str(option.id ?? option.option_id ?? option.optionId);
    if (!id) return [];

    return [{
      id,
      text: str(option.text ?? option.option_text ?? option.label ?? option.value),
    }];
  });
};

const toTests = (v: unknown): TestCase[] =>
  Array.isArray(v)
    ? v.filter(isRec).map((t, i) => ({
        id: str(t.id, `tc-${i + 1}`),
        input: str(t.input ?? t.stdin),
        expected_output: str(t.expected_output ?? t.output),
        hidden: t.is_hidden === true || t.hidden === true || t.is_sample === false,
      }))
    : [];

export const normalizeQuestion = (
  r: Record<string, unknown>,
  sectionId: string,
  i: number,
): Question => {
  const id = str(r.id ?? r.question_id ?? r.questionId);
  if (!id) {
    throw new Error(`Question at position ${i + 1} is missing a backend question ID.`);
  }
  const looksCoding = r.question_type === 'coding' || r.type === 'coding' || Array.isArray(r.test_cases) || 'starter_code' in r;
  if (looksCoding) {
    const cons = r.constraints;
    const starterCode = r.starter_code;
    const language = str(
      r.language ??
      (Array.isArray(r.supported_languages) ? r.supported_languages[0] : undefined) ??
      (isRec(starterCode) ? Object.keys(starterCode)[0] : undefined),
      'python',
    ).toLowerCase();
    const code = isRec(starterCode)
      ? str(starterCode[language] ?? Object.values(starterCode)[0])
      : str(starterCode);
    return {
      kind: 'coding', id, sectionId,
      attemptQuestionId: str(r.attempt_question_id ?? r.attemptQuestionId) || undefined,
      attemptId: str(r.attempt_id ?? r.attemptId) || undefined,
      title: str(r.title, 'Coding question'),
      description: str(r.description ?? r.problem_statement ?? r.question_text),
      input_format: str(r.input_format ?? r.input_description) || undefined,
      output_format: str(r.output_format ?? r.output_description) || undefined,
      constraints: Array.isArray(cons) ? cons.map((c) => str(c)) : typeof cons === 'string' && cons ? cons.split('\n') : [],
      language,
      starter_code: code,
      marks: num(r.marks),
      test_cases: toTests(r.test_cases),
    } satisfies CodingQuestion;
  }
  return {
    kind: 'mcq', id, sectionId,
    attemptQuestionId: str(r.attempt_question_id ?? r.attemptQuestionId) || undefined,
    text: str(r.question_text ?? r.text ?? r.question ?? r.title),
    imageUrl: safeImageUrl(str(r.image_url ?? r.image) || undefined),
    marks: num(r.marks),
    options: toOptions(r.options ?? r.choices),
  };
};

/** Group any of: [{section_id, questions}], {sections:[...]}, or a flat list carrying section_id. */
export const fetchQuestions = async (
  token: string, assessmentId: string, sectionIds: string[],
): Promise<Record<string, Question[]>> => {
  const ep = resolve('QUESTIONS', { token, assessmentId });
  const res = await api.request({ method: ep.method, url: ep.url });
  let d: unknown = res.data;
  if (isRec(d) && d.data !== undefined) d = d.data;
  if (isRec(d) && Array.isArray(d.sections)) d = d.sections;
  if (isRec(d) && Array.isArray(d.questions)) d = d.questions;
  const out: Record<string, Question[]> = {};
  if (!Array.isArray(d)) return out;
  d.filter(isRec).forEach((row, i) => {
    if (Array.isArray(row.questions)) {
      const sid = str(row.section_id ?? row.id);
      out[sid] = row.questions.filter(isRec).map((q, j) => normalizeQuestion(q, sid, j));
    } else {
      const sid = str(row.section_id, sectionIds[0] ?? '');
      (out[sid] ??= []).push(normalizeQuestion(row, sid, i));
    }
  });
  return out;
};

export const canFetchQuestions = () => isConfigured('QUESTIONS');

export const saveCodingSubmission = async (token: string, assessmentId: string, questionId: string, code: string, language: string) => {
  if (!isConfigured('SAVE_CODING')) return;
  const ep = resolve('SAVE_CODING', { token, assessmentId, questionId });
  await api.request({ method: ep.method === 'get' ? 'post' : ep.method, url: ep.url, data: { question_id: questionId, source_code: code, language } });
};
