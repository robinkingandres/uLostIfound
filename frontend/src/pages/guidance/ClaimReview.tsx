import { useState, useEffect } from 'react';
import { Eye, X, PackageCheck } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { fetchClaims, updateClaimStatus, fetchReports } from '../../services/api';
import type { Claim } from '../../types/claim';
import type { Report } from '../../types/report';

export default function ClaimReview() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reports, setReports] = useState<Report[]>([]); // Needed to get images
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);

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
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c));
      setSelectedClaim(null);
    } catch (error) {
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <DashboardHeader />
      
      <div className="p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Claim Verification Queue</h1>

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
              {claims.map((claim) => (
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
                    {/* GUIDANCE ONLY REVIEWS APPROVED ITEMS */}
                    {claim.status === 'Approved' ? (
                        <button 
                          onClick={() => setSelectedClaim(claim)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" /> Review & Release
                        </button>
                    ) : claim.status === 'Pending' ? (
                        <span className="text-xs text-gray-400 italic">Waiting for Admin</span>
                    ) : (
                        <span className="text-xs text-gray-400 italic">Closed</span>
                    )}
                  </td>
                </tr>
              ))}
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
            </div>

            {/* FOOTER ACTIONS - STRICT GUIDANCE LOGIC */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              
              {/* Guidance can ONLY act if status is Approved (meaning Admin verified it) */}
              {selectedClaim.status === 'Approved' && (
                 <>
                    <button 
                        onClick={() => handleAction(selectedClaim.id, 'Rejected')}
                        className="px-6 py-3 bg-white border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                        <X className="w-5 h-5" /> Reject (Physical Mismatch)
                    </button>

                    <button 
                        onClick={() => handleAction(selectedClaim.id, 'Claimed')}
                        className="w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 shadow-lg"
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
