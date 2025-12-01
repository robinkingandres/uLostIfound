import { useState, useEffect, useCallback } from 'react';
import { Eye } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import ReportDetailsModal from '../../components/ReportDetailsModal';
// Import new API functions and payload type
import { fetchReports, updateReportStatus } from '../../services/api';
import type { Report, ReportStatus, ReportType } from '../../types/report';

type FilterType = 'All' | 'Lost' | 'Found' | 'Verified' | 'Pending' | 'Rejected';

export default function ManageReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [filter, setFilter] = useState<FilterType>('All');
  
  // Memoize fetch function to prevent unnecessary re-runs
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // Map filters to API parameters
    let typeFilter: ReportType | undefined = undefined;
    let statusFilter: ReportStatus | undefined = undefined;

    if (filter === 'Lost' || filter === 'Found') {
      typeFilter = filter;
    } else if (filter !== 'All') {
      statusFilter = filter as ReportStatus;
    }

    try {
      // Call the new API function
      const data = await fetchReports(typeFilter, statusFilter);
      setReports(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  }, [filter]); // Re-run whenever filter changes

  useEffect(() => {
    loadReports();
  }, [loadReports]);


  const handleStatusUpdate = async (reportId: number, newStatus: ReportStatus) => {
    try {
      // Call the API to update the status
      await updateReportStatus(reportId, newStatus);
      
      // Update the local state (or reload data)
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
      setSelectedReport(null); // Close modal
      
      // If the filter is active, force a reload to filter out the updated item
      if (filter !== 'All' && filter !== 'Lost' && filter !== 'Found') {
          setTimeout(loadReports, 100); 
      }

    } catch (err) {
      console.error(`Failed to update status to ${newStatus}:`, err);
      alert(`Failed to update report status. Error: ${err}`);
    }
  };


  const handleVerify = (reportId: number) => handleStatusUpdate(reportId, 'Verified');

  const handleReject = (reportId: number) => handleStatusUpdate(reportId, 'Rejected');

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
        
        {error && <div className="text-red-500 p-4 bg-red-100 rounded-lg mb-6">Error: {error}</div>}


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
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reports...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    {/* CHANGED: Split Reporter column */}
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">School ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Reported By</th>
                    
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
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      {/* CHANGED: Display School ID */}
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.reporterSchoolId || 'N/A'}
                      </td>
                      
                      {/* CHANGED: Display Username and Role */}
                      <td className="px-6 py-4 text-sm">
                        <div>
                          <p className="font-medium text-gray-900">{report.reporterUsername || report.reporterUsername}</p>
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
                Showing <span className="font-semibold">{reports.length}</span> reports
              </p>
            </div>
          </div>
        )}
        
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