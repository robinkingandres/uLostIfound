import { useState } from 'react';
import { Eye } from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import ReportDetailsModal from '../components/ReportDetailsModal';
import { mockReports } from '../data/mockReports';
import type { Report, ReportStatus, ReportType } from '../types/report';

type FilterType = 'All' | 'Lost' | 'Found' | 'Verified' | 'Pending' | 'Rejected';

export default function ManageReports() {
  const [reports, setReports] = useState<Report[]>(mockReports);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<FilterType>('All');

  const filteredReports = reports.filter((report) => {
    if (filter === 'All') return true;
    if (filter === 'Lost' || filter === 'Found') return report.type === filter;
    return report.status === filter;
  });

  const handleVerify = (reportId: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'Verified' as ReportStatus } : r))
    );
    setSelectedReport(null);
  };

  const handleReject = (reportId: number) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: 'Rejected' as ReportStatus } : r))
    );
    setSelectedReport(null);
  };

  const getStatusColor = (status: ReportStatus) => {
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

  const getTypeColor = (type: ReportType) => {
    return type === 'Lost'
      ? 'bg-red-100 text-red-800'
      : 'bg-blue-100 text-blue-800';
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Reports</h1>
          <p className="text-gray-600">Review and manage all lost and found items</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-semibold text-gray-900">Filter Reports</span>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['All', 'Lost', 'Found', 'Verified', 'Pending', 'Rejected'] as FilterType[]).map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === option
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reporter</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{report.reporter}</p>
                        <p className="text-xs text-gray-500">{report.reporterRole}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.itemName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{report.description}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                        {report.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{report.location}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{report.date}</td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                        See more
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredReports.length}</span> of{' '}
              <span className="font-semibold">{reports.length}</span> reports
            </p>
          </div>
        </div>
      </div>

      {selectedReport && (
        <ReportDetailsModal
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
          onVerify={handleVerify}
          onReject={handleReject}
        />
      )}
    </div>
  );
}
