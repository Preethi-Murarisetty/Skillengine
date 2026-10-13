import axios from 'axios';

const topicInterviewApi = axios.create({
  baseURL: 'http://100.117.158.50:8100',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const startTopicInterview = async (payload) => {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('access_token');

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  console.log('AUTH TOKEN EXISTS:', Boolean(token));
  console.log('AUTH HEADER EXISTS:', Boolean(headers.Authorization));

  const response = await topicInterviewApi.post(
    '/interview/start',
    payload,
    { headers }
  );

  return response.data;
};

export const requestTopicInterviewQuestion = async (
  sessionId,
  candidateAnswer = ''
) => {
  const response = await topicInterviewApi.post(
    '/interview/question',
    {
      session_id: sessionId,
      candidate_answer: candidateAnswer,
    }
  );

  return response.data;
};

export const evaluateTopicInterviewAnswer = async (payload) => {
  const response = await topicInterviewApi.post(
    '/interview/evaluate',
    payload
  );

  return response.data;
};

export const getTopicInterviewStatus = async (sessionId) => {
  const response = await topicInterviewApi.get(
    `/interview/status/${encodeURIComponent(sessionId)}`
  );

  return response.data;
};

export const endTopicInterview = async (sessionId) => {
  const response = await topicInterviewApi.post(
    `/interview/end/${encodeURIComponent(sessionId)}`
  );

  return response.data;
};