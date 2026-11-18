
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../common/Card";

const Phase1Intro = () => {
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    {
      value: "all",
      title: "All",
      description:
        "Aptitude, Reasoning, Puzzle, and Soft Skills topics",
    },
    {
      value: "aptitude",
      title: "Aptitude",
      description:
        "Numerical and quantitative problem solving",
    },
    {
      value: "reasoning",
      title: "Reasoning",
      description:
        "Patterns, logic, and analytical thinking",
    },
    {
      value: "puzzle",
      title: "Puzzle",
      description:
        "Logical puzzles and problem solving",
    },
    {
      value: "soft_skills",
      title: "Soft Skills",
      description:
        "Communication and workplace situations",
    },
  ];

  const handleStartPractice = () => {
    // Save selected category so Phase1Test.jsx can use it
    sessionStorage.setItem(
      "phase1Category",
      selectedCategory
    );

    // Clear previous attempt data
    sessionStorage.removeItem("phase1Answers");
    sessionStorage.removeItem("phase1Reviewed");
    sessionStorage.removeItem("phase1Result");

    navigate("/phase1/practice");
  };

  return (
    <div className="mx-auto max-w-4xl">

      {/* HERO */}
      <div className="gradient-hero animate-gradient rounded-3xl p-8 text-white md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
          Practice journey
        </p>

        <h1 className="mt-3 text-4xl font-bold md:text-5xl">
          Phase 1 Practice
        </h1>

        <p className="mt-4 max-w-2xl text-lg text-white/90">
          Select a category and complete 15 AI-generated questions
          within 30 minutes.
        </p>
      </div>

      {/* CATEGORY SELECTION */}
      <Card className="mt-8" hover={false}>

        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            Select Category
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Choose <strong>All</strong> to cover questions from all
            Phase 1 categories and topics.
          </p>
        </div>

        {/* CATEGORY CARDS */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          {categories.map((category) => {
            const isSelected =
              selectedCategory === category.value;

            return (
              <button
                key={category.value}
                type="button"
                onClick={() =>
                  setSelectedCategory(category.value)
                }
                className={`text-left rounded-xl border-2 p-5 transition-all ${
                  isSelected
                    ? "border-indigo-600 bg-indigo-50 shadow-md"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-gray-50"
                }`}
              >

                <div className="flex items-start justify-between gap-3">

                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {category.title}
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-600">
                      {category.description}
                    </p>
                  </div>

                  {/* SELECTED ICON */}
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
                      isSelected
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <span className="text-sm font-bold">
                        ✓
                      </span>
                    )}
                  </div>

                </div>

                {/* QUESTION COUNT */}
                <div className="mt-4 text-sm font-semibold text-indigo-600">
                  15 Questions
                </div>

              </button>
            );
          })}

        </div>

        {/* INFO */}
        <div className="mt-8 rounded-xl bg-gray-50 p-5">

          <div className="flex flex-wrap items-center justify-between gap-4">

            <div>
              <p className="font-semibold text-gray-800">
                Selected Category
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {categories.find(
                  (item) =>
                    item.value === selectedCategory
                )?.title}
              </p>
            </div>

            <div>
              <p className="font-semibold text-gray-800">
                Practice
              </p>

              <p className="mt-1 text-sm text-gray-500">
                15 Questions | 30 Minutes
              </p>
            </div>

          </div>

        </div>

        {/* START */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 pt-6">

          <div>
            <p className="font-semibold text-gray-800">
              Ready to begin?
            </p>

            <p className="mt-1 text-sm text-gray-500">
              Questions will be generated based on your selected
              category.
            </p>
          </div>

          <button
            type="button"
            onClick={handleStartPractice}
            className="btn-primary"
          >
            Start Practice{" "}
            <span aria-hidden="true">
              &#8594;
            </span>
          </button>

        </div>

      </Card>

    </div>
  );
};

export default Phase1Intro;

