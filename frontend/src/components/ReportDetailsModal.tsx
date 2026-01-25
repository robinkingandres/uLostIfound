import { useState } from 'react';
import { X, Check, XCircle, Zap } from 'lucide-react';
import type { Report } from '../types/report';
import AIMatchesModal from './AIMatchesModal';

interface ReportDetailsModalProps {
  report: Report;
  onClose: () => void;
  onVerify: (reportId: number) => void;
  onReject: (reportId: number) => void;
}

export default function ReportDetailsModal({
  report,
  onClose,
  onVerify,
  onReject,
}: ReportDetailsModalProps) {
  const [showAIMatches, setShowAIMatches] = useState(false);
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Verified':
        return 'bg-green-100 text-green-800';
      case 'Claimed':
        return 'bg-blue-100 text-blue-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'Lost' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-96 overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <img
              src={report.image}
              alt={report.itemName}
              className="w-full h-40 object-cover rounded-lg mb-4"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Item name</p>
              <p className="text-sm font-semibold text-gray-900">{report.itemName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Category</p>
              <p className="text-sm font-semibold text-gray-900">{report.category}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</p>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                  {report.type}
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</p>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                {report.status}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Location</p>
              <p className="text-sm font-semibold text-gray-900">{report.location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Date</p>
              <p className="text-sm font-semibold text-gray-900">{report.date}</p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Description</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{report.description}</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-600 font-semibold mb-1">Reported by</p>
            <p className="text-sm font-semibold text-gray-900">{report.reporterName || report.reporterUsername || 'Unknown'}</p>
            <p className="text-xs text-gray-600">{report.reporterRole}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => onVerify(report.id)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Check className="w-4 h-4" />
              Verify Report
            </button>
            <button
              onClick={() => onReject(report.id)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Reject Report
            </button>
            <button 
              onClick={() => setShowAIMatches(true)}
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Zap className="w-4 h-4" />
              View AI Matches
            </button>
          </div>
        </div>
      </div>

      {showAIMatches && (
        <AIMatchesModal
          report={report}
          onClose={() => setShowAIMatches(false)}
        />
      )}
    </div>
  );
}
