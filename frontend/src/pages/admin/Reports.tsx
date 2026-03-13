import { useState, useEffect, useCallback, useMemo } from 'react';
import { Eye, Search } from 'lucide-react';
import ReportDetailsModal from '../../components/ReportDetailsModal';
// Import new API functions and payload type
import { fetchReports, updateReportStatus } from '../../services/api';
import type { Report, ReportStatus, ReportType } from '../../types/report';

type TypeFilter = 'All' | 'Lost' | 'Found';
type StatusFilter = 'All' | 'Verified' | 'Claimed' | 'Rejected';

export default function ManageReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('All');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Memoize fetch function to prevent unnecessary re-runs
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    
    // Map filters to API parameters
    let apiTypeFilter: ReportType | undefined = undefined;
    let apiStatusFilter: ReportStatus | undefined = undefined;

    if (typeFilter !== 'All') apiTypeFilter = typeFilter;
    if (statusFilter !== 'All') apiStatusFilter = statusFilter as ReportStatus;

    try {
      // Call the new API function
      const data = await fetchReports(apiTypeFilter, apiStatusFilter);
      setReports(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load reports. Please check the backend connection.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]); // Re-run whenever filter changes

  useEffect(() => {
    loadReports();
  }, [loadReports]);


  const handleStatusUpdate = async (reportId: number, newStatus: ReportStatus) => {
    try {
      // Call the API to update the status
      await updateReportStatus(reportId, newStatus);

      // Always reload from DB so "All" stays in sync with backend state.
      await loadReports();
      setSelectedReport(null); // Close modal
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

  // Filter reports based on search query
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) {
      return reports;
    }

    const query = searchQuery.toLowerCase().trim();
    return reports.filter((report) => {
      const searchableFields = [
        report.itemName,
        report.description,
        report.location,
        report.reporterUsername || report.reporterName || '',
        report.reporterSchoolId || '',
        report.category || '',
        report.id.toString(),
      ];

      return searchableFields.some((field) =>
        field?.toLowerCase().includes(query)
      );
    });
  }, [reports, searchQuery]);

  return (
    <>
    <div className="p-6">
        {error && <div className="text-red-500 p-4 bg-red-100 rounded-lg mb-6">Error: {error}</div>}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports by item name, description, location, reporter, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
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

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Type</div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
                  className="w-full sm:w-44 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                >
                  <option value="All">All</option>
                  <option value="Lost">Lost</option>
                  <option value="Found">Found</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-600 mb-2">Status</div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  className="w-full sm:w-44 px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                >
                  <option value="All">All</option>
                  <option value="Verified">Verified</option>
                  <option value="Claimed">Claimed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { void loadReports(); }}
              className="px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors self-start sm:self-auto"
            >
              Refresh
            </button>
          </div>
        </div>
        
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading reports...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead className="bg-gray-100 border-b border-gray-200">
                  <tr>
                    {/* Unique Identifier */}
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-12">ID</th>
                    {/* CHANGED: Split Reporter column */}
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-20">School ID</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-24">Reported By</th>
                    
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-28">Item name</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase">Description</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-16">Type</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-24">Location</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-20">Status</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-24">Date</th>
                    <th className="px-2 py-2.5 text-left text-xs font-semibold text-gray-700 uppercase w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                      {/* Unique Identifier */}
                      <td className="px-2 py-3 text-xs font-medium text-gray-900">
                        #{report.id}
                      </td>
                      {/* CHANGED: Display School ID */}
                      <td className="px-2 py-3 text-xs font-medium text-gray-900 truncate">
                        {report.reporterSchoolId || 'N/A'}
                      </td>
                      
                      {/* CHANGED: Display Username and Role */}
                      <td className="px-2 py-3 text-xs">
                        <div>
                          <p className="font-medium text-gray-900 truncate">{report.reporterUsername || report.reporterName || 'N/A'}</p>
                          <p className="text-xs text-gray-500 truncate">{report.reporterRole}</p>
                        </div>
                      </td>

                      <td className="px-2 py-3 text-xs font-medium text-gray-900 truncate">{report.itemName}</td>
                      <td className="px-2 py-3 text-xs text-gray-600 truncate" title={report.description}>
                        {report.description}
                      </td>
                      <td className="px-2 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getTypeColor(report.type)}`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-900 truncate">{report.location}</td>
                      <td className="px-2 py-3 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-2 py-3 text-xs text-gray-900">{report.date}</td>
                      <td className="px-2 py-3 text-xs">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors whitespace-nowrap"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span className="text-xs">See more</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <p className="text-xs text-gray-600">
                Showing <span className="font-semibold">{filteredReports.length}</span> of <span className="font-semibold">{reports.length}</span> reports
                {searchQuery && (
                  <span className="ml-2 text-gray-500">
                    (filtered by "{searchQuery}")
                  </span>
                )}
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
    </>
  );
}
