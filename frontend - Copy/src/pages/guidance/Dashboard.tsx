// frontend/src/pages/guidance/Dashboard.tsx
import { useState, useEffect } from 'react';
import { ClipboardList, CheckCircle, PackageCheck } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader'; // Reusing header
import StatCard from '../../components/admin/StatCard'; // Reusing stat card
import { fetchClaims } from '../../services/api';
import type { Claim } from '../../types/claim';

export default function GuidanceDashboard() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchClaims();
        setClaims(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const pending = claims.filter(c => c.status === 'Pending').length;
  const approved = claims.filter(c => c.status === 'Approved').length;
  const claimed = claims.filter(c => c.status === 'Claimed').length;

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex-1 overflow-auto">
      <DashboardHeader />
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Guidance Overview</h1>
          <p className="text-gray-600">Track claim verifications and item releases.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Pending Reviews" 
            value={pending} 
            icon={ClipboardList} 
            bgColor="bg-yellow-50" 
            iconBg="bg-yellow-500" 
          />
          <StatCard 
            title="Ready for Pickup" 
            value={approved} 
            icon={CheckCircle} 
            bgColor="bg-green-50" 
            iconBg="bg-green-500" 
          />
          <StatCard 
            title="Successfully Returned" 
            value={claimed} 
            icon={PackageCheck} 
            bgColor="bg-blue-50" 
            iconBg="bg-blue-500" 
          />
        </div>
      </div>
    </div>
  );
}