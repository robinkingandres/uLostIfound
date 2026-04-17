import { useState, useEffect, useCallback } from "react";
import {
  Check,
  X,
  Search
} from "lucide-react";
import type { Claim, ClaimStatus } from "../types/claim";
import { fetchClaims, updateClaimStatus } from "../services/api";
import ClaimDetailsModal from "../components/admin/ClaimDetailsModal";
import { useAdminTheme } from '../contexts/AdminThemeContext';

export default function ClaimManagement() {
  const { isDark } = useAdminTheme();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState("");

  const loadClaims = useCallback(async () => {
    try {
      const data = await fetchClaims();
      setClaims(data);
    } catch (error) {
      console.error("Failed to load claims:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  const handleStatusUpdate = async (id: number, newStatus: ClaimStatus, rejectionReason?: string) => {
    try {
      await updateClaimStatus(id, newStatus, rejectionReason);
      
      setClaims((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      
      setIsModalOpen(false);
      loadClaims();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update claim status");
    }
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch = 
      claim.itemName.toLowerCase().includes(search.toLowerCase()) ||
      claim.claimantName.toLowerCase().includes(search.toLowerCase()) ||
      claim.id.toString().includes(search);
    return matchesSearch;
  });

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-700 border-green-200";
      case "Rejected": return "bg-red-100 text-red-700 border-red-200";
      case "Claimed": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  return (
    <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      
      {/* Updated Search Layout to match image_8aec82.png */}
      <div className={`p-6 rounded-xl shadow-sm border ${isDark ? 'bg-[#0f172a] border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="relative w-full">
          <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search reports by item name, description, location, reporter, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-12 pr-4 py-3 rounded-lg focus:outline-none focus:ring-1 transition-all ${
              isDark
                ? 'bg-[#020617] border border-slate-700 text-slate-100 placeholder:text-slate-600 focus:ring-slate-600 focus:border-slate-600'
                : 'bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500/20'
            }`}
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-70 border-b border-gray-100'}`}>
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Item</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Claimant</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Date</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Status</th>
                <th className={`px-6 py-4 text-xs font-semibold uppercase text-right ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Actions</th>
              </tr>
            </thead>
            <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-gray-50'}>
              {loading ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    Loading claims...
                  </td>
                </tr>
              ) : filteredClaims.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`px-6 py-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    No claims found.
                  </td>
                </tr>
              ) : (
                filteredClaims.map((claim) => (
                  <tr key={claim.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.itemName}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>ID: #{claim.id}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.claimantName}</div>
                      <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{claim.claimantRole}</div>
                    </td>
                    <td className={`px-6 py-4 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {new Date(claim.createdAt || claim.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedClaim(claim);
                            setIsModalOpen(true);
                          }}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                            isDark ? 'text-slate-200 bg-slate-800 hover:bg-slate-700' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                          }`}
                        >
                          View Details
                        </button>
                        
                        {claim.status === "Pending" && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(claim.id, "Approved")}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedClaim(claim);
                                setIsModalOpen(true);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
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

      <ClaimDetailsModal
        open={isModalOpen}
        claim={selectedClaim}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusUpdate}
      />
    </div>
  );
}