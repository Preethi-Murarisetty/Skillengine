import React from "react";
import { useNavigate } from "react-router-dom";
import { FaCode, FaPlus, FaTools, FaTrophy, FaUsers } from "react-icons/fa";

function PendingStatCard({ icon: Icon, label }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center text-xl shrink-0">
        <Icon />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <h2 className="text-2xl font-bold text-gray-300 mt-1">&mdash;</h2>
      </div>
    </div>
  );
}

function CodingAnalytics() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Coding Analytics</h1>
        <p className="text-gray-500 mt-2">View coding attempts and performance analytics.</p>
      </div>

      {/* Integration notice */}
      <div className="flex items-start gap-4 bg-orange-50 border border-orange-200 text-orange-800 rounded-xl px-5 py-4 mb-8">
        <FaTools className="text-xl mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Coding analytics aren't connected yet</p>
          <p className="text-sm text-orange-700 mt-1">
            The coding question submissions backend hasn't been wired up. Once it's connected,
            attempt counts and scores will appear here automatically.
          </p>
        </div>
      </div>

      {/* Placeholder stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <PendingStatCard icon={FaUsers} label="Total Coding Attempts" />
        <PendingStatCard icon={FaCode} label="Average Score" />
        <PendingStatCard icon={FaTrophy} label="Highest Score" />
      </div>

      {/* Empty state */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Coding Attempts</h2>
          <p className="text-sm text-gray-500 mt-1">Coding submissions will appear here once available.</p>
        </div>

        <div className="p-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center text-2xl mx-auto mb-4">
            <FaCode />
          </div>
          <p className="text-gray-700 font-semibold">No coding attempt data available</p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            In the meantime, you can keep building out your coding question bank.
          </p>

          <button
            type="button"
            onClick={() => navigate("/admin/coding")}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition"
          >
            <FaPlus />
            Add Coding Question
          </button>
        </div>
      </div>
    </div>
  );
}

export default CodingAnalytics;
