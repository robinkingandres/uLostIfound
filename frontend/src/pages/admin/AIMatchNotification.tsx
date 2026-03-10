import { useState, useEffect, useCallback } from 'react';
import { Sparkles, ClipboardList, CheckCircle, RefreshCw, Search } from 'lucide-react';
import StatCard from '../../components/admin/StatCard';
import { fetchAIMatches, fetchAIMatchStats, updateAIMatchStatus, triggerAIScan } from '../../services/api';
import type { AIMatch, AIMatchStats } from '../../services/api';

type TabStatus = 'All' | 'Verified' | 'Pending' | 'Rejected';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function AIMatchNotification() {
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [stats, setStats] = useState<AIMatchStats>({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [activeTab, setActiveTab] = useState<TabStatus>('All');
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [matchesResult, statsResult] = await Promise.allSettled([
      fetchAIMatches(),
      fetchAIMatchStats(),
    ]);

    if (matchesResult.status === 'fulfilled') {
      console.log('AI matches loaded:', matchesResult.value.length);
      setMatches(matchesResult.value);
    } else {
      console.error('Failed to load AI matches:', matchesResult.reason);
      setMatches([]);
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    } else {
      console.error('Failed to load AI stats:', statsResult.reason);
      const loaded = matchesResult.status === 'fulfilled' ? matchesResult.value : [];
      setStats({
        total: loaded.length,
        pending: loaded.filter((m) => m.status === 'Pending').length,
        approved: loaded.filter((m) => m.status === 'Approved').length,
        rejected: loaded.filter((m) => m.status === 'Rejected').length,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Filter matches based on the active tab
  const filteredMatches = matches.filter(m => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Verified') return m.status === 'Approved';
    return m.status === activeTab;
  });

  const handleAction = async (id: number, newStatus: 'Approved' | 'Rejected') => {
    try {
      await updateAIMatchStatus(id, newStatus);
      await loadData();
    } catch (err) {
      console.error('Failed to update match status:', err);
      alert('Failed to update match status. Please try again.');
    }
  };

  const handleScanAll = async () => {
    setScanning(true);
    try {
      const result = await triggerAIScan();
      console.log('AI scan result:', result);
      alert(`Scan complete. Created ${result.matches_created} new match(es).`);
      // Reload data after scan
      await loadData();
    } catch (err) {
      console.error('Failed to scan for matches:', err);
      alert('Failed to scan for matches. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
    if (imagePath.startsWith('http')) return imagePath;
    return `${API_BASE}${imagePath.startsWith('/') ? '' : '/media/'}${imagePath}`;
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-4 border-blue-500 border-opacity-50"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-8">
        <div />
        <button
          onClick={handleScanAll}
          disabled={scanning}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
        >
          {scanning ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          {scanning ? 'Scanning...' : 'Scan for Matches'}
        </button>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Matches"
          value={stats.total}
          icon={Sparkles}
          bgColor="bg-white"
          iconBg="bg-blue-600"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={ClipboardList}
          bgColor="bg-white"
          iconBg="bg-yellow-400"
        />
        <StatCard
          title="Approved Matches"
          value={stats.approved}
          icon={CheckCircle}
          bgColor="bg-white"
          iconBg="bg-green-500"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        {/* Tabs Navigation */}
        <div className="flex items-center gap-6 mb-6 border-b border-gray-200 pb-2">
          <h2 className="text-xl font-bold text-gray-900 mr-4">AI Match Results</h2>
          {(['All', 'Verified', 'Pending', 'Rejected'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-sm font-semibold pb-2 -mb-2.5 transition-colors ${
                activeTab === tab
                  ? 'text-gray-900 border-b-2 border-gray-900'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Match Cards List */}
        <div className="space-y-6">
          {filteredMatches.map((match) => (
            <div key={match.id} className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-gray-800">Potential Match Found</h3>
              </div>

              {/* Comparison Container */}
              <div className="flex flex-col lg:flex-row gap-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-6">
                {/* Lost Item */}
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-2">Lost Item</p>
                  <div className="flex gap-4">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={getImageUrl(match.lostItem.image)} 
                        alt={match.lostItem.itemName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-900 text-lg">{match.lostItem.itemName}</h4>
                      <p className="text-xs text-gray-500">ID: {match.lostItem.id}</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold">Category:</span> {match.lostItem.category}</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold">Reporter:</span> {match.lostItem.reporterName}</p>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{match.lostItem.description}</p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden lg:block w-px bg-gray-200 self-stretch mx-2"></div>

                {/* Found Item */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-gray-400">Found Item</p>
                      <div className="text-right">
                          <p className="text-xs text-gray-400">Date</p>
                          <p className="text-xs font-medium text-gray-600">{match.date}</p>
                      </div>
                  </div>
                  
                  <div className="flex gap-4">
                    <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={getImageUrl(match.foundItem.image)} 
                        alt={match.foundItem.itemName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-bold text-gray-900 text-lg">{match.foundItem.itemName}</h4>
                      <p className="text-xs text-gray-500">ID: {match.foundItem.id}</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold">Category:</span> {match.foundItem.category}</p>
                      <p className="text-xs text-gray-500"><span className="font-semibold">Reporter:</span> {match.foundItem.reporterName}</p>
                      <p className="text-xs text-gray-500 mt-2 leading-relaxed line-clamp-2">{match.foundItem.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Confidence Bar */}
              <div className="flex flex-col gap-2 mb-6">
                  <div className="flex flex-wrap justify-between text-xs text-gray-500 font-medium mb-1">
                    <span className="font-bold text-gray-700">Match Confidence</span>
                    <span>Visual Score: {match.visualScore}% &nbsp;&nbsp; Text/Description Score: {match.textScore}%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ease-out ${
                          match.matchScore >= 80 ? 'bg-green-500' :
                          match.matchScore >= 60 ? 'bg-yellow-500' :
                          'bg-orange-500'
                        }`}
                        style={{ width: `${match.matchScore}%` }}
                      ></div>
                    </div>
                    <span className={`text-xl font-medium ${
                      match.matchScore >= 80 ? 'text-green-600' :
                      match.matchScore >= 60 ? 'text-yellow-600' :
                      'text-orange-600'
                    }`}>{match.matchScore}%</span>
                  </div>
              </div>

              {/* Action Buttons */}
              {match.status === 'Pending' ? (
                <div className="flex gap-3">
                  <button 
                    onClick={() => handleAction(match.id, 'Approved')}
                    className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                  >
                    Approve Match
                  </button>
                  <button 
                    onClick={() => handleAction(match.id, 'Rejected')}
                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                  >
                    Reject Match
                  </button>
                </div>
              ) : (
                <div
                  className={`px-4 py-2 rounded-lg text-sm font-bold inline-block ${
                    match.status === 'Approved'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }`}
                >
                  Match {match.status}
                </div>
              )}

            </div>
          ))}

          {filteredMatches.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No matches found in {activeTab} tab.</p>
              {activeTab === 'Pending' && (
                <p className="text-sm text-gray-400">Click "Scan for Matches" to find potential matches.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

