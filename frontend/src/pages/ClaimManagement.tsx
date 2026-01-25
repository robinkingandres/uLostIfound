import { useState, useEffect, useCallback } from 'react';
import { 
  ClipboardList, 
  CheckCircle, 
  XCircle, 
  Check,
  X,
  PackageCheck,
  Clock
} from 'lucide-react';
import DashboardHeader from '../components/admin/DashboardHeader';
import StatCard from '../components/admin/StatCard';
import type { Claim, ClaimStatus } from '../types/claim';
import { fetchClaims, updateClaimStatus } from '../services/api';

export default function ClaimManagement() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ... (Stats state and loadClaims remain the same) ...
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    claimed: 0,
    rejected: 0
  });

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchClaims();
      setClaims(data);
      
      setStats({
        pending: data.filter(c => c.status === 'Pending').length,
        approved: data.filter(c => c.status === 'Approved').length,
        claimed: data.filter(c => c.status === 'Claimed').length,
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

  const handleStatusChange = async (id: number, newStatus: ClaimStatus) => {
    // ... (same optimistic update logic) ...
    const originalClaims = [...claims];
    const updatedData = claims.map(c => c.id === id ? { ...c, status: newStatus } : c);
    setClaims(updatedData);

    try {
      await updateClaimStatus(id, newStatus);
      // Update stats immediately for UI responsiveness
      setStats({
        pending: updatedData.filter(c => c.status === 'Pending').length,
        approved: updatedData.filter(c => c.status === 'Approved').length,
        claimed: updatedData.filter(c => c.status === 'Claimed').length,
        rejected: updatedData.filter(c => c.status === 'Rejected').length
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      alert('Failed to update claim status.');
      setClaims(originalClaims);
    }
  };

  const getStatusColor = (status: ClaimStatus) => {
    // ... (same color logic) ...
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-700';
      case 'Claimed': return 'bg-blue-100 text-blue-700';
      case 'Rejected': return 'bg-red-100 text-red-700';
      default: return 'bg-yellow-100 text-yellow-700';
    }
  };

  if (loading) return <div className="p-8">Loading claims...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Claim Requests (Admin)</h1>
          <p className="text-gray-600 mt-1">Verify proof of ownership before forwarding to Guidance.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard title="Pending" value={stats.pending} icon={ClipboardList} bgColor="bg-gray-100" iconBg="bg-yellow-400" />
          <StatCard title="To Release" value={stats.approved} icon={CheckCircle} bgColor="bg-gray-100" iconBg="bg-green-400" />
          <StatCard title="Claimed" value={stats.claimed} icon={PackageCheck} bgColor="bg-gray-100" iconBg="bg-blue-400" />
          <StatCard title="Rejected" value={stats.rejected} icon={XCircle} bgColor="bg-gray-100" iconBg="bg-red-600" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Claim Verification Queue</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Item Name</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Claimant</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Proof</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-bold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-bold text-gray-900">{claim.itemName}</td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-bold text-gray-900">{claim.claimantName}</p>
                        <p className="text-xs text-gray-500 italic">{claim.claimantRole}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 truncate max-w-xs" title={claim.proofDescription}>
                      {claim.proofDescription}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(claim.status)}`}>
                        {claim.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        {/* ADMIN ACTIONS: Only Approve or Reject */}
                        {claim.status === 'Pending' && (
                          <>
                            <button 
                              onClick={() => handleStatusChange(claim.id, 'Approved')}
                              className="flex items-center gap-1 px-3 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded text-xs font-bold transition-colors border border-green-200"
                            >
                              <Check className="w-3 h-3" /> Approve (Verify)
                            </button>
                            <button 
                              onClick={() => handleStatusChange(claim.id, 'Rejected')}
                              className="flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded text-xs font-bold transition-colors border border-red-200"
                            >
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}

                        {/* Approved items are waiting for Guidance */}
                        {claim.status === 'Approved' && (
                           <span className="flex items-center gap-1 text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded">
                              <Clock className="w-3 h-3" /> Forwarded to Guidance
                           </span>
                        )}
                        
                        {(claim.status === 'Claimed' || claim.status === 'Rejected') && (
                           <span className="text-xs text-gray-400 italic">Completed</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}