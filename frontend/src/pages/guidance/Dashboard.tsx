// frontend/src/pages/guidance/Dashboard.tsx
import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Search, PackageCheck, X, Download, Printer } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader'; 
import StatCard from '../../components/admin/StatCard'; 
import { fetchReports } from '../../services/api';
import type { Report } from '../../types/report';

type StageKey = 'pending' | 'awaiting' | 'released';
type StatusFilter = 'all' | 'Pending' | 'Verified' | 'Claimed';
type TypeFilter = 'all' | 'Lost' | 'Found';

function toDateInputValue(v: Date): string {
  return v.toISOString().slice(0, 10);
}

function downloadAndOpenRecords(records: Report[], contextLabel: string) {
  const generatedAt = new Date();
  const rows = records.map((r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.itemName}</td>
      <td>${r.type}</td>
      <td>${r.category}</td>
      <td>${r.location}</td>
      <td>${r.status === 'Verified' ? 'Awaiting Match' : r.status}</td>
      <td>${r.date}</td>
      <td>${r.reporterName || r.reporterUsername || 'N/A'}</td>
    </tr>
  `).join('');

  const printHtml = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Guidance Records PDF</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { margin: 0 0 8px 0; }
          .meta { color: #4b5563; font-size: 12px; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
        </style>
      </head>
      <body>
        <h1>Guidance Records Export</h1>
        <div class="meta">Context: ${contextLabel} | Generated: ${generatedAt.toLocaleString()} | Total: ${records.length}</div>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Item</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
              <th>Reporter</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(printHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}

export default function GuidanceDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [stage, setStage] = useState<StageKey>('pending');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState(toDateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 1))));
  const [dateTo, setDateTo] = useState(toDateInputValue(new Date()));

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchReports();
        setReports(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const pending = reports.filter((r) => r.status === 'Pending').length;
  const approved = reports.filter((r) => r.status === 'Verified').length;
  const claimed = reports.filter((r) => r.status === 'Claimed').length;

  const modalStatusFromStage: Record<StageKey, StatusFilter> = {
    pending: 'Pending',
    awaiting: 'Verified',
    released: 'Claimed',
  };

  const modalRecords = useMemo(() => {
    const filtered = reports.filter((r) => {
      const statusMatches = statusFilter === 'all' ? true : r.status === statusFilter;
      const typeMatches = typeFilter === 'all' ? true : r.type === typeFilter;
      const dateVal = new Date(r.date).getTime();
      const fromVal = dateFrom ? new Date(dateFrom).getTime() : Number.NEGATIVE_INFINITY;
      const toVal = dateTo ? new Date(dateTo).getTime() + 86399999 : Number.POSITIVE_INFINITY;
      return statusMatches && typeMatches && dateVal >= fromVal && dateVal <= toVal;
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, statusFilter, typeFilter, dateFrom, dateTo]);

  const openModalFromCard = (nextStage: StageKey) => {
    setStage(nextStage);
    setStatusFilter(modalStatusFromStage[nextStage]);
    setTypeFilter('all');
    setDateFrom(toDateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 1))));
    setDateTo(toDateInputValue(new Date()));
    setIsRecordsModalOpen(true);
  };

  const modalTitle = stage === 'pending'
    ? 'Pending Reviews Records'
    : stage === 'awaiting'
      ? 'Awaiting Match Records'
      : 'Released to Owners Records';

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
        {/* Welcome Section */}
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

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Pending Reviews */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('pending')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-amber-100"
            >
              <StatCard 
                title="Pending Reviews" 
                value={pending} 
                icon={ClipboardList} 
                bgColor="transparent" 
                iconBg="bg-amber-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Reports currently being <span className="font-bold text-slate-800 underline decoration-amber-200 uppercase text-[10px] tracking-wide">reviewed and verified</span> by administration.
                </p>
              </div>
            </button>
          </div>

          {/* Card 2: Awaiting Match */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('awaiting')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-emerald-100"
            >
              <StatCard 
                title="Awaiting Match" 
                value={approved} 
                icon={Search} 
                bgColor="transparent" 
                iconBg="bg-emerald-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Looking for the <span className="font-bold text-slate-800 underline decoration-emerald-200 uppercase text-[10px] tracking-wide">rightful owner</span> or locating items in storage.
                </p>
              </div>
            </button>
          </div>

          {/* Card 3: Released to Owners */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('released')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-blue-100"
            >
              <StatCard 
                title="Released to Owners" 
                value={claimed} 
                icon={PackageCheck} 
                bgColor="transparent" 
                iconBg="bg-blue-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Successfully <span className="font-bold text-slate-800 underline decoration-blue-200 uppercase text-[10px] tracking-wide">handed over</span> to students and logged.
                </p>
              </div>
            </button>
          </div>

        </div>

      </main>

      {isRecordsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setIsRecordsModalOpen(false)}>
          <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{modalTitle}</h3>
                <p className="text-xs text-gray-500 mt-1">View, filter by date and type, and print/download all records.</p>
              </div>
              <button onClick={() => setIsRecordsModalOpen(false)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Status</label>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="all">All statuses</option>
                    <option value="Pending">Pending Reviews</option>
                    <option value="Verified">Awaiting Match</option>
                    <option value="Claimed">Released to Owners</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Type</label>
                  <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white">
                    <option value="all">All types</option>
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date From</label>
                  <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date To</label>
                  <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="flex items-end gap-2">
                  <button
                    onClick={() => downloadAndOpenRecords(modalRecords, modalTitle)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 py-2 text-sm hover:bg-emerald-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => downloadAndOpenRecords(modalRecords, modalTitle)}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Download All
                  </button>
                </div>
              </div>

              <div className="text-xs text-gray-500">Total records: {modalRecords.length}</div>

              <div className="max-h-[420px] overflow-auto border border-gray-100 rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Reporter</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No records match the selected filters.</td>
                      </tr>
                    ) : (
                      modalRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">#{record.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.itemName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{record.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{record.status === 'Verified' ? 'Awaiting Match' : record.status}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{record.reporterName || record.reporterUsername || 'N/A'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
