import type { AxiosResponse } from 'axios';

type CoreResponse<T extends object = Record<string, unknown>> = AxiosResponse<T>;

export interface CoreAssessmentInterview {
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

export interface CoreCareerInterview {
  id: string;
  role: string;
  status: string;
  questions: Array<{
    id: string;
    sequence: number;
    skill: string;
    concept: string;
    question: string;
    response?: string | null;
    evaluation?: Record<string, unknown> | null;
    score?: number | null;
    feedback?: string | null;
  }>;
}

export interface CoreLearningPlan {
  id: string;
  weeks: number;
  items: Array<{
    id: string;
    week_number: number;
    skill: string;
    focus: string;
    status: 'pending' | 'in_progress' | 'completed';
  }>;
}

export const CORE_API_ENABLED: boolean;
export function setAssessmentSessionToken(inviteToken: string, token: string | null): void;
export function getExamLink(token: string): CoreResponse;
export function requestExamOtp(token: string): Promise<CoreResponse>;
export function verifyExamOtp(token: string, otp: string): Promise<CoreResponse<{
  session_token?: string;
  assessment_id?: string;
  assessment?: Record<string, unknown>;
}>>;
export function getExamSession(token: string): Promise<CoreResponse<Record<string, unknown>>>;
export function startExam(token: string): Promise<CoreResponse<Record<string, unknown>>>;
export function saveMcqAnswer(token: string, questionId: string, selectedOptionId: string | null): Promise<CoreResponse>;
export function saveCodingDraft(token: string, questionId: string, data: Record<string, unknown>): Promise<CoreResponse>;
export function runCoreCoding(token: string, questionId: string, data: Record<string, unknown>): Promise<CoreResponse<Record<string, unknown>>>;
export function submitCoreCoding(token: string, questionId: string, data: Record<string, unknown>): Promise<CoreResponse<Record<string, unknown>>>;
export function submitExam(token: string): Promise<CoreResponse<Record<string, unknown>>>;
export function getExamReport(token: string): Promise<CoreResponse<Record<string, any>>>;
export function startAssessmentInterview(assessmentId: string, attemptId: string, token: string): Promise<CoreResponse<CoreAssessmentInterview>>;
export function getAssessmentInterview(interviewId: string, token: string): Promise<CoreResponse<CoreAssessmentInterview>>;
export function submitAssessmentInterviewResponse(interviewId: string, questionId: string, token: string, response: string): Promise<CoreResponse<{
  question_id: string;
  skill: string;
  score: number;
  feedback?: string;
  evaluation: Record<string, unknown>;
}>>;
export function completeAssessmentInterview(interviewId: string, token: string): Promise<CoreResponse<CoreAssessmentInterview>>;

export function confirmCareerProfile(profile: Record<string, unknown>): Promise<CoreResponse>;
export function recommendCareerRoles(resumeText: string): Promise<CoreResponse>;
export function getCareerSkillGaps(analysisId: string): Promise<CoreResponse<Record<string, unknown>>>;
export function selectCareerGoal(role: string, resumeText: string): Promise<CoreResponse>;
export function startCareerInterview(analysisId: string): Promise<CoreResponse<CoreCareerInterview>>;
export function getCareerInterview(interviewId: string): Promise<CoreResponse<CoreCareerInterview>>;
export function submitCareerResponse(interviewId: string, questionId: string, response: string): Promise<CoreResponse<Record<string, unknown>>>;
export function completeCareerInterview(interviewId: string): Promise<CoreResponse<Record<string, unknown>>>;
export function getCareerReport(interviewId: string): Promise<CoreResponse<Record<string, unknown>>>;
export function getMySubscription(): Promise<CoreResponse<{ eligible: boolean }>>;
export function generateLearningPlan(roleAnalysisId: string, weeks: number): Promise<CoreResponse<CoreLearningPlan>>;
export function getMyLearningPlan(): Promise<CoreResponse<{ plan: CoreLearningPlan | null }>>;
export function updateLearningProgress(planId: string, itemId: string, status: string): Promise<CoreResponse>;
export function createCoreAssessment(payload: Record<string, unknown>): Promise<CoreResponse>;
export function publishCoreAssessment(assessmentId: string): Promise<CoreResponse>;
export function getCoreInstitutions(): Promise<CoreResponse<{ institutions: Array<{ id: string; name: string }> }>>;
export function createCoreInstitution(name: string): Promise<CoreResponse<{ id: string; name: string }>>;
export function syncInstitutionMembers(institutionId: string, members: unknown[]): Promise<CoreResponse>;
