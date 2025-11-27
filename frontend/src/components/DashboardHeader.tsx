import { ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function DashboardHeader() {
  const { user } = useAuth();

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's what happening today.</p>
      </div>

      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-semibold">
            {user?.username.charAt(0).toUpperCase() || 'L'}
          </span>
        </div>
        <div className="text-left">
          <p className="text-sm font-semibold text-gray-900">{user?.username || 'Lewis Hamilton'}</p>
          <p className="text-xs text-gray-500">Admin</p>
        </div>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
}
