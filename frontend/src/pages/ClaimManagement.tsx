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
  const [filter, setFilter] = useState<ClaimStatus | "All">("All");
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

  // --- THE FIX IS HERE ---
  const handleStatusUpdate = async (id: number, newStatus: ClaimStatus, rejectionReason?: string) => {
    try {
      // Pass the rejectionReason to the API
      await updateClaimStatus(id, newStatus, rejectionReason);
      
      // Update local state to reflect change immediately
      setClaims((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      
      // Close modal if open
      setIsModalOpen(false);
      
      // Optional: Refresh from server to ensure sync
      loadClaims();
    } catch (error) {
      console.error("Failed to update status:", error);
      alert("Failed to update claim status");
    }
  };

  const filteredClaims = claims.filter((claim) => {
    const matchesFilter = filter === "All" || claim.status === filter;
    const matchesSearch = 
      claim.itemName.toLowerCase().includes(search.toLowerCase()) ||
      claim.claimantName.toLowerCase().includes(search.toLowerCase()) ||
      claim.id.toString().includes(search);
    return matchesFilter && matchesSearch;
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
      {/* Filters & Search */}
      <div className={`p-4 rounded-xl shadow-sm border flex flex-col sm:flex-row gap-4 justify-between items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className={`flex gap-2 p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-50'}`}>
          {(["All", "Pending", "Approved", "Claimed", "Rejected"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                filter === s
                  ? isDark ? "bg-slate-100 text-slate-900 shadow-sm" : "bg-white text-blue-600 shadow-sm"
                  : isDark ? "text-slate-400 hover:text-slate-200" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
          <input
            type="text"
            placeholder="Search claims..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 ${
              isDark
                ? 'bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/30'
                : 'bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500/20'
            }`}
          />
        </div>
      </div>

      {/* Claims Table */}
      <div className={`rounded-xl shadow-sm border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-100'}`}>
              <tr>
                <th className={`px-6 py-4 text-xs font-semibold uppercase ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Item</th>
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
                    No claims found matching your filters.
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
                        
                        {/* Quick Actions for Pending */}
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
                                // We open modal for rejection to force reason input
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

      {/* Detail Modal */}
      <ClaimDetailsModal
        open={isModalOpen}
        claim={selectedClaim}
        onClose={() => setIsModalOpen(false)}
        onStatusChange={handleStatusUpdate}
      />
    </div>
  );
}

