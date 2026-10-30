// src/services/api.
import axios from 'axios';
import resumeRoleApi from './resumeRoleApi';

// ============================================================================
// API BASE URLs
// ============================================================================

// Existing SkillEngine Node backend
export const NODE_API_URL =
  import.meta.env.VITE_BACKEND_URL ||
  'http://100.117.158.50:3005';

// Existing Interview / Resume API
const API_URL = import.meta.env.DEV
  ? '/api'
  : NODE_API_URL;

// SkillEngine AI backend - INTERVIEWS ONLY
export const AI_API_URL =
  import.meta.env.DEV
    ? '/ai-backend'
    : import.meta.env.VITE_AI_API_URL ||
      'http://100.117.158.50:8100';

const NGROK_BYPASS_HEADER =
  'ngrok-skip-browser-warning';

// ============================================================================
// HELPERS
// ============================================================================

const unwrapPayload = (payload) => {
  if (
    payload?.data &&
    typeof payload.data === 'object'
  ) {
    return payload.data;
  }

  return payload;
};

export const normalizeUser = (payload) => {
  const body = unwrapPayload(payload);

  const profile =
    body?.user &&
    body?.profile &&
    typeof body.profile === 'object'
      ? body.profile
      : null;

  const rawUser =
    body?.user ??
    body?.profile ??
    (
      body &&
      (
        body.id ??
        body.user_id ??
        body.userId ??
        body.email ??
        body.username ??
        body.fullName ??
        body.full_name
      )
        ? body
        : null
    );

  if (
    !rawUser ||
    typeof rawUser !== 'object' ||
    Array.isArray(rawUser)
  ) {
    return null;
  }

  return {
    ...(profile || {}),
    ...rawUser,

    id:
      rawUser.id ??
      rawUser.user_id ??
      rawUser.userId,

    role: rawUser.role,

    dateOfBirth:
      rawUser.dateOfBirth ??
      rawUser.date_of_birth ??
      profile?.date_of_birth,

    fullName:
      rawUser.fullName ??
      rawUser.full_name ??
      rawUser.name,

    phone:
      rawUser.phone ??
      rawUser.phone_number ??
      profile?.phone,

    currentRole:
      rawUser.currentRole ??
      rawUser.current_role,

    experienceYears:
      rawUser.experienceYears ??
      rawUser.experience_years,

    educationLevel:
      rawUser.educationLevel ??
      rawUser.education_level,

    careerGoal:
      rawUser.careerGoal ??
      rawUser.career_goal,

    learningGoals:
      rawUser.learningGoals ??
      rawUser.learning_goals,

    createdAt:
      rawUser.createdAt ??
      rawUser.created_at,
  };
};

export const getApiErrorMessage = (error) => {
  if (!error) {
    return 'Something went wrong. Please try again.';
  }

  if (typeof error === 'string') {
    return error;
  }

  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }

  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  if (
    typeof error.response?.data === 'string' &&
    error.response.data.trim()
  ) {
    return error.response.data;
  }

  if (error.data?.detail) {
    return error.data.detail;
  }

  if (error.data?.message) {
    return error.data.message;
  }

  if (error.message) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
};

// ============================================================================
// AUTH HELPERS
// ============================================================================

export const normalizeAuthResponse = (payload) => {
  const body = unwrapPayload(payload);

  return {
    user: normalizeUser(payload),

    token:
      body?.Logintoken ??
      payload?.Logintoken ??
      body?.token ??
      body?.access_token ??
      body?.accessToken ??
      payload?.token ??
      payload?.access_token ??
      null,
  };
};

const getAuthToken = () =>
  localStorage.getItem('authToken') ||
  localStorage.getItem('access_token') ||
  localStorage.getItem('token');

// ============================================================================
// TRANSCRIPT HELPER
// ============================================================================

