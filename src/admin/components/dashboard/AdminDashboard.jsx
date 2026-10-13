import React, { useEffect, useMemo, useState } from "react";
import { RESULTS_API_BASE_URL } from "../../config";
import { useNavigate } from "react-router-dom";

import {
  FaBook,
  FaChartLine,
  FaClipboardList,
  FaCode,
  FaFileAlt,
  FaLayerGroup,
  FaListUl,
  FaRedo,
  FaTag,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";

import {
  getManualQuestions,
  getCategories,
  getSubjects,
  getTopics,
  getUsers,
} from "../../services/api";

// ============================================================================
// HELPERS  (match the shape-handling used in AssessmentCreate)
// ============================================================================

const unwrapList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.data?.users)) return data.data.users;
  if (Array.isArray(data?.questions)) return data.questions;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.result)) return data.result;
  return [];
};

const getUserId = (u) =>
  u?.id ?? u?.user_id ?? u?._id ?? u?.userId ?? null;

const getUserName = (u) => {
  if (!u) return "Unknown User";
  if (u.name) return u.name;
  if (u.full_name) return u.full_name;
  if (u.fullName) return u.fullName;
  if (u.username) return u.username;
  if (u.first_name || u.last_name) {
    return [u.first_name, u.last_name].filter(Boolean).join(" ");
  }
  if (u.email) return u.email;
  return getUserId(u) || "Unknown User";
};

const getUserEmail = (u) =>
  u?.email || u?.email_id || u?.mail || "";

// ============================================================================
// STAT CARD
// ============================================================================

