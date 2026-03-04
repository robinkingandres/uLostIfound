import { useEffect, useMemo, useRef, useState } from 'react';
import { Info, ChevronDown, Upload, X, Loader2, UserCircle2, FileText, Eye, Calendar, MapPin, Tag } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { createClaim, fetchReports } from '../../services/api';
import type { Report } from '../../types/report';

export default function CreateClaimReport() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    reportId: '',
    claimantName: '',
    claimantSchoolId: '',
    proofDescription: '',
  });

  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [claimantPhoto, setClaimantPhoto] = useState<File | null>(null);
  const [claimantPreview, setClaimantPreview] = useState<string | null>(null);
  const [zoomSrc, setZoomSrc] = useState<string | null>(null);
  const [showItemDetails, setShowItemDetails] = useState(false);

  const proofInputRef = useRef<HTMLInputElement>(null);
  const claimantPhotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      try {
        const foundReports = await fetchReports('Found');

        const approvedReports = foundReports.filter((r) => r.status === 'Verified' || r.status === 'Pending');
        setReports(approvedReports);
      } catch (e) {
        setError('Failed to load reports for claim report creation.');
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((r) => String(r.id) === form.reportId) || null,
    [reports, form.reportId]
  );

  const onSelectFile = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'proof' | 'claimant'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be 5MB or below.');
      return;
    }
    setError('');
    if (kind === 'proof') {
      setProofImage(file);
      setProofPreview(URL.createObjectURL(file));
    } else {
      setClaimantPhoto(file);
      setClaimantPreview(URL.createObjectURL(file));
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.reportId || !form.claimantName.trim() || !form.proofDescription.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    if (!claimantPhoto) {
      setError('Claimant photo is required.');
      return;
    }

    setSubmitting(true);
    try {
      await createClaim(
        Number(form.reportId),
        form.proofDescription.trim(),
        proofImage,
        claimantPhoto,
        {
          claimantName: form.claimantName.trim(),
          claimantSchoolId: form.claimantSchoolId.trim(),
        }
      );
      setSuccess('Claim report created successfully.');
      setForm({ reportId: '', claimantName: '', claimantSchoolId: '', proofDescription: '' });
      setProofImage(null);
      setProofPreview(null);
      setClaimantPhoto(null);
      setClaimantPreview(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create claim report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <DashboardHeader />
      <main className="p-8">
        <div className="max-w-5xl mx-auto bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Guidance</p>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">Create Claim Report</h1>
            <p className="text-sm text-gray-500 mt-1">Register a claim with ownership proof and claimant photo.</p>
          </div>

          <form onSubmit={submit} className="p-6 space-y-6">
              <div className="w-full rounded-xl p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
                <Info className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
                <p className="text-xs leading-relaxed font-medium text-blue-700">
                  Guidance can review and release directly once proof and claimant documentation are complete.
                </p>
              </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl p-3">{error}</div>}
            {success && <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl p-3">{success}</div>}

            {loadingData ? (
              <div className="py-10 text-center text-gray-500">Loading reports...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Found Item Report <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        value={form.reportId}
                        onChange={(e) => setForm((p) => ({ ...p, reportId: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-gray-50/50"
                        required
                      >
                        <option value="">Select found item...</option>
                        {reports.map((r) => (
                          <option key={r.id} value={r.id}>
                            #{r.id} - {r.itemName} ({r.location})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Claimant Name <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={form.claimantName}
                      onChange={(e) => setForm((p) => ({ ...p, claimantName: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50"
                      placeholder="Enter claimant full name"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase font-bold text-gray-500">Selected Item</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport?.itemName || '-'}</p>
                        <p className="text-xs text-gray-500">{selectedReport?.category || '-'} | {selectedReport?.location || '-'}</p>
                      </div>
                      {selectedReport && (
                        <button
                          type="button"
                          onClick={() => setShowItemDetails(true)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold hover:bg-blue-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
                    <p className="text-xs uppercase font-bold text-gray-500">Claimant (Walk-in)</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{form.claimantName.trim() || '-'}</p>
                    <p className="text-xs text-gray-500">{form.claimantSchoolId.trim() || 'No school ID provided'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">Claimant School ID (Optional)</label>
                    <input
                      type="text"
                      value={form.claimantSchoolId}
                      onChange={(e) => setForm((p) => ({ ...p, claimantSchoolId: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50/50"
                      placeholder="e.g., 2020-123456"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Proof of Item <span className="text-red-500">*</span></label>
                  <textarea
                    value={form.proofDescription}
                    onChange={(e) => setForm((p) => ({ ...p, proofDescription: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none bg-gray-50/50"
                    placeholder="Describe unique marks, contents, identifiers, and ownership details."
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Proof Image</label>
                    <input ref={proofInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => onSelectFile(e, 'proof')} />
                    {proofPreview ? (
                      <div className="relative w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <img src={proofPreview} alt="Proof" className="w-full h-44 object-cover cursor-zoom-in" onClick={() => setZoomSrc(proofPreview)} />
                        <button type="button" onClick={() => { setProofImage(null); setProofPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => proofInputRef.current?.click()} className="w-full border-2 border-dashed border-cyan-300 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-cyan-50/50">
                        <Upload className="w-6 h-6 text-cyan-500" />
                        <span className="text-sm font-semibold text-cyan-700">Upload Proof Image</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Claimant Person Photo <span className="text-red-500">*</span></label>
                    <input ref={claimantPhotoRef} type="file" className="hidden" accept="image/*" onChange={(e) => onSelectFile(e, 'claimant')} />
                    {claimantPreview ? (
                      <div className="relative w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                        <img src={claimantPreview} alt="Claimant" className="w-full h-44 object-cover cursor-zoom-in" onClick={() => setZoomSrc(claimantPreview)} />
                        <button type="button" onClick={() => { setClaimantPhoto(null); setClaimantPreview(null); }} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => claimantPhotoRef.current?.click()} className="w-full border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-emerald-50/50">
                        <UserCircle2 className="w-6 h-6 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-700">Upload Claimant Photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loadingData || submitting}
                className="w-full md:w-auto px-8 py-3 rounded-xl bg-[#29b6f6] hover:bg-[#039be5] text-white text-sm font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><FileText className="w-4 h-4" /> Create Claim Report</>}
              </button>
            </div>
          </form>
        </div>
      </main>

      {zoomSrc && (
        <div className="fixed inset-0 z-[70] bg-black/80 p-3 sm:p-6 flex items-center justify-center" onClick={() => setZoomSrc(null)}>
          <button type="button" onClick={() => setZoomSrc(null)} className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-black/60 hover:bg-black/75 text-white rounded-full p-2" aria-label="Close image preview">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <img src={zoomSrc} alt="Preview" className="max-w-full max-h-[90vh] object-contain rounded-xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {showItemDetails && selectedReport && (
        <div
          className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowItemDetails(false)}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Found Item Details</h3>
                <p className="text-xs text-gray-500 mt-1">Review complete report details before creating claim report.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowItemDetails(false)}
                className="p-2 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                {selectedReport.image ? (
                  <img
                    src={selectedReport.image}
                    alt={selectedReport.itemName}
                    className="w-full h-64 object-cover cursor-zoom-in"
                    onClick={() => setZoomSrc(selectedReport.image)}
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-sm text-gray-500">
                    No image uploaded
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase font-bold text-gray-500">Item Name</p>
                  <p className="text-base font-semibold text-gray-900 mt-1">{selectedReport.itemName}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Category</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport.category}</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport.date}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-[11px] uppercase font-bold text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport.location}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-[11px] uppercase font-bold text-gray-500">Status</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport.status}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-[11px] uppercase font-bold text-gray-500">Reporter</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedReport.reporterName || selectedReport.reporterUsername || 'N/A'}</p>
                  <p className="text-xs text-gray-500">{selectedReport.reporterSchoolId || ''}</p>
                </div>
              </div>

              <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-[11px] uppercase font-bold text-gray-500">Description</p>
                <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{selectedReport.description || 'No description available.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
