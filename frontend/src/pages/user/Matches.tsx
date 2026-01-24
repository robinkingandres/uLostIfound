import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, CheckCircle, PackageCheck, TrendingUp, MapPin, Calendar } from 'lucide-react';
import UserHeader from '../../components/UserHeader';
import Chatbot from '../../components/Chatbot';
import { fetchMyReports, fetchClaims } from '../../services/api';
import type { Report } from '../../types/report';
import type { Claim } from '../../types/claim';
import chatbotIcon from '../../assets/chatbot.png';
import { useAuth } from '../../contexts/AuthContext';

type MatchCategory = 'All' | 'Pending' | 'Verified' | 'Complete';

interface MatchItem {
  id: number;
  type: 'report' | 'claim';
  itemName: string;
  description: string;
  image: string;
  location: string;
  date: string;
  status: 'Pending' | 'Verified' | 'Complete';
  matchPercentage?: number;
  reportId?: number;
  claimId?: number;
  category: string;
}

export default function Matches() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<MatchCategory>('All');
  const [reports, setReports] = useState<Report[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<MatchItem | null>(null);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  // Calculate match percentage (mock calculation based on similarity)
  const calculateMatchPercentage = (report: Report, claim?: Claim): number => {
    // If there's a claim, calculate based on description similarity
    if (claim) {
      const reportWords = report.description.toLowerCase().split(/\s+/);
      const claimWords = claim.proofDescription.toLowerCase().split(/\s+/);
      const commonWords = reportWords.filter(word => claimWords.includes(word));
      const similarity = (commonWords.length / Math.max(reportWords.length, claimWords.length)) * 100;
      return Math.min(100, Math.max(70, Math.round(similarity + 20))); // Ensure at least 70%, max 100%
    }
    // For reports without claims, return a base percentage
    return 75;
  };

  // Convert reports and claims to match items
  const getMatchItems = useCallback((): MatchItem[] => {
    const matchItems: MatchItem[] = [];

    // Add reports
    reports.forEach((report) => {
      const relatedClaim = claims.find(c => c.itemName === report.itemName);
      let status: 'Pending' | 'Verified' | 'Complete' = 'Pending';
      
      if (report.status === 'Claimed') {
        status = 'Complete';
      } else if (report.status === 'Verified' || relatedClaim?.status === 'Approved') {
        status = 'Verified';
      } else if (report.status === 'Pending' || relatedClaim?.status === 'Pending') {
        status = 'Pending';
      }

      matchItems.push({
        id: report.id,
        type: 'report',
        itemName: report.itemName,
        description: report.description,
        image: report.image,
        location: report.location,
        date: report.date,
        status,
        matchPercentage: relatedClaim ? calculateMatchPercentage(report, relatedClaim) : undefined,
        reportId: report.id,
        claimId: relatedClaim?.id,
        category: report.category,
      });
    });

    // Add claims that don't have a corresponding report (user claimed someone else's found item)
    claims.forEach((claim) => {
      const hasReport = reports.some(r => r.itemName === claim.itemName);
      if (!hasReport) {
        let status: 'Pending' | 'Verified' | 'Complete' = 'Pending';
        if (claim.status === 'Claimed') {
          status = 'Complete';
        } else if (claim.status === 'Approved') {
          status = 'Verified';
        }

        matchItems.push({
          id: claim.id + 10000, // Offset to avoid ID conflicts
          type: 'claim',
          itemName: claim.itemName,
          description: claim.proofDescription,
          image: 'https://via.placeholder.com/150', // Default image for claims
          location: 'N/A',
          date: claim.date,
          status,
          matchPercentage: 85, // Default match percentage for claims
          claimId: claim.id,
          category: 'Unknown',
        });
      }
    });

    return matchItems;
  }, [reports, claims]);

  // Filter match items by category
  const getFilteredItems = (): MatchItem[] => {
    const items = getMatchItems();
    if (activeCategory === 'All') return items;
    return items.filter(item => item.status === activeCategory);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [myReports, myClaims] = await Promise.all([
        fetchMyReports(),
        fetchClaims(),
      ]);
      setReports(myReports);
      setClaims(myClaims);
    } catch (err) {
      console.error('Failed to load matches:', err);
      setError('Failed to load matches. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = getFilteredItems();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
            <Clock className="w-3 h-3" />
            Pending
          </div>
        );
      case 'Verified':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
            <CheckCircle className="w-3 h-3" />
            Verified
          </div>
        );
      case 'Complete':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
            <PackageCheck className="w-3 h-3" />
            Complete
          </div>
        );
      default:
        return null;
    }
  };

  const categories: MatchCategory[] = ['All', 'Pending', 'Verified', 'Complete'];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-sans">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-4 border-blue-500 border-opacity-50 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative pb-24">
      <UserHeader />

      <main className="max-w-md mx-auto md:max-w-5xl px-4 py-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate('/home')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Matches</h1>
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${
                activeCategory === category
                  ? category === 'Pending'
                    ? 'bg-orange-500 text-white'
                    : category === 'Verified'
                    ? 'bg-green-500 text-white'
                    : category === 'Complete'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Match Items List */}
        {filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-48 h-48 mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                    <TrendingUp className="w-12 h-12 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No matches found</h2>
            <p className="text-gray-500 text-center">
              No {activeCategory === 'All' ? '' : activeCategory.toLowerCase()} matches at the moment.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Item Image */}
                  <div className="w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.itemName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Item Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg mb-1">{item.itemName}</h3>
                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{item.description}</p>
                      </div>
                      {item.matchPercentage !== undefined && (
                        <div className="flex items-center gap-1 text-green-600 flex-shrink-0">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-sm font-semibold">{item.matchPercentage}% match</span>
                        </div>
                      )}
                    </div>

                    {/* Status Badge */}
                    <div className="mb-2">{getStatusBadge(item.status)}</div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(item.date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* View Details Button */}
                    <button
                      onClick={() => setSelectedMatch(item)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View Details →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsChatbotOpen(true)}
          className="bg-transparent hover:scale-110 active:scale-95 transition-transform duration-200 shadow-none border-0 p-0 cursor-pointer focus:outline-none"
          aria-label="Open Support Chat"
        >
          <div className="w-16 h-16 relative">
            <img
              src={chatbotIcon}
              alt="Chatbot"
              className="w-full h-full object-contain drop-shadow-xl"
            />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </button>
      </div>

      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

      {/* Match Details Modal */}
      {selectedMatch && (
        <MatchDetailsModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          report={reports.find(r => r.id === selectedMatch.reportId)}
          claim={claims.find(c => c.id === selectedMatch.claimId)}
        />
      )}
    </div>
  );
}

