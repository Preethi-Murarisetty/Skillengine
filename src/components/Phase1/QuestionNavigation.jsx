import React from "react";

const QuestionNavigation = ({
  currentIndex = 0,
  totalQuestions = 0,
  answers = {},
  reviewed = {},
  onQuestionClick,
}) => {
  // Safety check
  const safeAnswers = answers || {};
  const safeReviewed = reviewed || {};

  return (
    <div className="question-navigation">
      <div className="question-navigation-title">
        Questions
      </div>

      <div className="question-navigation-grid">
        {Array.from(
          { length: totalQuestions },
          (_, index) => {
            const isCurrent =
              index === currentIndex;

            const isAnswered =
              safeAnswers[index] !== undefined &&
              safeAnswers[index] !== null &&
              safeAnswers[index] !== "";

            const isReviewed =
              safeReviewed[index] === true;

            return (
              <button
                key={index}
                type="button"
                onClick={() =>
                  onQuestionClick &&
                  onQuestionClick(index)
                }
                className={`
                  question-navigation-item
                  ${isCurrent ? "current" : ""}
                  ${isAnswered ? "answered" : ""}
                  ${isReviewed ? "reviewed" : ""}
                `}
              >
                {index + 1}
              </button>
            );
          }
        )}
      </div>

      {/* Legend */}
      <div className="question-navigation-legend">
        <div className="legend-item">
          <span className="legend-box current-box"></span>
          <span>Current</span>
        </div>

        <div className="legend-item">
          <span className="legend-box answered-box"></span>
          <span>Answered</span>
        </div>

        <div className="legend-item">
          <span className="legend-box reviewed-box"></span>
          <span>Marked</span>
        </div>

        <div className="legend-item">
          <span className="legend-box unanswered-box"></span>
          <span>Not Answered</span>
        </div>
      </div>
    </div>
  );
};

export default QuestionNavigation;