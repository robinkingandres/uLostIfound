import { useState } from 'react';
import { Sparkles, ClipboardList, CheckCircle } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import StatCard from '../../components/admin/StatCard';
import { mockMatches } from '../../data/mockMatches';
import type { AIMatch, MatchStatus } from '../../types/aiMatch';

export default function AIMatchNotification() {
  const [matches, setMatches] = useState<AIMatch[]>(mockMatches);
  const [activeTab, setActiveTab] = useState<MatchStatus | 'Verified'>('Pending');

  // Filter matches based on the active tab
  // If tab is 'Verified', show 'Approved' matches
  const filteredMatches = matches.filter(m => {
    if (activeTab === 'Verified') return m.status === 'Approved';
    return m.status === activeTab;
  });

  const handleAction = (id: number, newStatus: MatchStatus) => {
    setMatches(prev => prev.map(m => 
      m.id === id ? { ...m, status: newStatus } : m
    ));
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Match Notification</h1>
          <p className="text-gray-600 mt-1">AI-Powered Matching between lost and found items</p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Total Matches"
            value={matches.length}
            icon={Sparkles}
            bgColor="bg-gray-100"
            iconBg="bg-blue-600"
          />
          <StatCard
            title="Pending Review"
            value={matches.filter(m => m.status === 'Pending').length}
            icon={ClipboardList}
            bgColor="bg-gray-100"
            iconBg="bg-yellow-400"
          />
          <StatCard
            title="Approved Matches"
            value={matches.filter(m => m.status === 'Approved').length}
            icon={CheckCircle}
            bgColor="bg-gray-100"
            iconBg="bg-green-500"
          />
        </div>

        {/* Main Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          
          {/* Tabs Navigation */}
          <div className="flex items-center gap-6 mb-6 border-b border-gray-200 pb-2">
            <h2 className="text-xl font-bold text-gray-900 mr-4">AI Match Results</h2>
            {(['Verified', 'Pending', 'Rejected'] as const).map((tab) => (
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
                          src={match.lostItem.image} 
                          alt={match.lostItem.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 text-lg">{match.lostItem.name}</h4>
                        <p className="text-xs text-gray-500">{match.lostItem.id}</p>
                        <p className="text-xs text-gray-500"><span className="font-semibold">Category:</span> {match.lostItem.category}</p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{match.lostItem.description}</p>
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
                          src={match.foundItem.image} 
                          alt={match.foundItem.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-bold text-gray-900 text-lg">{match.foundItem.name}</h4>
                        <p className="text-xs text-gray-500">{match.foundItem.id}</p>
                        <p className="text-xs text-gray-500"><span className="font-semibold">Category:</span> {match.foundItem.category}</p>
                        <p className="text-xs text-gray-500 mt-2 leading-relaxed">{match.foundItem.description}</p>
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
                          className="bg-green-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                          style={{ width: `${match.matchScore}%` }}
                        ></div>
                      </div>
                      <span className="text-xl font-medium text-gray-600">{match.matchScore}%</span>
                    </div>
                </div>

                {/* Action Buttons */}
                {match.status === 'Pending' ? (
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleAction(match.id, 'Approved')}
                      className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      Approved Match
                    </button>
                    <button 
                      onClick={() => handleAction(match.id, 'Rejected')}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                    >
                      Reject Match
                    </button>
                  </div>
                ) : (
                   <div className={`px-4 py-2 rounded-lg text-sm font-bold inline-block
                     ${match.status === 'Approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                     Match {match.status}
                   </div>
                )}

              </div>
            ))}

            {filteredMatches.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No matches found in {activeTab} tab.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}