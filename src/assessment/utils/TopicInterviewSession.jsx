import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMicrophone,
  FaVolumeUp,
} from 'react-icons/fa';
import { createSpeechRecognition } from '../utils/speechRecognition';
import {
  endTopicInterview,
  evaluateTopicInterviewAnswer,
  getTopicInterviewStatus,
  requestTopicInterviewQuestion,
} from './api/topicInterviewApi';

const readStoredSession = () => {
  try {
    return JSON.parse(sessionStorage.getItem('topicInterviewSession') || 'null');
  } catch {
    return null;
  }
};

const getBody = (response) => {
  let body = response?.data ?? response;
  while (body && typeof body === 'object' && body.data && typeof body.data === 'object') {
    body = body.data;
  }
  return body && typeof body === 'object' ? body : {};
};

const getHistory = (response) => {
  const body = getBody(response);
  if (Array.isArray(body.history)) return body.history;
  if (Array.isArray(body.questions)) return body.questions;
  if (Array.isArray(body.results)) return body.results;
  return [];
};

const mergeHistory = (...groups) => {
  const entries = new Map();
  groups.flat().filter((item) => item && typeof item === 'object').forEach((item, index) => {
    const questionNumber = item.question_number ?? item.questionNumber;
    const questionId = item.question_id ?? item.questionId ?? item.id;
    const key = questionNumber !== undefined && questionNumber !== null
      ? `number:${questionNumber}`
      : questionId
        ? `id:${questionId}`
        : `question:${item.question || item.text || index}`;
    const merged = { ...(entries.get(key) || {}) };
    Object.entries(item).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') merged[field] = value;
    });
    entries.set(key, merged);
  });
  return [...entries.values()].sort((left, right) =>
    Number(left.question_number ?? left.questionNumber ?? 0)
      - Number(right.question_number ?? right.questionNumber ?? 0),
  );
};

const readStoredHistory = (sessionId) => {
  if (!sessionId) return [];
  try {
    const history = JSON.parse(sessionStorage.getItem(`topicInterviewHistory:${sessionId}`) || '[]');
    return Array.isArray(history) ? history : [];
  } catch {
    return [];
  }
};

const getQuestion = (response) => {
  const body = getBody(response);
  const value = body.question ?? body.next_question ?? body.current_question ?? body.question_text;
  const question = value && typeof value === 'object' ? value : body;
  const text = typeof value === 'string'
    ? value
    : question.question ?? question.text ?? question.content ?? question.prompt;
  const id = question.question_id ?? question.questionId ?? question.id
    ?? body.question_id ?? body.questionId;
  const number = Number(question.question_number ?? body.question_number);
  const concepts = question.concepts ?? question.key_concepts ?? question.topics
    ?? body.concepts ?? body.key_concepts ?? body.topics;

  return text
    ? {
        id: id ? String(id) : '',
        text: String(text),
        number: Number.isFinite(number) && number > 0 ? number : null,
        concepts: Array.isArray(concepts) ? concepts : typeof concepts === 'string' ? [concepts] : [],
      }
    : null;
};

