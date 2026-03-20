// frontend/src/pages/guidance/Dashboard.tsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { ClipboardList, Search, PackageCheck, X, Download, Printer, FilePenLine } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DashboardHeader from '../../components/admin/DashboardHeader'; 
import StatCard from '../../components/admin/StatCard'; 
import { fetchClaims, fetchReports, updateClaimContact, updateReport } from '../../services/api';
import type { Claim } from '../../types/claim';
import type { Report, ReportStatus, ReportType } from '../../types/report';

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

function buildRecordsPrintHtml(records: Report[], contextLabel: string, showClaimant: boolean) {
  const generatedAt = new Date();
  const rows = records.map((r) => `
    <tr>
      <td class="photo-cell">
        ${r.image ? `<a href="${r.image}" target="_blank" rel="noopener">
          <img src="${r.image}" alt="${r.itemName || 'Record photo'}" class="photo-img" />
        </a>` : '<span class="no-photo">No image</span>'}
      </td>
      <td>${r.id}</td>
      <td>${r.itemName}</td>
      <td>${r.type}</td>
      <td>${r.category}</td>
      <td>${r.location}</td>
      <td>${getDisplayStatus(r)}</td>
      <td>${r.date}</td>
      <td>${r.reporterName || r.reporterUsername || 'N/A'}</td>
      <td>${(r.personName || '').trim() || 'N/A'}</td>
      <td>${[r.grade, r.section].map((v) => (v || '').trim()).filter(Boolean).join(' - ') || 'N/A'}</td>
      ${showClaimant ? `
        <td class="photo-cell">
          ${r.claimantPhoto ? `<a href="${r.claimantPhoto}" target="_blank" rel="noopener">
            <img src="${r.claimantPhoto}" alt="Claimant photo" class="photo-img" />
          </a>` : '<span class="no-photo">No image</span>'}
          <div style="margin-top:6px;font-size:11px;color:#374151;">${r.claimantName || 'Unknown'}</div>
        </td>
        <td>${r.claimantContact || 'N/A'}</td>
      ` : ''}
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
          th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; font-size: 12px; vertical-align: top; }
          th { background: #f3f4f6; }
          .photo-cell { width: 140px; }
          .photo-img { width: 120px; height: 90px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; }
          .no-photo { color: #9ca3af; font-size: 11px; }
          a { text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>Guidance Records Export</h1>
        <div class="meta">Context: ${contextLabel} | Generated: ${generatedAt.toLocaleString()} | Total: ${records.length}</div>
        <table>
          <thead>
            <tr>
              <th>Photo</th>
              <th>ID</th>
              <th>Item</th>
              <th>Type</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Date</th>
              <th>Reporter</th>
              <th>Person</th>
              <th>Grade/Section</th>
              ${showClaimant ? '<th>Claimant</th><th>Claimant Contact</th>' : ''}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>
  `;

  return printHtml;
}

function openPrintableRecords(records: Report[], contextLabel: string, showClaimant: boolean) {
  const printHtml = buildRecordsPrintHtml(records, contextLabel, showClaimant);

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

function downloadRecordsPdf(records: Report[], contextLabel: string, showClaimant: boolean) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const generatedAt = new Date().toLocaleString();

  doc.setFontSize(14);
  doc.text('Guidance Records Export', 40, 40);
  doc.setFontSize(10);
  doc.text(`Context: ${contextLabel} | Generated: ${generatedAt} | Total: ${records.length}`, 40, 58);

  const head = [[
    'ID',
    'Item',
    'Type',
    'Category',
    'Location',
    'Status',
    'Date',
    'Reporter',
    'Person',
    'Grade/Section',
    ...(showClaimant ? ['Claimant', 'Claimant Contact'] : []),
  ]];

  const body = records.map((r) => ([
    String(r.id ?? ''),
    r.itemName || '',
    r.type || '',
    r.category || '',
    r.location || '',
    getDisplayStatus(r) || '',
    r.date || '',
    r.reporterName || r.reporterUsername || 'N/A',
    (r.personName || '').trim() || 'N/A',
    [r.grade, r.section].map((v) => (v || '').trim()).filter(Boolean).join(' - ') || 'N/A',
    ...(showClaimant ? [r.claimantName || 'Unknown', r.claimantContact || 'N/A'] : []),
  ]));

  autoTable(doc, {
    head,
    body,
    startY: 72,
    styles: { fontSize: 8, cellPadding: 3, valign: 'top' },
    headStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39] },
  });

  const safeLabel = contextLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const dateStamp = new Date().toISOString().slice(0, 10);
  doc.save(`guidance_records_${safeLabel || 'records'}_${dateStamp}.pdf`);
}

