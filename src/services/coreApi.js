import axios from 'axios';

export const CORE_API_ENABLED = import.meta.env.VITE_CORE_API_ENABLED === 'true';

const coreApi = axios.create({
  baseURL: import.meta.env.VITE_CORE_API_BASE_URL || '/core-api/api/v1',
  timeout: 60000,
  headers: { Accept: 'application/json' },
});

coreApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
    || localStorage.getItem('access_token')
    || localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const sessionStorageKey = (inviteToken) =>
  `skillengine:assessment-session:${encodeURIComponent(inviteToken)}`;

export const setAssessmentSessionToken = (inviteToken, token) => {
  if (token) sessionStorage.setItem(sessionStorageKey(inviteToken), token);
  else sessionStorage.removeItem(sessionStorageKey(inviteToken));
};

const assessmentConfig = (inviteToken) => {
  const sessionToken = sessionStorage.getItem(sessionStorageKey(inviteToken));
  return sessionToken
    ? { headers: { 'X-Assessment-Session': sessionToken } }
    : {};
};

export const getExamLink = (token) => coreApi.get(`/exam/${encodeURIComponent(token)}`);
export const requestExamOtp = (token) => coreApi.post(`/exam/${encodeURIComponent(token)}/otp`);
export const verifyExamOtp = async (token, otp) => {
  const response = await coreApi.post(
    `/exam/${encodeURIComponent(token)}/otp/verify`,
    { otp },
  );
  setAssessmentSessionToken(token, response.data?.session_token);
  return response;
};
export const getExamSession = (token) =>
  coreApi.get(`/exam/${encodeURIComponent(token)}/session`, assessmentConfig(token));
export const startExam = (token) =>
  coreApi.post(`/exam/${encodeURIComponent(token)}/start`, null, assessmentConfig(token));
export const saveMcqAnswer = (token, questionId, selectedOptionId) =>
  coreApi.put(
    `/exam/${encodeURIComponent(token)}/answers/${encodeURIComponent(questionId)}`,
    { selected_option_id: selectedOptionId },
    assessmentConfig(token),
  );
export const saveCodingDraft = (token, questionId, data) =>
  coreApi.post(
    `/exam/${encodeURIComponent(token)}/coding/${encodeURIComponent(questionId)}/draft`,
    data,
    assessmentConfig(token),
  );
export const runCoreCoding = (token, questionId, data) =>
  coreApi.post(
    `/exam/${encodeURIComponent(token)}/coding/${encodeURIComponent(questionId)}/run`,
    data,
    { ...assessmentConfig(token), timeout: 60000 },
  );
export const submitCoreCoding = (token, questionId, data) =>
  coreApi.post(
    `/exam/${encodeURIComponent(token)}/coding/${encodeURIComponent(questionId)}/submit`,
    data,
    { ...assessmentConfig(token), timeout: 60000 },
  );
export const submitExam = (token) =>
  coreApi.post(`/exam/${encodeURIComponent(token)}/submit`, null, assessmentConfig(token));
export const getExamReport = (token) =>
  coreApi.get(`/exam/${encodeURIComponent(token)}/report`, assessmentConfig(token));
export const startAssessmentInterview = (assessmentId, attemptId, token) =>
  coreApi.post(
    `/assessments/${encodeURIComponent(assessmentId)}/attempts/${encodeURIComponent(attemptId)}/interview/start`,
    null,
    assessmentConfig(token),
  );
export const getAssessmentInterview = (interviewId, token) =>
  coreApi.get(`/assessment-interviews/${encodeURIComponent(interviewId)}`, assessmentConfig(token));
export const submitAssessmentInterviewResponse = (interviewId, questionId, token, response) =>
  coreApi.put(
    `/assessment-interviews/${encodeURIComponent(interviewId)}/questions/${encodeURIComponent(questionId)}/response`,
    { response },
    assessmentConfig(token),
  );
export const completeAssessmentInterview = (interviewId, token) =>
  coreApi.post(
    `/assessment-interviews/${encodeURIComponent(interviewId)}/complete`,
    null,
    assessmentConfig(token),
  );

export const confirmCareerProfile = (profile) =>
  coreApi.put('/career/profile/confirm', profile);
export const recommendCareerRoles = (resumeText) =>
  coreApi.post('/career/roles/recommend', { resume_text: resumeText });
export const getCareerSkillGaps = (analysisId) =>
  coreApi.get(`/career/skill-gaps/${encodeURIComponent(analysisId)}`);
export const selectCareerGoal = (role, resumeText) =>
  coreApi.put('/career/goal', { role, resume_text: resumeText });
export const startCareerInterview = (analysisId) =>
  coreApi.post('/career/interviews', { role_analysis_id: analysisId });
export const getCareerInterview = (interviewId) =>
  coreApi.get(`/career/interviews/${encodeURIComponent(interviewId)}`);
export const submitCareerResponse = (interviewId, questionId, response) =>
  coreApi.put(
    `/career/interviews/${encodeURIComponent(interviewId)}/questions/${encodeURIComponent(questionId)}/response`,
    { response },
  );
export const completeCareerInterview = (interviewId) =>
  coreApi.post(`/career/interviews/${encodeURIComponent(interviewId)}/complete`);
export const getCareerReport = (interviewId) =>
  coreApi.get(`/career/interviews/${encodeURIComponent(interviewId)}/report`);
export const getMySubscription = () => coreApi.get('/subscriptions/me');
export const generateLearningPlan = (roleAnalysisId, weeks) =>
  coreApi.post('/learning-plans', { role_analysis_id: roleAnalysisId, weeks });
export const getMyLearningPlan = () => coreApi.get('/learning-plans/me');
export const updateLearningProgress = (planId, itemId, status) =>
  coreApi.patch(
    `/learning-plans/${encodeURIComponent(planId)}/items/${encodeURIComponent(itemId)}/progress`,
    { status },
  );

export const createCoreAssessment = (payload) => coreApi.post('/assessments', payload);
export const publishCoreAssessment = (assessmentId) =>
  coreApi.post(`/assessments/${encodeURIComponent(assessmentId)}/publish`);
export const getCoreInstitutions = () => coreApi.get('/institutions');
export const createCoreInstitution = (name) => coreApi.post('/institutions', { name });
export const syncInstitutionMembers = (institutionId, members) =>
  coreApi.post(
    `/institutions/${encodeURIComponent(institutionId)}/members:sync`,
    { members },
  );

export default coreApi;
