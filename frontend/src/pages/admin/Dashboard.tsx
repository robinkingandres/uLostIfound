import { Package, PackageCheck, CheckCircle } from 'lucide-react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import StatCard from '../../components/admin/StatCard';
import TotalReportsChart from '../../components/admin/TotalReportsChart';
import ClaimedUnclaimedChart from '../../components/admin/ClaimedUnclaimedChart';
import InfoCard from '../../components/InfoCard';
import ActivityFeed from '../../components/admin/ActivityFeed';

export default function AdminDashboard() {
  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Total Lost Items"
            value={13}
            icon={Package}
            bgColor="bg-red-100"
            iconBg="bg-red-500"
          />
          <StatCard
            title="Total Found Items"
            value={13}
            icon={PackageCheck}
            bgColor="bg-green-100"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Total Claimed items"
            value={13}
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
          <InfoCard title="Pending reports" value={13} />
          <InfoCard title="Registered users" value={13} />
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