function StatCard({ icon: Icon, label, value, loading, error, accent = "orange" }) {
  const accentClasses = {
    orange: "bg-orange-100 text-orange-500",
    blue: "bg-blue-100 text-blue-500",
    green: "bg-green-100 text-green-500",
    purple: "bg-purple-100 text-purple-500",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
          accentClasses[accent] || accentClasses.orange
        }`}
      >
        <Icon />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>

        {loading ? (
          <div className="h-7 w-14 bg-gray-100 rounded animate-pulse mt-1" />
        ) : error ? (
          <p className="text-sm text-red-500 mt-1">Unavailable</p>
        ) : (
          <h2 className="text-2xl font-bold text-gray-800 mt-1">{value}</h2>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

function AdminDashboard() {
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());

  // --------------------------------------------------------------------------
  // Master data
  // --------------------------------------------------------------------------
  const [categories, setCategories] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState(false);

  // --------------------------------------------------------------------------
  // Question bank
  // --------------------------------------------------------------------------
  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState(false);

  // --------------------------------------------------------------------------
  // Users  →  getUsers()  (same source as AssessmentCreate)
  // --------------------------------------------------------------------------
  const [allUsers, setAllUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState(false);

  // --------------------------------------------------------------------------
  // Quiz results
  // --------------------------------------------------------------------------
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [topResults, setTopResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(true);
  const [resultsMessage, setResultsMessage] = useState("");

  // --------------------------------------------------------------------------
  // Merged rows: every user + their exam performance (0 attempts if none)
  // --------------------------------------------------------------------------
  const [userPerformance, setUserPerformance] = useState([]);
  const [userSearch, setUserSearch] = useState("");

  // ==========================================================================
  // CLOCK
  // ==========================================================================
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // ==========================================================================
  // LOAD MASTER DATA
  // ==========================================================================
  const loadMasterData = async () => {
    setLoadingMaster(true);
    setMasterError(false);

    try {
      const cats = await getCategories();
      const categoryList = Array.isArray(cats) ? cats : [];
      setCategories(categoryList);

      const subjectLists = await Promise.all(
        categoryList.map(async (category) => {
          try {
            const subs = await getSubjects(category.id);
            return (Array.isArray(subs) ? subs : []).map((s) => ({
              ...s,
              category_id: category.id,
            }));
          } catch (error) {
            console.error(
              `Failed to load subjects for category ${category.id}:`,
              error
            );
            return [];
          }
        })
      );

      const allSubjects = subjectLists.flat();
      setSubjects(allSubjects);

      const topicLists = await Promise.all(
        allSubjects.map(async (subject) => {
          try {
            const tops = await getTopics(subject.id);
            return (Array.isArray(tops) ? tops : []).map((t) => ({
              ...t,
              subject_id: subject.id,
            }));
          } catch (error) {
            console.error(
              `Failed to load topics for subject ${subject.id}:`,
              error
            );
            return [];
          }
        })
      );

      setTopics(topicLists.flat());
    } catch (error) {
      console.error("Failed to load master data:", error);
      setMasterError(true);
    } finally {
      setLoadingMaster(false);
    }
  };

  // ==========================================================================
  // LOAD QUESTIONS
  // ==========================================================================
  const loadQuestions = async () => {
    setLoadingQuestions(true);
    setQuestionsError(false);

    try {
      const data = await getManualQuestions();
      setQuestions(unwrapList(data));
    } catch (error) {
      console.error("Failed to load question bank:", error);
      setQuestionsError(true);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // ==========================================================================
  // LOAD USERS  →  getUsers()  (identical to AssessmentCreate)
  // ==========================================================================
  const loadUsers = async () => {
    setLoadingUsers(true);
    setUsersError(false);

    try {
      const data = await getUsers();
      console.log("👥 Users API response:", data);

      const userList = unwrapList(data);
      setAllUsers(userList);
      return userList;
    } catch (error) {
      console.error("Failed to load users:", error);
      setUsersError(true);
      setAllUsers([]);
      return [];
    } finally {
      setLoadingUsers(false);
    }
  };

  // ==========================================================================
  // LOAD QUIZ RESULTS
  // ==========================================================================
  const loadResults = async () => {
    setLoadingResults(true);
    setResultsMessage("");

    try {
      const statusResponse = await fetch(
        `${RESULTS_API_BASE_URL}/api/exam-status`
      );
      const examData = await statusResponse.json();

      if (!statusResponse.ok) {
        throw new Error(examData.detail || "Unable to get current exam.");
      }

      // No active exam
      if (!examData.exam_id) {
        setResultsMessage("No active exam.");
        setTotalParticipants(0);
        setAverageScore(0);
        setHighestScore(0);
        setTopResults([]);
        return [];
      }

      const response = await fetch(
        `${RESULTS_API_BASE_URL}/api/admin/results?exam_id=${encodeURIComponent(
          examData.exam_id
        )}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Unable to load quiz results."
        );
      }

      const allResults = Array.isArray(data.results) ? data.results : [];

      // Overall stats
      setTotalParticipants(
        Number(data.total_participants) || allResults.length
      );

      const scores = allResults.map((r) => Number(r.score) || 0);
      if (scores.length > 0) {
        const totalScore = scores.reduce((s, v) => s + v, 0);
        setAverageScore((totalScore / scores.length).toFixed(2));
        setHighestScore(Math.max(...scores));
      } else {
        setAverageScore(0);
        setHighestScore(0);
      }

      // Top 5
      const sortedResults = [...allResults].sort(
        (a, b) => (Number(b.score) || 0) - (Number(a.score) || 0)
      );
      setTopResults(sortedResults.slice(0, 5));

      return allResults;
    } catch (error) {
      console.error("Failed to load quiz results:", error);
      setResultsMessage("Unable to load quiz participant data.");
      setTopResults([]);
      return [];
    } finally {
      setLoadingResults(false);
    }
  };

  // ==========================================================================
  // MERGE USERS (from /api/users/users) + EXAM RESULTS
  // Every user shows up, even with 0 attempts.
  // ==========================================================================
  const mergeUsersAndResults = (users, results) => {
    // Build a userId → performance map from exam results
    const perfMap = {};

    (results || []).forEach((result, index) => {
      const userId =
        result.user_id ||
        result.userId ||
        result.user?.id ||
        result.participant_id ||
        result.participantId ||
        result.id ||
        result.instagram ||
        result.email ||
        result.name ||
        `unknown-${index}`;

      if (!perfMap[userId]) {
        perfMap[userId] = {
          attempts: 0,
          scores: [],
          highestScore: 0,
          lastAttempt: null,
          results: [],
        };
      }

      const entry = perfMap[userId];
      const score = Number(result.score) || 0;

      entry.attempts += 1;
      entry.scores.push(score);
      entry.highestScore = Math.max(entry.highestScore, score);
      entry.results.push(result);

      const attemptDate = new Date(
        result.created_at ||
          result.completed_at ||
          result.completedAt ||
          result.updated_at ||
          result.updatedAt ||
          0
      );
      const currentLastDate = new Date(entry.lastAttempt || 0);
      if (
        !Number.isNaN(attemptDate.getTime()) &&
        attemptDate > currentLastDate
      ) {
        entry.lastAttempt =
          result.created_at ||
          result.completed_at ||
          result.completedAt ||
          result.updated_at ||
          result.updatedAt ||
          null;
      }
    });

    // Join every registered user with their performance (or empty)
    return (users || []).map((u) => {
      const userId = getUserId(u);
      const perf = perfMap[userId] || {
        attempts: 0,
        scores: [],
        highestScore: 0,
        lastAttempt: null,
        results: [],
      };

      const totalScore = perf.scores.reduce((s, v) => s + v, 0);
      const average =
        perf.scores.length > 0 ? totalScore / perf.scores.length : 0;

      return {
        userId,
        name: getUserName(u),
        email: getUserEmail(u),
        instagram: u.instagram || u.instagram_username || "",
        role: u.role || "student",
        attempts: perf.attempts,
        averageScore: average.toFixed(2),
        highestScore: perf.highestScore,
        totalScore,
        lastAttempt: perf.lastAttempt,
      };
    });
  };

  // ==========================================================================
  // REFRESH EVERYTHING
  // ==========================================================================
  const refreshAll = async () => {
    // Fire independent loaders in parallel
    const usersPromise = loadUsers();
    const resultsPromise = loadResults();
    loadMasterData();
    loadQuestions();

    const [users, results] = await Promise.all([
      usersPromise,
      resultsPromise,
    ]);

    setUserPerformance(mergeUsersAndResults(users, results));
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================================
  // DERIVED DATA
  // ==========================================================================

  const difficultyCounts = useMemo(() => {
    const counts = { easy: 0, medium: 0, hard: 0 };
    questions.forEach((q) => {
      const level = String(q.difficulty || "").toLowerCase();
      if (counts[level] !== undefined) counts[level] += 1;
    });
    return counts;
  }, [questions]);

  const topCategoriesByQuestions = useMemo(() => {
    const counts = {};
    questions.forEach((question) => {
      const id =
        question.category_id ||
        question.category?.id ||
        question.category ||
        "uncategorized";
      counts[id] = (counts[id] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([id, count]) => {
        const match = categories.find(
          (c) => String(c.id) === String(id)
        );
        return { id, name: match?.name || "Uncategorized", count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [questions, categories]);

  const filteredUsers = useMemo(() => {
    const search = userSearch.trim().toLowerCase();
    if (!search) return userPerformance;

    return userPerformance.filter(
      (u) =>
        String(u.name || "").toLowerCase().includes(search) ||
        String(u.email || "").toLowerCase().includes(search) ||
        String(u.instagram || "").toLowerCase().includes(search)
    );
  }, [userPerformance, userSearch]);

  const totalQuestions = questions.length;
  const maxDifficulty = Math.max(1, ...Object.values(difficultyCounts));
  const maxCategoryCount = Math.max(
    1,
    ...topCategoriesByQuestions.map((c) => c.count)
  );

  const greeting = (() => {
    const hour = now.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return "—";
    return parsed.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="pb-10">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            {greeting}, welcome to skillEngine Admin
          </h1>
          <p className="text-gray-500 mt-2">
            Here's what's happening across your platform right now.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 hidden md:block">
            {now.toLocaleString("en-IN", {
              weekday: "short",
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          <button
            type="button"
            onClick={refreshAll}
            disabled={
              loadingMaster ||
              loadingQuestions ||
              loadingResults ||
              loadingUsers
            }
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            <FaRedo
              className={
                loadingMaster ||
                loadingQuestions ||
                loadingResults ||
                loadingUsers
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>
        </div>
      </div>

      {/* ================= PLATFORM OVERVIEW ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={FaClipboardList}
          label="Total Questions"
          value={totalQuestions}
          loading={loadingQuestions}
          error={questionsError}
          accent="orange"
        />
        <StatCard
          icon={FaTag}
          label="Categories"
          value={categories.length}
          loading={loadingMaster}
          error={masterError}
          accent="blue"
        />
        <StatCard
          icon={FaBook}
          label="Subjects"
          value={subjects.length}
          loading={loadingMaster}
          error={masterError}
          accent="green"
        />
        <StatCard
          icon={FaListUl}
          label="Topics"
          value={topics.length}
          loading={loadingMaster}
          error={masterError}
          accent="purple"
        />
      </div>

      {/* ================= USER / PERFORMANCE OVERVIEW ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        <StatCard
          icon={FaUsers}
          label="Registered Users"
          value={allUsers.length}
          loading={loadingUsers}
          error={usersError}
          accent="blue"
        />
        <StatCard
          icon={FaClipboardList}
          label="Exam Participants"
          value={totalParticipants}
          loading={loadingResults}
          error={!!resultsMessage}
          accent="green"
        />
        <StatCard
          icon={FaChartLine}
          label="Average Score"
          value={averageScore}
          loading={loadingResults}
          error={!!resultsMessage}
          accent="purple"
        />
        <StatCard
          icon={FaTrophy}
          label="Highest Score"
          value={highestScore}
          loading={loadingResults}
          error={!!resultsMessage}
          accent="orange"
        />
      </div>

      {/* ================= INDIVIDUAL USER PERFORMANCE ================= */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaUsers className="text-orange-500" />
                All Registered Users
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Search users and review their exam performance.
              </p>
            </div>

            <div className="w-full lg:w-96">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search name, email or Instagram..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
              />
            </div>
          </div>
        </div>

        <div className="px-6 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing{" "}
              <span className="font-semibold text-gray-700">
                {filteredUsers.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-gray-700">
                {userPerformance.length}
              </span>{" "}
              users
            </p>
            {userSearch && (
              <button
                type="button"
                onClick={() => setUserSearch("")}
                className="text-sm text-orange-500 hover:text-orange-600 font-semibold"
              >
                Clear search
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {loadingUsers || loadingResults ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
              <p className="text-gray-500 mt-3">
                Loading user performance...
              </p>
            </div>
          ) : usersError ? (
            <div className="text-center py-12">
              <div className="text-red-400 text-4xl mb-3">
                <FaUsers className="mx-auto" />
              </div>
              <p className="text-red-500">Unable to load users.</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-300 text-5xl mb-3">
                <FaUsers className="mx-auto" />
              </div>
              <p className="text-gray-500 font-medium">
                {userSearch
                  ? "No users match your search."
                  : "No users have been registered yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-200">
                    <th className="py-3 pr-4">User</th>
                    <th className="py-3 pr-4">Role</th>
                    <th className="py-3 pr-4">Attempts</th>
                    <th className="py-3 pr-4">Average Score</th>
                    <th className="py-3 pr-4">Highest Score</th>
                    <th className="py-3 pr-4">Last Attempt</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={String(user.userId)}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold shrink-0">
                            {String(user.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">
                              {user.name}
                            </p>
                            {user.email && (
                              <p className="text-xs text-gray-500 truncate max-w-[220px]">
                                {user.email}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold capitalize">
                          {user.role || "student"}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <span className="inline-flex items-center justify-center min-w-[36px] px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold">
                          {user.attempts}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <span className="font-bold text-gray-800">
                          {user.attempts > 0 ? user.averageScore : "—"}
                        </span>
                      </td>

                      <td className="py-4 pr-4">
                        <span className="font-bold text-orange-600">
                          {user.attempts > 0 ? user.highestScore : "—"}
                        </span>
                      </td>

                      <td className="py-4 pr-4 text-sm text-gray-500">
                        {formatDate(user.lastAttempt)}
                      </td>

                      <td className="py-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/users/${encodeURIComponent(
                                String(user.userId)
                              )}`
                            )
                          }
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= TOP QUIZ RESULTS ================= */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm mb-8">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <FaTrophy className="text-orange-500" />
              Top Quiz Results
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Highest scores from the current exam attempt data.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/admin/analytics/quiz")}
            className="text-sm font-semibold text-orange-500 hover:text-orange-600"
          >
            View full analytics →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-6">
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">Total Participants</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {loadingResults ? "…" : totalParticipants}
            </h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">Average Score</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {loadingResults ? "…" : averageScore}
            </h3>
          </div>
          <div className="bg-gray-50 rounded-xl p-5">
            <p className="text-sm text-gray-500">Highest Score</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              {loadingResults ? "…" : highestScore}
            </h3>
          </div>
        </div>

        <div className="px-6 pb-6">
          {loadingResults ? (
            <div className="text-center text-gray-500 py-6">
              Loading participant data...
            </div>
          ) : resultsMessage ? (
            <div className="text-center text-gray-500 py-6">
              {resultsMessage}
            </div>
          ) : topResults.length === 0 ? (
            <div className="text-center text-gray-500 py-6">
              No participants yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="text-left text-xs uppercase text-gray-400 border-b border-gray-200">
                    <th className="py-2 pr-4">Rank</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Instagram</th>
                    <th className="py-2 pr-4 text-right">Score</th>
                    <th className="py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {topResults.map((result, index) => (
                    <tr
                      key={`${result.name || "user"}-${
                        result.created_at || index
                      }`}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3 pr-4 font-semibold text-gray-700">
                        {index === 0
                          ? "🥇"
                          : index === 1
                          ? "🥈"
                          : index === 2
                          ? "🥉"
                          : `#${index + 1}`}
                      </td>
                      <td className="py-3 pr-4 text-gray-700">
                        {result.name ||
                          result.full_name ||
                          result.username ||
                          "Unknown"}
                      </td>
                      <td className="py-3 pr-4 text-gray-500">
                        {result.instagram
                          ? `@${String(result.instagram).replace(/^@/, "")}`
                          : "—"}
                      </td>
                      <td className="py-3 pr-4 text-right font-bold text-gray-800">
                        {result.score}
                      </td>
                      <td className="py-3 text-right">
                        {(result.user_id ||
                          result.userId ||
                          result.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/admin/users/${encodeURIComponent(
                                  String(
                                    result.user_id ||
                                      result.userId ||
                                      result.id
                                  )
                                )}`
                              )
                            }
                            className="text-sm font-semibold text-orange-500 hover:text-orange-600"
                          >
                            View
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ================= QUESTION BANK BREAKDOWN ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Difficulty */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <FaLayerGroup className="text-orange-500" />
            Question Bank by Difficulty
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Distribution of manual quiz questions by difficulty level.
          </p>

          {loadingQuestions ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : questionsError ? (
            <div className="text-red-500 text-sm">
              Unable to load question bank.
            </div>
          ) : totalQuestions === 0 ? (
            <div className="text-gray-500 text-sm">
              No questions created yet.
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { key: "easy", label: "Easy", color: "bg-green-500" },
                { key: "medium", label: "Medium", color: "bg-orange-500" },
                { key: "hard", label: "Hard", color: "bg-red-500" },
              ].map(({ key, label, color }) => (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="text-gray-500">
                      {difficultyCounts[key]}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${color}`}
                      style={{
                        width: `${
                          (difficultyCounts[key] / maxDifficulty) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Categories */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
            <FaTag className="text-orange-500" />
            Top Categories by Questions
          </h2>
          <p className="text-sm text-gray-500 mb-5">
            Categories with the most questions in the question bank.
          </p>

          {loadingQuestions || loadingMaster ? (
            <div className="text-gray-500 text-sm">Loading...</div>
          ) : topCategoriesByQuestions.length === 0 ? (
            <div className="text-gray-500 text-sm">
              No data available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {topCategoriesByQuestions.map((category) => (
                <div key={category.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 font-medium">
                      {category.name}
                    </span>
                    <span className="text-gray-500">{category.count}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className="h-2.5 rounded-full bg-blue-500"
                      style={{
                        width: `${
                          (category.count / maxCategoryCount) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ================= QUICK ACTIONS ================= */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
          <FaTrophy className="text-orange-500" />
          Quick Actions
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <button
            type="button"
            onClick={() => navigate("/admin/quiz")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaClipboardList className="text-orange-500 text-xl mb-3" />
            <p className="font-semibold text-gray-800">Add Quiz Question</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a new manual quiz question.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/coding")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaCode className="text-orange-500 text-xl mb-3" />
            <p className="font-semibold text-gray-800">Add Coding Question</p>
            <p className="text-sm text-gray-500 mt-1">
              Create a new coding problem.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/assessment")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaClipboardList className="text-orange-500 text-xl mb-3" />
            <p className="font-semibold text-gray-800">Create Assessment</p>
            <p className="text-sm text-gray-500 mt-1">
              Title, description, MCQ and coding in one exam.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/resume")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaFileAlt className="text-orange-500 text-xl mb-3" />
            <p className="font-semibold text-gray-800">Manage PDF Exams</p>
            <p className="text-sm text-gray-500 mt-1">
              Schedule and manage aptitude exams.
            </p>
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/analytics")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaTrophy className="text-orange-500 text-xl mb-3" />
            <p className="font-semibold text-gray-800">View Analytics</p>
            <p className="text-sm text-gray-500 mt-1">
              Deep-dive into quiz and coding performance.
            </p>
          </button>

          {/* NEW: Manage Master Data */}
          <button
            type="button"
            onClick={() => navigate("/admin/master-data")}
            className="text-left border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition"
          >
            <FaLayerGroup className="text-orange-500 text-xl mb-3" />

            <p className="font-semibold text-gray-800">
              Manage Master Data
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Add categories, subjects and topics.
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;