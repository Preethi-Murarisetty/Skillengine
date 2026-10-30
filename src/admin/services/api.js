import { API_BASE_URL, PDF_API_BASE_URL as PDF_BASE } from "../config";
import { applyStudentPlacements } from "../utils/studentPlacement";

// ============================================================================
// API BASE URLs
// ============================================================================
const MANUAL_API_BASE_URL = API_BASE_URL;
const PDF_API_BASE_URL = PDF_BASE;
const AUTH_API_BASE_URL = `${MANUAL_API_BASE_URL}/api/users`;

const unwrapUsers = (value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];

  for (const key of ["users", "students", "student_records", "studentRecords", "institutional_users", "institutionalUsers", "profiles", "records", "items", "results", "rows", "result", "data", "payload"]) {
    const nested = value[key];
    if (Array.isArray(nested) && nested.length) return nested;
    if (nested && typeof nested === "object") {
      const users = unwrapUsers(nested);
      if (users.length) return users;
    }
  }

  if (["id", "user_id", "userId", "_id", "student_id", "studentId"].some((key) => value[key] !== undefined)) {
    return [value];
  }

  return [];
};

// ============================================================================
// AUTH TOKEN HELPER
// ============================================================================
const getAuthToken = () => {
  return (
    localStorage.getItem("authToken") ||
    localStorage.getItem("access_token") ||
    localStorage.getItem("token") ||
    ""
  );
};

// ============================================================================
// AUTH API
// ============================================================================
const authApi = {
  get: async (endpoint, options = {}) => {
    const token = getAuthToken();

    const response = await fetch(`${AUTH_API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      const error = new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          `Request failed with status ${response.status}`
      );
      error.response = { status: response.status, data };
      throw error;
    }

    return { data, status: response.status, ok: response.ok };
  },
};

// ============================================================================
// MASTER DATA APIs
// ============================================================================
const MASTER_API_BASE_URL = `${MANUAL_API_BASE_URL}/api`;

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.assessments)) return data.data.assessments;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  if (Array.isArray(data?.rows)) return data.rows;
  if (Array.isArray(data?.assessments)) return data.assessments;
  if (Array.isArray(data?.categories)) return data.categories;
  if (Array.isArray(data?.subjects)) return data.subjects;
  if (Array.isArray(data?.topics)) return data.topics;
  return [];
};

export const getMasterData = async (params = {}) => {
  try {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, value);
      }
    });

    const queryString = query.toString();
    const url =
      `${MASTER_API_BASE_URL}/master/master-category` +
      (queryString ? `?${queryString}` : "");

    console.log("📚 Master API:", url);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch master data."
      );
    }

    return unwrapList(data);
  } catch (error) {
    console.error("❌ Get Master Data Error:", error);
    throw error;
  }
};

export const getCategories = async () => {
  const list = await getMasterData({ type: "category" });

  return list.map((item) => ({
    id: item.id || item._id || item.category_id,
    name: item.name || item.category_name || item.title || "",
  }));
};

export const getSubjects = async (categoryId) => {
  if (!categoryId) return [];

  const list = await getMasterData({
    type: "subject",
    category_id: categoryId,
  });

  return list.map((item) => ({
    id: item.id || item._id || item.subject_id,
    name: item.name || item.subject_name || item.title || "",
  }));
};

export const getTopics = async (subjectId) => {
  if (!subjectId) return [];

  const list = await getMasterData({
    type: "topic",
    subject_id: subjectId,
  });

  return list.map((item) => ({
    id: item.id || item._id || item.topic_id,
    name: item.name || item.topic_name || item.title || "",
  }));
};

// ============================================================================
// USERS
// ============================================================================
export const getUsers = async () => {
  try {
    const response = await authApi.get("/users");
    console.log("👥 Users API response:", response.data);

    return applyStudentPlacements(unwrapUsers(response.data));
  } catch (error) {
    console.error(
      "❌ Error fetching users:",
      error?.response?.data || error?.message || error
    );
    throw error;
  }
};

// ============================================================================
// CREATE MANUAL QUESTION (MCQ)
// ============================================================================
export const createManualQuestion = async (payload) => {
  try {
    const response = await fetch(
      `${MANUAL_API_BASE_URL}/api/quiz/questions/mcq`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          question_text: payload.question_text,
          category_id: payload.category_id,
          subject_id: payload.subject_id,
          topic_id: payload.topic_id,
          difficulty: payload.difficulty,
          source: "manual",
          allow_multiple_answers: false,
          explanation: payload.explanation,
          options: payload.options,
        }),
      }
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create manual question."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create Manual Question Error:", error);
    throw error;
  }
};

// ============================================================================
// CREATE CODING QUESTIONS
// ============================================================================
export const createCodingQuestions = async (questions) => {
  try {
    if (!Array.isArray(questions)) {
      throw new Error("Questions must be an array.");
    }
    if (questions.length === 0) {
      throw new Error("At least one coding question is required.");
    }

    const response = await fetch(
      `${MANUAL_API_BASE_URL}/api/coding/questions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ questions }),
      }
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create coding question."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create Coding Questions Error:", error);
    throw error;
  }
};

