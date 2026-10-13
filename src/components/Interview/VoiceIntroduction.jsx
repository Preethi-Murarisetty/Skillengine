// src/components/Interview/VoiceIntroduction.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useInterview } from '../../hooks/useInterview';
import Card from '../common/Card';
import SkillTag from '../common/SkillTag';
import {
  transcribeText,
  interviewAPI,
} from '../../services/api';
import { createSpeechRecognition } from '../../utils/speechRecognition';
import { getResumeSkills, normalizeSkillList } from '../../utils/skills';

const MAX_RECORDING_SECONDS = 120;
const TOTAL_QUESTIONS = 8;

const getBackendMessage = (error, fallback) => {
  const detail =
    error?.response?.data?.detail ||
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message;

  return typeof detail === 'string' ? detail : fallback;
};

const VoiceIntroduction = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loading: hookLoading } = useInterview();

  const [resumeData] = useState(() => {
    const fromState = location.state?.resumeData;
    if (fromState) return fromState;

    try {
      const stored = sessionStorage.getItem('resumeData');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [detectedSkills, setDetectedSkills] = useState([]);
  const [recordDuration, setRecordDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isManualMode, setIsManualMode] = useState(false);

  const recognitionRef = useRef(null);
  const speechTextRef = useRef('');
  const timerRef = useRef(null);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (!resumeData) {
      navigate('/resume');
    }
  }, [navigate, resumeData]);

  useEffect(() => {
    return () => {
      stopTimer();

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // The recognition instance may already be inactive during unmount.
        }

        recognitionRef.current = null;
      }
    };
  }, []);

  // ============================================================
  // TRANSCRIBE INTRODUCTION
  // ============================================================

  const transcribeIntroduction = async (spokenText) => {
    const textToTranscribe = String(spokenText || '').trim();

    if (!textToTranscribe) {
      setError(
        'No speech was detected. Please try again or type your introduction.'
      );
      setIsManualMode(true);
      return;
    }

    setIsTranscribing(true);
    setError(null);

    try {
      // AI backend:
      // POST /transcribe
      // Body: { text }
      const confirmedTranscript = await transcribeText(textToTranscribe);

      setTranscript(confirmedTranscript);
    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError);

      // Keep browser transcript available so candidate can continue.
      setTranscript(textToTranscribe);
      setIsManualMode(true);

      setError(
        getBackendMessage(
          transcriptionError,
          'Failed to save the transcript. Please check it and try again.'
        )
      );
    } finally {
      setIsTranscribing(false);
    }
  };

  // ============================================================
  // FINISH SPEECH RECOGNITION
  // ============================================================

  const finishRecognition = async () => {
    stopTimer();
    setIsRecording(false);
    recognitionRef.current = null;

    const spokenText = speechTextRef.current.trim();

    if (spokenText) {
      await transcribeIntroduction(spokenText);
    } else {
      setError(
        'No speech was detected. Please try again or type your introduction.'
      );
      setIsManualMode(true);
    }
  };

  // ============================================================
  // START RECORDING
  // ============================================================

  const startRecording = () => {
    setError(null);
    setIsManualMode(false);
    setTranscript('');
    setDetectedSkills([]);
    setRecordDuration(0);
    speechTextRef.current = '';

    const recognition = createSpeechRecognition();

    if (!recognition) {
      setError(
        'Speech recognition is not supported in this browser. Please type your introduction instead.'
      );
      setIsManualMode(true);
      return;
    }

    recognition.onstart = () => {
      setIsRecording(true);
      setRecordDuration(0);

      stopTimer();

      timerRef.current = setInterval(() => {
        setRecordDuration((previous) => {
          const next = previous + 1;

          if (
            next >= MAX_RECORDING_SECONDS &&
            recognitionRef.current
          ) {
            try {
              recognitionRef.current.stop();
            } catch {
              // Browser may already have stopped recognition.
            }
          }

          return next;
        });
      }, 1000);
    };

    recognition.onresult = (event) => {
      let finalText = speechTextRef.current;
      let interimText = '';

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];

        const spokenPart =
          result?.[0]?.transcript || '';

        if (result.isFinal) {
          finalText = `${finalText} ${spokenPart}`.trim();
        } else {
          interimText += spokenPart;
        }
      }

      speechTextRef.current = finalText;

      setTranscript(
        `${finalText} ${interimText}`.trim()
      );
    };

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        console.error(
          'Speech recognition error:',
          event.error
        );

        setError(
          `Speech recognition failed (${
            event.error || 'unknown error'
          }). You can type your introduction instead.`
        );

        setIsManualMode(true);
      }
    };

    recognition.onend = () => {
      void finishRecognition();
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (recognitionError) {
      console.error(
        'Could not start speech recognition:',
        recognitionError
      );

      recognitionRef.current = null;
      stopTimer();
      setIsRecording(false);
      setIsManualMode(true);

      setError(
        'Could not start speech recognition. Please type your introduction instead.'
      );
    }
  };

  // ============================================================
  // STOP RECORDING
  // ============================================================

  const stopRecording = () => {
    if (!recognitionRef.current) {
      stopTimer();
      setIsRecording(false);
      return;
    }

    try {
      recognitionRef.current.stop();
    } catch {
      void finishRecognition();
    }
  };

  // ============================================================
  // FALLBACK QUESTION
  // ============================================================

  const buildFallbackOpeningQuestion = (
    introText,
    skillSet,
    normalizedResumeData
  ) => {
    const normalizedSkills =
      normalizeSkillList(skillSet);

    const skillSummary = normalizedSkills.length
      ? normalizedSkills.slice(0, 4).join(', ')
      : 'your background';

    return {
      question: introText.trim()
        ? `Based on your introduction and your experience in ${skillSummary}, can you walk me through one project or experience that best demonstrates your skills?`
        : `Can you walk me through one project or experience that best demonstrates your skills in ${skillSummary}?`,

      sessionId: `session_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`,

      techTermsFound: normalizedSkills,
      questionSource: 'resume-and-skills-fallback',
      totalQuestions: TOTAL_QUESTIONS,
      resumeData: normalizedResumeData,
    };
  };

  // ============================================================
  // GENERATE OPENING QUESTION
  // ============================================================

  const generateOpeningQuestion = async (
    introText,
    spokenSkillList
  ) => {
    const resumeSkills = getResumeSkills(resumeData);

    const spokenSkills =
      normalizeSkillList(spokenSkillList);

    const allSkills = normalizeSkillList(
      resumeSkills,
      spokenSkills
    );

    const normalizedResumeData = {
      ...(resumeData || {}),

      skills: resumeSkills,
      resume_skills: resumeSkills,
      resumeSkills,

      spoken_skills: spokenSkills,
      spokenSkills,

      all_skills: allSkills,
      allSkills,
    };

    // ========================================================
    // STEP 1: PROCESS SELF INTRO
    // AI Backend:
    // POST http://localhost:8000/process-self-intro
    // ========================================================

    const introResponse =
      await interviewAPI.processSelfIntro({
        self_intro: introText,
        resume_skills: resumeSkills,
      });

    /*
      interviewAPI.processSelfIntro() returns response.data.

      So support both:
      {
        extracted_concepts: [...]
      }

      and:

      {
        data: {
          extracted_concepts: [...]
        }
      }
    */

    const introPayload =
      introResponse?.data ??
      introResponse ??
      {};

    const introSkills = normalizeSkillList(
      introPayload?.extracted_concepts,
      introPayload?.new_skills,
      introPayload?.tech_terms_found,
      introPayload?.skills
    );

    const backendSkills = normalizeSkillList(
      resumeSkills,
      spokenSkills,
      introSkills
    );

    const combinedSpokenSkills =
      normalizeSkillList(
        spokenSkills,
        introSkills
      );

    setDetectedSkills(combinedSpokenSkills);

    const openingSkill =
      introSkills[0] ||
      allSkills[0] ||
      'General';

    // ========================================================
    // STEP 2: GENERATE OPENING QUESTION
    // AI Backend:
    // POST http://localhost:8000/generate-question
    // ========================================================

    const questionResponse =
      await interviewAPI.generateQuestions({
        current_skill: openingSkill,
        question_type: 'basic',
        concept: openingSkill,
      });

    /*
      interviewAPI.generateQuestions() returns response.data.
    */

    const questionPayload =
      questionResponse?.data ??
      questionResponse ??
      {};

    const questionText =
      questionPayload?.question ||
      questionPayload?.text;

    if (!questionText) {
      throw new Error(
        'The question-generation response did not include a question.'
      );
    }

    const question = {
      question: questionText,

      question_id:
        questionPayload?.question_id ||
        questionPayload?.questionId ||
        questionPayload?.id,

      category: openingSkill,
    };

    return {
      question,

      sessionId:
        questionPayload?.session_id ||
        questionPayload?.sessionId ||
        `session_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      techTermsFound: backendSkills,

      spokenSkills: combinedSpokenSkills,

      questionSource: 'backend-generated',

      totalQuestions: TOTAL_QUESTIONS,

      resumeData: normalizedResumeData,
    };
  };

  // ============================================================
  // HANDLE START INTERVIEW
  // ============================================================

  const handleGenerateQuestions = async () => {
    const introText = transcript.trim();

    if (!introText) {
      setError(
        'Please provide your introduction first.'
      );
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const generated =
        await generateOpeningQuestion(
          introText,
          detectedSkills
        );

      const interviewResumeData =
        generated.resumeData ||
        resumeData ||
        {};

      const allSkills = normalizeSkillList(
        getResumeSkills(interviewResumeData),
        detectedSkills,
        generated.techTermsFound
      );

      const sessionId =
        generated.sessionId ||
        `session_${Date.now()}`;

      // ======================================================
      // SAVE INTERVIEW DATA IN SESSION STORAGE
      // ======================================================

      sessionStorage.setItem(
        'interviewSessionId',
        String(sessionId)
      );

      sessionStorage.setItem(
        'resumeData',
        JSON.stringify(interviewResumeData)
      );

      sessionStorage.setItem(
        'resumeSkills',
        JSON.stringify(
          getResumeSkills(interviewResumeData)
        )
      );

      sessionStorage.setItem(
        'spokenSkills',
        JSON.stringify(
          generated.spokenSkills ||
            normalizeSkillList(detectedSkills)
        )
      );

      sessionStorage.setItem(
        'allSkills',
        JSON.stringify(allSkills)
      );

      sessionStorage.setItem(
        'selfIntro',
        introText
      );

      sessionStorage.setItem(
        'techTermsFound',
        JSON.stringify(allSkills)
      );

      sessionStorage.setItem(
        'questionSource',
        generated.questionSource ||
          'skills-based'
      );

      sessionStorage.setItem(
        'totalQuestions',
        String(
          generated.totalQuestions ||
            TOTAL_QUESTIONS
        )
      );

      sessionStorage.setItem(
        'askedQuestions',
        JSON.stringify([
          generated.question,
        ])
      );

      sessionStorage.setItem(
        'interviewAnswers',
        JSON.stringify([])
      );

      sessionStorage.setItem(
        'interviewEvaluations',
        JSON.stringify([])
      );

      // ======================================================
      // GO TO INTERVIEW QUESTIONS
      // ======================================================

      navigate('/interview/questions', {
        state: {
          openingQuestion:
            generated.question,

          sessionId,

          resumeData:
            interviewResumeData,

          selfIntro:
            introText,

          techTerms:
            allSkills,

          questionSource:
            generated.questionSource ||
            'skills-based',

          totalQuestions:
            generated.totalQuestions ||
            TOTAL_QUESTIONS,
        },
      });
    } catch (processingError) {
      console.error(
        'Error processing introduction:',
        processingError
      );

      setError(
        getBackendMessage(
          processingError,
          'Failed to start the interview. Please try again.'
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // ============================================================
  // RE-RECORD
  // ============================================================

  const handleReRecord = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Recognition may already be inactive.
      }

      recognitionRef.current = null;
    }

    stopTimer();

    setIsRecording(false);
    setTranscript('');
    speechTextRef.current = '';
    setDetectedSkills([]);
    setRecordDuration(0);
    setError(null);
    setIsManualMode(false);
  };

  // ============================================================
  // FORMAT DURATION
  // ============================================================

  const formatDuration = (seconds) => {
    const minutes = Math.floor(
      seconds / 60
    );

    const remainingSeconds =
      seconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  const combinedSkills =
    normalizeSkillList(
      getResumeSkills(resumeData),
      detectedSkills
    );

  // ============================================================
  // LOADING
  // ============================================================

  if (!resumeData) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto" />

        <p className="text-gray-600 mt-4">
          Loading resume data...
        </p>
      </div>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <div>
      {/* HERO */}
      <div className="gradient-hero rounded-3xl p-8 text-center text-white mb-8">
        <h1 className="text-3xl font-bold">
          🎤 Tell Me About Yourself
        </h1>

        <p className="text-white/90 mt-2">
          Record a brief introduction about your
          background, skills, and experience
        </p>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* RESUME SUMMARY */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
          <p className="text-sm font-medium text-indigo-700 mb-2">
            📄 Resume Summary
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm">

            <span className="font-medium">
              {resumeData.candidate_name ||
                'Candidate'}
            </span>

            <span className="text-gray-400">
              •
            </span>

            <span>
              {resumeData.experience_level
                ?.seniority_level ||
                'Professional'}
            </span>

            <span className="text-gray-400">
              •
            </span>

            <div className="flex flex-wrap gap-1">
              {getResumeSkills(resumeData)
                .slice(0, 5)
                .map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-white rounded-full text-xs text-indigo-600 border border-indigo-200"
                  >
                    {skill}
                  </span>
                ))}
            </div>
          </div>
        </div>

        {/* MAIN CARD */}
        <Card className="p-6">

          {/* ERROR */}
          {error && (
            <div
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg"
              role="alert"
            >
              <p className="text-sm text-red-700 flex items-center">
                <span className="mr-2">
                  ⚠️
                </span>

                {error}
              </p>
            </div>
          )}

          {/* RECORDING AREA */}
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
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'btn-primary hover:scale-105'
              } px-8 py-4 text-lg rounded-full transition-all duration-300 transform`}
              disabled={
                isTranscribing ||
                isProcessing
              }
            >
              {isRecording ? (
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse" />

                  ⏹ Stop Listening
                </span>
              ) : (
                '🎙 Start Speaking'
              )}
            </button>

            {/* RECORDING TIMER */}
            {isRecording && (
              <div
                className="mt-4 inline-flex items-center space-x-2 bg-red-50 px-4 py-2 rounded-full"
                aria-live="polite"
              >
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />

                <span className="text-red-600 font-medium">
                  Listening{' '}
                  {formatDuration(
                    recordDuration
                  )}
                </span>

                <span className="text-xs text-red-400 ml-2">
                  Speak clearly for 30-60 seconds
                </span>
              </div>
            )}

            {/* MANUAL MODE */}
            {!isRecording &&
              !transcript &&
              !isTranscribing && (
                <button
                  type="button"
                  onClick={() =>
                    setIsManualMode(true)
                  }
                  className="block mx-auto text-sm text-indigo-600 hover:text-indigo-800 mt-3"
                >
                  ✏️ Type your introduction instead
                </button>
              )}

            {/* RECORD AGAIN */}
            {!isRecording &&
              transcript &&
              !isTranscribing && (
                <button
                  type="button"
                  onClick={handleReRecord}
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
                  aria-hidden="true"
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

          {/* TRANSCRIPT / MANUAL INTRO */}
          {(transcript ||
            isManualMode) &&
            !isTranscribing && (
              <div className="space-y-4 mt-4">

                {/* TRANSCRIPT BOX */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">

                  <div className="flex justify-between items-center mb-2">

                    <p className="text-sm font-medium text-gray-700">
                      {isRecording
                        ? '🎙 Live transcript:'
                        : isManualMode
                          ? '✏️ Your Introduction:'
                          : '📝 Transcribed Introduction:'}
                    </p>

                    {!isRecording &&
                      !isManualMode && (
                        <button
                          type="button"
                          onClick={() =>
                            setIsManualMode(true)
                          }
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Edit
                        </button>
                      )}
                  </div>

                  {/* TEXTAREA */}
                  {isManualMode ? (
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      rows="5"
                      placeholder="Type your introduction here..."
                      value={transcript}
                      onChange={(event) =>
                        setTranscript(
                          event.target.value
                        )
                      }
                    />
                  ) : (
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {transcript}
                    </p>
                  )}
                </div>

                {/* DETECTED SKILLS */}
                {combinedSkills.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">

                    <p className="text-sm font-medium text-green-700 mb-2">
                      🎯 Skills used for questions:
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {combinedSkills.map(
                        (skill) => (
                          <SkillTag
                            key={skill}
                            skill={skill}
                          />
                        )
                      )}
                    </div>

                    <p className="text-xs text-green-600 mt-2">
                      Resume skills and introduction
                      skills will guide your interview.
                    </p>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex gap-4">

                  {/* START INTERVIEW */}
                  <button
                    type="button"
                    onClick={
                      handleGenerateQuestions
                    }
                    disabled={
                      !transcript.trim() ||
                      isProcessing ||
                      hookLoading
                    }
                    className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ||
                    hookLoading ? (
                      <span className="flex items-center justify-center">

                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          aria-hidden="true"
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

                        Starting Interview...
                      </span>
                    ) : (
                      '🚀 Start Interview'
                    )}
                  </button>

                  {/* BACK */}
                  <button
                    type="button"
                    onClick={() =>
                      navigate(-1)
                    }
                    className="btn-secondary"
                    disabled={
                      isProcessing ||
                      hookLoading
                    }
                  >
                    ← Back
                  </button>
                </div>

                {/* PROCESSING MESSAGE */}
                {isProcessing && (
                  <p className="text-sm text-gray-500 text-center">
                    ⏳ This may take a few moments...
                  </p>
                )}
              </div>
            )}

          {/* TIPS */}
          {!transcript &&
            !isRecording &&
            !isTranscribing &&
            !isManualMode && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">

                <p className="text-sm font-medium text-blue-800 mb-2">
                  💡 Tips for a Great Introduction:
                </p>

                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>
                    Start with your name and current role
                  </li>

                  <li>
                    Mention your key technical skills and technologies
                  </li>

                  <li>
                    Briefly describe your most significant project or achievement
                  </li>

                  <li>
                    Share what excites you about your field
                  </li>

                  <li>
                    Keep it between 30-60 seconds
                  </li>
                </ul>
              </div>
            )}
        </Card>
      </div>
    </div>
  );
};

export default VoiceIntroduction;