export const extractTranscriptText = (payload) => {
  const cleanText = (value) => {
    const text = String(value || '').trim();

    return /<(!doctype|html|body)\b/i.test(text)
      ? ''
      : text;
  };

  if (typeof payload === 'string') {
    return cleanText(payload);
  }

  if (!payload || typeof payload !== 'object') {
    return '';
  }

  if (typeof payload.data === 'string') {
    return cleanText(payload.data);
  }

  const body =
    payload.data &&
    typeof payload.data === 'object'
      ? payload.data
      : payload;

  const candidates = [
    body?.transcript,
    body?.transcription,
    body?.transcribed_text,
    body?.transcribedText,
    body?.text,
    body?.result?.transcript,
    body?.result?.transcription,
    body?.result?.text,
  ];

  const transcript = candidates.find(
    (value) =>
      typeof value === 'string' &&
      cleanText(value)
  );

  return cleanText(transcript);
};

// ============================================================================
// EXISTING API INSTANCE
// ============================================================================

const api = axios.create({
  baseURL: API_URL,

  timeout: 30000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    [NGROK_BYPASS_HEADER]: 'true',
  },

  withCredentials: false,
});

// ============================================================================
// SKILLENGINE AI API - INTERVIEWS ONLY
// ============================================================================

const aiApi = axios.create({
  baseURL: AI_API_URL,


  headers: {
    Accept: 'application/json',
    [NGROK_BYPASS_HEADER]: 'true',
  },

  withCredentials: false,
});

// ============================================================================
// AI REQUEST INTERCEPTOR
// ============================================================================

aiApi.interceptors.request.use(
  (config) => {
    console.log(
      `🤖 AI INTERVIEW 📤 ${config.method?.toUpperCase()} ${
        config.baseURL
      }${config.url}`
    );

    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    return Promise.reject(error);
  }
);

// ============================================================================
// AI RESPONSE INTERCEPTOR
// ============================================================================

