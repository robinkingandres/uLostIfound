import { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Eye, 
  X,
  Check
} from 'lucide-react';
import DashboardHeader from '../components/admin/DashboardHeader';
import StatCard from '../components/admin/StatCard';
import type { Claim, ClaimStatus } from '../types/claim';
// Import API functions
import { fetchClaims, updateClaimStatus } from '../services/api';

export default function ClaimManagement() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stats state
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  // Fetch Claims
  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClaims();
      setClaims(data);
      
      // Calculate stats based on real data
      setStats({
        pending: data.filter(c => c.status === 'Pending').length,
        approved: data.filter(c => c.status === 'Approved').length,
        rejected: data.filter(c => c.status === 'Rejected').length
      });
    } catch (err) {
      console.error(err);
      setError('Failed to load claims.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Handle Status Update (Approve/Reject)
  const handleStatusChange = async (id: number, newStatus: ClaimStatus) => {
    // Optimistic UI update
    const originalClaims = [...claims];
    setClaims(claims.map(c => c.id === id ? { ...c, status: newStatus } : c));

    try {
      await updateClaimStatus(id, newStatus);
      // Re-calculate stats after successful update
      const updatedData = claims.map(c => c.id === id ? { ...c, status: newStatus } : c);
      setStats({
        pending: updatedData.filter(c => c.status === 'Pending').length,
        approved: updatedData.filter(c => c.status === 'Approved').length,
        rejected: updatedData.filter(c => c.status === 'Rejected').length
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update claim status.');
      setClaims(originalClaims); // Revert on error
    }
  };

  const getStatusColor = (status: ClaimStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-600';
      case 'Rejected':
        return 'bg-red-100 text-red-600';
      default: // Pending
        return 'bg-yellow-100 text-yellow-600';
    }
  };

  if (loading) return <div className="p-8">Loading claims...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Claim Requests</h1>
          <p className="text-gray-600 mt-1">Review and approve item claim requests</p>
        </div>

        {/* Stats Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Pending Claims"
            value={stats.pending}
            icon={ClipboardList}
            bgColor="bg-gray-100"
            iconBg="bg-yellow-400"
          />
          <StatCard
            title="Approved Claims"
            value={stats.approved}
            icon={CheckCircle}
            bgColor="bg-gray-100"
            iconBg="bg-green-400"
          />
          <StatCard
            title="Rejected Claims"
            value={stats.rejected}
            icon={XCircle}
            bgColor="bg-gray-100"
            iconBg="bg-red-600"
          />
        </div>

        {/* Main Table Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">All Claim Requests</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Item Name</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Claimant</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Proof Description</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Date</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-gray-500">No claims found.</td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                      {/* Item Name */}
                      <td className="py-4 px-4">
                        <span className="font-bold text-gray-900">{claim.itemName}</span>
                      </td>

                      {/* Claimant */}
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-bold text-gray-900">{claim.claimantName}</p>
                          <p className="text-xs text-gray-500 italic">{claim.claimantRole}</p>
                        </div>
                      </td>

                      {/* Proof Description */}
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-600 truncate max-w-xs" title={claim.proofDescription}>
                          {claim.proofDescription}
                        </p>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4">
                        <span className="text-sm font-medium text-gray-900">{claim.date}</span>
                      </td>

                      {/* Status Pill */}
                      <td className="py-4 px-4">
                        <span className={`px-4 py-1 rounded-full text-xs font-bold ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                      </td>

                      {/* Actions Buttons */}
                      <td className="py-4 px-4">
                        {claim.status === 'Pending' ? (
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleStatusChange(claim.id, 'Approved')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded text-xs font-bold text-green-700 transition-colors"
                            >
                              <Check className="w-3 h-3" />
                              Approve
                            </button>
                            <button 
                              onClick={() => handleStatusChange(claim.id, 'Rejected')}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded text-xs font-bold text-red-600 transition-colors"
                            >
                              <X className="w-3 h-3" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">
                            Action taken
                          </span>
                        )}
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
  );
}