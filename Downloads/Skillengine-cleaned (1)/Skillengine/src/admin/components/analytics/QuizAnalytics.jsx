import React, { useEffect, useMemo, useState } from "react";
import { RESULTS_API_BASE_URL as API_BASE_URL } from "../../config";
import {
  FaChartLine,
  FaClock,
  FaDownload,
  FaExclamationTriangle,
  FaRedo,
  FaSearch,
  FaTrophy,
  FaUsers,
} from "react-icons/fa";


const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "rank", label: "Rank" },
  { value: "score_desc", label: "Score (High to Low)" },
  { value: "score_asc", label: "Score (Low to High)" },
  { value: "name", label: "Name (A-Z)" },
];

function StatCard({ icon: Icon, label, value, accent = "orange" }) {
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
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <h2 className="text-2xl font-bold text-gray-800 mt-1">{value}</h2>
      </div>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-100 animate-pulse shrink-0" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-6 w-16 bg-gray-100 rounded animate-pulse mt-2" />
      </div>
    </div>
  );
}

function ScoreBadge({ score, totalQuestions }) {
  const percentage = totalQuestions ? (Number(score) / Number(totalQuestions)) * 100 : null;

  let classes = "bg-gray-100 text-gray-700";
  if (percentage !== null) {
    if (percentage >= 75) classes = "bg-green-100 text-green-700";
    else if (percentage >= 50) classes = "bg-orange-100 text-orange-700";
    else classes = "bg-red-100 text-red-700";
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${classes}`}>
      {score}
      {totalQuestions ? ` / ${totalQuestions}` : ""}
    </span>
  );
}

function QuizAnalytics() {
  const [results, setResults] = useState([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [highestScore, setHighestScore] = useState(0);
  const [averageTime, setAverageTime] = useState(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rank");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null); // null | "no-exam" | "error"
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, sortBy]);

  const loadResults = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const statusResponse = await fetch(`${API_BASE_URL}/api/exam-status`);
      const examData = await statusResponse.json();

      if (!examData.exam_id) {
        setStatus("no-exam");
        setResults([]);
        setTotalParticipants(0);
        setAverageScore(0);
        setHighestScore(0);
        setAverageTime(null);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/admin/results?exam_id=${examData.exam_id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to load quiz results.");
      }

      const allResults = data.results || [];

      setResults(allResults);
      setTotalParticipants(data.total_participants || 0);

      if (allResults.length > 0) {
        const scores = allResults.map((item) => Number(item.score) || 0);
        const total = scores.reduce((sum, score) => sum + score, 0);

        setAverageScore((total / scores.length).toFixed(2));
        setHighestScore(Math.max(...scores));

        const times = allResults
          .map((item) => Number(item.time_taken))
          .filter((value) => !Number.isNaN(value));

        setAverageTime(
          times.length ? Math.round(times.reduce((sum, t) => sum + t, 0) / times.length) : null
        );
      } else {
        setAverageScore(0);
        setHighestScore(0);
        setAverageTime(null);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error(error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return "-";

    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes}m ${remaining}s`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (isNaN(date.getTime())) return value;

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredResults = useMemo(() => {
    const value = search.toLowerCase().trim();

    const filtered = results.filter((result) => {
      const name = String(result.name || "").toLowerCase();
      const instagram = String(result.instagram || "").toLowerCase();
      return name.includes(value) || instagram.includes(value);
    });

    const sorted = [...filtered];

    if (sortBy === "score_desc") sorted.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    else if (sortBy === "score_asc") sorted.sort((a, b) => (Number(a.score) || 0) - (Number(b.score) || 0));
    else if (sortBy === "name") sorted.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    else sorted.sort((a, b) => (Number(a.rank) || 0) - (Number(b.rank) || 0));

    return sorted;
  }, [results, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const paginatedResults = filteredResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportCsv = () => {
    if (filteredResults.length === 0) return;

    const headers = [
      "Rank",
      "Name",
      "Instagram",
      "Score",
      "Correct",
      "Wrong",
      "Unanswered",
      "Total Questions",
      "Time Taken (s)",
      "Submitted At",
    ];

    const rows = filteredResults.map((result) => [
      result.rank ?? "",
      result.name ?? "",
      result.instagram ?? "",
      result.score ?? "",
      result.correct ?? "",
      result.wrong ?? "",
      result.unanswered ?? "",
      result.total_questions ?? "",
      result.time_taken ?? "",
      result.created_at ?? "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `quiz-results-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Quiz Analytics</h1>
          <p className="text-gray-500 mt-2">
            View quiz results and participant performance.
            {lastUpdated && (
              <span className="text-gray-400">
                {" "}
                &middot; Last updated {lastUpdated.toLocaleTimeString("en-IN")}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={exportCsv}
            disabled={loading || filteredResults.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <FaDownload />
            Export CSV
          </button>

          <button
            onClick={loadResults}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-60 transition"
          >
            <FaRedo className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={FaUsers} label="Total Participants" value={totalParticipants} accent="orange" />
            <StatCard icon={FaChartLine} label="Average Score" value={averageScore} accent="blue" />
            <StatCard icon={FaTrophy} label="Highest Score" value={highestScore} accent="green" />
            <StatCard
              icon={FaClock}
              label="Average Time Taken"
              value={averageTime !== null ? formatTime(averageTime) : "-"}
              accent="purple"
            />
          </>
        )}
      </div>

      {/* Results */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Quiz Results</h2>
            <p className="text-sm text-gray-500 mt-1">
              {filteredResults.length} of {results.length} participant
              {results.length !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                placeholder="Search by name or Instagram..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-72 border border-gray-300 rounded-lg pl-9 pr-4 py-2.5 outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white outline-none focus:border-orange-500"
            >
              {SORT_OPTIONS.map((option) => (
                <option value={option.value} key={option.value}>
                  Sort: {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-500">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
            Loading quiz results...
          </div>
        ) : status === "no-exam" ? (
          <div className="p-16 text-center">
            <FaExclamationTriangle className="mx-auto text-3xl text-gray-300 mb-3" />
            <p className="text-gray-600 font-semibold">No active exam</p>
            <p className="text-gray-400 text-sm mt-1">
              Schedule a PDF exam to start collecting participant results.
            </p>
          </div>
        ) : status === "error" ? (
          <div className="p-16 text-center">
            <FaExclamationTriangle className="mx-auto text-3xl text-red-300 mb-3" />
            <p className="text-gray-600 font-semibold">Unable to load quiz analytics</p>
            <p className="text-gray-400 text-sm mt-1">Check that the results server is reachable and try again.</p>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="p-16 text-center text-gray-500">
            {results.length === 0
              ? "No participants yet."
              : "No results match your search."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-gray-900 text-white text-sm">
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3 text-center">Name</th>
                    <th className="px-4 py-3 text-center">Instagram</th>
                    <th className="px-4 py-3 text-center">Score</th>
                    <th className="px-4 py-3 text-center">Correct</th>
                    <th className="px-4 py-3 text-center">Wrong</th>
                    <th className="px-4 py-3 text-center">Unanswered</th>
                    <th className="px-4 py-3 text-center">Time Taken</th>
                    <th className="px-4 py-3 text-center">Submitted</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedResults.map((result, index) => (
                    <tr
                      key={`${result.instagram || result.name || "row"}-${index}`}
                      className="border-b border-gray-100 hover:bg-orange-50 transition"
                    >
                      <td className="px-4 py-3 text-center font-semibold text-gray-700">
                        {result.rank <= 3 ? ["🥇", "🥈", "🥉"][result.rank - 1] : ""} {result.rank ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">{result.name}</td>
                      <td className="px-4 py-3 text-center text-gray-500">@{result.instagram}</td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={result.score} totalQuestions={result.total_questions} />
                      </td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{result.correct}</td>
                      <td className="px-4 py-3 text-center text-red-500 font-medium">{result.wrong}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{result.unanswered}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{formatTime(result.time_taken)}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{formatDateTime(result.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default QuizAnalytics;
