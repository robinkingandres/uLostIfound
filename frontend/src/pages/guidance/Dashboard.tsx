import { useState, useEffect, useMemo } from 'react';
import { Download, Search, X } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { claimFoundItemAsClaimed, fetchClaims, fetchReports, updateReportStatus } from '../../services/api';
import type { Report, ReportStatus } from '../../types/report';
import type { Claim } from '../../types/claim';

type FeedFilter = 'All' | 'Lost' | 'Found' | 'Claimed' | 'Matched';

const MONTH_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

type FoundClaimForm = {
  fullName: string;
  studentId: string;
  courseYear: string;
  contactNumber: string;
  dateLost: string;
  dateClaimed: string;
  locationLost: string;
  detailedDescription: string;
  proofImage: File | null;
};

function getDisplayStatus(record: Report, claimedReportIds: Set<number>) {
  if (record.status === 'Claimed' || claimedReportIds.has(record.id)) return 'Claimed';
  if (record.status === 'Matched') return 'Matched';
  if (record.status === 'Verified') return 'Awaiting Match';
  return record.status;
}

function getFeedStatusBadge(status: string) {
  switch (status) {
    case 'Matched':
      return 'bg-emerald-100 text-emerald-700';
    case 'Claimed':
      return 'bg-blue-100 text-blue-700';
    case 'Awaiting Match':
      return 'bg-yellow-100 text-yellow-700';
    case 'Pending':
      return 'bg-amber-100 text-amber-700';
    case 'Rejected':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

function parseDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function escapeCsvCell(value: unknown) {
  const asText = String(value ?? '');
  if (/[",\n]/.test(asText)) {
    return `"${asText.replace(/"/g, '""')}"`;
  }
  return asText;
}

export default function GuidanceDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  const [feedSearch, setFeedSearch] = useState('');
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('All');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [updatingReportId, setUpdatingReportId] = useState<number | null>(null);
  const [feedError, setFeedError] = useState('');
  const [claimingReport, setClaimingReport] = useState<Report | null>(null);
  const [claimModalError, setClaimModalError] = useState('');
  const [claimForm, setClaimForm] = useState<FoundClaimForm>({
    fullName: '',
    studentId: '',
    courseYear: '',
    contactNumber: '',
    dateLost: '',
    dateClaimed: new Date().toISOString().slice(0, 10),
    locationLost: '',
    detailedDescription: '',
    proofImage: null,
  });

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      try {
        const [reportsData, claimsData] = await Promise.all([
          fetchReports(),
          fetchClaims(),
        ]);
        if (isMounted) {
          setReports(reportsData);
          setClaims(claimsData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const handleFocusRefresh = () => {
      loadData();
    };

    loadData();

    const refreshTimer = window.setInterval(loadData, 15000);
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, []);

  const claimedReportIds = useMemo(() => {
    const ids = new Set<number>();
    for (const claim of claims) {
      if (claim.status === 'Claimed' && claim.reportRecordId) {
        ids.add(claim.reportRecordId);
      }
    }
    return ids;
  }, [claims]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const report of reports) {
      const parsedDate = parseDate(report.date);
      if (parsedDate) years.add(parsedDate.getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [reports]);

  const feedRecords = useMemo(() => {
    const q = feedSearch.trim().toLowerCase();
    const selectedYear = yearFilter === 'all' ? null : Number(yearFilter);
    const selectedMonth = monthFilter === 'all' ? null : Number(monthFilter);

    return reports
      .filter((r) => {
        const displayStatus = getDisplayStatus(r, claimedReportIds);

        const filterMatches =
          feedFilter === 'All'
            ? true
            : feedFilter === 'Lost'
              ? r.type === 'Lost' && displayStatus !== 'Matched'
              : feedFilter === 'Found'
                ? r.type === 'Found' && displayStatus !== 'Claimed'
                : feedFilter === 'Claimed'
                  ? displayStatus === 'Claimed'
                  : displayStatus === 'Matched';

        if (!filterMatches) return false;

        const reportDate = parseDate(r.date);
        if (selectedYear !== null && (!reportDate || reportDate.getFullYear() !== selectedYear)) return false;
        if (selectedMonth !== null && (!reportDate || reportDate.getMonth() + 1 !== selectedMonth)) return false;

        if (!q) return true;
        const haystack = [
          r.id.toString(),
          r.itemName,
          r.description,
          r.location,
          r.category,
          r.type,
          displayStatus,
          r.reporterName,
          r.reporterUsername,
          r.reporterSchoolId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, feedFilter, feedSearch, monthFilter, yearFilter, claimedReportIds]);

  const exportFeedToExcel = () => {
    const headers = ['Report ID', 'Item', 'Type', 'Status', 'Reporter', 'School ID', 'Category', 'Location', 'Date', 'Description'];
    const rows = feedRecords.map((report) => {
      const parsedDate = parseDate(report.date);
      return [
        `#${report.id}`,
        report.itemName,
        report.type,
        getDisplayStatus(report, claimedReportIds),
        report.reporterName || report.reporterUsername || 'N/A',
        report.reporterSchoolId || 'N/A',
        report.category,
        report.location,
        parsedDate ? parsedDate.toLocaleDateString() : report.date,
        report.description,
      ].map(escapeCsvCell).join(',');
    });

    const csvContent = ['\ufeff' + headers.map(escapeCsvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const fileUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const monthLabel = monthFilter === 'all'
      ? 'all-months'
      : (MONTH_OPTIONS.find((option) => option.value === monthFilter)?.label || 'month')
        .toLowerCase()
        .replace(/\s+/g, '-');
    const yearLabel = yearFilter === 'all' ? 'all-years' : yearFilter;

    anchor.href = fileUrl;
    anchor.download = `guidance_lost_found_feed_${yearLabel}_${monthLabel}_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(fileUrl);
  };

  const handleGuidanceStatusUpdate = async (report: Report, targetStatus: ReportStatus) => {
    setFeedError('');
    setUpdatingReportId(report.id);
    try {
      const updated = await updateReportStatus(report.id, targetStatus);
      setReports((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      console.error(err);
      setFeedError(`Failed to update report #${report.id}. Make sure it is Verified before changing status.`);
    } finally {
      setUpdatingReportId(null);
    }
  };

  const openClaimModal = (report: Report) => {
    setClaimingReport(report);
    setClaimModalError('');
    setClaimForm({
      fullName: '',
      studentId: '',
      courseYear: '',
      contactNumber: '',
      dateLost: '',
      dateClaimed: new Date().toISOString().slice(0, 10),
      locationLost: report.location || '',
      detailedDescription: report.description || '',
      proofImage: null,
    });
  };

  const closeClaimModal = () => {
    setClaimingReport(null);
    setClaimModalError('');
  };

  const handleClaimFormChange = (field: keyof FoundClaimForm, value: string | File | null) => {
    setClaimForm((prev) => ({ ...prev, [field]: value }));
  };

  const submitClaimDetails = async () => {
    if (!claimingReport) return;

    setClaimModalError('');
    setUpdatingReportId(claimingReport.id);
    try {
      const result = await claimFoundItemAsClaimed(
        claimingReport.id,
        {
          fullName: claimForm.fullName,
          studentId: claimForm.studentId,
          courseYear: claimForm.courseYear,
          contactNumber: claimForm.contactNumber,
          dateLost: claimForm.dateLost,
          dateClaimed: claimForm.dateClaimed,
          locationLost: claimForm.locationLost,
          detailedDescription: claimForm.detailedDescription,
        },
        claimForm.proofImage
      );
      setReports((prev) => prev.map((r) => (r.id === result.report.id ? result.report : r)));
      closeClaimModal();
    } catch (err) {
      console.error(err);
      setClaimModalError(err instanceof Error ? err.message : 'Failed to save claim details.');
    } finally {
      setUpdatingReportId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="mt-4 text-sm font-medium text-gray-500 animate-pulse">Syncing dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[#F8FAFC]">
      <DashboardHeader />

      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-10">
          <span className="text-emerald-600 font-bold text-xs uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Guidance Management System
          </span>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
            Guidance Overview
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Track report reviews, awaiting matches, and released items for <span className="text-slate-900 font-semibold underline decoration-emerald-400 decoration-2">San Isidro NHS</span>.
          </p>
        </div>

        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Lost & Found Feed</h2>
            <p className="text-sm text-slate-500 mt-1">Search reports, filter by status/type, and update workflow status.</p>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={feedSearch}
                  onChange={(e) => setFeedSearch(e.target.value)}
                  placeholder="Search by item, description, location, reporter, school ID, or report #"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(['All', 'Lost', 'Found', 'Claimed', 'Matched'] as FeedFilter[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFeedFilter(option)}
                    className={`px-3 py-2 text-sm rounded-lg border transition ${
                      feedFilter === option
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  {MONTH_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="all">All years</option>
                  {availableYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  {feedRecords.length} record{feedRecords.length === 1 ? '' : 's'}
                </span>
              </div>
              <button
                type="button"
                disabled={feedRecords.length === 0}
                onClick={exportFeedToExcel}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Export to Excel
              </button>
            </div>

            {feedError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{feedError}</div> : null}

            <div className="border border-slate-100 rounded-xl overflow-auto">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">ID</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Status</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Reporter</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Location</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500">Date</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">No reports match your search and filters.</td>
                    </tr>
                  ) : (
                    feedRecords.map((report) => {
                      const displayStatus = getDisplayStatus(report, claimedReportIds);
                      const canMarkMatched = report.type === 'Lost' && report.status === 'Verified';
                      const canMarkClaimed = report.type === 'Found' && displayStatus !== 'Claimed' && report.status === 'Verified';
                      const isBusy = updatingReportId === report.id;

                      return (
                        <tr key={report.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3 text-sm text-slate-700">#{report.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            <p>{report.itemName}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[220px]">{report.category}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{report.type}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getFeedStatusBadge(displayStatus)}`}>
                              {displayStatus}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">
                            <p className="font-medium text-slate-900">{report.reporterName || report.reporterUsername || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{report.reporterSchoolId || 'N/A'}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{report.location}</td>
                          <td className="px-4 py-3 text-sm text-slate-500">{new Date(report.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-right">
                            {canMarkMatched ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleGuidanceStatusUpdate(report, 'Matched')}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                              >
                                {isBusy ? 'Updating...' : 'Mark Matched'}
                              </button>
                            ) : canMarkClaimed ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => openClaimModal(report)}
                                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                              >
                                {isBusy ? 'Updating...' : 'Mark Claimed'}
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No action</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {claimingReport && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={closeClaimModal}>
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Claimant Details</h3>
                <p className="text-xs text-gray-500 mt-1">Complete claimant information before marking this found item as Claimed.</p>
              </div>
              <button type="button" onClick={closeClaimModal} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">Item:</span> {claimingReport.itemName}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Full Name</label>
                  <input type="text" value={claimForm.fullName} onChange={(e) => handleClaimFormChange('fullName', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Student ID</label>
                  <input type="text" value={claimForm.studentId} onChange={(e) => handleClaimFormChange('studentId', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Course/Year</label>
                  <input type="text" value={claimForm.courseYear} onChange={(e) => handleClaimFormChange('courseYear', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Contact Number</label>
                  <input type="text" value={claimForm.contactNumber} onChange={(e) => handleClaimFormChange('contactNumber', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date Lost</label>
                  <input type="date" value={claimForm.dateLost} onChange={(e) => handleClaimFormChange('dateLost', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date Claimed</label>
                  <input type="date" value={claimForm.dateClaimed} onChange={(e) => handleClaimFormChange('dateClaimed', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Location Lost</label>
                <input type="text" value={claimForm.locationLost} onChange={(e) => handleClaimFormChange('locationLost', e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Detailed Description</label>
                <textarea value={claimForm.detailedDescription} onChange={(e) => handleClaimFormChange('detailedDescription', e.target.value)} rows={4} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y" />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-600">Upload Proof (optional)</label>
                <input type="file" accept="image/*" onChange={(e) => handleClaimFormChange('proofImage', e.target.files?.[0] || null)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white" />
              </div>

              {claimModalError ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{claimModalError}</div> : null}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button type="button" onClick={closeClaimModal} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                disabled={updatingReportId === claimingReport.id}
                onClick={submitClaimDetails}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {updatingReportId === claimingReport.id ? 'Saving...' : 'Save and Mark Claimed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