export const createCategory = async (payload) => {
  const response = await api.post(
    "/master/master-category",
    {
      type: "category",
      name: payload.name,
      description: payload.description,
    }
  );

  return response.data;
};

export const createSubject = async (payload) => {
  const response = await api.post(
    "/master/master-category",
    {
      type: "subject",
      name: payload.name,
      description: payload.description,
      category_id: payload.category_id,
    }
  );

  return response.data;
};

export const createTopic = async (payload) => {
  const response = await api.post(
    "/master/master-category",
    {
      type: "topic",
      name: payload.name,
      description: payload.description,
      subject_id: payload.subject_id,
      difficulty: payload.difficulty,
    }
  );

  return response.data;
};

// ============================================================================
// GET MANUAL QUESTIONS
// ============================================================================
export const getManualQuestions = async ({
  category_id,
  subject_id,
  topic_id,
  difficulty,
  source,
  question_type,
} = {}) => {
  try {
    const params = new URLSearchParams();

    if (category_id) params.append("category_id", category_id);
    if (subject_id) params.append("subject_id", subject_id);
    if (topic_id) params.append("topic_id", topic_id);
    if (difficulty) params.append("difficulty", difficulty);
    if (source) params.append("source", source);
    if (question_type) params.append("question_type", question_type);

    const queryString = params.toString();
    const url =
      `${MANUAL_API_BASE_URL}/api/quiz/questions` +
      (queryString ? `?${queryString}` : "");

    const response = await fetch(url);

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch manual questions."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Get Manual Questions Error:", error);
    throw error;
  }
};

// ============================================================================
// CREATE MANUAL QUESTIONS - BULK
// ============================================================================
export const createManualQuestionsBulk = async (questions) => {
  try {
    if (!Array.isArray(questions)) {
      throw new Error("Questions must be an array.");
    }
    if (questions.length === 0) {
      throw new Error("At least one question is required.");
    }

    const response = await fetch(
      `${MANUAL_API_BASE_URL}/api/quiz/bulkquestions/mcq`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ questions }),
      }
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create manual questions."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create Manual Questions Bulk Error:", error);
    throw error;
  }
};

// ============================================================================
// INTERVIEWS
// ============================================================================
export const createInterview = async (payload) => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${MANUAL_API_BASE_URL}/api/interviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create interview."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create Interview Error:", error);
    throw error;
  }
};

