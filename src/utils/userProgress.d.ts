import type { AuthUser } from '../hooks/useAuth';

export interface UserProgressAssessment {
  assessmentId?: string;
  attemptId?: string;
  attemptNumber?: number;
  candidateId?: string;
  title?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  status?: string;
  submittedAt?: string;
  sections?: Array<Record<string, unknown>>;
}

export interface UserProgressPracticeSession {
  id?: string;
  category?: string;
  score?: number;
  maxScore?: number;
  percentage?: number;
  answered?: number;
  completedAt?: string;
}

export interface UserProgress {
  version: number;
  assessments: UserProgressAssessment[];
  practiceSessions: UserProgressPracticeSession[];
}

export function readUserProgress(user: AuthUser | null): UserProgress;
export function recordPracticeSession(user: AuthUser | null, session: UserProgressPracticeSession): boolean;
export function recordAssessmentResult(
  user: AuthUser | null,
  candidateEmail: string | undefined,
  result: UserProgressAssessment,
): boolean;