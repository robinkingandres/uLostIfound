// frontend/src/pages/admin/Dashboard.tsx

import { useState, useEffect } from 'react';
import { Package, PackageCheck, CheckCircle } from 'lucide-react';
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
    totalUnclaimedItems: number; // Added this field for the chart
    pendingReports: number;
    totalUsers: number;
    reportsByMonth: ChartData[];
}

type TimePeriod = 'weekly' | 'monthly' | 'yearly';
type StatusFilter = 'all' | 'lost' | 'found' | 'claimed';

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardData>({
    totalLostItems: 0,
    totalFoundItems: 0,
    totalClaimedItems: 0,
    totalUnclaimedItems: 0, // Initialize
    pendingReports: 0,
    totalUsers: 0,
    reportsByMonth: [], 
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('yearly');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await fetchDashboardStats(timePeriod, statusFilter);
        // @ts-ignore - Ignoring potential type mismatch during dev if API types aren't fully sync'd yet
        setStats({
          totalLostItems: data.totalLostItems,
          totalFoundItems: data.totalFoundItems,
          totalClaimedItems: data.totalClaimedItems,
          totalUnclaimedItems: data.totalUnclaimedItems, // Map from API response
          pendingReports: data.pendingReports,
          totalUsers: data.totalUsers,
          reportsByMonth: data.reportsByMonth || [],
        });
      } catch (err) {
        console.error("Dashboard data fetch failed:", err);
        setError('Failed to load dashboard data.');
      } finally {
        setLoading(false);
      }
    };
    loadStats();
  }, [timePeriod, statusFilter]);
  
  if (loading) return <div className="p-8 text-center text-gray-500">Loading Dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500 font-semibold">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard
            title="Total Lost Items"
            value={stats.totalLostItems}
            icon={Package}
            bgColor="bg-white"
            iconBg="bg-red-500"
          />
          <StatCard
            title="Total Found Items"
            value={stats.totalFoundItems}
            icon={PackageCheck}
            bgColor="bg-white"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Total Claimed items"
            value={stats.totalClaimedItems}
            icon={CheckCircle}
            bgColor="bg-white"
            iconBg="bg-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <InfoCard title="Pending reports" value={stats.pendingReports} />
          <InfoCard title="Registered users" value={stats.totalUsers} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
          <div className="xl:col-span-8 h-full">
            {/* Pass the real data to the chart with filters */}
            <TotalReportsChart 
              data={stats.reportsByMonth} 
              timePeriod={timePeriod}
              statusFilter={statusFilter}
              onTimePeriodChange={setTimePeriod}
              onStatusFilterChange={setStatusFilter}
            />
          </div>
          <div className="xl:col-span-4 h-full">
            {/* Pass claimed and unclaimed counts as props */}
            <ClaimedUnclaimedChart 
              claimed={stats.totalClaimedItems} 
              unclaimed={stats.totalUnclaimedItems} 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5">
          <div className="w-full">
            <ActivityFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