// Match Details Modal Component
interface MatchDetailsModalProps {
  match: MatchItem;
  onClose: () => void;
  report?: Report;
  claim?: Claim;
}

function MatchDetailsModal({ match, onClose, report, claim }: MatchDetailsModalProps) {
  const getStatusMessage = () => {
    switch (match.status) {
      case 'Pending':
        return {
          title: 'Pending',
          message: 'Your report is being reviewed. We will notify you once a match is found.',
          color: 'orange',
        };
      case 'Verified':
        return {
          title: 'Verified!',
          message: 'Ownership has been verified. Please proceed to the guidance office to claim your item.',
          color: 'green',
        };
      case 'Complete':
        return {
          title: 'Completed!',
          message: 'Item successfully returned. Thank you for using uLostIfound!',
          color: 'blue',
        };
      default:
        return {
          title: 'Pending',
          message: 'Your report is being reviewed.',
          color: 'orange',
        };
    }
  };

  const statusInfo = getStatusMessage();

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Match Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Match Score */}
            {match.matchPercentage !== undefined && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900">Match Score</h3>
                  <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${
                    match.matchPercentage >= 90 ? 'bg-green-100 text-green-700' :
                    match.matchPercentage >= 70 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-orange-100 text-orange-700'
                  }`}>
                    {match.matchPercentage}%
                  </div>
                </div>
                {report && claim && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Lost Item</span>
                      <span className="text-sm font-semibold text-gray-900">{report.itemName}</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Found Item</span>
                      <span className="text-sm font-semibold text-gray-900">{claim.itemName}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Item Details */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PackageCheck className="w-4 h-4" />
                Item Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Your {match.type === 'report' ? 'Reported' : 'Claimed'} Item</p>
                  <p className="font-bold text-gray-900">{match.itemName}</p>
                </div>
                <p className="text-sm text-gray-600">{match.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{match.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(match.date).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Message */}
            <div className={`rounded-xl p-4 border-2 ${
              statusInfo.color === 'green' ? 'bg-green-50 border-green-200' :
              statusInfo.color === 'blue' ? 'bg-blue-50 border-blue-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center gap-3">
                <CheckCircle className={`w-6 h-6 ${
                  statusInfo.color === 'green' ? 'text-green-600' :
                  statusInfo.color === 'blue' ? 'text-blue-600' :
                  'text-orange-600'
                }`} />
                <div>
                  <h4 className={`font-bold text-lg ${
                    statusInfo.color === 'green' ? 'text-green-800' :
                    statusInfo.color === 'blue' ? 'text-blue-800' :
                    'text-orange-800'
                  }`}>
                    {statusInfo.title}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    statusInfo.color === 'green' ? 'text-green-700' :
                    statusInfo.color === 'blue' ? 'text-blue-700' :
                    'text-orange-700'
                  }`}>
                    {statusInfo.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
