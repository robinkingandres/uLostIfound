import { useState, useEffect } from 'react'; // Added useEffect
import { Package, PackageCheck, CheckCircle, Users } from 'lucide-react'; // Added Users
import DashboardHeader from '../../components/admin/DashboardHeader';
import StatCard from '../../components/admin/StatCard';
import TotalReportsChart from '../../components/admin/TotalReportsChart';
import ClaimedUnclaimedChart from '../../components/admin/ClaimedUnclaimedChart';
import InfoCard from '../../components/InfoCard';
import ActivityFeed from '../../components/admin/ActivityFeed';
// Import the new API function
import { fetchDashboardStats } from '../../services/api'; 

// Define a type for the stats state
interface DashboardData {
    totalLostItems: number;
    totalFoundItems: number;
    totalClaimedItems: number;
    pendingReports: number;
    totalUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardData>({
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaimedItems: 0,
    pendingReports: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch data on component mount
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
          {/* STATS FROM API */}
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
            <TotalReportsChart />
          </div>
          <div>
            <ClaimedUnclaimedChart />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* INFO CARDS FROM API */}
          <InfoCard title="Pending reports" value={stats.pendingReports} />
          <InfoCard title="Registered users" value={stats.totalUsers} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}