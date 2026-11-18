import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Phase1Test.css";

import ProgressBar from "../common/ProgressBar";
import QuestionCard from "./QuestionCard";
import QuestionNavigation from "./QuestionNavigation";
import Timer from "./Timer";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://100.117.158.50:3005/api";

const SECONDS_PER_QUESTION = 2 * 60; // adjust as needed

// Payload comes from router state, falling back to localStorage (page refresh)
const getConfiguration = (locationState) => {
  if (locationState) return locationState;
  try {
    return JSON.parse(localStorage.getItem("quizConfiguration"));
  } catch {
    return null;
  }
};

const Phase1Test = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const configuration = getConfiguration(location.state);

  const TOTAL_QUESTIONS = configuration?.numberOfQuestions || 15;
  const TOTAL_TIME_SECONDS = TOTAL_QUESTIONS * SECONDS_PER_QUESTION;

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const [answers, setAnswers] = useState({});
  const [reviewed, setReviewed] = useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME_SECONDS);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // ============================================================
  // LOAD QUESTIONS (filtered by the saved quiz configuration)
  // ============================================================

  useEffect(() => {
    loadPhase1Questions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPhase1Questions = async () => {
    try {
      setLoading(true);
      setError("");

      if (!configuration) {
        throw new Error(
          "Quiz configuration not found. Please set up the quiz again."
        );
      }

      const params = new URLSearchParams({
        category_id: configuration.category_id,
        subject_id: configuration.subject_id,
        topic_id: configuration.topic_id,
        difficulty: String(configuration.difficulty).toLowerCase(),
        limit: String(configuration.numberOfQuestions),
      });

      const response = await fetch(`${API_BASE_URL}/quiz/questions?${params}`);

      if (!response.ok) {
        throw new Error(
          `Failed to load questions. Server returned ${response.status}.`
        );
      }

      const data = await response.json();
      const rawQuestions = data.data || data.items || data.questions || [];

      const formattedQuestions = rawQuestions
        .filter((item) => item.question_type === "mcq")
        .slice(0, TOTAL_QUESTIONS)
        .map((item, index) => {
          // Backend structure can be nested, so handle both formats
          const questionText =
            typeof item.question === "string"
              ? item.question
              : item.question?.text || "";

          const options = Array.isArray(item.options)
            ? item.options
            : Array.isArray(item.question?.options)
            ? item.question.options
            : [];

          const correctAnswer =
            item.correct_answer ??
            item.correctAnswer ??
            item.question?.correct_answer ??
            item.question?.correctAnswer ??
            null;

          const explanation =
            item.explanation ?? item.question?.explanation ?? "";

          const categoryName =
            typeof item.category === "object"
              ? item.category?.name
              : item.category;

          return {
            id: item.id ?? index + 1,
            question: questionText,
            options,
            correctAnswer,
            explanation,
            solution: item.solution || "",
            section: categoryName || configuration.category || "General",
            category: categoryName || configuration.category || "",
            subject:
              typeof item.subject === "object"
                ? item.subject?.name
                : item.subject || configuration.subject || "",
            topic:
              typeof item.topic === "object"
                ? item.topic?.name
                : item.topic || configuration.topic || "",
            difficulty: item.difficulty || configuration.difficulty || "medium",
            language: item.language || "English",
            source: item.source || "manual",
            verified: item.verified ?? true,
          };
        });

      if (formattedQuestions.length === 0) {
        throw new Error(
          "No questions found for the selected category, subject, topic and difficulty."
        );
      }

      setQuestions(formattedQuestions);

      // Restore answers
      const savedAnswers = sessionStorage.getItem("phase1Answers");
      if (savedAnswers) {
        try {
          setAnswers(JSON.parse(savedAnswers));
        } catch (e) {
          console.warn("Could not restore Phase 1 answers");
        }
      }

      // Restore reviewed questions
      const savedReviewed = sessionStorage.getItem("phase1Reviewed");
      if (savedReviewed) {
        try {
          setReviewed(JSON.parse(savedReviewed));
        } catch (e) {
          console.warn("Could not restore reviewed questions");
        }
      }
    } catch (err) {
      console.error("Phase 1 load error:", err);
      setError(err.message || "Unable to load questions.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // SAVE ANSWERS / REVIEWED
  // ============================================================

  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem("phase1Answers", JSON.stringify(answers));
    }
  }, [answers]);

  useEffect(() => {
    sessionStorage.setItem("phase1Reviewed", JSON.stringify(reviewed));
  }, [reviewed]);

  // ============================================================
  // TIMER
  // ============================================================

  useEffect(() => {
    if (loading || submitted || questions.length === 0) return;

    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((previous) => {
        if (previous <= 1) {
          clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, submitted, questions.length, timeLeft]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleAnswer = (answer) => {
    setAnswers((previous) => ({ ...previous, [currentIndex]: answer }));
  };

  const toggleReview = () => {
    setReviewed((previous) => ({
      ...previous,
      [currentIndex]: !previous[currentIndex],
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
    }
  };

  const handleQuestionSelect = (index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(
      remainingSeconds
    ).padStart(2, "0")}`;
  };

  // ============================================================
  // RESULT
  // ============================================================

  const calculateResult = () => {
    let correct = 0;
    let attempted = 0;

    questions.forEach((question, index) => {
      const selectedAnswer = answers[index];

      if (
        selectedAnswer !== undefined &&
        selectedAnswer !== null &&
        selectedAnswer !== ""
      ) {
        attempted++;

        if (
          String(selectedAnswer).trim().toLowerCase() ===
          String(question.correctAnswer).trim().toLowerCase()
        ) {
          correct++;
        }
      }
    });

    const percentage =
      questions.length > 0
        ? Math.round((correct / questions.length) * 100)
        : 0;

    return {
      totalQuestions: questions.length,
      attempted,
      skipped: questions.length - attempted,
      correct,
      wrong: attempted - correct,
      percentage,
      answers,
      questions,
      timeLeft,
      configuration,
    };
  };

  const finishTest = (extra = {}) => {
    const result = { ...calculateResult(), ...extra };

    sessionStorage.setItem("phase1Result", JSON.stringify(result));
    sessionStorage.removeItem("phase1Answers");
    sessionStorage.removeItem("phase1Reviewed");

    setSubmitted(true);
    setShowSubmitModal(false);

    navigate("/phase1/result");
  };

  const handleSubmit = () => finishTest();

  const handleAutoSubmit = () => {
    if (submitted) return;
    console.log("Time completed. Auto submitting...");
    finishTest({ autoSubmitted: true });
  };

  // ============================================================
  // LOADING / ERROR / EMPTY
  // ============================================================

  if (loading) {
    return (
      <div className="phase1-test-page">
        <div className="phase1-loading">
          <h2>Loading Quiz...</h2>
          <p>Questions are being loaded from the database.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="phase1-test-page">
        <div className="phase1-error">
          <h2>Unable to Load Quiz</h2>
          <p>{error}</p>

          <button type="button" onClick={loadPhase1Questions}>
            Retry
          </button>

          <button type="button" onClick={() => navigate("/quiz")}>
            Back to Quiz Setup
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="phase1-test-page">
        <div className="phase1-error">
          <h2>No Questions Available</h2>
          <p>No questions matched your selection.</p>

          <button type="button" onClick={() => navigate("/quiz")}>
            Change Selection
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // DERIVED VALUES
  // ============================================================

  const currentQuestion = questions[currentIndex];

  const answeredCount = Object.keys(answers).filter(
    (key) =>
      answers[key] !== undefined && answers[key] !== null && answers[key] !== ""
  ).length;

  const reviewedCount = Object.values(reviewed).filter(Boolean).length;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="phase1-test-page">
      {/* TOP BAR */}
      <div className="phase1-header">
        <div>
          <h1>Phase 1 Practice</h1>
          <p>
            {[configuration?.category, configuration?.subject, configuration?.topic, configuration?.difficulty]
              .filter(Boolean)
              .join(" • ")}
          </p>
        </div>

        <div className="phase1-timer">
          <span>Time Left</span>
          <strong>{formatTime(timeLeft)}</strong>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="phase1-progress-wrapper">
        <ProgressBar progress={progress} />

        <div className="phase1-progress-text">
          Question {currentIndex + 1} of {questions.length}
        </div>
      </div>

      {/* STATS */}
      <div className="phase1-stats">
        <span>
          Answered: <strong>{answeredCount}</strong>
        </span>

        <span>
          Reviewed: <strong>{reviewedCount}</strong>
        </span>

        <span>
          Skipped: <strong>{questions.length - answeredCount}</strong>
        </span>
      </div>

      {/* MAIN CONTENT */}
      <div className="phase1-content">
        <div className="phase1-question-section">
          <QuestionCard
            question={currentQuestion}
            selectedAnswer={answers[currentIndex] || ""}
            onSelect={handleAnswer}
          />

          <button
            type="button"
            className="phase1-review-button"
            onClick={toggleReview}
          >
            {reviewed[currentIndex] ? "★ Marked for Review" : "☆ Mark for Review"}
          </button>

          <div className="phase1-navigation-buttons">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button type="button" onClick={handleNext}>
                Next
              </button>
            ) : (
              <button type="button" onClick={() => setShowSubmitModal(true)}>
                Review & Submit
              </button>
            )}
          </div>
        </div>

        <div className="phase1-question-navigation">
          <QuestionNavigation
            questions={questions}
            currentIndex={currentIndex}
            answers={answers}
            reviewed={reviewed}
            onQuestionSelect={handleQuestionSelect}
          />
        </div>
      </div>

      {/* SUBMIT MODAL */}
      {showSubmitModal && (
        <div className="phase1-modal-overlay">
          <div className="phase1-submit-modal">
            <h2>Submit Quiz?</h2>

            <p>Please review your answers before submitting.</p>

            <div className="phase1-submit-summary">
              <p>
                Total Questions: <strong>{questions.length}</strong>
              </p>
              <p>
                Answered: <strong>{answeredCount}</strong>
              </p>
              <p>
                Skipped: <strong>{questions.length - answeredCount}</strong>
              </p>
              <p>
                Marked for Review: <strong>{reviewedCount}</strong>
              </p>
            </div>

            <div className="phase1-modal-buttons">
              <button type="button" onClick={() => setShowSubmitModal(false)}>
                Continue Test
              </button>

              <button type="button" onClick={handleSubmit}>
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Phase1Test;