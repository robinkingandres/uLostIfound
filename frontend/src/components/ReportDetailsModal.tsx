import { useState } from 'react';
import { X, Check, XCircle } from 'lucide-react';
import type { Report } from '../types/report';

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
  const [showImagePreview, setShowImagePreview] = useState(false);
  const canModerate = report.status === 'Pending';
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
            <button
              type="button"
              onClick={() => setShowImagePreview(true)}
              className="w-full rounded-lg overflow-hidden group"
              aria-label="View full image"
            >
              <img
                src={report.image}
                alt={report.itemName}
                className="w-full h-40 object-contain bg-gray-100 rounded-lg mb-1 cursor-zoom-in"
              />
              <span className="text-xs text-gray-500 group-hover:text-gray-700">Click image to view full size</span>
            </button>
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
              disabled={!canModerate}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                canModerate
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Check className="w-4 h-4" />
              Verify Report
            </button>
            <button
              onClick={() => onReject(report.id)}
              disabled={!canModerate}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors ${
                canModerate
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <XCircle className="w-4 h-4" />
              Reject Report
            </button>
          </div>
          {!canModerate && (
            <p className="text-xs text-gray-500 mt-2">
              This report is finalized and can no longer be edited.
            </p>
          )}
        </div>
      </div>

      {showImagePreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowImagePreview(false)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-black/60 hover:bg-black/75 text-white rounded-full p-2"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <img
            src={report.image}
            alt={report.itemName}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