const extractQuestionConcepts = (question, topic) => {
  const suppliedConcepts = (question?.concepts || [])
    .map((concept) => typeof concept === 'string' ? concept : concept?.name ?? concept?.concept ?? concept?.text)
    .filter(Boolean);
  if (suppliedConcepts.length) return [...new Set(suppliedConcepts)];

  const ignoredWords = new Set([
    'about', 'after', 'also', 'answer', 'application', 'approach', 'based', 'between',
    'best', 'both', 'could', 'describe', 'difference', 'does', 'explain', 'following',
    'from', 'handle', 'have', 'having', 'help', 'into', 'issue', 'issues', 'impact',
    'just', 'many', 'most', 'often', 'other', 'question', 'should', 'some', 'such',
    'than', 'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this',
    'through', 'under', 'using', 'what', 'when', 'where', 'which', 'while', 'with',
    'would', 'your', 'you', 'can', 'for', 'how', 'the', 'and', 'are', 'was', 'were',
    'does', 'did', 'its', 'not', 'but', 'use', 'used', 'way', 'why', 'will', 'more',
  ]);
  const normalizedTopic = String(topic || '').trim().toLowerCase();
  const terms = String(question?.text || '')
    .match(/[A-Za-z][A-Za-z0-9+#.]*/g) || [];
  const concepts = terms
    .map((term) => term.replace(/[.]$/, ''))
    .filter((term) => term.length > 2 && !ignoredWords.has(term.toLowerCase()))
    .filter((term) => term.toLowerCase() !== normalizedTopic);

  return [...new Set(concepts)].slice(0, 8);
};

const isComplete = (response) => {
  const body = getBody(response);
  const status = String(body.status ?? body.interview_status ?? '').toLowerCase();
  return body.completed === true
    || body.is_completed === true
    || body.finished === true
    || ['complete', 'completed', 'finished', 'ended'].includes(status);
};

const getErrorMessage = (error) => {
  const body = error?.response?.data;
  return body?.detail || body?.message || error?.message || 'The interview request failed.';
};

const formatClock = (seconds) => {
  if (!Number.isFinite(seconds)) return '--:--';
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
};

const TopicInterviewSession = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [session] = useState(() => location.state?.topicInterview || readStoredSession());
  const [interviewHistory, setInterviewHistory] = useState(() => readStoredHistory(session?.sessionId));
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [answeredCount, setAnsweredCount] = useState(0);
  const [questionNumber, setQuestionNumber] = useState(1);
  const [finalResult, setFinalResult] = useState(null);
  const [status, setStatus] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [questionSeconds, setQuestionSeconds] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [nextQuestionLoading, setNextQuestionLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState('');
  const initializedSession = useRef('');
  const endingSession = useRef(false);
  const movingToNextRef = useRef(false);
  const recognitionRef = useRef(null);
  const recognitionBaseRef = useRef('');
  const interviewHistoryRef = useRef(interviewHistory);
  const evaluatedAnswerRef = useRef(null);

  const updateHistory = (entries) => {
    const merged = mergeHistory(interviewHistoryRef.current, entries);
    interviewHistoryRef.current = merged;
    setInterviewHistory(merged);
    if (session?.sessionId) {
      sessionStorage.setItem(`topicInterviewHistory:${session.sessionId}`, JSON.stringify(merged));
    }
    return merged;
  };

  const applyServerState = (response, resetQuestionTimer = false) => {
    const body = getBody(response);
    const remaining = Number(body.remaining_time_seconds);
    const perQuestion = Number(body.question_time_seconds);
    const serverQuestionNumber = Number(body.question_number);
    if (Number.isFinite(remaining)) setRemainingSeconds(remaining);
    if (resetQuestionTimer && Number.isFinite(perQuestion)) setQuestionSeconds(perQuestion);
    if (Number.isFinite(serverQuestionNumber) && serverQuestionNumber > 0) {
      setQuestionNumber(serverQuestionNumber);
    }
    const serverHistory = getHistory(response);
    if (serverHistory.length) updateHistory(serverHistory);
    setStatus(response);
  };

  const finishInterview = useCallback(async () => {
    if (endingSession.current || !session?.sessionId) return;
    endingSession.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setLoading(true);
    setError('');
    try {
      const response = await endTopicInterview(session.sessionId);
      const result = getBody(response);
      const completeHistory = updateHistory(getHistory(response));
      const completedResult = { ...result, history: completeHistory };
      setFinalResult(completedResult);
      const completedCount = Number(result.questions_answered);
      setAnsweredCount(Math.max(
        Number.isFinite(completedCount) ? completedCount : 0,
        completeHistory.length,
      ));
      setFinished(true);
    } catch (requestError) {
      endingSession.current = false;
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [session?.sessionId]);

  useEffect(() => {
    if (!session?.sessionId) {
      setError('Interview session was not found. Please start again.');
      setLoading(false);
      return;
    }
    if (initializedSession.current === session.sessionId) return;
    initializedSession.current = session.sessionId;

    const initialize = async () => {
      setLoading(true);
      try {
        applyServerState(session.startResponse, true);
        const initialQuestion = getQuestion(session.startResponse);
        if (initialQuestion) {
          setQuestion(initialQuestion);
          if (initialQuestion.number) setQuestionNumber(initialQuestion.number);
        } else {
          const response = await requestTopicInterviewQuestion(session.sessionId, '');
          applyServerState(response, true);
          const nextQuestion = getQuestion(response);
          if (nextQuestion) {
            setQuestion(nextQuestion);
            if (nextQuestion.number) setQuestionNumber(nextQuestion.number);
          } else if (isComplete(response)) {
            await finishInterview();
          } else {
            throw new Error('The interview API did not return a question.');
          }
        }

        try {
          applyServerState(await getTopicInterviewStatus(session.sessionId));
        } catch (statusError) {
          console.warn('Could not load interview status:', statusError);
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError));
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [finishInterview, session]);

  useEffect(() => {
    if (!session?.sessionId || finished) return undefined;
    let active = true;
    let timerId;
    const pollStatus = async () => {
      try {
        const currentStatus = await getTopicInterviewStatus(session.sessionId);
        if (!active) return;
        applyServerState(currentStatus);
        if (isComplete(currentStatus)) {
          await finishInterview();
          return;
        }
      } catch (statusError) {
        if (active) console.warn('Could not refresh interview status:', statusError);
      }
      if (active) timerId = window.setTimeout(pollStatus, 5000);
    };
    timerId = window.setTimeout(pollStatus, 5000);
    return () => {
      active = false;
      window.clearTimeout(timerId);
    };
  }, [finishInterview, finished, session?.sessionId]);

  useEffect(() => {
    if (remainingSeconds === null || finished) return undefined;
    if (remainingSeconds <= 0) {
      finishInterview();
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setRemainingSeconds((remaining) => remaining === null ? null : Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [finishInterview, finished, remainingSeconds]);

  useEffect(() => {
    if (questionSeconds === null || finished || loading) return undefined;
    if (questionSeconds <= 0) {
      skipQuestion('time_expired');
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setQuestionSeconds((remaining) => remaining === null ? null : Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearTimeout(timerId);
  }, [finished, loading, questionSeconds]);

  useEffect(() => {
    if (!question?.text || finished || !('speechSynthesis' in window)) return undefined;
    const speech = window.speechSynthesis;
    speech.cancel();
    const utterance = new SpeechSynthesisUtterance(question.text);
    const voice = speech.getVoices().find((item) => /^en(-|_)/i.test(item.lang));
    if (voice) utterance.voice = voice;
    utterance.lang = voice?.lang || 'en-US';
    utterance.rate = 0.95;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    const timerId = window.setTimeout(() => {
      speech.resume();
      speech.speak(utterance);
    }, 100);
    return () => {
      window.clearTimeout(timerId);
      speech.cancel();
      setIsSpeaking(false);
    };
  }, [finished, question?.id, question?.text]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const startVoiceAnswer = () => {
    const recognition = createSpeechRecognition({ lang: 'en-US' });
    if (!recognition) {
      setError('Speech recognition is not available in this browser. You can type your answer instead.');
      return;
    }

    setError('');
    recognitionBaseRef.current = answer.trim();
    recognitionRef.current = recognition;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      setAnswer([recognitionBaseRef.current, spoken].filter(Boolean).join(' '));
    };
    recognition.onerror = (event) => {
      if (event.error !== 'aborted') setError(`Microphone error: ${event.error}. You can type your answer instead.`);
      setIsRecording(false);
      recognitionRef.current = null;
    };
    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };
    try {
      recognition.start();
      setIsRecording(true);
    } catch (recordingError) {
      setError(recordingError.message || 'Could not start microphone recording.');
      setIsRecording(false);
      recognitionRef.current = null;
    }
  };

  const stopVoiceAnswer = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const handleNextQuestion = async (event) => {
    event.preventDefault();
    const candidateAnswer = answer.trim();
    if (!candidateAnswer || !question?.id || loading || movingToNextRef.current) return;

    movingToNextRef.current = true;
    setLoading(true);
    setNextQuestionLoading(true);
    setError('');
    try {
      const cachedEvaluation = evaluatedAnswerRef.current;
      let nextAnsweredCount = answeredCount;
      if (cachedEvaluation?.questionId !== question.id || cachedEvaluation?.answer !== candidateAnswer) {
        const evaluationResponse = await evaluateTopicInterviewAnswer({
          session_id: session.sessionId,
          question_id: question.id,
          candidate_answer: candidateAnswer,
        });
        const evaluationBody = getBody(evaluationResponse);
        const evaluationDetails = evaluationBody.evaluation ?? evaluationBody.result ?? evaluationBody;
        updateHistory({
          ...(evaluationDetails && typeof evaluationDetails === 'object' ? evaluationDetails : {}),
          question_id: question.id,
          question_number: question.number || questionNumber,
          topic: session.topic,
          level: session.level,
          question: question.text,
          candidate_answer: candidateAnswer,
          feedback: evaluationBody.feedback ?? evaluationDetails?.feedback,
          score: evaluationBody.score ?? evaluationDetails?.score,
          missing_concepts: evaluationBody.missing_concepts ?? evaluationDetails?.missing_concepts,
          extracted_concepts: evaluationBody.extracted_concepts ?? evaluationDetails?.extracted_concepts,
        });
        evaluatedAnswerRef.current = { questionId: question.id, answer: candidateAnswer };
        nextAnsweredCount += 1;
        setAnsweredCount(nextAnsweredCount);
      }

      let currentStatus = null;
      try {
        currentStatus = await getTopicInterviewStatus(session.sessionId);
        applyServerState(currentStatus);
      } catch (statusError) {
        console.warn('Could not refresh interview status:', statusError);
      }

      if (
        nextAnsweredCount >= (Number(session.numberOfQuestions) || 8)
        || questionNumber >= (Number(session.numberOfQuestions) || 8)
        || (currentStatus && isComplete(currentStatus))
      ) {
        await finishInterview();
        return;
      }

      const nextResponse = await requestTopicInterviewQuestion(session.sessionId, candidateAnswer);
      applyServerState(nextResponse, true);
      const nextQuestion = getQuestion(nextResponse);
      if (nextQuestion) {
        setQuestion(nextQuestion);
        setQuestionNumber(nextQuestion.number || questionNumber + 1);
        setAnswer('');
        evaluatedAnswerRef.current = null;
      } else if (isComplete(nextResponse)) {
        await finishInterview();
      } else {
        throw new Error('The interview API did not return the next question.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      movingToNextRef.current = false;
      setNextQuestionLoading(false);
      setLoading(false);
    }
  };

  const moveToNextQuestion = async (candidateAnswer) => {
    if (movingToNextRef.current || loading) return;
    movingToNextRef.current = true;
    setLoading(true);
    setError('');
    try {
      const nextResponse = await requestTopicInterviewQuestion(session.sessionId, candidateAnswer);
      applyServerState(nextResponse, true);
      const nextQuestion = getQuestion(nextResponse);
      if (nextQuestion) {
        setQuestion(nextQuestion);
        setQuestionNumber(nextQuestion.number || questionNumber + 1);
        setAnswer('');
        evaluatedAnswerRef.current = null;
      } else if (isComplete(nextResponse)) {
        await finishInterview();
      } else {
        throw new Error('The interview API did not return the next question.');
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      movingToNextRef.current = false;
      setLoading(false);
    }
  };

  const skipQuestion = (reason = 'skipped') => {
    if (loading) return;
    updateHistory({
      question_id: question?.id,
      question_number: question?.number || questionNumber,
      topic: session.topic,
      level: session.level,
      question: question?.text || '',
      question_concepts: extractQuestionConcepts(question, session.topic),
      candidate_answer: reason === 'time_expired' ? '[Time expired]' : '[Skipped]',
      skipped: reason !== 'time_expired',
      question_time_expired: reason === 'time_expired',
    });
    if (questionNumber >= (Number(session.numberOfQuestions) || 8)) {
      finishInterview();
      return;
    }
    moveToNextQuestion('');
  };

  const replayQuestion = () => {
    if (!question?.text || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(question.text);
    utterance.lang = 'en-US';
    utterance.rate = 0.95;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  };

  if (!session?.sessionId) {
    return (
      <main className="resume-page">
        <section className="resume-upload-card" style={{ maxWidth: 720, margin: '48px auto', padding: 32 }}>
          <div role="alert" className="text-red-700">{error}</div>
          <button type="button" className="resume-choose-button" onClick={() => navigate('/assessments/interview')}>
            Back to interview setup
          </button>
        </section>
      </main>
    );
  }

  const questionLimit = Number(session.numberOfQuestions) || 8;
  const resultHistory = mergeHistory(interviewHistory, getHistory(status), getHistory(finalResult));
  const historyScores = resultHistory
    .map((item) => Number(item.score))
    .filter(Number.isFinite);
  const isSkippedResult = (item) => item.skipped === true || item.candidate_answer === '[Skipped]';
  const isTimedOutResult = (item) => item.question_time_expired === true || item.candidate_answer === '[Time expired]';
  const resultSkippedCount = resultHistory.filter(isSkippedResult).length;
  const resultTimedOutCount = resultHistory.filter(isTimedOutResult).length;
  const evaluatedHistoryCount = resultHistory.filter((item) => !isSkippedResult(item) && !isTimedOutResult(item)).length;
  const reportedScore = Number(finalResult?.overall_score ?? finalResult?.average_score);
  const averageScore = Number.isFinite(reportedScore)
    ? reportedScore
    : historyScores.length
      ? historyScores.reduce((total, score) => total + score, 0) / historyScores.length
      : null;
  const reportedAnsweredCount = Number(finalResult?.questions_answered);
  const resultAnsweredCount = Math.max(
    Number.isFinite(reportedAnsweredCount) ? reportedAnsweredCount : 0,
    evaluatedHistoryCount,
    answeredCount,
  );

  return (
    <main className="resume-page">
      <section className="resume-hero">
        <div>
          <button type="button" className="resume-hero-button" onClick={() => navigate('/assessments/interview')}>
            <FaArrowLeft /> Back to Setup
          </button>
          <span>TOPIC INTERVIEW</span>
          <h1>{finished ? 'Interview Complete' : `${session.topic} Interview`}</h1>
          <p>{session.level} level · {Math.min(answeredCount, questionLimit)} of {questionLimit} answered</p>
        </div>
      </section>

      <section className="resume-upload-card" style={{ maxWidth: 900, margin: '24px auto', padding: 32 }}>
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <FaExclamationTriangle style={{ flex: '0 0 auto', marginTop: 3 }} />
            <span>{error}</span>
          </div>
        )}

        {finished ? (
          <div>
            <div className="mb-8 text-center">
              <FaCheckCircle className="mx-auto mb-3 text-4xl text-green-600" />
              <h2 className="mb-2 text-2xl font-bold">Interview Results</h2>
              <p className="text-gray-600">{session.topic} · {session.level}</p>
              <p className="mt-2 text-gray-700">
                {resultAnsweredCount} question{resultAnsweredCount === 1 ? '' : 's'} answered
                {resultSkippedCount > 0 && <> · {resultSkippedCount} skipped</>}
                {resultTimedOutCount > 0 && <> · {resultTimedOutCount} timed out</>}
                {averageScore !== null && <> · Average score: <strong>{averageScore.toFixed(1)}/10</strong></>}
              </p>
              <p className="mt-1 text-sm text-gray-600">{resultHistory.length} question{resultHistory.length === 1 ? '' : 's'} attempted</p>
            </div>

            {resultHistory.length > 0 ? (
              <div className="mb-8 space-y-4 text-left">
                {resultHistory.map((item, index) => (
                  <article key={`${item.question_id || item.question_number || index}`} className="rounded-lg border border-orange-100 bg-white p-5">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold">Question {item.question_number || index + 1}</h3>
                      {isSkippedResult(item) ? (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">Skipped</span>
                      ) : isTimedOutResult(item) ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">Time expired</span>
                      ) : item.score !== undefined && item.score !== null && (
                        <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
                          Score: {Number(item.score).toFixed(1)}/10
                        </span>
                      )}
                    </div>
                    <p className="mb-4 text-gray-800">{item.question || 'Question unavailable'}</p>
                    <div className="mb-4 rounded-md bg-gray-50 p-3">
                      <h4 className="mb-1 text-sm font-semibold text-gray-700">Your answer</h4>
                      <p className="whitespace-pre-wrap text-sm text-gray-700">{item.candidate_answer || (isSkippedResult(item) ? 'Skipped' : isTimedOutResult(item) ? 'Time expired' : 'No answer recorded')}</p>
                    </div>
                    {item.feedback && (
                      <div className="mb-4">
                        <h4 className="mb-1 text-sm font-semibold text-gray-700">Feedback</h4>
                        <p className="whitespace-pre-wrap text-sm text-gray-700">{item.feedback}</p>
                      </div>
                    )}
                    {((Array.isArray(item.missing_concepts) && item.missing_concepts.length > 0)
                      || (Array.isArray(item.question_concepts) && item.question_concepts.length > 0)) && (
                      <div className="mb-3">
                        <h4 className="mb-2 text-sm font-semibold text-gray-700">Concepts to review</h4>
                        <div className="flex flex-wrap gap-2">
                          {(Array.isArray(item.missing_concepts) && item.missing_concepts.length > 0
                            ? item.missing_concepts
                            : item.question_concepts).map((concept) => (
                            <span key={concept} className="rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-800">{concept}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(item.extracted_concepts) && item.extracted_concepts.length > 0 && (
                      <p className="text-sm text-gray-600"><strong>Covered:</strong> {item.extracted_concepts.join(', ')}</p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="mb-8 text-center text-gray-600">The backend did not return interview history for this session.</p>
            )}

            <div className="text-center">
              <button type="button" className="resume-choose-button" onClick={() => navigate('/assessments/interview')}>
                Start another interview <FaArrowRight />
              </button>
            </div>
          </div>
        ) : (
          <>
            {loading && !question ? (
              <p className="py-10 text-center text-gray-600">Preparing your first question...</p>
            ) : question ? (
              <>
                <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                  <h2 className="text-xl font-bold text-gray-900">Question {questionNumber}</h2>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-700" aria-live="polite">
                    <span>{session.topic} · {session.level}</span>
                    <span>Question time: {formatClock(questionSeconds)}</span>
                    <span>Interview time: {formatClock(remainingSeconds)}</span>
                  </div>
                </div>
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <p className="min-w-0 flex-1 text-xl leading-relaxed text-gray-800">{question.text}</p>
                  <button type="button" className="resume-hero-button" onClick={replayQuestion} aria-label="Speak question aloud">
                    <FaVolumeUp /> {isSpeaking ? 'Speaking' : 'Hear Question'}
                  </button>
                </div>
                {nextQuestionLoading && (
                  <p className="mb-4 font-semibold text-red-600" role="status" aria-live="polite">
                    Analyzing answer...
                  </p>
                )}
                  <form onSubmit={handleNextQuestion}>
                  <label className="mb-2 block font-semibold" htmlFor="topic-interview-answer">Your answer</label>
                  <textarea
                    id="topic-interview-answer"
                    rows={6}
                    value={answer}
                    onChange={(event) => setAnswer(event.target.value)}
                    placeholder="Write your answer here..."
                    className="mb-4 w-full rounded-lg border border-orange-200 p-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-100"
                    disabled={loading}
                  />
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="resume-hero-button"
                      onClick={isRecording ? stopVoiceAnswer : startVoiceAnswer}
                      disabled={loading}
                    >
                      <FaMicrophone /> {isRecording ? 'Stop Answer' : 'Answer by Voice'}
                    </button>
                    <span className="text-sm text-gray-600" aria-live="polite">
                      {isRecording ? 'Listening... speak your answer.' : 'Type or speak your answer.'}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-between gap-3">
                    <div className="flex flex-wrap gap-3">
                      <button type="button" className="resume-hero-button" onClick={skipQuestion} disabled={loading}>
                        Skip <FaArrowRight />
                      </button>
                      <button
                        type="submit"
                        className="resume-choose-button"
                        disabled={loading || !answer.trim() || !question.id}
                      >
                        Next Question <FaArrowRight />
                      </button>
                    </div>
                  </div>
                  {!question.id && <p className="mt-3 text-sm text-red-700">The API response did not include a question ID, which is required to evaluate the answer.</p>}
                </form>
              </>
            ) : (
              <p className="py-10 text-center text-gray-600">Waiting for the interview question...</p>
            )}
          </>
        )}
      </section>
      {status && !finished && <span className="sr-only">Session status: {String(getBody(status).status || 'active')}</span>}
    </main>
  );
};

export default TopicInterviewSession;