aiApi.interceptors.response.use(
  (response) => {
    console.log(
      `🤖 AI INTERVIEW 📥 ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    if (error.response) {
      console.error(
        '🤖 AI INTERVIEW ERROR:',
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        '🤖 AI INTERVIEW NO RESPONSE:',
        error.message
      );
    } else {
      console.error(
        '🤖 AI INTERVIEW ERROR:',
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// EXISTING API REQUEST INTERCEPTOR
// ============================================================================

api.interceptors.request.use(
  (config) => {
    console.log(
      `📤 ${config.method?.toUpperCase()} ${config.url}`
    );

    console.log(
      '📦 Data:',
      config.data
    );

    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    console.error(
      '📤 Request Error:',
      error
    );

    return Promise.reject(error);
  }
);

// ============================================================================
// EXISTING API RESPONSE INTERCEPTOR
// ============================================================================

api.interceptors.response.use(
  (response) => {
    console.log(
      `📥 Response: ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    if (error.response) {
      console.error(
        '📥 Response Error:',
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error(
        '📥 No Response:',
        error.request
      );
    } else {
      console.error(
        '📥 Error:',
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// AI TRANSCRIPTION
// ============================================================================

export const transcribeText = async (text) => {
  const normalizedText =
    String(text || '').trim();

  if (!normalizedText) {
    throw new Error(
      'Transcript cannot be empty.'
    );
  }

  const response =
    await aiApi.post(
      '/transcribe',
      {
        text: normalizedText,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type':
            'application/json',
        },
      }
    );

  const transcript =
    extractTranscriptText(
      response?.data
    );

  if (
    response?.data?.status === 'error' ||
    !transcript
  ) {
    throw new Error(
      response?.data?.message ||
      'The transcription response was empty.'
    );
  }

  return transcript;
};

// ============================================================================
// AUTH API
// ============================================================================

const authApi = axios.create({
  baseURL:
    `${NODE_API_URL}/api/users`,


  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    [NGROK_BYPASS_HEADER]: 'true',
  },

  withCredentials: false,
});

// ============================================================================
// AUTH REQUEST INTERCEPTOR
// ============================================================================

const isPasswordRecoveryRequest = (config) =>
  /\/(?:forgotPassword|resetPassword)(?:[/?]|$)/i.test(config?.url || '');

authApi.interceptors.request.use(
  (config) => {
    if (!isPasswordRecoveryRequest(config)) {
      console.log(
        '===================================='
      );

      console.log(
        `🔐 AUTH REQUEST: ${config.method?.toUpperCase()} ${
          config.baseURL
        }${config.url}`
      );

      // Password ni console lo print cheyyakunda
      // email matrame print chestunnam.
      console.log(
        '🔐 AUTH DATA:',
        {
          email: config.data?.email,
          password: config.data?.password
            ? '******'
            : undefined,
        }
      );
    }

    const token =
      localStorage.getItem('authToken') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },

  (error) => {
    if (!isPasswordRecoveryRequest(error.config)) {
      console.error(
        '🔐 AUTH REQUEST ERROR:',
        error
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// AUTH RESPONSE INTERCEPTOR
// ============================================================================

authApi.interceptors.response.use(
  (response) => {
    if (isPasswordRecoveryRequest(response.config)) {
      return response;
    }

    console.log(
      `🔐 AUTH RESPONSE: ${response.status} ${
        response.config.baseURL
      }${response.config.url}`
    );

    console.log(
      '🔐 AUTH RESPONSE DATA:',
      response.data
    );

    console.log(
      '===================================='
    );

    return response;
  },

  (error) => {
    if (isPasswordRecoveryRequest(error.config)) {
      return Promise.reject(error);
    }

    console.log(
      '===================================='
    );

    if (error.response) {
      console.error(
        '🔐 AUTH RESPONSE ERROR:',
        error.response.status
      );

      console.error(
        '🔐 AUTH ERROR DATA:',
        error.response.data
      );

      console.error(
        '🔐 AUTH ERROR URL:',
        error.config?.baseURL +
          error.config?.url
      );
    } else if (error.request) {
      console.error(
        '🔐 AUTH NO RESPONSE:',
        error.message
      );

      console.error(
        '🔐 AUTH REQUEST:',
        error.request
      );
    } else {
      console.error(
        '🔐 AUTH ERROR:',
        error.message
      );
    }

    console.log(
      '===================================='
    );

    return Promise.reject(error);
  }
);

// ============================================================================
// JWT DECODER
// ============================================================================

const decodeJwt = (token) => {
  try {
    const part = token
      .split('.')[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    return JSON.parse(
      decodeURIComponent(
        escape(atob(part))
      )
    );
  } catch {
    return null;
  }
};

// ============================================================================
// LOGIN
// ============================================================================

export const loginUser = async (
  email,
  password
) => {
  try {
    console.log(
      '===================================='
    );

    console.log(
      '🔐 LOGIN START'
    );

    console.log(
      '📧 Email:',
      email
    );

    console.log(
      '🌐 Backend:',
      NODE_API_URL
    );

    console.log(
      '🔗 Login URL:',
      `${NODE_API_URL}/api/users/userLogin`
    );

    console.log(
      '===================================='
    );

    const response =
      await authApi.post(
        '/userLogin',
        {
          email: String(
            email || ''
          ).trim(),

          password,
        }
      );

    console.log(
      '===================================='
    );

    console.log(
      '✅ LOGIN SUCCESS'
    );

    console.log(
      '📦 Backend Response:',
      response.data
    );

    console.log(
      '===================================='
    );

    const normalized =
      normalizeAuthResponse(
        response.data
      );

    console.log(
      '✅ NORMALIZED LOGIN:',
      normalized
    );

    return normalized;
  } catch (error) {
    console.log(
      '===================================='
    );

    console.error(
      '❌ LOGIN FAILED'
    );

    console.error(
      '❌ Status:',
      error.response?.status
    );

    console.error(
      '❌ Backend Response:',
      error.response?.data
    );

    console.error(
      '❌ URL:',
      error.config?.baseURL +
        error.config?.url
    );

    console.error(
      '❌ Message:',
      error.message
    );

    console.log(
      '===================================='
    );

    throw error;
  }
};

export const requestPasswordReset = async (email) => {
  const response = await authApi.post('http://100.117.158.50:8100/api/users/forgotPassword', {
    email: String(email || '').trim(),
  });

  return response.data;
};

export const resetPassword = async (email, otp, newPassword) => {
  const response = await authApi.post('/resetPassword', {
    email: String(email || '').trim(),
    otp: String(otp || '').trim(),
    newPassword,
  });

  return response.data;
};

// ============================================================================
// REGISTER
// ============================================================================

export const registerUser = async (
  userData
) => {
  const payload = {
    name: userData.fullName,
    email: userData.email,
    password: userData.password,
    role: 'student',
    phone: userData.phone,
    date_of_birth:
      userData.dateOfBirth,
    gender: userData.gender,
    location: userData.location,
    bio:
      userData.learningGoals ||
      undefined,
  };

  const response =
    await authApi.post(
      '/createAccount',
      payload
    );

  return normalizeAuthResponse(
    response.data
  );
};

// ============================================================================
// VERIFY REGISTRATION OTP
// ============================================================================

export const verifyRegistrationOtp =
  async (
    email,
    otp
  ) => {
    const response =
      await authApi.put(
        '/verifyuserRegister',
        {
          email,
          otp: String(
            otp
          ).trim(),
        }
      );

    return response.data;
  };

// ============================================================================
// RESEND OTP
// ============================================================================

export const resendRegistrationOtp =
  async (
    email
  ) => {
    const response =
      await authApi.post(
        '/resendUserOTP',
        {
          email,
        }
      );

    return response.data;
  };

// ============================================================================
// LOGOUT
// ============================================================================

export const logoutUser = async () => {
  localStorage.removeItem(
    'authUser'
  );

  localStorage.removeItem(
    'authToken'
  );

  localStorage.removeItem(
    'access_token'
  );

  localStorage.removeItem(
    'token'
  );
};

// ============================================================================
// CURRENT USER
// ============================================================================

export const getCurrentUser =
  async () => {
    const token =
      localStorage.getItem(
        'authToken'
      ) ||
      localStorage.getItem(
        'access_token'
      );

    const claims =
      decodeJwt(
        token || ''
      );

    if (
      !claims ||
      (
        claims.exp &&
        claims.exp * 1000 <
          Date.now()
      )
    ) {
      throw new Error(
        'Session expired. Please log in again.'
      );
    }

    let cached = null;

    try {
      cached = JSON.parse(
        localStorage.getItem(
          'authUser'
        )
      );
    } catch {
      cached = null;
    }

    return normalizeUser({
      user: {
        ...claims,
        ...(cached || {}),
        role:
          claims.role ??
          cached?.role,
      },
    });
  };

// ============================================================================
// USER PROFILE
// ============================================================================

export const getUserProfile =
  async () =>
    getCurrentUser();

// PUT /api/users/users/:user_id
export const updateUserProfile =
  async (
    userId,
    profileData
  ) => {
    if (!userId) {
      throw new Error(
        'User ID is required.'
      );
    }

    const token =
      getAuthToken();

    const response =
      await axios.put(
        `${NODE_API_URL}/api/users/users/${encodeURIComponent(
          userId
        )}`,
        profileData,
        {
          headers: {
            Accept:
              'application/json',

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),
          },
        }
      );

    return unwrapPayload(
      response.data
    );
  };

// ============================================================================
// MASTER DATA API
// ============================================================================

const masterApi = axios.create({
  baseURL:
    `${NODE_API_URL}/api/master`,

  timeout: 30000,

  headers: {
    'Content-Type':
      'application/json',

    Accept:
      'application/json',

    [NGROK_BYPASS_HEADER]:
      'true',
  },

  withCredentials: false,
});

masterApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        'authToken'
      ) ||
      localStorage.getItem(
        'access_token'
      ) ||
      localStorage.getItem(
        'token'
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    console.log(
      `📤 MASTER ${config.method?.toUpperCase()} ${
        config.baseURL
      }${config.url}`,
      config.params || ''
    );

    return config;
  },

  (error) =>
    Promise.reject(error)
);

masterApi.interceptors.response.use(
  (response) => {
    console.log(
      `📥 MASTER ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    if (error.response) {
      console.error(
        '📥 MASTER Error:',
        error.response.status,
        error.response.data
      );
    } else {
      console.error(
        '📥 MASTER Error:',
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// MASTER DATA HELPERS
// ============================================================================

const toArray = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.rows)) {
    return payload.rows;
  }

  if (
    Array.isArray(
      payload?.data?.rows
    )
  ) {
    return payload.data.rows;
  }

  if (
    Array.isArray(
      payload?.categories
    )
  ) {
    return payload.categories;
  }

  if (
    Array.isArray(
      payload?.subjects
    )
  ) {
    return payload.subjects;
  }

  if (
    Array.isArray(
      payload?.topics
    )
  ) {
    return payload.topics;
  }

  return [];
};

const cache = {
  categories: null,
  subjects: new Map(),
  topics: new Map(),
};

export const getCategories =
  async (
    force = false
  ) => {
    if (
      !force &&
      cache.categories
    ) {
      return cache.categories;
    }

    try {
      const response =
        await masterApi.get(
          '/master-category',
          {
            params: {
              type: 'category',
            },
          }
        );

      const list =
        toArray(
          response.data
        );

      cache.categories =
        list;

      return list;
    } catch (error) {
      console.error(
        'Error fetching categories:',
        error
      );

      throw error;
    }
  };

export const getSubjects =
  async (
    categoryId,
    force = false
  ) => {
    if (!categoryId) {
      return [];
    }

    if (
      !force &&
      cache.subjects.has(
        categoryId
      )
    ) {
      return cache.subjects.get(
        categoryId
      );
    }

    try {
      const response =
        await masterApi.get(
          '/master-category',
          {
            params: {
              type: 'subject',
              category_id:
                categoryId,
            },
          }
        );

      const list =
        toArray(
          response.data
        );

      cache.subjects.set(
        categoryId,
        list
      );

      return list;
    } catch (error) {
      console.error(
        'Error fetching subjects:',
        error
      );

      throw error;
    }
  };

export const getTopics =
  async (
    subjectId,
    force = false
  ) => {
    if (!subjectId) {
      return [];
    }

    if (
      !force &&
      cache.topics.has(
        subjectId
      )
    ) {
      return cache.topics.get(
        subjectId
      );
    }

    try {
      const response =
        await masterApi.get(
          '/master-category',
          {
            params: {
              type: 'topic',
              subject_id:
                subjectId,
            },
          }
        );

      const list =
        toArray(
          response.data
        );

      cache.topics.set(
        subjectId,
        list
      );

      return list;
    } catch (error) {
      console.error(
        'Error fetching topics:',
        error
      );

      throw error;
    }
  };

export const clearMasterCache =
  () => {
    cache.categories =
      null;

    cache.subjects.clear();
    cache.topics.clear();
  };

// ============================================================================
// CODING QUESTIONS
// ============================================================================

export const createCodingQuestions =
  async (
    questions
  ) => {
    try {
      const response =
        await masterApi.post(
          '/coding-questions',
          questions
        );

      return response.data;
    } catch (error) {
      console.error(
        'Error creating coding questions:',
        error
      );

      throw error;
    }
  };

// ============================================================================
// ASSESSMENT
// ============================================================================

export const createAssessment =
  async (
    payload
  ) => {
    try {
      const response =
        await masterApi.post(
          '/assessment',
          payload
        );

      return response.data;
    } catch (error) {
      console.error(
        'Error creating assessment:',
        error
      );

      throw error;
    }
  };

// ============================================================================
// INTERVIEW HELPERS
// ============================================================================

const toInterviewResultPayload =
  (
    data = {}
  ) => ({
    overallScore:
      data.overallScore ??
      data.overall_score ??
      0,

    skillRatings:
      data.skillRatings ??
      data.skill_ratings ??
      {},

    questionsAnswered:
      data.questionsAnswered ??
      data.questions_answered ??
      data.answered_questions ??
      0,

    interviewHistory:
      data.interviewHistory ??
      data.interview_history ??
      data.questions ??
      [],

    skills:
      data.skills ??
      data.all_skills ??
      [],
  });

// ============================================================================
// ANALYZE RESUME - AI BACKEND
// ============================================================================

export const analyzeResumeAPI = async (
  file,
  userEmail,
  jobRole = 'Software Engineer'
) => {
  if (!file) {
    throw new Error('Please select a resume file to analyze.');
  }

  const formData = new FormData();

  formData.append('file', file);

  if (userEmail) {
    formData.append('email', userEmail);
  }

  formData.append('job_role', jobRole);

  try {
    console.log('📄 Starting resume analysis...');
    console.log('🤖 AI Backend:', 'http://127.0.0.1:8000');
    console.log('💼 Job Role:', jobRole);

    const response = await aiApi.post(
      'http://127.0.0.1:8000/resume/analyze',
      formData,
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    console.log('✅ Resume analysis response:', response.data);

    return response.data;
  } catch (error) {
    console.error(
      '❌ Resume analysis failed:',
      error.response?.data || error.message
    );

    throw error;
  }
};

// ============================================================================
// INTERVIEW API
// ============================================================================

export const interviewAPI = {

  // Resume Analysis
  analyzeResume: (
    file,
    email
  ) => {
    const formData =
      new FormData();

    formData.append(
      'file',
      file
    );

    if (email) {
      formData.append(
        'email',
        email
      );
    }

    return resumeRoleApi
      .post(
        '/resume/analyze',
        formData
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Skill Extraction
  extractSkills: (
    data
  ) => {
    return aiApi
      .post(
        '/process-self-intro',
        {
          self_intro:
            data?.text ??
            data?.self_intro ??
            data?.selfIntro ??
            '',

          resume_skills:
            data?.resume_skills ??
            data?.resumeSkills ??
            [],
        }
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Transcription
  transcribeAudio: (
    text
  ) =>
    transcribeText(text),

  // Self Introduction
  processSelfIntro: (
    data
  ) => {
    const payload = {
      self_intro:
        data?.self_intro ??
        data?.selfIntro ??
        '',

      resume_skills:
        data?.resume_skills ??
        data?.resumeSkills ??
        [],
    };

    return aiApi
      .post(
        '/process-self-intro',
        payload
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Question Generation
  generateQuestions: (
    data
  ) => {
    const currentSkill =
      data?.current_skill ??
      data?.currentSkill ??
      data?.skill ??
      'General';

    const questionType =
      data?.question_type ??
      data?.questionType ??
      'basic';

    const concept =
      data?.concept ??
      currentSkill;

    return aiApi
      .post(
        '/generate-question',
        {
          current_skill:
            currentSkill,

          question_type:
            questionType,

          concept,
        }
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Answer Evaluation
  evaluateAnswer: (
    data
  ) => {
    return aiApi
      .post(
        '/evaluate-answer',
        data
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Report
  generateReport: (
    data
  ) => {
    return aiApi
      .post(
        '/interviews',
        toInterviewResultPayload(
          data
        )
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Save Session
  saveSession: (
    data
  ) => {
    return aiApi
      .post(
        '/interviews',
        toInterviewResultPayload(
          data
        )
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Existing Interview History
  getHistory: () => {
    return api
      .get(
        '/interviews'
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Skills
  getSkills: () => {
    return aiApi
      .get(
        '/get-skills'
      )
      .then(
        (response) =>
          response.data
      );
  },

  // Debug Routes
  debugRoutes: () => {
    return aiApi
      .get(
        '/interview/debug/routes'
      )
      .then(
        (response) =>
          response.data
      );
  },
};

// ============================================================================
// USER INTERVIEW STATS
// ============================================================================

export const getUserInterviewStats =
  async (
    userId
  ) => {
    try {
      const response =
        await api.get(
          '/me'
        );

      console.log(
        'Stats API response:',
        response.data
      );

      const data =
        response.data || {};

      return {
        totalInterviews:
          data.totalInterviews ||
          0,

        avgScore:
          data.avgScore ||
          0,

        sessions:
          data.sessions ||
          [],

        completed:
          data.completed ||
          0,

        lastInterview:
          data.lastInterview ||
          null,
      };
    } catch (error) {
      console.error(
        'Error fetching stats:',
        error
      );

      return {
        totalInterviews: 0,
        avgScore: 0,
        sessions: [],
        completed: 0,
        lastInterview: null,
      };
    }
  };

// ============================================================================
// LEGACY AUTH API
// ============================================================================

export const authAPI = {

  login: (
    credentials
  ) => {
    return api
      .post(
        '/login',
        credentials
      )
      .then(
        (response) =>
          response.data
      );
  },

  register: (
    userData
  ) => {
    return api
      .post(
        '/register',
        userData
      )
      .then(
        (response) =>
          response.data
      );
  },

  logout: () => {
    return api
      .post(
        '/logout'
      )
      .then(
        (response) =>
          response.data
      );
  },

  getProfile: () => {
    return api
      .get(
        '/me'
      )
      .then(
        (response) =>
          response.data
      );
  },
};

// ============================================================================
// LEGACY INTERVIEW EXPORTS
// ============================================================================

export const generateQuestionsAPI =
  async (
    resumeData,
    detectedSkills
  ) => {
    const currentSkill =
      detectedSkills?.[0] ||
      resumeData?.skills?.[0] ||
      'General';

    const response =
      await aiApi.post(
        '/generate-question',
        {
          current_skill:
            currentSkill,

          question_type:
            'basic',

          concept:
            currentSkill,
        }
      );

    return response.data;
  };

export const submitAnswerAPI =
  async (
    question,
    answer
  ) => {
    const questionText =
      typeof question === 'string'
        ? question
        : question?.question ||
          question?.text ||
          question?.content ||
          '';

    const currentSkill =
      typeof question === 'object'
        ? question?.category ||
          question?.topic ||
          'General'
        : 'General';

    const response =
      await aiApi.post(
        '/evaluate-answer',
        {
          current_skill:
            currentSkill,

          question:
            questionText,

          candidate_answer:
            answer,
        }
      );

    return response.data;
  };

export const completeInterviewAPI =
  async (
    interviewData
  ) => {
    const response =
      await aiApi.post(
        '/interviews',
        toInterviewResultPayload(
          interviewData
        )
      );

    return response.data;
  };

// ============================================================================
// ADMIN INTERVIEWS API
// ============================================================================

const interviewsApi =
  axios.create({
    baseURL:
      `${NODE_API_URL}/api`,

    timeout: 30000,

    headers: {
      'Content-Type':
        'application/json',

      Accept:
        'application/json',

      [NGROK_BYPASS_HEADER]:
        'true',
    },

    withCredentials: false,
  });

interviewsApi.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem(
        'authToken'
      ) ||
      localStorage.getItem(
        'access_token'
      ) ||
      localStorage.getItem(
        'token'
      );

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    console.log(
      `📤 INTERVIEWS ${config.method?.toUpperCase()} ${
        config.baseURL
      }${config.url}`,
      config.data || ''
    );

    return config;
  },

  (error) =>
    Promise.reject(error)
);

interviewsApi.interceptors.response.use(
  (response) => {
    console.log(
      `📥 INTERVIEWS ${response.status} ${response.config.url}`
    );

    return response;
  },

  (error) => {
    if (error.response) {
      console.error(
        '📥 INTERVIEWS Error:',
        error.response.status,
        error.response.data
      );
    } else {
      console.error(
        '📥 INTERVIEWS Error:',
        error.message
      );
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// CREATE INTERVIEW
// ============================================================================

export const createInterview =
  async (
    payload
  ) => {
    try {
      const response =
        await interviewsApi.post(
          '/interviews',
          payload
        );

      return response.data;
    } catch (error) {
      console.error(
        '❌ Create Interview Error:',
        error
      );

      throw error;
    }
  };

// ============================================================================
// GET INTERVIEWS
// ============================================================================

export const getInterviews =
  async () => {
    try {
      const response =
        await interviewsApi.get(
          '/interviews'
        );

      return response.data;
    } catch (error) {
      console.error(
        '❌ Get Interviews Error:',
        error
      );

      throw error;
    }
  };

// ============================================================================
// ASSIGN INTERVIEW
// ============================================================================

export const assignInterviewToUsers =
  async (
    interviewId,
    payload
  ) => {
    if (!interviewId) {
      throw new Error(
        'Interview ID is required.'
      );
    }

    try {
      const response =
        await interviewsApi.post(
          `/interviews/${encodeURIComponent(
            interviewId
          )}/assign`,
          payload
        );

      return response.data;
    } catch (error) {
      console.error(
        '❌ Assign Interview Error:',
        error
      );

      throw error;
    }
  };

// ============================================================================
// GET USERS
// ============================================================================

export const getUsers =
  async () => {
    try {
      const response =
        await authApi.get(
          '/users'
        );

      console.log(
        '👥 Users API response:',
        response.data
      );

      return (
        response?.data?.users ||
        response?.data?.data ||
        response?.data ||
        []
      );
    } catch (error) {
      console.error(
        '❌ Error fetching users:',
        error.response?.data ||
        error.message
      );

      throw error;
    }
  };

// ============================================================================
// AI INTERVIEW SESSION APIs
// ============================================================================

// POST /interview/configure
export const configureAIInterview =
  async (
    payload
  ) => {
    const response =
      await aiApi.post(
        '/interview/configure',
        payload
      );

    return response.data;
  };

// POST /interview/start
export const startAIInterview =
  async (
    payload
  ) => {
    const response =
      await aiApi.post(
        '/interview/start',
        payload
      );

    return response.data;
  };

// POST /interview/question
export const getAIInterviewQuestion =
  async (
    payload
  ) => {
    const response =
      await aiApi.post(
        '/interview/question',
        payload
      );

    return response.data;
  };

// POST /interview/evaluate
export const evaluateAIInterviewAnswer =
  async (
    payload
  ) => {
    const response =
      await aiApi.post(
        '/interview/evaluate',
        payload
      );

    return response.data;
  };

// GET /interview/status/:sessionId
export const getAIInterviewStatus =
  async (
    sessionId
  ) => {
    if (!sessionId) {
      throw new Error(
        'Session ID is required.'
      );
    }

    const response =
      await aiApi.get(
        `/interview/status/${encodeURIComponent(
          sessionId
        )}`
      );

    return response.data;
  };

// POST /interview/end/:sessionId
export const endAIInterview =
  async (
    sessionId
  ) => {
    if (!sessionId) {
      throw new Error(
        'Session ID is required.'
      );
    }

    const response =
      await aiApi.post(
        `/interview/end/${encodeURIComponent(
          sessionId
        )}`
      );

    return response.data;
  };

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default api;