export type AssessmentStatus =
  | 'VERIFYING' | 'VERIFIED' | 'INSTRUCTIONS' | 'STARTING' | 'IN_PROGRESS'
  | 'SECTION_COMPLETED' | 'SUBMITTING' | 'COMPLETED' | 'EXPIRED' | 'ERROR';

export type UnlockRule = 'immediate' | 'previous_completed';
export type SectionType = 'mcq' | 'coding';

export interface Candidate { id?: string; name?: string; email?: string }

export interface AssessmentSection {
  id: string;
  name: string;
  description?: string;
  sequence: number;
  duration_seconds?: number;
  question_count: number;
  total_marks: number;
  negative_marks?: number;
  section_type: SectionType;
  unlock_rule: UnlockRule;
  difficulty?: string;
}

export interface Assessment {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  duration_seconds: number;
  passing_percentage?: number;
  result_status?: string;
  starts_at?: string;
  ends_at?: string;
  sections: AssessmentSection[];
  candidate?: Candidate;
}

export interface McqOption { id: string; text: string }

export interface MCQQuestion {
  kind: 'mcq';
  id: string;
  sectionId: string;
  attemptQuestionId?: string;
  text: string;
  imageUrl?: string;
  marks?: number;
  options: McqOption[];
}

export interface TestCase {
  id: string;
  input: string;
  expected_output: string;
  hidden: boolean;
}

export interface CodingQuestion {
  kind: 'coding';
  id: string;
  sectionId: string;
  attemptQuestionId?: string;
  attemptId?: string;
  title: string;
  description: string;
  input_format?: string;
  output_format?: string;
  constraints: string[];
  language: string;
  starter_code: string;
  marks?: number;
  test_cases: TestCase[];
}

export type Question = MCQQuestion | CodingQuestion;

export interface Answer { questionId: string; selectedOptionId: string | null; savedAt: number }

export type ExecStatus =
  | 'idle' | 'running' | 'submitted' | 'accepted' | 'wrong_answer'
  | 'compilation_error' | 'runtime_error' | 'time_limit' | 'error';

export interface TestCaseResult {
  id: string;
  index: number;
  passed: boolean;
  hidden: boolean;
  status: string;
  input?: string;
  expected?: string;
  actual?: string;
  timeSec?: number;
  memoryKb?: number;
}

export interface CodingSubmission {
  questionId: string;
  status: ExecStatus;
  message?: string;
  stdout?: string;
  stderr?: string;
  results: TestCaseResult[];
  passed: number;
  total: number;
  timeSec?: number;
  memoryKb?: number;
  mode: 'run' | 'submit';
}

export interface AssessmentResult {
  score?: number;
  total_marks?: number;
  percentage?: number;
  status?: string;
  message?: string;
  correct_count?: number;
  wrong_count?: number;
  unanswered_count?: number;
}

export interface AssessmentSubmissionSnapshot {
  normalized: AssessmentResult | null;
  payload: unknown;
}

export interface AssessmentSession {
  token: string;
  assessmentId: string;
  attemptId: string;
  status: AssessmentStatus;
  sectionIdx: number;
  questionIdx: number;
  answers: Record<string, Answer>;
  marked: string[];
  visited: string[];
  completedSections: string[];
  code: Record<string, string>;
  startedAt: number | null;
  endsAt: number | null;
  questionsAssigned: boolean;
  /** Non-sensitive assessment metadata (title, sections). No questions or test cases. */
  assessment: Assessment | null;
  questions?: Record<string, Question[]>;
}
