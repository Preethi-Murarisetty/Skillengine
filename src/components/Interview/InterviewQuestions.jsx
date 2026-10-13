// src/components/Interview/InterviewQuestions.jsx

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useInterview } from '../../hooks/useInterview';
import ProgressBar from '../common/ProgressBar';
import { transcribeText } from '../../services/api';
import {
  startAIInterview,
  getAIInterviewQuestion,
  evaluateAIInterviewAnswer,
  endAIInterview,
} from '../../services/api';
import { createSpeechRecognition } from '../../utils/speechRecognition';

const MAX_RECORDING_SECONDS = 180;
const DEFAULT_TOTAL_SECONDS = 1800;
const DEFAULT_QUESTION_SECONDS = 120;
const DEFAULT_TOTAL_QUESTIONS = 15;

const THINKING_LINES = {
  high: [
    "That's a strong answer — let me follow up on that...",
    "Good, I want to dig a bit deeper on that...",
    "Nice — building on what you just said...",
  ],
  low: [
    "Okay, let's shift gears for a moment...",
    "Got it — let's try a different angle...",
    "Alright, moving on to something else...",
  ],
  neutral: [
    "Interesting, okay — give me a moment...",
    "Noted. Let me think about what to ask next...",
    "Okay, thinking about a good follow-up here...",
  ],
};