export default function GuidanceDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordsModalOpen, setIsRecordsModalOpen] = useState(false);
  const [stage, setStage] = useState<StageKey>('lost');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateFrom, setDateFrom] = useState(toDateInputValue(new Date(new Date().setMonth(new Date().getMonth() - 1))));
  const [dateTo, setDateTo] = useState(toDateInputValue(new Date()));
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [claimEdit, setClaimEdit] = useState<{ id: number; claimantName: string; claimantContact: string } | null>(null);
  const [editForm, setEditForm] = useState({
    itemName: '',
    personName: '',
    grade: '',
    section: '',
    category: '',
    location: '',
    description: '',
    date: '',
    publicStatus: 'Lost' as PublicStatusOption,
  });
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [reportsResult, claimsResult] = await Promise.allSettled([
        fetchReports(),
        fetchClaims(),
      ]);

      if (reportsResult.status === 'fulfilled') {
        setReports(reportsResult.value);
      } else {
        console.error(reportsResult.reason);
      }

      if (claimsResult.status === 'fulfilled') {
        setClaims(claimsResult.value);
      } else {
        console.error(claimsResult.reason);
      }
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
  const claimedClaims = useMemo(
    () => claims.filter((c) => c.status === 'Claimed'),
    [claims]
  );
  const claimed = claimedClaims.length;

  const claimedRecords = useMemo<Report[]>(
    () =>
      claimedClaims.map((claim) => ({
        id: claim.reportRecordId ?? claim.id,
        reporter: 0,
        reporterName: claim.reporterName || '',
        reporterRole: claim.reporterRole || '',
        reporterSchoolId: claim.reporterSchoolId || '',
        reporterUsername: claim.reporterName || '',
        itemName: claim.itemName,
        personName: '',
        grade: '',
        section: '',
        description: claim.reportDescription || '',
        type: (claim.reportType || 'Found') as ReportType,
        category: claim.reportCategory || '',
        location: claim.reportLocation || '',
        status: 'Claimed',
        date: claim.reportDate || claim.date,
        image: claim.reportImage || '',
        returnedByPhoto: null,
        claimantName: claim.claimantName || '',
        claimantPhoto: claim.claimantPhoto || claim.claimant_photo || null,
        claimantContact: claim.claimantContact || null,
      })),
    [claimedClaims]
  );

  const modalRecords = useMemo(() => {
    const source = stage === 'claimed' ? claimedRecords : reports;
    const filtered = source.filter((r) => {
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
  }, [stage, claimedRecords, reports, statusFilter, typeFilter, dateFrom, dateTo]);

  const openEdit = (record: Report) => {
    setEditError('');
    setEditingReport(record);
    setClaimEdit(null);
    setEditForm({
      itemName: record.itemName || '',
      personName: (record.personName || '').trim(),
      grade: (record.grade || '').trim(),
      section: (record.section || '').trim(),
      category: record.category || '',
      location: record.location || '',
      description: record.description || '',
      date: record.date || '',
      publicStatus: getPublicStatusLabel(record),
    });
    if (record.status === 'Claimed') {
      fetchClaims(record.id)
        .then((claims) => {
          const claimed = claims.find((c) => c.status === 'Claimed') || claims[0];
          if (!claimed) return;
          setClaimEdit({
            id: claimed.id,
            claimantName: claimed.claimantName || '',
            claimantContact: claimed.claimantContact || '',
          });
        })
        .catch((err) => console.error(err));
    }
  };

  const saveEdit = async () => {
    if (!editingReport) return;
    setEditBusy(true);
    setEditError('');
    try {
      if (editForm.publicStatus === 'Claimed') {
        if (!claimEdit) {
          setEditError('No claim record found for this report.');
          return;
        }
        if (!claimEdit.claimantContact.trim()) {
          setEditError('Claimant contact number is required for claimed records.');
          return;
        }
        await updateClaimContact(claimEdit.id, {
          claimantName: claimEdit.claimantName.trim(),
          claimantContact: claimEdit.claimantContact.trim(),
        });
      }
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

      const updated = await updateReport(editingReport.id, {
        itemName: editForm.itemName.trim(),
        personName: editForm.personName.trim(),
        grade: editForm.grade.trim(),
        section: editForm.section.trim(),
        category: editForm.category,
        location: editForm.location.trim(),
        description: editForm.description.trim(),
        date: editForm.date,
        type: nextType,
        status: nextStatus,
      });
      setEditingReport(null);
      setReports((prev) =>
        prev.map((report) =>
          report.id === editingReport.id
            ? {
                ...report,
                ...updated,
                image: updated.image || report.image,
              }
            : report
        )
      );
    } catch (err) {
      console.error(err);
      setEditError('Failed to update post. Please try again.');
    } finally {
      setEditBusy(false);
    }
  };

  const openModalFromCard = (nextStage: StageKey) => {
    loadData();
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
  const showClaimant = stage === 'claimed';

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
                    onClick={() => openPrintableRecords(modalRecords, modalTitle, showClaimant)}
                    className="flex-1 h-10 inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 text-white px-3 text-sm hover:bg-emerald-700"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => downloadRecordsPdf(modalRecords, modalTitle, showClaimant)}
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
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Person</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Grade/Section</th>
                      {showClaimant ? (
                        <>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Claimant</th>
                          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                        </>
                      ) : null}
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Image</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalRecords.length === 0 ? (
                      <tr>
                        <td colSpan={showClaimant ? 12 : 10} className="px-4 py-8 text-center text-gray-500">No records match the selected filters.</td>
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
                          <td className="px-4 py-3 text-sm text-gray-700">{(record.personName || '').trim() || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{[record.grade, record.section].map((v) => (v || '').trim()).filter(Boolean).join(' - ') || 'N/A'}</td>
                          {showClaimant ? (
                            <>
                              <td className="px-4 py-3">
                              {record.claimantPhoto ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage({ src: record.claimantPhoto as string, alt: 'Claimant' })}
                                  className="inline-flex items-center justify-center cursor-zoom-in"
                                >
                                    <img
                                      src={record.claimantPhoto}
                                      alt="Claimant"
                                      className="h-10 w-10 rounded-md object-cover border border-gray-200"
                                    />
                                  </button>
                              ) : (
                                <span className="text-xs text-gray-400">No image</span>
                              )}
                              <div className="mt-1 text-xs text-gray-600">{record.claimantName || 'Unknown'}</div>
                            </td>
                              <td className="px-4 py-3 text-sm text-gray-700">{record.claimantContact || 'N/A'}</td>
                            </>
                          ) : null}
                          <td className="px-4 py-3">
                            {record.image ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ src: record.image, alt: record.itemName })}
                                className="inline-flex items-center justify-center cursor-zoom-in"
                              >
                                <img
                                  src={record.image}
                                  alt={record.itemName}
                                  className="h-10 w-10 rounded-md object-cover border border-gray-200"
                                />
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">No image</span>
                            )}
                          </td>
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

      {previewImage && (
        <div
          className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-black/60 hover:bg-black/75 text-white rounded-full p-2"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
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
                  <label className="text-xs font-semibold text-gray-600">Grade</label>
                  <input
                    type="text"
                    value={editForm.grade}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, grade: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., 10"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600">Section</label>
                  <input
                    type="text"
                    value={editForm.section}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, section: e.target.value }))}
                    className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="e.g., Einstein"
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
              {editForm.publicStatus === 'Claimed' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Claimant Name</label>
                    <input
                      type="text"
                      value={claimEdit?.claimantName || ''}
                      onChange={(e) => {
                        if (!claimEdit) return;
                        setClaimEdit({ ...claimEdit, claimantName: e.target.value });
                      }}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="Enter claimant full name"
                      disabled={!claimEdit}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600">Claimant Contact Number</label>
                    <input
                      type="text"
                      value={claimEdit?.claimantContact || ''}
                      onChange={(e) => {
                        if (!claimEdit) return;
                        setClaimEdit({ ...claimEdit, claimantContact: e.target.value });
                      }}
                      className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      placeholder="e.g., 0917-123-4567"
                      required
                      disabled={!claimEdit}
                    />
                  </div>
                </div>
              ) : null}
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
