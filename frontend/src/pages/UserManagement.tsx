import { useState, useEffect } from 'react';
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
  UserCircle,
} from 'lucide-react';
import DashboardHeader from '../components/admin/DashboardHeader';
import StatCard from '../components/admin/StatCard';
import EditUserModal from '../components/admin/EditUserModal'; 
import ResetPasswordModal from '../components/admin/ResetPasswordModal'; 
import type { User, UserRole } from '../types/user';
import { fetchUsers, deleteUser, updateUser } from '../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals and Selection State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Stats state
  const [stats, setStats] = useState({
    total: 0,
    students: 0,
    teachers: 0,
    admins: 0
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      
      // The API already returns the ID under the key 'userId' (mapped from school_id)
      // and the combined name under the key 'name' (from get_name).
      // We rely on the serializer's output keys here.
      const mappedData: User[] = data.map((u: any) => ({
        ...u,
        // The API output key is already 'userId'. We ensure it's used.
        userId: u.userId || '', 
        name: u.name || u.username,
      }));
      
      setUsers(mappedData);
      calculateStats(mappedData);
    } catch (err) {
      setError('Failed to load users. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: User[]) => {
    setStats({
      total: data.length,
      students: data.filter(u => u.role === 'Student').length,
      teachers: data.filter(u => u.role === 'Teacher').length,
      admins: data.filter(u => u.role === 'Admin').length
    });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone.")) return;
    
    try {
      await deleteUser(id);
      const updatedUsers = users.filter(user => user.id !== id);
      setUsers(updatedUsers);
      calculateStats(updatedUsers);
      window.alert("User deleted successfully.");
    } catch (err) {
      window.alert("Error deleting user. Check console for details.");
      console.error(err);
    }
  };

  // Handler to open edit modal
  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  // Handler to open password modal
  const handlePasswordClick = (user: User) => {
    setSelectedUser(user);
    setIsPasswordOpen(true);
  };

  // Logic to save user updates (Called from Modals)
  const handleUpdateUser = async (id: number, data: Partial<User> | any) => {
    // This function handles the PATCH request logic
    const apiPayload: any = {};
    
    // Map frontend fields back to Django's model fields (using explicit keys)
    if (data.name !== undefined) apiPayload.username = data.name; 
    if (data.email !== undefined) apiPayload.email = data.email;
    if (data.role !== undefined) apiPayload.role = data.role;
    // Map userId (frontend) back to school_id (backend)
    if (data.userId !== undefined) apiPayload.school_id = data.userId;
    // Password update
    if (data.password) apiPayload.password = data.password;

    try {
      const updatedUser = await updateUser(id, apiPayload);
      
      // --- FIX APPLIED HERE: Resilient Data Merging ---
      // 1. Find the original user object 'u' in the current state.
      // 2. Merge the original user object with the partial data returned by the API (updatedUser).
      const updatedList = users.map(u => {
          if (u.id === id) {
              // Merge existing fields (u) with newly updated fields (updatedUser).
              // We explicitly map userId and name using the guaranteed API keys.
              return {
                  ...u, 
                  ...updatedUser, 
                  userId: updatedUser.userId || u.userId, // Prefer new userId, fallback to old one
                  name: updatedUser.name || updatedUser.username || u.name, // Prefer new name, fallback to old one
              };
          }
          return u;
      });
      
      setUsers(updatedList);
      calculateStats(updatedList);
      
    } catch (err) {
      throw err; 
    }
  };


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

  if (loading) return <div className="p-8">Loading users...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="flex-1 bg-gray-50 overflow-auto">
      <DashboardHeader />

      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-1">View and manage all the system users</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value={stats.total} icon={Users} bgColor="bg-blue-50" iconBg="bg-blue-500" />
          <StatCard title="Students" value={stats.students} icon={GraduationCap} bgColor="bg-green-50" iconBg="bg-green-500" />
          <StatCard title="Teachers" value={stats.teachers} icon={PcCase} bgColor="bg-yellow-50" iconBg="bg-yellow-500" />
          <StatCard title="Admins" value={stats.admins} icon={ShieldAlert} bgColor="bg-red-50" iconBg="bg-red-500" />
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
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
                          {user.avatar ? (
                             <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                             <UserCircle className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <span className="font-semibold text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {/* Displays the ID field which is now correctly mapped */}
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
                        {/* Edit Button */}
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors" 
                          title="Edit Account"
                        >
                          <Pencil className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {/* Password Reset Button */}
                        <button 
                          onClick={() => handlePasswordClick(user)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors" 
                          title="Reset Password"
                        >
                          <Key className="w-4 h-4 text-gray-600" />
                        </button>
                        
                        {/* Delete Button */}
                        <button 
                          className="p-1 hover:bg-red-100 rounded transition-colors" 
                          title="Delete"
                          onClick={() => handleDelete(user.id)}
                        >
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

      {/* Render Modals */}
      {selectedUser && (
        <>
          {/* Edit User Modal */}
          <EditUserModal 
            user={selectedUser}
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            onSave={handleUpdateUser}
          />
          
          {/* Reset Password Modal */}
          <ResetPasswordModal
            user={selectedUser}
            isOpen={isPasswordModalOpen}
            onClose={() => setIsPasswordOpen(false)}
            onSave={handleUpdateUser}
          />
        </>
      )}
    </div>
  );
}