import { useState, useEffect } from 'react';
import { Eye, X, PackageCheck, Printer, FileText } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { fetchClaims, updateClaimStatus, fetchReports } from '../../services/api';
import type { Claim } from '../../types/claim';
import type { Report } from '../../types/report';

export default function ClaimReview() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reports, setReports] = useState<Report[]>([]); // Needed to get images
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'Pending' | 'Approved' | 'Claimed' | 'All'>('Pending');

  // Load both claims and reports to map images
  const loadData = async () => {
    setLoading(true);
    try {
      const [claimsData, reportsData] = await Promise.all([
        fetchClaims(),
        fetchReports('Found') // We generally claim found items
      ]);
      setClaims(claimsData);
      setReports(reportsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Helper to find the report image for a claim
  const getReportImage = (itemName: string) => {
    // Note: Ideally the API response for Claim should include the image URL directly.
    // As a fallback, we match by item name (risky in prod, ok for MVP) or ID if available.
    const report = reports.find(r => r.itemName === itemName);
    return report?.image || 'https://via.placeholder.com/150';
  };

  const handleAction = async (id: number, status: 'Approved' | 'Rejected' | 'Claimed') => {
    try {
      await updateClaimStatus(id, status);
      await loadData();
      setSelectedClaim(null);
    } catch (error) {
      alert("Failed to update status");
    }
  };

  const handlePrintClaimReport = (claim: Claim) => {
    const reportImage = claim.reportImage || getReportImage(claim.itemName);
    const proofImage = claim.proof_image || claim.proofImage || '';
    const claimantPhoto = claim.claimant_photo || claim.claimantPhoto || '';
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Claim Documentation Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 8px 0; font-size: 24px; }
            h2 { margin: 20px 0 8px 0; font-size: 16px; }
            .meta { font-size: 12px; color: #6b7280; margin-bottom: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
            .label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: 700; }
            .value { font-size: 14px; color: #111827; margin-top: 4px; }
            img { max-width: 100%; max-height: 240px; object-fit: cover; border: 1px solid #e5e7eb; border-radius: 8px; }
            .full { margin-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Claim Documentation Report</h1>
          <div class="meta">Generated: ${new Date().toLocaleString()} | Claim ID: #${claim.id}</div>
          <div class="grid">
            <div class="card">
              <div class="label">Student Claimant</div>
              <div class="value">${claim.claimantName}</div>
              <div class="value">${claim.claimantRole}</div>
            </div>
            <div class="card">
              <div class="label">Item</div>
              <div class="value">${claim.itemName}</div>
              <div class="value">Status: ${claim.status}</div>
            </div>
          </div>
          <h2>Report Details</h2>
          <div class="card">
            <div class="value">Category: ${claim.reportCategory || 'N/A'}</div>
            <div class="value">Location: ${claim.reportLocation || 'N/A'}</div>
            <div class="value">Date Lost/Found: ${claim.reportDate || 'N/A'}</div>
            <div class="value">Reported by: ${claim.reporterName || 'N/A'} (${claim.reporterSchoolId || 'N/A'})</div>
            <div class="value">${claim.reportDescription || 'No report description.'}</div>
          </div>
          <h2>Proof of Ownership</h2>
          <div class="card">
            <div class="value">${claim.proofDescription || 'No proof description provided.'}</div>
          </div>
          <div class="grid full">
            <div class="card">
              <div class="label">Item Report Image</div>
              ${reportImage ? `<img src="${reportImage}" alt="Report Image" />` : '<div class="value">No image</div>'}
            </div>
            <div class="card">
              <div class="label">Proof Image</div>
              ${proofImage ? `<img src="${proofImage}" alt="Proof Image" />` : '<div class="value">No image</div>'}
            </div>
          </div>
          <h2>Claimant Identification Photo</h2>
          <div class="card">
            ${claimantPhoto ? `<img src="${claimantPhoto}" alt="Claimant Photo" />` : '<div class="value">No claimant photo uploaded.</div>'}
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (loading) return <div className="p-8">Loading...</div>;

  const visibleClaims = claims.filter((claim) => {
    if (statusFilter === 'All') return true;
    return claim.status === statusFilter;
  });

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <DashboardHeader />
      
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Claim Verification Queue</h1>
        <div className="mb-4 flex gap-2">
          {(['Pending', 'Approved', 'Claimed', 'All'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                statusFilter === key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Claimant</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visibleClaims.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <p className="text-sm font-semibold text-gray-700">No claims found for this filter.</p>
                    <p className="text-xs text-gray-500 mt-1">
                      A claim must be submitted first before it appears in Review Claims.
                    </p>
                  </td>
                </tr>
              ) : (
                visibleClaims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{claim.itemName}</td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold">{claim.claimantName}</p>
                      <p className="text-xs text-gray-500">{claim.claimantRole}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(claim.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold 
                        ${claim.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 
                          claim.status === 'Approved' ? 'bg-green-100 text-green-700' :
                          claim.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handlePrintClaimReport(claim)}
                          className="text-slate-700 hover:text-slate-900 text-sm font-semibold flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" /> Claim Report
                        </button>

                        {claim.status === 'Approved' || claim.status === 'Pending' ? (
                            <button 
                              onClick={() => setSelectedClaim(claim)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> Review & Release
                            </button>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Closed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- REVIEW MODAL (Comparison Logic) --- */}
      {selectedClaim && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Review Claim Request</h2>
                <p className="text-sm text-gray-500">Compare item details with student proof.</p>
              </div>
              <button onClick={() => setSelectedClaim(null)} className="p-2 hover:bg-gray-200 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col md:flex-row gap-8">
                
                {/* LEFT: Physical Item Data (From Report) */}
                <div className="flex-1 space-y-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-blue-800 text-sm font-bold text-center">
                    PHYSICAL ITEM (DATABASE)
                  </div>
                  <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <img 
                      src={getReportImage(selectedClaim.itemName)} 
                      alt="Item" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Item Name</label>
                    <p className="text-lg font-bold text-gray-900">{selectedClaim.itemName}</p>
                  </div>
                </div>

                {/* DIVIDER */}
                <div className="hidden md:block w-px bg-gray-200"></div>

                {/* RIGHT: Claimant Proof (From Claim) */}
                <div className="flex-1 space-y-4">
                  <div className="bg-emerald-50 p-3 rounded-lg text-emerald-800 text-sm font-bold text-center">
                    STUDENT PROOF (CLAIM)
                  </div>
                  {(selectedClaim.claimant_photo || selectedClaim.claimantPhoto) ? (
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={selectedClaim.claimant_photo || selectedClaim.claimantPhoto || ''}
                        alt="Claimant"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="bg-red-50 p-3 rounded-lg text-red-700 text-sm font-semibold text-center border border-red-100">
                      Missing claimant photo. Upload is required before release.
                    </div>
                  )}
                  
                  <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl p-6 min-h-[200px]">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Proof Description / Unique Marks</label>
                    <p className="text-gray-800 leading-relaxed italic">
                      "{selectedClaim.proofDescription}"
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Claimant</label>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {selectedClaim.claimantName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{selectedClaim.claimantName}</p>
                        <p className="text-xs text-gray-500">{selectedClaim.claimantRole}</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Claim Documentation Report</h3>
                  <button
                    type="button"
                    onClick={() => handlePrintClaimReport(selectedClaim)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800"
                  >
                    <Printer className="w-4 h-4" />
                    Print Report
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Student Details</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedClaim.claimantName}</p>
                    <p className="text-xs text-gray-500">{selectedClaim.claimantRole}</p>
                    <p className="text-xs text-gray-500 mt-2">Claim ID: #{selectedClaim.id}</p>
                    <p className="text-xs text-gray-500">Date: {new Date(selectedClaim.date).toLocaleDateString()}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Item Report Details</p>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Item:</span> {selectedClaim.itemName}</p>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Category:</span> {selectedClaim.reportCategory || 'N/A'}</p>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Location:</span> {selectedClaim.reportLocation || 'N/A'}</p>
                    <p className="text-sm text-gray-800"><span className="font-semibold">Date Lost/Found:</span> {selectedClaim.reportDate || 'N/A'}</p>
                  </div>

                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Ownership Proof Details</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedClaim.proofDescription}</p>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Reported Item Photo</p>
                        <img
                          src={selectedClaim.reportImage || getReportImage(selectedClaim.itemName)}
                          alt="Reported item"
                          className="w-full h-44 object-cover rounded-lg border border-gray-200"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1">Proof Image</p>
                        {selectedClaim.proof_image || selectedClaim.proofImage ? (
                          <img
                            src={selectedClaim.proof_image || selectedClaim.proofImage || ''}
                            alt="Proof"
                            className="w-full h-44 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="w-full h-44 rounded-lg border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-xs text-gray-500">
                            No proof image uploaded
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Claimant Identification Photo</p>
                    {selectedClaim.claimant_photo || selectedClaim.claimantPhoto ? (
                      <img
                        src={selectedClaim.claimant_photo || selectedClaim.claimantPhoto || ''}
                        alt="Claimant photo"
                        className="w-full md:w-80 h-56 object-cover rounded-lg border border-gray-200"
                      />
                    ) : (
                      <div className="w-full rounded-lg border border-dashed border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        Missing claimant photo. Upload is required before release.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER ACTIONS - STRICT GUIDANCE LOGIC */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              
              {/* Guidance can release directly from Pending or Approved */}
              {(selectedClaim.status === 'Approved' || selectedClaim.status === 'Pending') && (
                 <>
                    <button 
                        onClick={() => handleAction(selectedClaim.id, 'Rejected')}
                        className="px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                        <X className="w-5 h-5" /> Reject (Physical Mismatch)
                    </button>

                    <button 
                        disabled={!(selectedClaim.claimant_photo || selectedClaim.claimantPhoto)}
                        onClick={() => handleAction(selectedClaim.id, 'Claimed')}
                        className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <PackageCheck className="w-5 h-5" /> Release Item (Final)
                    </button>
                 </>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
