import { useState, useEffect } from 'react';
import { Package, PackageCheck, CheckCircle } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import StatCard from '../../components/admin/StatCard';
import TotalReportsChart from '../../components/admin/TotalReportsChart';
import ClaimedUnclaimedChart from '../../components/admin/ClaimedUnclaimedChart';
import InfoCard from '../../components/InfoCard';
import ActivityFeed from '../../components/admin/ActivityFeed';
import { fetchDashboardStats } from '../../services/api'; 

interface ChartData {
  month: string;
  value: number;
}

interface DashboardData {
    totalLostItems: number;
    totalFoundItems: number;
    totalClaimedItems: number;
    pendingReports: number;
    totalUsers: number;
    reportsByMonth: ChartData[]; // Added this field
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardData>({
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaimedItems: 0,
    pendingReports: 0,
    totalUsers: 0,
    reportsByMonth: [], // Initialize empty
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setStats({
          totalLostItems: data.totalLostItems,
          totalFoundItems: data.totalFoundItems,
          totalClaimedItems: data.totalClaimedItems,
          pendingReports: data.pendingReports,
          totalUsers: data.totalUsers,
          reportsByMonth: data.reportsByMonth || [], // Handle potential API delays
        });
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, []);
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-semibold">{error}</div>;

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Total Lost Items"
            value={stats.totalLostItems}
            icon={Package}
            bgColor="bg-red-100"
            iconBg="bg-red-500"
          />
          <StatCard
            title="Total Found Items"
            value={stats.totalFoundItems}
            icon={PackageCheck}
            bgColor="bg-green-100"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Total Claimed items"
            value={stats.totalClaimedItems}
            icon={CheckCircle}
            bgColor="bg-gray-100"
            iconBg="bg-green-500"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2">
            {/* Pass the real data to the chart */}
            <TotalReportsChart data={stats.reportsByMonth} />
          </div>
          <div>
            <ClaimedUnclaimedChart />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <InfoCard title="Pending reports" value={stats.pendingReports} />
          <InfoCard title="Registered users" value={stats.totalUsers} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}