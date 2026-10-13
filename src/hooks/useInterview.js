// hooks/useInterview.js
import { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export const useInterview = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user || null;
  
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [evaluations, setEvaluations] = useState([]);
  const [report, setReport] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Process Self Introduction ──────────────────────────────────────
  const processSelfIntro = async (selfIntro, resumeData) => {
    setLoading(true);
    setError(null);
    try {
      const resumeSkills = resumeData?.resume_skills
        || resumeData?.resumeSkills
        || resumeData?.skills
        || [];
      const response = await api.post('/process-self-intro', {
        self_intro: selfIntro,
        resume_skills: resumeSkills,
      });
      const data = response.data || {};
      const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
      const formattedQuestions = rawQuestions.map((question) => {
        if (typeof question === 'string') {
          return { question, category: 'General', topic: 'General' };
        }
        return {
          question: question.question || question.text || question.content || 'No question text',
          category: question.category || question.type || 'General',
          topic: question.topic || question.category || 'General',
        };
      });
      const techTerms = data.tech_terms_found || data.extracted_concepts || data.new_skills || [];

      setQuestions(formattedQuestions);
      sessionStorage.setItem('questions', JSON.stringify(formattedQuestions));
      sessionStorage.setItem('techTermsFound', JSON.stringify(techTerms));
      sessionStorage.setItem('questionSource', data.question_source || 'self-intro-analysis');

      return {
        ...data,
        questions: formattedQuestions,
        techTerms,
        questionSource: data.question_source || 'self-intro-analysis',
      };
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Answer ──────────────────────────────────────────────────
  const submitAnswer = async (answerData) => {
    try {
      // Get question text properly
      let questionText = '';
      let questionTopic = 'General';
      
      if (typeof answerData.question === 'string') {
        questionText = answerData.question;
      } else if (answerData.question) {
        questionText = answerData.question.question || answerData.question.text || answerData.question.content || 'No question text';
        questionTopic = answerData.question.category || answerData.question.topic || 'General';
      }
      
      const response = await api.post('/evaluate-answer', {
        current_skill: questionTopic,
        question: questionText,
        candidate_answer: answerData.answer,
      });
      
      if (response.data.status === 'success' || response.data.success) {
        const evaluation = response.data.evaluation || response.data;
        const newAnswer = {
          question: answerData.question,
          answer: answerData.answer,
          evaluation: evaluation
        };
        
        // ✅ Update state with new answer and evaluation
        const updatedAnswers = [...answers, newAnswer];
        const updatedEvaluations = [...evaluations, evaluation];
        
        setAnswers(updatedAnswers);
        setEvaluations(updatedEvaluations);
        
        // ✅ Also store in session storage
        sessionStorage.setItem('interviewAnswers', JSON.stringify(updatedAnswers));
        sessionStorage.setItem('interviewEvaluations', JSON.stringify(updatedEvaluations));
        
        // ✅ Also store questions if not already stored
        if (questions.length > 0) {
          sessionStorage.setItem('interviewQuestions', JSON.stringify(questions));
        }
        
        console.log('✅ Answer submitted. Total answers:', updatedAnswers.length);
        console.log('✅ Total evaluations:', updatedEvaluations.length);
        
        return response.data;
      }
      throw new Error(response.data.message || 'Failed to submit answer');
    } catch (err) {
      console.error('Submit answer error:', err);
      throw err;
    }
  };

  // ─── Complete Interview ─────────────────────────────────────────────
  const completeInterview = async () => {
    setLoading(true);
    try {
      // ✅ Get current state values
      const currentQuestions = questions;
      const currentAnswers = answers;
      const currentEvaluations = evaluations;
      
      console.log('📊 Current state before report:', {
        questionsCount: currentQuestions.length,
        answersCount: currentAnswers.length,
        evaluationsCount: currentEvaluations.length
      });
      
      // ✅ If state is empty, try to load from session storage
      let finalQuestions = currentQuestions;
      let finalAnswers = currentAnswers;
      let finalEvaluations = currentEvaluations;
      
      if (finalQuestions.length === 0) {
        const storedQuestions = sessionStorage.getItem('interviewQuestions');
        if (storedQuestions) {
          try {
            finalQuestions = JSON.parse(storedQuestions);
            console.log('✅ Loaded questions from session storage:', finalQuestions.length);
          } catch (e) {}
        }
      }
      
      if (finalAnswers.length === 0) {
        const storedAnswers = sessionStorage.getItem('interviewAnswers');
        if (storedAnswers) {
          try {
            finalAnswers = JSON.parse(storedAnswers);
            console.log('✅ Loaded answers from session storage:', finalAnswers.length);
          } catch (e) {}
        }
      }
      
      if (finalEvaluations.length === 0) {
        const storedEvaluations = sessionStorage.getItem('interviewEvaluations');
        if (storedEvaluations) {
          try {
            finalEvaluations = JSON.parse(storedEvaluations);
            console.log('✅ Loaded evaluations from session storage:', finalEvaluations.length);
          } catch (e) {}
        }
      }
      
      const questionDetails = finalQuestions.map((question, index) => {
        const answer = finalAnswers[index] || {};
        return {
          questionNumber: index + 1,
          question: typeof question === 'string' ? question : question?.question || question?.text || 'Question',
          topic: typeof question === 'object' ? question?.category || question?.topic || 'General' : 'General',
          answer: answer.answer || '[Skipped]',
          evaluation: finalEvaluations[index] || answer.evaluation || { score: 0, feedback: 'Skipped.' },
        };
      });
      const scores = finalEvaluations
        .map((evaluation) => Number(evaluation?.score))
        .filter((score) => Number.isFinite(score));
      const overallScore = scores.length
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;
      const skills = (() => {
        try {
          return JSON.parse(sessionStorage.getItem('allSkills') || '[]');
        } catch {
          return [];
        }
      })();
      const reportResult = {
        candidateName: user?.full_name || user?.name || 'Candidate',
        overallScore,
        technicalScore: overallScore,
        communicationScore: overallScore,
        confidenceScore: overallScore,
        totalQuestions: finalQuestions.length || finalAnswers.length || 1,
        answeredQuestions: finalAnswers.filter((answer) => answer.answer !== '[Skipped]').length,
        recommendedForNextRound: overallScore >= 6,
        questionDetails,
      };
      const savePayload = {
        overallScore,
        skillRatings: {},
        questionsAnswered: reportResult.answeredQuestions,
        interviewHistory: questionDetails,
        skills,
      };

      console.log('📤 Saving interview result:', {
        questionsCount: finalQuestions.length,
        answersCount: finalAnswers.length,
        evaluationsCount: finalEvaluations.length,
      });

      // The live backend persists completed interviews at POST /interviews.
      // Keep the local report usable even if persistence is unavailable.
      try {
        await api.post('/interviews', savePayload);
      } catch (saveError) {
        console.error('Interview result save error:', saveError);
      }

      setReport(reportResult);
      try {
        sessionStorage.setItem('interviewReport', JSON.stringify(reportResult));
        sessionStorage.setItem('interviewQuestions', JSON.stringify(finalQuestions));
        sessionStorage.setItem('interviewAnswers', JSON.stringify(finalAnswers));
        sessionStorage.setItem('interviewEvaluations', JSON.stringify(finalEvaluations));
        sessionStorage.setItem('totalQuestions', String(finalQuestions.length || finalAnswers.length));
      } catch (storageError) {
        console.error('Error saving report locally:', storageError);
      }

      return { success: true, report: reportResult };
    } catch (err) {
      console.error('Complete interview error:', err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // ─── Reset Interview ─────────────────────────────────────────────────
  const resetInterview = () => {
    setQuestions([]);
    setAnswers([]);
    setEvaluations([]);
    setReport(null);
    setCurrentQuestionIndex(0);
    setError(null);
    
    // Clear session storage
    sessionStorage.removeItem('questions');
    sessionStorage.removeItem('techTermsFound');
    sessionStorage.removeItem('questionSource');
    sessionStorage.removeItem('resumeSkills');
    sessionStorage.removeItem('spokenSkills');
    sessionStorage.removeItem('allSkills');
    sessionStorage.removeItem('selfIntro');
    sessionStorage.removeItem('interviewReport');
    sessionStorage.removeItem('interviewQuestions');
    sessionStorage.removeItem('interviewAnswers');
    sessionStorage.removeItem('interviewEvaluations');
    sessionStorage.removeItem('interviewSessionId');
  };

  // ─── Load Saved Session ──────────────────────────────────────────────
  const loadSavedSession = () => {
    try {
      const savedQuestions = sessionStorage.getItem('questions');
      const savedAnswers = sessionStorage.getItem('interviewAnswers');
      const savedEvaluations = sessionStorage.getItem('interviewEvaluations');
      const savedReport = sessionStorage.getItem('interviewReport');
      
      if (savedQuestions) {
        setQuestions(JSON.parse(savedQuestions));
      }
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
      }
      if (savedEvaluations) {
        setEvaluations(JSON.parse(savedEvaluations));
      }
      if (savedReport) {
        setReport(JSON.parse(savedReport));
      }
      
      return true;
    } catch (e) {
      console.error('Error loading saved session:', e);
      return false;
    }
  };

  return {
    questions,
    answers,
    evaluations,
    report,
    currentQuestionIndex,
    loading,
    error,
    processSelfIntro,
    submitAnswer,
    completeInterview,
    setCurrentQuestionIndex,
    resetInterview,
    loadSavedSession
  };
};