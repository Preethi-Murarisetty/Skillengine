import React, { useEffect, useState } from "react";
import { RESULTS_API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { FaArrowRight, FaClipboardList, FaCode } from "react-icons/fa";



function Analytics() {
  const navigate = useNavigate();

  const [quizBadge, setQuizBadge] = useState({ loading: true, text: "" });

  useEffect(() => {
    const loadQuizSnapshot = async () => {
      try {
        const statusResponse = await fetch(`${RESULTS_API_BASE_URL}/api/exam-status`);
        const examData = await statusResponse.json();

        if (!examData.exam_id) {
          setQuizBadge({ loading: false, text: "No active exam" });
          return;
        }

        const response = await fetch(
          `${RESULTS_API_BASE_URL}/api/admin/results?exam_id=${examData.exam_id}`
        );

        const data = await response.json();

        if (!response.ok) throw new Error("failed");

        const count = data.total_participants || 0;
        setQuizBadge({ loading: false, text: `${count} participant${count !== 1 ? "s" : ""}` });
      } catch {
        setQuizBadge({ loading: false, text: "" });
      }
    };

    loadQuizSnapshot();
  }, []);

  const cards = [
    {
      key: "quiz",
      title: "Quiz Analytics",
      description: "View quiz results, scores and leaderboard data.",
      icon: FaClipboardList,
      path: "/admin/analytics/quiz",
      badge: quizBadge.loading ? "Loading..." : quizBadge.text,
      badgeTone: "live",
    },
    {
      key: "coding",
      title: "Coding Analytics",
      description: "View coding submissions and performance data.",
      icon: FaCode,
      path: "/admin/analytics/coding",
      badge: "Coming soon",
      badgeTone: "pending",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Performance Analytics</h1>
        <p className="text-gray-500 mt-2">View quiz and coding performance analytics.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards.map(({ key, title, description, icon: Icon, path, badge, badgeTone }) => (
          <button
            key={key}
            type="button"
            onClick={() => navigate(path)}
            className="group text-left bg-white border border-gray-200 rounded-xl p-7 shadow-sm hover:shadow-md hover:border-orange-300 transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center text-2xl shrink-0">
                  <Icon />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                  <p className="text-gray-500 mt-1">{description}</p>

                  {badge && (
                    <span
                      className={`inline-block mt-3 text-xs font-semibold px-2.5 py-1 rounded-full ${
                        badgeTone === "live"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </div>
              </div>

              <FaArrowRight className="text-gray-300 group-hover:text-orange-400 group-hover:translate-x-1 transition mt-2 shrink-0" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default Analytics;
