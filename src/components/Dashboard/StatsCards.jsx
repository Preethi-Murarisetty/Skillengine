import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const StatsCards = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/interviews')
      .then(res => {
        if (res.data.success) setHistory(res.data.sessions || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>;
  }

  if (!history.length) {
    return <div className="text-center py-6 text-gray-500"><p className="text-4xl mb-2">📋</p><p className="text-sm">No interviews yet. Start your first one!</p></div>;
  }

  const avgScore = (history.reduce((s, h) => s + (h.overall_score || 0), 0) / history.length).toFixed(1);
  const passCount = history.filter(h => h.recommended).length;

  return (
    <div className="space-y-4">
      <div className="stat-card transform hover:scale-105 transition-all duration-300"><div className="text-4xl">🎯</div><div className="stat-number">{history.length}</div><div className="text-white/80 text-sm mt-1">Interviews Taken</div></div>
      <div className="stat-card transform hover:scale-105 transition-all duration-300"><div className="text-4xl">⭐</div><div className="stat-number">{avgScore}</div><div className="text-white/80 text-sm mt-1">Avg Score / 10</div></div>
      <div className="stat-card transform hover:scale-105 transition-all duration-300"><div className="text-4xl">🏆</div><div className="stat-number">{passCount}</div><div className="text-white/80 text-sm mt-1">Recommended</div></div>
      <div className="mt-4"><h3 className="text-sm font-semibold text-gray-700 mb-2">Recent Sessions</h3><div className="space-y-2 max-h-48 overflow-y-auto">{history.slice(0, 5).map((s, i) => <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg text-sm"><div><p className="font-medium text-gray-800 truncate max-w-[120px]">{s.interview_date ? new Date(s.interview_date).toLocaleDateString() : 'N/A'}</p><p className="text-xs text-gray-500">{s.total_questions || 0} questions</p></div><div className="text-right"><span className={`font-bold ${(s.overall_score || 0) >= 6.5 ? 'text-green-600' : 'text-orange-500'}`}>{(s.overall_score || 0).toFixed(1)}</span><p className="text-xs">{s.recommended ? '✅ Pass' : '❌ Retry'}</p></div></div>)}</div></div>
    </div>
  );
};

export default StatsCards;