export const getInterviews = async () => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${MANUAL_API_BASE_URL}/api/interviews`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch interviews."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Get Interviews Error:", error);
    throw error;
  }
};

export const assignInterviewToUsers = async (interviewId, payload) => {
  try {
    if (!interviewId) throw new Error("Interview ID is required.");

    const token = getAuthToken();

    const response = await fetch(
      `${MANUAL_API_BASE_URL}/api/interviews/${encodeURIComponent(
        interviewId
      )}/assign`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      }
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to assign interview."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Assign Interview Error:", error);
    throw error;
  }
};

// ============================================================================
// ASSESSMENT API
// ============================================================================
export const createAssessment = async (payload) => {
  try {
    const token = getAuthToken();

    const response = await fetch(`${MANUAL_API_BASE_URL}/api/assessment`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create assessment."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create Assessment Error:", error);
    throw error;
  }
};

export const getAssessments = async () => {
  try {
    const token = getAuthToken();
    const response = await fetch(`${MANUAL_API_BASE_URL}/api/assessment`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {}),
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch assessments."
      );
    }

    return unwrapList(data)
      .filter((assessment) => assessment && typeof assessment === "object")
      .map((assessment) => ({
        ...assessment,
        id:
          assessment.id ||
          assessment.assessment_id ||
          assessment.assessmentId ||
          assessment._id ||
          "",
      }))
      .filter((assessment) => assessment.id);
  } catch (error) {
    console.error("❌ Get Assessments Error:", error);
    throw error;
  }
};

// ============================================================================
// PDF / APTITUDE QUIZ APIs
// ============================================================================
export const getPdfExamStatus = async () => {
  try {
    const response = await fetch(`${PDF_API_BASE_URL}/api/exam-status`);

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch exam status."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ PDF Exam Status Error:", error);
    throw error;
  }
};

export const getPdfExam = async () => {
  try {
    const response = await fetch(`${PDF_API_BASE_URL}/api/exam`);

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch PDF exam."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Get PDF Exam Error:", error);
    throw error;
  }
};

export const createPdfExam = async (examData) => {
  try {
    if (!examData || typeof examData !== "object") {
      throw new Error("Exam data is required.");
    }

    const response = await fetch(`${PDF_API_BASE_URL}/api/exam`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        topic: examData.topic,
        start_time: examData.start_time,
        end_time: examData.end_time,
        duration_minutes: Number(examData.duration_minutes),
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to create PDF exam."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Create PDF Exam Error:", error);
    throw error;
  }
};

export const getPdfQuestions = async (examId) => {
  try {
    if (!examId) {
      throw new Error("Exam ID is required.");
    }

    const response = await fetch(
      `${PDF_API_BASE_URL}/api/test?exam_id=${encodeURIComponent(examId)}`
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch PDF questions."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Get PDF Questions Error:", error);
    throw error;
  }
};

export const checkPdfAttempt = async (examId, instagram) => {
  try {
    if (!examId) {
      throw new Error("Exam ID is required.");
    }
    if (!instagram?.trim()) {
      throw new Error("Instagram username is required.");
    }

    const encodedInstagram = encodeURIComponent(instagram.trim());

    const response = await fetch(
      `${PDF_API_BASE_URL}/api/check-attempt/${encodeURIComponent(
        examId
      )}/${encodedInstagram}`
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to check attempt."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Check PDF Attempt Error:", error);
    throw error;
  }
};

export const submitPdfQuiz = async ({
  name,
  instagram,
  answers,
  time_taken,
  exam_id,
}) => {
  try {
    if (!name?.trim()) {
      throw new Error("Name is required.");
    }
    if (!instagram?.trim()) {
      throw new Error("Instagram username is required.");
    }
    if (!Array.isArray(answers)) {
      throw new Error("Answers must be an array.");
    }
    if (!exam_id) {
      throw new Error("Exam ID is required.");
    }

    const response = await fetch(`${PDF_API_BASE_URL}/api/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: name.trim(),
        instagram: instagram.trim(),
        answers,
        time_taken: Number(time_taken) || 0,
        exam_id: Number(exam_id),
      }),
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to submit PDF quiz."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Submit PDF Quiz Error:", error);
    throw error;
  }
};

export const getPdfLeaderboard = async (examId) => {
  try {
    if (!examId) {
      throw new Error("Exam ID is required.");
    }

    const response = await fetch(
      `${PDF_API_BASE_URL}/api/leaderboard?exam_id=${encodeURIComponent(
        examId
      )}`
    );

    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok) {
      throw new Error(
        data?.message ||
          data?.error ||
          data?.detail ||
          "Failed to fetch PDF leaderboard."
      );
    }

    return data;
  } catch (error) {
    console.error("❌ Get PDF Leaderboard Error:", error);
    throw error;
  }
};

// ============================================================================
// OPTIONAL ALIASES
// ============================================================================
export const getQuizExamStatus = getPdfExamStatus;
export const getQuizExam = getPdfExam;
export const createQuizExam = createPdfExam;
export const getQuizTest = getPdfQuestions;
export const checkQuizAttempt = checkPdfAttempt;
export const submitQuiz = submitPdfQuiz;
export const getQuizLeaderboard = getPdfLeaderboard;

// ============================================================================
// DEFAULT EXPORT
// ============================================================================
const api = {
  // Master
  getMasterData,
  getCategories,
  getSubjects,
  getTopics,

  // Users
  getUsers,

  // Manual Quiz
  createManualQuestion,
  getManualQuestions,
  createManualQuestionsBulk,

  // Coding
  createCodingQuestions,

  // Interviews
  createInterview,
  getInterviews,
  assignInterviewToUsers,

  // Assessment
  createAssessment,

  // PDF Quiz
  getPdfExamStatus,
  getPdfExam,
  createPdfExam,
  getPdfQuestions,
  checkPdfAttempt,
  submitPdfQuiz,
  getPdfLeaderboard,

  // Aliases
  getQuizExamStatus,
  getQuizExam,
  createQuizExam,
  getQuizTest,
  checkQuizAttempt,
  submitQuiz,
  getQuizLeaderboard,
};

export default api;