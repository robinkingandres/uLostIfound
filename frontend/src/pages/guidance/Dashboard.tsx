// frontend/src/pages/guidance/Dashboard.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ClipboardList, Search, PackageCheck, X, Download, Printer, FilePenLine } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader'; 
import StatCard from '../../components/admin/StatCard'; 
import { fetchReports, updateReport } from '../../services/api';
import type { Report, ReportStatus } from '../../types/report';

type StageKey = 'lost' | 'found' | 'claimed';
type StatusFilter = 'all' | 'Pending' | 'Verified' | 'Claimed';
type TypeFilter = 'all' | 'Lost' | 'Found';
type PublicStatusOption = 'Lost' | 'Found' | 'Matched' | 'Claimed';

function toDateInputValue(v: Date): string {
  return v.toISOString().slice(0, 10);
}

function getDisplayStatus(record: Report) {
  return record.status;
}

function getPublicStatusLabel(record: Report): PublicStatusOption {
  if (record.status === 'Claimed') return 'Claimed';
  if (record.publicStatus === 'Matched' || record.isMatched) return 'Matched';
  return record.type;
}

function buildRecordsPrintHtml(records: Report[], contextLabel: string) {
  const generatedAt = new Date();
  const rows = records.map((r) => `
    <tr>
      <td>${r.id}</td>
      <td>${r.itemName}</td>
      <td>${r.type}</td>
      <td>${r.category}</td>
      <td>${r.location}</td>
      <td>${getDisplayStatus(r)}</td>
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

  return printHtml;
}

function openPrintableRecords(records: Report[], contextLabel: string) {
  const printHtml = buildRecordsPrintHtml(records, contextLabel);

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

function pdfEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function downloadRecordsPdf(records: Report[], contextLabel: string) {
  const generatedAt = new Date().toLocaleString();
  const lines: string[] = [
    `Guidance Records Export`,
    `Context: ${contextLabel}`,
    `Generated: ${generatedAt}`,
    `Total Records: ${records.length}`,
    ``,
    `ID | Item | Type | Status | Date | Reporter`,
    `------------------------------------------------------------`,
  ];

  records.forEach((r) => {
    const line = [
      `#${r.id}`,
      r.itemName,
      r.type,
      getDisplayStatus(r),
      r.date,
      r.reporterName || r.reporterUsername || 'N/A',
    ]
      .map((part) => String(part).replace(/\s+/g, ' ').trim())
      .join(' | ');
    lines.push(line.slice(0, 120));
  });

  const textCommands = lines
    .map((line, index) => {
      const y = 800 - index * 14;
      if (y < 40) return null;
      return `BT /F1 10 Tf 50 ${y} Td (${pdfEscape(line)}) Tj ET`;
    })
    .filter(Boolean)
    .join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
  objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
  objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj');
  objects.push('4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');
  objects.push(`5 0 obj << /Length ${textCommands.length} >> stream\n${textCommands}\nendstream endobj`);

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj) => {
    offsets.push(pdf.length);
    pdf += `${obj}\n`;
  });

  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const safeContext = contextLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `guidance-${safeContext || 'records'}-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export default function GuidanceDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [stage, setStage] = useState<StageKey>('lost');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState(toDateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 1))));
  const [dateTo, setDateTo] = useState(toDateInputValue(new Date()));
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editForm, setEditForm] = useState({
    itemName: '',
    personName: '',
    category: '',
    location: '',
    description: '',
    date: '',
    publicStatus: 'Lost' as PublicStatusOption,
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const reportsData = await fetchReports();
      setReports(reportsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleFocusRefresh = () => {
      if (isMounted) loadData();
    };

    loadData();

    // Keep dashboard metrics in sync with claim actions done in other pages/tabs.
    const refreshTimer = window.setInterval(loadData, 15000);
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);

    return () => {
      isMounted = false;
      window.clearInterval(refreshTimer);
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, [loadData]);

  const lostCount = reports.filter((r) => r.type === 'Lost').length;
  const foundCount = reports.filter((r) => r.type === 'Found').length;
  const claimed = reports.filter((r) => r.status === 'Claimed').length;

  const modalRecords = useMemo(() => {
    const filtered = reports.filter((r) => {
      const statusMatches =
        statusFilter === 'all'
          ? true
          : statusFilter === 'Claimed'
            ? r.status === 'Claimed'
            : r.status === statusFilter;
      const typeMatches = typeFilter === 'all' ? true : r.type === typeFilter;
      const dateVal = new Date(r.date).getTime();
      const fromVal = dateFrom ? new Date(dateFrom).getTime() : Number.NEGATIVE_INFINITY;
      const toVal = dateTo ? new Date(dateTo).getTime() + 86399999 : Number.POSITIVE_INFINITY;
      return statusMatches && typeMatches && dateVal >= fromVal && dateVal <= toVal;
    });

    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reports, statusFilter, typeFilter, dateFrom, dateTo]);

  const openEdit = (record: Report) => {
    setEditError('');
    setEditingReport(record);
    setEditForm({
      itemName: record.itemName || '',
      personName: (record.personName || '').trim(),
      category: record.category || '',
      location: record.location || '',
      description: record.description || '',
      date: record.date || '',
      publicStatus: getPublicStatusLabel(record),
    });
  };

  const saveEdit = async () => {
    if (!editingReport) return;
    setEditBusy(true);
    setEditError('');
    try {
      let nextType = editingReport.type;
      let nextStatus: ReportStatus = 'Verified';

      if (editForm.publicStatus === 'Claimed') {
        nextStatus = 'Claimed';
      } else if (editForm.publicStatus === 'Lost') {
        nextType = 'Lost';
        nextStatus = 'Verified';
      } else if (editForm.publicStatus === 'Found') {
        nextType = 'Found';
        nextStatus = 'Verified';
      } else {
        // Matched is system-driven; keep report type and set as verified.
        nextStatus = 'Verified';
      }

      await updateReport(editingReport.id, {
        itemName: editForm.itemName.trim(),
        personName: editForm.personName.trim(),
        category: editForm.category,
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        date: editForm.date,
        type: nextType,
        status: nextStatus,
      });
      setEditingReport(null);
      await loadData();
    } catch (err) {
      console.error(err);
      setEditError('Failed to update post. Please try again.');
    } finally {
      setEditBusy(false);
    }
  };

  const openModalFromCard = (nextStage: StageKey) => {
    setStage(nextStage);
    if (nextStage === 'lost') {
      setTypeFilter('Lost');
      setStatusFilter('all');
    } else if (nextStage === 'found') {
      setTypeFilter('Found');
      setStatusFilter('all');
    } else {
      setTypeFilter('all');
      setStatusFilter('Claimed');
    }
    setDateFrom(toDateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 1))));
    setDateTo(toDateInputValue(new Date()));
    setIsRecordsModalOpen(true);
  };

  const modalTitle = stage === 'lost'
    ? 'Lost Item Records'
    : stage === 'found'
      ? 'Found Item Records'
      : 'Claimed Item Records';

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
            Track lost, found, and claimed items for <span className="text-slate-900 font-semibold underline decoration-emerald-400 decoration-2">San Isidro NHS</span>.
          </p>
        </div>

        {/* Enhanced Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Lost Items */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-amber-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('lost')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-amber-100"
            >
              <StatCard 
                title="Lost Items" 
                value={lostCount} 
                icon={ClipboardList} 
                bgColor="transparent" 
                iconBg="bg-amber-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Total records of <span className="font-bold text-slate-800 underline decoration-amber-200 uppercase text-[10px] tracking-wide">lost items</span> in the system.
                </p>
              </div>
            </button>
          </div>

          {/* Card 2: Found Items */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('found')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-emerald-100"
            >
              <StatCard 
                title="Found Items" 
                value={foundCount} 
                icon={Search} 
                bgColor="transparent" 
                iconBg="bg-emerald-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Total records of <span className="font-bold text-slate-800 underline decoration-emerald-200 uppercase text-[10px] tracking-wide">found items</span> submitted to the office.
                </p>
              </div>
            </button>
          </div>

          {/* Card 3: Claimed Items */}
          <div className="group relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-3xl blur opacity-10 group-hover:opacity-30 transition duration-300"></div>
            <button
              type="button"
              onClick={() => openModalFromCard('claimed')}
              className="w-full text-left relative bg-white border border-slate-100 rounded-[2rem] p-2 transition-all duration-300 group-hover:translate-y-[-4px] group-hover:shadow-xl group-hover:shadow-blue-100"
            >
              <StatCard 
                title="Claimed Items" 
                value={claimed} 
                icon={PackageCheck} 
                bgColor="transparent" 
                iconBg="bg-blue-500" 
              />
              <div className="px-5 pb-5 pt-0">
                <div className="h-px bg-slate-50 w-full mb-4" />
                <p className="text-sm text-slate-500 leading-snug">
                  Successfully <span className="font-bold text-slate-800 underline decoration-blue-200 uppercase text-[10px] tracking-wide">released</span> and documented as claimed.
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
                    <option value="Pending">Pending</option>
                    <option value="Verified">Verified</option>
                    <option value="Claimed">Claimed</option>
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
                    onClick={() => openPrintableRecords(modalRecords, modalTitle)}
                    className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 text-sm hover:bg-emerald-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => downloadRecordsPdf(modalRecords, modalTitle)}
                    className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white text-gray-700 px-3 text-sm hover:bg-gray-50"
                  >
                    <Download className="w-4 h-4" />
                    Download PDF
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No records match the selected filters.</td>
                      </tr>
                    ) : (
                      modalRecords.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-700">#{record.id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.itemName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{record.type}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{getDisplayStatus(record)}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{new Date(record.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{record.reporterName || record.reporterUsername || 'N/A'}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(record)}
                              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <FilePenLine className="w-3.5 h-3.5" />
                              Edit Post
                            </button>
                          </td>
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

      {editingReport && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4" onClick={() => setEditingReport(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Edit Post</h3>
                <p className="text-xs text-gray-500 mt-1">Update details and correct status when claim verification is wrong.</p>
              </div>
              <button onClick={() => setEditingReport(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editError && (
                <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm">{editError}</div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600">Person Name</label>
                  <input
                    type="text"
                    value={editForm.personName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, personName: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="GUIDANCE if blank"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Item Name</label>
                  <input
                    type="text"
                    value={editForm.itemName}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, itemName: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Category</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Location</label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Date</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Status</label>
                  <select
                    value={editForm.publicStatus}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, publicStatus: e.target.value as PublicStatusOption }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="Lost">Lost</option>
                    <option value="Found">Found</option>
                    <option value="Matched">Matched</option>
                    <option value="Claimed">Claimed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600">Description</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingReport(null)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editBusy}
                  className="rounded-lg bg-emerald-600 text-white px-4 py-2 text-sm hover:bg-emerald-700 disabled:opacity-70"
                >
                  {editBusy ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
