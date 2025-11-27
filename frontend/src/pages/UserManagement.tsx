import { useState } from 'react';
import { 
  Users, 
  GraduationCap, 
  PcCase, 
  ShieldAlert, 
  Search,
  Filter,
  Pencil,
  Key,
  Trash2,
  UserCircle
} from 'lucide-react';
import DashboardHeader from '../components/DashboardHeader';
import StatCard from '../components/StatCard';
import { mockUsers } from '../data/mockUsers';
import type { User, UserRole } from '../types/user';

export default function UserManagement() {
  const [users] = useState<User[]>(mockUsers);

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-100 text-red-500';
      case 'Student':
        return 'bg-green-100 text-green-500';
      case 'Teacher':
        return 'bg-indigo-100 text-indigo-500';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">View and manage all the system users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Users"
            value={15}
            icon={Users}
            bgColor="bg-blue-50"
            iconBg="bg-blue-500"
          />
          <StatCard
            title="Students"
            value={15}
            icon={GraduationCap}
            bgColor="bg-green-50"
            iconBg="bg-green-500"
          />
          <StatCard
            title="Teachers"
            value={15}
            icon={PcCase}
            bgColor="bg-yellow-50"
            iconBg="bg-yellow-500"
          />
          <StatCard
            title="Admins"
            value={3}
            icon={ShieldAlert}
            bgColor="bg-red-50"
            iconBg="bg-red-500"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="relative">
              <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                <span className="text-gray-500">Filter by</span>
                <Filter className="w-4 h-4" />
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search users..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">User</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">ID</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">Email</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">Role</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                          <UserCircle className="w-6 h-6 text-gray-400" />
                        </div>
                        <span className="font-semibold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-semibold text-gray-600">{user.userId}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm text-gray-500">{user.email}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Edit">
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-gray-200 rounded transition-colors" title="Reset Password">
                          <Key className="w-4 h-4 text-gray-600" />
                        </button>
                        <button className="p-1 hover:bg-red-100 rounded transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4 text-gray-600 hover:text-red-500" />
                        </button>
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