import { useState, useEffect } from 'react';
import { X, Zap, MapPin, Calendar, Tag } from 'lucide-react';
import { fetchReportAIMatches } from '../services/api';
import type { AIMatch } from '../services/api';
import type { Report } from '../types/report';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return 'https://via.placeholder.com/150?text=No+Image';
  if (imagePath.startsWith('http')) return imagePath;
  return `${API_BASE}${imagePath.startsWith('/') ? '' : '/media/'}${imagePath}`;
};

interface AIMatchesModalProps {
  report: Report;
  onClose: () => void;
}

interface MatchReport {
  id: number;
  itemName: string;
  description: string;
  category: string;
  location: string;
  image: string;
  reporterName: string;
  date: string;
  type: 'Lost' | 'Found';
}

export default function AIMatchesModal({ report, onClose }: AIMatchesModalProps) {
  const [matches, setMatches] = useState<AIMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadMatches = async () => {
      try {
        setLoading(true);
        const data = await fetchReportAIMatches(report.id);
        setMatches(data);
      } catch (err) {
        console.error('Failed to load AI matches:', err);
        setError('Failed to load AI matches. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [report.id]);

  const getMatchReport = (match: AIMatch): MatchReport | null => {
    // If current report is Lost, show Found matches
    // If current report is Found, show Lost matches
    if (report.type === 'Lost' && match.foundItem) {
      return {
        id: match.foundItem.id,
        itemName: match.foundItem.itemName,
        description: match.foundItem.description,
        category: match.foundItem.category,
        location: match.foundItem.location,
        image: match.foundItem.image,
        reporterName: match.foundItem.reporterName,
        date: match.date,
        type: 'Found',
      };
    } else if (report.type === 'Found' && match.lostItem) {
      return {
        id: match.lostItem.id,
        itemName: match.lostItem.itemName,
        description: match.lostItem.description,
        category: match.lostItem.category,
        location: match.lostItem.location,
        image: match.lostItem.image,
        reporterName: match.lostItem.reporterName,
        date: match.date,
        type: 'Lost',
      };
    }
    return null;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">AI Matches</h2>
            <p className="text-sm text-gray-600 mt-1">
              Potential matches for: <span className="font-semibold">{report.itemName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">Loading matches...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">{error}</div>
          ) : matches.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-semibold">No matches found</p>
              <p className="text-sm mt-2">No potential matches were found for this item.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => {
                const matchReport = getMatchReport(match);
                if (!matchReport) return null;

                return (
                  <div
                    key={match.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      {/* Image */}
                      <div className="flex-shrink-0">
                        <img
                          src={getImageUrl(matchReport.image)}
                          alt={matchReport.itemName}
                          className="w-24 h-24 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=No+Image';
                          }}
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {matchReport.itemName}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {matchReport.description}
                            </p>
                          </div>
                          {/* Match Score Badge */}
                          <div className="flex-shrink-0 ml-4">
                            <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                              <div className="text-xs font-semibold">Match Score</div>
                              <div className="text-lg font-bold">{match.matchScore.toFixed(1)}%</div>
                            </div>
                          </div>
                        </div>

                        {/* Match Details */}
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Tag className="w-4 h-4" />
                            <span className="font-medium">Category:</span>
                            <span>{matchReport.category}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="w-4 h-4" />
                            <span className="font-medium">Location:</span>
                            <span>{matchReport.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">Date:</span>
                            <span>{matchReport.date}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span className="font-medium">Reported by:</span>
                            <span>{matchReport.reporterName}</span>
                          </div>
                        </div>

                        {/* Score Breakdown */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="flex gap-4 text-xs">
                            <div>
                              <span className="text-gray-500">Visual:</span>
                              <span className="ml-1 font-semibold text-gray-700">
                                {match.visualScore.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Text:</span>
                              <span className="ml-1 font-semibold text-gray-700">
                                {match.textScore.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <span className={`ml-1 font-semibold ${
                                match.status === 'Approved' ? 'text-green-600' :
                                match.status === 'Pending' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {match.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