const pickThinkingLine = (lastScore) => {
  let pool = THINKING_LINES.neutral;

  if (typeof lastScore === 'number') {
    if (lastScore >= 8) {
      pool = THINKING_LINES.high;
    } else if (lastScore <= 3) {
      pool = THINKING_LINES.low;
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
};

const getApiErrorMessage = (error, fallbackMessage) => {
  const responseData = error?.response?.data;
  const detail = responseData?.detail;

  const detailMessage = Array.isArray(detail)
    ? detail
        .map(
          (item) =>
            item?.msg ||
            item?.message ||
            String(item)
        )
        .join(', ')
    : detail;

  return (
    detailMessage ||
    responseData?.message ||
    responseData?.error ||
    error?.message ||
    fallbackMessage
  );
};

const normalizeEvaluation = (payload) => {
  const raw = payload?.data ?? payload ?? {};

  const scoreValue =
    raw?.score ??
    raw?.evaluation?.score ??
    raw?.result?.score ??
    0;

  const score = Number.isFinite(Number(scoreValue))
    ? Number(scoreValue)
    : 0;

  return {
    score,

    maxScore:
      raw?.max_score ??
      raw?.maxScore ??
      raw?.evaluation?.max_score ??
      10,

    feedback:
      raw?.feedback ||
      raw?.evaluation?.feedback ||
      raw?.result?.feedback ||
      raw?.analysis ||
      '',

    missingConcepts:
      raw?.missing_concepts ||
      raw?.missingConcepts ||
      raw?.evaluation?.missing_concepts ||
      [],

    extractedConcepts:
      raw?.extracted_concepts ||
      raw?.extractedConcepts ||
      raw?.evaluation?.extracted_concepts ||
      [],

    nextQuestionType:
      raw?.next_question_type ||
      raw?.nextQuestionType ||
      'basic',
  };
};

const buildFallbackEvaluation = (
  message = 'Could not evaluate this answer.'
) => ({
  score: 0,
  maxScore: 10,
  feedback: message,
  missingConcepts: [],
  extractedConcepts: [],
  nextQuestionType: 'basic',
});

const InterviewQuestions = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const {
    completeInterview,
    loading: hookLoading,
  } = useInterview();

  // ==========================================================================
  // AI INTERVIEW SESSION
  // ==========================================================================

  const [aiSessionId, setAiSessionId] =
    useState('');

  const [topic, setTopic] = useState(
    () =>
      location.state?.topic ||
      sessionStorage.getItem(
        'aiInterviewTopic'
      ) ||
      'Technical Interview'
  );

  const [level, setLevel] = useState(
    () =>
      location.state?.level ||
      sessionStorage.getItem(
        'aiInterviewLevel'
      ) ||
      'Easy'
  );

  const [remainingTime, setRemainingTime] =
    useState(DEFAULT_TOTAL_SECONDS);

  const [questionTime, setQuestionTime] =
    useState(DEFAULT_QUESTION_SECONDS);

  // ==========================================================================
  // INTERVIEW STATE
  // ==========================================================================

  const [askedQuestions, setAskedQuestions] =
    useState([]);

  const [answers, setAnswers] =
    useState([]);

  const [evaluations, setEvaluations] =
    useState([]);

  const [currentIndex, setCurrentIndex] =
    useState(0);

  const [totalQuestions, setTotalQuestions] =
    useState(() => {
      const routeCount = Number(
        location.state?.numberOfQuestions ??
        location.state?.totalQuestions
      );
      if (Number.isInteger(routeCount) && routeCount > 0) {
        return routeCount;
      }

      try {
        const config = JSON.parse(
          localStorage.getItem('assessmentInterviewConfig') || '{}'
        );
        const selectedCount = Number(config.numberOfQuestions);
        if (Number.isInteger(selectedCount) && selectedCount > 0) {
          return selectedCount;
        }
      } catch {
        // Use the standard interview length when no valid choice is saved.
      }

      return DEFAULT_TOTAL_QUESTIONS;
    });

  const [resumeData, setResumeData] =
    useState(null);

  const [selfIntro, setSelfIntro] =
    useState('');

  const [techTerms, setTechTerms] =
    useState([]);

  // ==========================================================================
  // RECORDING / TRANSCRIPTION
  // ==========================================================================

  const [isRecording, setIsRecording] =
    useState(false);

  const [transcript, setTranscript] =
    useState('');

  const [isTranscribing, setIsTranscribing] =
    useState(false);

  const [transcribeError, setTranscribeError] =
    useState(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const [recordDuration, setRecordDuration] =
    useState(0);

  const [isManualMode, setIsManualMode] =
    useState(false);

  // ==========================================================================
  // THINKING / LOADING
  // ==========================================================================

  const [isThinking, setIsThinking] =
    useState(false);

  const [thinkingLine, setThinkingLine] =
    useState('');

  const [nextQuestionError, setNextQuestionError] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState(null);

  const [isDone, setIsDone] =
    useState(false);

  // ==========================================================================
  // REFS
  // ==========================================================================

  const timerRef = useRef(null);

  const recognitionRef = useRef(null);

  const speechTextRef = useRef('');

  const recognitionFinishRef =
    useRef(false);

  const interviewTimerRef =
    useRef(null);

  const questionTimerRef =
    useRef(null);

  const endingInterviewRef =
    useRef(false);

  // IMPORTANT:
  // Prevent duplicate initialization in React StrictMode.
  const initializedRef = useRef(false);

  // ==========================================================================
  // SESSION STORAGE
  // ==========================================================================

  useEffect(() => {
    if (aiSessionId) {
      sessionStorage.setItem(
        'aiInterviewSessionId',
        aiSessionId
      );
    }
  }, [aiSessionId]);

  useEffect(() => {
    if (topic) {
      sessionStorage.setItem(
        'aiInterviewTopic',
        topic
      );
    }
  }, [topic]);

  useEffect(() => {
    if (level) {
      sessionStorage.setItem(
        'aiInterviewLevel',
        level
      );
    }
  }, [level]);

  // ==========================================================================
  // CLEAR OLD AI SESSION DATA
  // ==========================================================================

  const clearAIInterviewStorage = () => {
    sessionStorage.removeItem(
      'aiInterviewSessionId'
    );

    sessionStorage.removeItem(
      'askedQuestions'
    );

    sessionStorage.removeItem(
      'interviewAnswers'
    );

    sessionStorage.removeItem(
      'interviewEvaluations'
    );

    sessionStorage.removeItem(
      'interviewQuestions'
    );

    sessionStorage.removeItem(
      'aiInterviewStarted'
    );
  };

  // ==========================================================================
  // INVALID QUESTION ID CHECK
  // ==========================================================================

  const isInvalidQuestionError = (error) => {
    const message =
      getApiErrorMessage(
        error,
        ''
      ).toLowerCase();

    return (
      message.includes(
        'invalid or expired question_id'
      ) ||
      message.includes(
        'invalid question_id'
      ) ||
      message.includes(
        'expired question_id'
      )
    );
  };

  // ==========================================================================
  // DERIVED STATE
  // ==========================================================================

  const currentQuestion =
    askedQuestions[currentIndex] ||
    null;

  const attemptedCount =
    answers.length;

  const progress =
    totalQuestions > 0
      ? (attemptedCount /
          totalQuestions) *
        100
      : 0;

  // ==========================================================================
  // QUESTION HELPERS
  // ==========================================================================

  const getQuestionText = (
    question
  ) => {
    if (!question) {
      return 'No question available';
    }

    if (typeof question === 'string') {
      return question;
    }

    if (
      typeof question === 'object'
    ) {
      return (
        question.question ||
        question.text ||
        question.content ||
        'No question text'
      );
    }

    return String(question);
  };

  const getQuestionTopic = (
    question
  ) => {
    if (!question) {
      return topic || 'General';
    }

    if (
      typeof question === 'object'
    ) {
      return (
        question.category ||
        question.topic ||
        question.type ||
        topic ||
        'General'
      );
    }

    return topic || 'General';
  };

  // ==========================================================================
  // VERY IMPORTANT:
  // USE EXACT QUESTION ID FROM FASTAPI
  // ==========================================================================

  const getQuestionId = (
    question
  ) => {
    if (
      !question ||
      typeof question !== 'object'
    ) {
      return undefined;
    }

    return (
      question.question_id ||
      question.questionId ||
      question.id
    );
  };

  // ==========================================================================
  // FORMAT TIME
  // ==========================================================================

  const formatDuration = (
    seconds
  ) => {
    const safeSeconds = Math.max(
      0,
      Number(seconds) || 0
    );

    const mins = Math.floor(
      safeSeconds / 60
    );

    const secs =
      safeSeconds % 60;

    return `${mins}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // ==========================================================================
  // SPEAK QUESTION
  // ==========================================================================

  const speakQuestion = (
    text
  ) => {
    if (
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(
          text
        );

      utterance.rate = 0.9;

      utterance.lang = 'en-US';

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(
        utterance
      );
    }
  };

  // ==========================================================================
  // SPEAK CURRENT QUESTION
  // ==========================================================================

  useEffect(() => {
    if (
      currentQuestion &&
      !isLoading &&
      !isThinking
    ) {
      speakQuestion(
        getQuestionText(
          currentQuestion
        )
      );
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentQuestion,
    isLoading,
    isThinking,
  ]);

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  useEffect(() => {
    return () => {
      if (
        'speechSynthesis' in window
      ) {
        window.speechSynthesis.cancel();
      }

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }

      if (
        interviewTimerRef.current
      ) {
        clearInterval(
          interviewTimerRef.current
        );

        interviewTimerRef.current =
          null;
      }

      if (
        questionTimerRef.current
      ) {
        clearInterval(
          questionTimerRef.current
        );

        questionTimerRef.current =
          null;
      }

      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Already stopped.
        }

        recognitionRef.current =
          null;
      }
    };
  }, []);

  // ==========================================================================
  // START NEW AI INTERVIEW
  // ==========================================================================

  const startNewAIInterview =
    async (prestartedResponse = null) => {
      const savedTopic =
        location.state?.topic ||
        sessionStorage.getItem(
          'aiInterviewTopic'
        ) ||
        'Technical Interview';

      const savedLevel =
        location.state?.level ||
        sessionStorage.getItem(
          'aiInterviewLevel'
        ) ||
        'Easy';

      setTopic(savedTopic);

      setLevel(savedLevel);

      const startPayload = {
        topic: savedTopic,

        level: savedLevel,

        previous_questions: [],

        question_number: 0,

        last_candidate_answer: '',

        next_question_type: 'basic',
      };

      const response =
        prestartedResponse ||
        await startAIInterview(
          startPayload
        );

      const data =
        response?.data ||
        response ||
        {};

      console.log(
        'AI START RESPONSE:',
        data
      );

      if (
        data?.status === 'error' ||
        !data?.session_id
      ) {
        throw new Error(
          data?.message ||
            'Could not start AI interview.'
        );
      }

      const newSessionId =
        data.session_id;

      setAiSessionId(
        newSessionId
      );

      sessionStorage.setItem(
        'aiInterviewSessionId',
        newSessionId
      );

      if (data.topic) {
        setTopic(data.topic);

        sessionStorage.setItem(
          'aiInterviewTopic',
          data.topic
        );
      }

      if (data.level) {
        setLevel(data.level);

        sessionStorage.setItem(
          'aiInterviewLevel',
          data.level
        );
      }

      if (
        data.total_time_seconds !==
        undefined
      ) {
        setRemainingTime(
          Number(
            data.total_time_seconds
          )
        );
      }

      if (
        data.question_time_seconds !==
        undefined
      ) {
        setQuestionTime(
          Number(
            data.question_time_seconds
          )
        );
      }

      sessionStorage.setItem(
        'aiInterviewStarted',
        'true'
      );

      return newSessionId;
    };

  // ==========================================================================
  // GET QUESTION FROM AI BACKEND
  // ==========================================================================

  const fetchAIQuestion =
    async (
      sessionId,
      questionNumber = 0
    ) => {
      if (!sessionId) {
        throw new Error(
          'AI interview session is missing.'
        );
      }

      setIsThinking(true);

      setThinkingLine(
        questionNumber > 0
          ? pickThinkingLine(
              evaluations[
                evaluations.length - 1
              ]?.score
            )
          : 'Let me prepare your first question...'
      );

      setNextQuestionError(null);

      try {
        console.log(
          'REQUESTING QUESTION:',
          {
            session_id:
              sessionId,
          }
        );

        const response =
          await getAIInterviewQuestion(
            {
              session_id:
                sessionId,
            }
          );

        const data =
          response?.data ||
          response ||
          {};

        console.log(
          'AI QUESTION RESPONSE:',
          data
        );

        if (
          data?.status === 'error'
        ) {
          throw new Error(
            data?.message ||
              'Could not generate question.'
          );
        }

        if (!data.question) {
          throw new Error(
            'AI backend returned no question.'
          );
        }

        // ------------------------------------------------------------
        // Backend session validation
        // ------------------------------------------------------------

        if (
          data.session_id &&
          data.session_id !==
            sessionId
        ) {
          throw new Error(
            'AI session mismatch. Please start a new interview.'
          );
        }

        // ------------------------------------------------------------
        // IMPORTANT:
        // Backend MUST give question_id.
        // ------------------------------------------------------------

        if (!data.question_id) {
          throw new Error(
            'AI backend did not return a question_id.'
          );
        }

        const question = {
          question:
            data.question,

          question_id:
            data.question_id,

          question_number:
            data.question_number ??
            questionNumber + 1,

          category:
            data.topic ||
            topic,

          topic:
            data.topic ||
            topic,

          level:
            data.level ||
            level,
        };

        console.log(
          'CURRENT QUESTION OBJECT:',
          question
        );

        // ------------------------------------------------------------
        // Add question.
        // ------------------------------------------------------------

        setAskedQuestions(
          (previous) => {
            const updated = [
              ...previous,
              question,
            ];

            sessionStorage.setItem(
              'askedQuestions',
              JSON.stringify(
                updated
              )
            );

            sessionStorage.setItem(
              'interviewQuestions',
              JSON.stringify(
                updated
              )
            );

            return updated;
          }
        );

        // ------------------------------------------------------------
        // IMPORTANT INDEX FIX
        //
        // Backend question_number:
        // 1 -> frontend index 0
        // 2 -> frontend index 1
        // ------------------------------------------------------------

        const backendQuestionNumber =
          Number(
            data.question_number ??
              questionNumber + 1
          );

        const newIndex =
          Math.max(
            0,
            backendQuestionNumber -
              1
          );

        setCurrentIndex(
          newIndex
        );

        if (
          data.remaining_time_seconds !==
          undefined
        ) {
          setRemainingTime(
            Number(
              data.remaining_time_seconds
            )
          );
        }

        if (
          data.question_time_seconds !==
          undefined
        ) {
          setQuestionTime(
            Number(
              data.question_time_seconds
            )
          );
        }

        handleReRecord();
      } catch (error) {
        console.error(
          'AI question error:',
          error
        );

        if (
          isInvalidQuestionError(
            error
          )
        ) {
          clearAIInterviewStorage();

          setAiSessionId('');

          setAskedQuestions([]);

          setAnswers([]);

          setEvaluations([]);

          setCurrentIndex(0);

          setLoadError(
            'The AI interview session has expired. Please start a new interview.'
          );

          return;
        }

        setNextQuestionError(
          getApiErrorMessage(
            error,
            'Could not generate the next question. Please retry.'
          )
        );
      } finally {
        setIsThinking(false);
      }
    };

  // ==========================================================================
  // INITIAL LOAD
  //
  // IMPORTANT:
  // DO NOT RESTORE OLD AI SESSION.
  // ALWAYS CREATE FRESH AI SESSION WHEN THIS PAGE OPENS.
  // ==========================================================================

  useEffect(() => {
    if (
      initializedRef.current
    ) {
      return;
    }

    initializedRef.current =
      true;

    const initialiseInterview =
      async () => {
        setIsLoading(true);

        setLoadError(null);

        try {
          // ----------------------------------------------------------
          // Clear stale AI interview data.
          // ----------------------------------------------------------

          clearAIInterviewStorage();

          setAskedQuestions([]);

          setAnswers([]);

          setEvaluations([]);

          setCurrentIndex(0);

          setTranscript('');

          // ----------------------------------------------------------
          // Load supporting data.
          // ----------------------------------------------------------

          let rData =
            location.state?.resumeData;

          let intro =
            location.state?.selfIntro;

          let terms =
            location.state?.techTerms;

          if (!rData) {
            const storedResume =
              sessionStorage.getItem(
                'resumeData'
              );

            if (storedResume) {
              try {
                rData =
                  JSON.parse(
                    storedResume
                  );
              } catch {
                rData = {};
              }
            }
          }

          if (!intro) {
            intro =
              sessionStorage.getItem(
                'selfIntro'
              ) || '';
          }

          if (!terms) {
            const storedTerms =
              sessionStorage.getItem(
                'techTermsFound'
              );

            if (storedTerms) {
              try {
                terms =
                  JSON.parse(
                    storedTerms
                  );
              } catch {
                terms = [];
              }
            }
          }

          setResumeData(
            rData || {}
          );

          setSelfIntro(
            intro || ''
          );

          setTechTerms(
            terms || []
          );

          // ----------------------------------------------------------
          // ALWAYS START NEW AI SESSION.
          // ----------------------------------------------------------

          const newSessionId =
            await startNewAIInterview(
              location.state?.prestartedInterview || null
            );

          setAiSessionId(
            newSessionId
          );

          // ----------------------------------------------------------
          // FIRST QUESTION
          // ----------------------------------------------------------

          await fetchAIQuestion(
            newSessionId,
            0
          );
        } catch (error) {
          console.error(
            'AI interview initialization error:',
            error
          );

          setLoadError(
            getApiErrorMessage(
              error,
              'Failed to start the AI interview. Please try again.'
            )
          );
        } finally {
          setIsLoading(false);
        }
      };

    initialiseInterview();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================================
  // TOTAL INTERVIEW TIMER
  // ==========================================================================

  useEffect(() => {
    if (
      isLoading ||
      !aiSessionId ||
      isDone
    ) {
      return undefined;
    }

    if (
      interviewTimerRef.current
    ) {
      clearInterval(
        interviewTimerRef.current
      );
    }

    interviewTimerRef.current =
      setInterval(() => {
        setRemainingTime(
          (previous) => {
            const next =
              Math.max(
                0,
                previous - 1
              );

            if (next === 0) {
              clearInterval(
                interviewTimerRef.current
              );

              interviewTimerRef.current =
                null;
            }

            return next;
          }
        );
      }, 1000);

    return () => {
      if (
        interviewTimerRef.current
      ) {
        clearInterval(
          interviewTimerRef.current
        );

        interviewTimerRef.current =
          null;
      }
    };
  }, [
    aiSessionId,
    isLoading,
    isDone,
  ]);

  // ==========================================================================
  // QUESTION TIMER
  // ==========================================================================

  useEffect(() => {
    if (
      !currentQuestion ||
      isLoading ||
      isThinking ||
      isDone
    ) {
      return undefined;
    }

    if (
      questionTimerRef.current
    ) {
      clearInterval(
        questionTimerRef.current
      );
    }

    questionTimerRef.current =
      setInterval(() => {
        setQuestionTime(
          (previous) => {
            const next =
              Math.max(
                0,
                previous - 1
              );

            if (next === 0) {
              clearInterval(
                questionTimerRef.current
              );

              questionTimerRef.current =
                null;
            }

            return next;
          }
        );
      }, 1000);

    return () => {
      if (
        questionTimerRef.current
      ) {
        clearInterval(
          questionTimerRef.current
        );

        questionTimerRef.current =
          null;
      }
    };
  }, [
    currentQuestion,
    isLoading,
    isThinking,
    isDone,
  ]);

  // ==========================================================================
  // AUTO END WHEN TOTAL TIME EXPIRES
  // ==========================================================================

  useEffect(() => {
    if (
      remainingTime > 0 ||
      !aiSessionId ||
      isDone ||
      endingInterviewRef.current
    ) {
      return;
    }

    const endBecauseOfTimeout =
      async () => {
        endingInterviewRef.current =
          true;

        setIsDone(true);

        try {
          await endAIInterview(
            aiSessionId
          );
        } catch (error) {
          console.error(
            'AI interview timeout end error:',
            error
          );
        }

        sessionStorage.setItem(
          'interviewAnswers',
          JSON.stringify(
            answers
          )
        );

        sessionStorage.setItem(
          'interviewEvaluations',
          JSON.stringify(
            evaluations
          )
        );

        sessionStorage.setItem(
          'interviewQuestions',
          JSON.stringify(
            askedQuestions
          )
        );

        sessionStorage.removeItem(
          'aiInterviewSessionId'
        );

        sessionStorage.removeItem(
          'aiInterviewStarted'
        );

        navigate('/report');
      };

    endBecauseOfTimeout();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    remainingTime,
    aiSessionId,
    isDone,
  ]);

  // ==========================================================================
  // RECORDING
  // ==========================================================================

  const finishRecognition =
    async () => {
      if (
        recognitionFinishRef.current
      ) {
        return;
      }

      recognitionFinishRef.current =
        true;

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );

        timerRef.current = null;
      }

      setIsRecording(false);

      recognitionRef.current =
        null;

      const spokenText =
        speechTextRef.current.trim();

      if (!spokenText) {
        setTranscribeError(
          'No speech was detected. Please try again or type your answer.'
        );

        setIsManualMode(true);

        return;
      }

      setIsTranscribing(true);

      setTranscribeError(null);

      try {
        const confirmedTranscript =
          await transcribeText(
            spokenText
          );

        setTranscript(
          confirmedTranscript
        );

        setIsManualMode(false);
      } catch (error) {
        console.error(
          'Answer transcription error:',
          error
        );

        setTranscript(
          spokenText
        );

        setIsManualMode(true);

        setTranscribeError(
          error?.response?.data
            ?.message ||
            error?.message ||
            'Failed to save your answer. Please check it and try again.'
        );
      } finally {
        setIsTranscribing(false);
      }
    };

  const startRecording = () => {
    setTranscribeError(null);

    setTranscript('');

    setIsManualMode(false);

    setRecordDuration(0);

    speechTextRef.current = '';

    recognitionFinishRef.current =
      false;

    const recognition =
      createSpeechRecognition();

    if (!recognition) {
      setTranscribeError(
        'Speech recognition is not supported in this browser. Please type your answer instead.'
      );

      setIsManualMode(true);

      return;
    }

    recognition.onstart =
      () => {
        setIsRecording(true);

        setRecordDuration(0);

        if (timerRef.current) {
          clearInterval(
            timerRef.current
          );
        }

        timerRef.current =
          setInterval(() => {
            setRecordDuration(
              (previous) => {
                const next =
                  previous + 1;

                if (
                  next >=
                    MAX_RECORDING_SECONDS &&
                  recognitionRef.current
                ) {
                  try {
                    recognitionRef.current.stop();
                  } catch {
                    // Already stopped.
                  }
                }

                return next;
              }
            );
          }, 1000);
      };

    recognition.onresult =
      (event) => {
        let finalText =
          speechTextRef.current;

        let interimText = '';

        for (
          let index =
            event.resultIndex;
          index <
          event.results.length;
          index += 1
        ) {
          const result =
            event.results[index];

          const spokenPart =
            result?.[0]
              ?.transcript || '';

          if (
            result.isFinal
          ) {
            finalText =
              `${finalText} ${spokenPart}`.trim();
          } else {
            interimText +=
              spokenPart;
          }
        }

        speechTextRef.current =
          finalText;

        setTranscript(
          `${finalText} ${interimText}`.trim()
        );
      };

    recognition.onerror =
      (event) => {
        if (
          event.error !==
          'aborted'
        ) {
          console.error(
            'Speech recognition error:',
            event.error
          );

          setTranscribeError(
            `Speech recognition failed (${event.error || 'unknown error'}). You can type your answer instead.`
          );

          setIsManualMode(true);
        }
      };

    recognition.onend =
      () => {
        void finishRecognition();
      };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch (error) {
      console.error(
        'Could not start speech recognition:',
        error
      );

      recognitionRef.current =
        null;

      setIsRecording(false);

      setIsManualMode(true);

      setTranscribeError(
        'Could not start speech recognition. Please type your answer instead.'
      );
    }
  };

  const stopRecording = () => {
    if (
      !recognitionRef.current
    ) {
      void finishRecognition();

      return;
    }

    try {
      recognitionRef.current.stop();
    } catch {
      void finishRecognition();
    }
  };

  const handleReRecord = () => {
    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Already stopped.
      }

      recognitionRef.current =
        null;
    }

    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }

    recognitionFinishRef.current =
      true;

    setIsRecording(false);

    setTranscript('');

    speechTextRef.current = '';

    setRecordDuration(0);

    setTranscribeError(null);

    setIsManualMode(false);
  };

  // ==========================================================================
  // RESET ANSWER
  // ==========================================================================

  const resetAnswerDraft = () => {
    setTranscript('');

    setTranscribeError(null);

    setIsManualMode(false);

    setIsRecording(false);

    speechTextRef.current = '';

    if (
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Already stopped.
      }

      recognitionRef.current =
        null;
    }

    if (timerRef.current) {
      clearInterval(
        timerRef.current
      );

      timerRef.current = null;
    }
  };

  // ==========================================================================
  // END INTERVIEW
  // ==========================================================================

  const finishInterview = async (
    finalAnswers,
    finalEvaluations
  ) => {
    if (
      endingInterviewRef.current
    ) {
      return;
    }

    endingInterviewRef.current =
      true;

    try {
      sessionStorage.setItem(
        'interviewAnswers',
        JSON.stringify(
          finalAnswers
        )
      );

      sessionStorage.setItem(
        'interviewEvaluations',
        JSON.stringify(
          finalEvaluations
        )
      );

      sessionStorage.setItem(
        'interviewQuestions',
        JSON.stringify(
          askedQuestions
        )
      );

      if (aiSessionId) {
        try {
          await endAIInterview(
            aiSessionId
          );
        } catch (endError) {
          console.error(
            'AI interview end error:',
            endError
          );
        }
      }

      // ------------------------------------------------------------
      // Keep report data but remove ACTIVE session.
      // ------------------------------------------------------------

      sessionStorage.removeItem(
        'aiInterviewSessionId'
      );

      sessionStorage.removeItem(
        'aiInterviewStarted'
      );

      sessionStorage.removeItem(
        'askedQuestions'
      );

      setIsDone(true);

      navigate('/report');
    } catch (error) {
      console.error(
        'Error completing interview:',
        error
      );

      setIsDone(true);

      navigate('/report');
    }
  };

  // ==========================================================================
  // SUBMIT ANSWER
  // ==========================================================================

  const handleSubmitAnswer =
    async () => {
      if (
        isSubmitting ||
        !aiSessionId ||
        !currentQuestion
      ) {
        return;
      }

      const answerText =
        transcript.trim();

      if (!answerText) {
        setTranscribeError(
          'Please provide an answer before submitting.'
        );

        return;
      }

      // ------------------------------------------------------------
      // IMPORTANT:
      // Get EXACT question_id returned by FastAPI.
      // ------------------------------------------------------------

      const questionId =
        getQuestionId(
          currentQuestion
        );

      if (!questionId) {
        setTranscribeError(
          'This question does not have a valid question ID. Please start a new interview.'
        );

        return;
      }

      console.log(
        'EVALUATE REQUEST:',
        {
          session_id:
            aiSessionId,

          question_id:
            questionId,

          candidate_answer:
            answerText,
        }
      );

      setIsSubmitting(true);

      let evaluation =
        buildFallbackEvaluation();

      try {
        const response =
          await evaluateAIInterviewAnswer(
            {
              session_id:
                aiSessionId,

              question_id:
                questionId,

              candidate_answer:
                answerText,
            }
          );

        const data =
          response?.data ||
          response ||
          {};

        console.log(
          'EVALUATE RESPONSE:',
          data
        );

        if (
          data?.status === 'error'
        ) {
          throw new Error(
            data?.message ||
              'Evaluation failed.'
          );
        }

        evaluation =
          normalizeEvaluation(
            data
          );

        if (
          data.remaining_time_seconds !==
          undefined
        ) {
          setRemainingTime(
            Number(
              data.remaining_time_seconds
            )
          );
        }

        if (
          data.question_time_seconds !==
          undefined
        ) {
          setQuestionTime(
            Number(
              data.question_time_seconds
            )
          );
        }

        const newAnswers = [
          ...answers,
          {
            question:
              currentQuestion,

            answer:
              answerText,
          },
        ];

        const newEvaluations = [
          ...evaluations,
          evaluation,
        ];

        setAnswers(
          newAnswers
        );

        setEvaluations(
          newEvaluations
        );

        sessionStorage.setItem(
          'interviewAnswers',
          JSON.stringify(
            newAnswers
          )
        );

        sessionStorage.setItem(
          'interviewEvaluations',
          JSON.stringify(
            newEvaluations
          )
        );

        resetAnswerDraft();

        // ----------------------------------------------------------
        // Backend says interview ended.
        // ----------------------------------------------------------

        if (
          data.interview_ended
        ) {
          await finishInterview(
            newAnswers,
            newEvaluations
          );

          return;
        }

        const nextQuestionNumber =
          currentIndex + 1;

        if (
          nextQuestionNumber >=
          totalQuestions
        ) {
          await finishInterview(
            newAnswers,
            newEvaluations
          );

          return;
        }

        setThinkingLine(
          pickThinkingLine(
            evaluation.score
          )
        );

        await fetchAIQuestion(
          aiSessionId,
          nextQuestionNumber
        );
      } catch (error) {
        console.error(
          'AI answer evaluation error:',
          error
        );

        // ----------------------------------------------------------
        // IMPORTANT FIX:
        // If question ID is expired, clear stale session.
        // ----------------------------------------------------------

        if (
          isInvalidQuestionError(
            error
          )
        ) {
          clearAIInterviewStorage();

          setAiSessionId('');

          setAskedQuestions([]);

          setAnswers([]);

          setEvaluations([]);

          setCurrentIndex(0);

          setLoadError(
            'The AI interview session has expired. Please start a new interview.'
          );

          return;
        }

        setTranscribeError(
          getApiErrorMessage(
            error,
            'Evaluation failed. Please try again.'
          )
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  // ==========================================================================
  // SKIP
  // ==========================================================================

  const handleSkip =
    async () => {
      if (
        isSubmitting ||
        !aiSessionId ||
        !currentQuestion
      ) {
        return;
      }

      const questionId =
        getQuestionId(
          currentQuestion
        );

      if (!questionId) {
        setTranscribeError(
          'This question does not have a valid question ID.'
        );

        return;
      }

      setIsSubmitting(true);

      try {
        const skippedAnswer =
          'The candidate skipped this question and did not provide an answer.';

        console.log(
          'SKIP REQUEST:',
          {
            session_id:
              aiSessionId,

            question_id:
              questionId,

            candidate_answer:
              skippedAnswer,
          }
        );

        const response =
          await evaluateAIInterviewAnswer(
            {
              session_id:
                aiSessionId,

              question_id:
                questionId,

              candidate_answer:
                skippedAnswer,
            }
          );

        const data =
          response?.data ||
          response ||
          {};

        console.log(
          'SKIP RESPONSE:',
          data
        );

        if (
          data?.status === 'error'
        ) {
          throw new Error(
            data?.message ||
              'Could not skip question.'
          );
        }

        const evaluation =
          normalizeEvaluation(
            data
          );

        if (
          data.remaining_time_seconds !==
          undefined
        ) {
          setRemainingTime(
            Number(
              data.remaining_time_seconds
            )
          );
        }

        const newAnswers = [
          ...answers,
          {
            question:
              currentQuestion,

            answer:
              '[Skipped]',
          },
        ];

        const newEvaluations = [
          ...evaluations,
          evaluation,
        ];

        setAnswers(
          newAnswers
        );

        setEvaluations(
          newEvaluations
        );

        sessionStorage.setItem(
          'interviewAnswers',
          JSON.stringify(
            newAnswers
          )
        );

        sessionStorage.setItem(
          'interviewEvaluations',
          JSON.stringify(
            newEvaluations
          )
        );

        resetAnswerDraft();

        if (
          data.interview_ended
        ) {
          await finishInterview(
            newAnswers,
            newEvaluations
          );

          return;
        }

        const nextQuestionNumber =
          currentIndex + 1;

        if (
          nextQuestionNumber >=
          totalQuestions
        ) {
          await finishInterview(
            newAnswers,
            newEvaluations
          );

          return;
        }

        setThinkingLine(
          'Okay, let’s move to the next question...'
        );

        await fetchAIQuestion(
          aiSessionId,
          nextQuestionNumber
        );
      } catch (error) {
        console.error(
          'Skip evaluation failed:',
          error
        );

        if (
          isInvalidQuestionError(
            error
          )
        ) {
          clearAIInterviewStorage();

          setAiSessionId('');

          setAskedQuestions([]);

          setAnswers([]);

          setEvaluations([]);

          setCurrentIndex(0);

          setLoadError(
            'The AI interview session has expired. Please start a new interview.'
          );

          return;
        }

        setTranscribeError(
          getApiErrorMessage(
            error,
            'Could not skip this question. Please try again.'
          )
        );
      } finally {
        setIsSubmitting(false);
      }
    };

  // ==========================================================================
  // RETRY QUESTION
  // ==========================================================================

  const retryNextQuestion =
    async () => {
      if (!aiSessionId) {
        return;
      }

      setNextQuestionError(null);

      await fetchAIQuestion(
        aiSessionId,
        currentIndex
      );
    };

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (
    isLoading ||
    hookLoading
  ) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>

        <p className="text-gray-600 mt-4">
          Starting your AI interview...
        </p>
      </div>
    );
  }

  // ==========================================================================
  // ERROR
  // ==========================================================================

  if (loadError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-4xl mb-4">
          ⚠️
        </div>

        <p className="text-gray-600 mb-4">
          {loadError}
        </p>

        <button
          onClick={() =>
            navigate('/intro')
          }
          className="btn-primary mt-4"
        >
          ← Back to Introduction
        </button>
      </div>
    );
  }

  // ==========================================================================
  // DONE
  // ==========================================================================

  if (isDone) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>

        <p className="text-gray-600 mt-4">
          Wrapping up your interview and generating your report...
        </p>
      </div>
    );
  }

  // ==========================================================================
  // THINKING
  // ==========================================================================

  if (isThinking) {
    return (
      <div>
        <div className="gradient-hero rounded-3xl p-6 text-white mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold">
                🎤 Live Interview
              </h1>

              <p className="text-sm text-white/80 mt-1">
                {topic} • {level}
              </p>
            </div>

            <div className="text-sm bg-white/20 px-4 py-2 rounded-full">
              Question{' '}
              {Math.min(
                currentIndex + 1,
                totalQuestions
              )}{' '}
              of {totalQuestions}
            </div>
          </div>

          <ProgressBar
            progress={progress}
          />

          <div className="flex justify-end mt-2 text-sm text-white/80">
            <span>
              ⏱{' '}
              {formatDuration(
                remainingTime
              )}
            </span>
          </div>
        </div>

        <div className="card text-center py-16">
          <div className="flex justify-center gap-1 mb-4">
            <span
              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
              style={{
                animationDelay: '0ms',
              }}
            />

            <span
              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
              style={{
                animationDelay: '150ms',
              }}
            />

            <span
              className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
              style={{
                animationDelay: '300ms',
              }}
            />
          </div>

          <p className="text-gray-600 italic">
            {thinkingLine}
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // NEXT QUESTION ERROR
  // ==========================================================================

  if (nextQuestionError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-4xl mb-4">
          ⚠️
        </div>

        <p className="text-gray-600 mb-4">
          {nextQuestionError}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={
              retryNextQuestion
            }
            className="btn-primary"
          >
            🔄 Retry
          </button>

          <button
            onClick={() =>
              navigate('/intro')
            }
            className="btn-secondary"
          >
            ← Back to Introduction
          </button>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // NO QUESTION
  // ==========================================================================

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          No question available. Please go back and try again.
        </p>

        <button
          onClick={() =>
            navigate('/intro')
          }
          className="btn-primary mt-4"
        >
          ← Back to Introduction
        </button>
      </div>
    );
  }

  // ==========================================================================
  // MAIN UI
  // ==========================================================================

  return (
    <div>
      {/* ================================================================= */}
      {/* HERO */}
      {/* ================================================================= */}

      <div className="gradient-hero rounded-3xl p-6 text-white mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold">
              🎤 Live Interview
            </h1>

            <p className="text-sm text-white/80 mt-1">
              {topic} • {level}
            </p>
          </div>

          <div className="text-right">
            <div className="text-sm bg-white/20 px-4 py-2 rounded-full">
              Question{' '}
              {currentIndex + 1} of{' '}
              {totalQuestions}
            </div>

            <div className="text-sm mt-2 text-white/90">
              ⏱ Total Time:{' '}
              {formatDuration(
                remainingTime
              )}
            </div>
          </div>
        </div>

        <ProgressBar
          progress={progress}
        />

        <div className="flex justify-between mt-2 text-sm text-white/80">
          <span>
            ✅ Answered:{' '}
            {
              answers.filter(
                (a) =>
                  a.answer !==
                  '[Skipped]'
              ).length
            }
          </span>

          <span>
            ⏭️ Skipped:{' '}
            {
              answers.filter(
                (a) =>
                  a.answer ===
                  '[Skipped]'
              ).length
            }
          </span>

          <span>
            {isSpeaking
              ? '🔊 Speaking...'
              : ''}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* QUESTION */}
      {/* ================================================================= */}

      <div className="card mb-6">
        <h3 className="text-sm font-medium text-indigo-600 mb-2">
          📌 Topic:{' '}
          {getQuestionTopic(
            currentQuestion
          )}
        </h3>

        <p className="text-xl text-gray-800 leading-relaxed">
          {getQuestionText(
            currentQuestion
          )}
        </p>

        <div className="flex justify-between items-center mt-3">
          <button
            onClick={() =>
              speakQuestion(
                getQuestionText(
                  currentQuestion
                )
              )
            }
            className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
          >
            🔊 Replay Question
          </button>

          <span className="text-sm text-gray-500">
            Question Time:{' '}
            {formatDuration(
              questionTime
            )}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* ANSWER */}
      {/* ================================================================= */}

      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">
          🎙️ Your Answer
        </h3>

        {transcribeError && (
          <div
            className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            role="alert"
          >
            <p className="text-sm text-red-700 flex items-center">
              <span className="mr-2">
                ⚠️
              </span>

              {transcribeError}
            </p>
          </div>
        )}

        {/* RECORD */}

        <div className="text-center py-6">
          <button
            type="button"
            onClick={
              isRecording
                ? stopRecording
                : startRecording
            }
            className={`${
              isRecording
                ? 'bg-red-500 hover:bg-red-600'
                : 'btn-primary'
            } px-8 py-4 text-lg rounded-full transition-all duration-300 transform hover:scale-105`}
            disabled={
              isTranscribing ||
              isSubmitting
            }
          >
            {isRecording
              ? '⏹ Stop Listening'
              : '🎙 Start Speaking'}
          </button>

          {isRecording && (
            <div
              className="mt-4 inline-flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-full"
              aria-live="polite"
            >
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>

              <span className="text-red-600 font-medium">
                Listening{' '}
                {formatDuration(
                  recordDuration
                )}
              </span>
            </div>
          )}

          {!isRecording &&
            !transcript &&
            !isTranscribing && (
              <button
                type="button"
                onClick={() =>
                  setIsManualMode(
                    true
                  )
                }
                className="block mx-auto text-sm text-indigo-600 hover:text-indigo-800 mt-3"
              >
                ✏️ Type your answer
                instead
              </button>
            )}

          {!isRecording &&
            transcript &&
            !isTranscribing && (
              <button
                type="button"
                onClick={
                  handleReRecord
                }
                className="btn-secondary mt-4"
              >
                🔄 Record again
              </button>
            )}
        </div>

        {/* TRANSCRIBING */}

        {isTranscribing && (
          <div
            className="text-center py-4"
            aria-live="polite"
          >
            <div className="animate-pulse text-indigo-600">
              <svg
                className="inline animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />

                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>

              Saving your transcript...
            </div>
          </div>
        )}

        {/* ANSWER TEXT */}

        {(transcript ||
          isManualMode) &&
          !isTranscribing && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 mb-4">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-medium text-gray-700">
                  {isRecording
                    ? '🎙 Live transcript:'
                    : isManualMode
                    ? '✏️ Your Answer:'
                    : '📝 Transcribed Answer:'}
                </p>

                {!isRecording &&
                  !isManualMode && (
                    <button
                      onClick={() =>
                        setIsManualMode(
                          true
                        )
                      }
                      className="text-xs text-indigo-600 hover:text-indigo-800"
                    >
                      Edit
                    </button>
                  )}
              </div>

              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows="4"
                placeholder="Type your answer here..."
                value={transcript}
                onChange={(event) =>
                  setTranscript(
                    event.target.value
                  )
                }
              />
            </div>
          )}

        {/* BUTTONS */}

        <div className="flex gap-4 mt-4">
          <button
            onClick={
              handleSubmitAnswer
            }
            disabled={
              !transcript ||
              transcript.trim() ===
                '' ||
              isSubmitting ||
              isTranscribing
            }
            className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />

                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>

                Evaluating...
              </span>
            ) : (
              '✅ Submit Answer'
            )}
          </button>

          <button
            onClick={handleSkip}
            className="btn-secondary flex-1"
            disabled={
              isSubmitting ||
              isTranscribing
            }
          >
            ⏭️ Skip
          </button>
        </div>
      </div>
    </div>
  );
};

export default InterviewQuestions;