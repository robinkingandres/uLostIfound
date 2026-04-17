import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Users,
  ShieldAlert,
  Search,
  Pencil,
  Key,
  Trash2,
  UserCircle,
  UserPlus,
  ChevronDown,
} from 'lucide-react';
import StatCard from '../components/admin/StatCard';
import EditUserModal from '../components/admin/EditUserModal';
import ResetPasswordModal from '../components/admin/ResetPasswordModal';
import DeleteConfirmModal from '../components/admin/DeleteConfirmModal';
import type { User, UserRole } from '../types/user';
import type { AddUserFormData } from '../components/admin/EditUserModal';
import { fetchUsers, deleteUser, updateUser, createUser } from '../services/api';
import { useAdminTheme } from '../contexts/AdminThemeContext';

const ROLE_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All roles' },
  { value: 'Guidance', label: 'Guidance' },
  { value: 'Admin', label: 'Admin' },
];

export default function UserManagement() {
  const { isDark } = useAdminTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [roleFilterOpen, setRoleFilterOpen] = useState(false);
  const roleFilterRef = useRef<HTMLDivElement | null>(null);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (roleFilterRef.current && !roleFilterRef.current.contains(e.target as Node)) {
        setRoleFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const loadUsers = async () => {
    try {
      const data = await fetchUsers();
      const mappedData: User[] = data.map((u: any) => ({
        ...u,
        username: u.username || '',
        userId: u.userId || '',
        name: u.name || u.username,
        yearLevel: u.yearLevel || u.year_level || '',
        room: u.room || '',
        gender: u.gender || '',
      }));
      setUsers(mappedData);
    } catch (err) {
      setError('Failed to load users. Please ensure the backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    let list = users;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (u) =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q) ||
          (u.userId || '').toLowerCase().includes(q)
      );
    }
    if (roleFilter) list = list.filter((u) => roleFilter === 'StudentTeacher' ? (u.role === 'Student' || u.role === 'Teacher') : u.role === roleFilter);
    return list;
  }, [users, searchQuery, roleFilter]);

  const stats = useMemo(
    () => ({
      total: users.length,
      students: users.filter((u) => u.role === 'Student' || u.role === 'Teacher').length,
      guidance: users.filter((u) => u.role === 'Guidance').length,
      admins: users.filter((u) => u.role === 'Admin').length,
    }),
    [users]
  );

  const handleDeleteClick = (u: User) => setDeleteTarget(u);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUser(deleteTarget.id);
      setUsers((prev) => prev.filter((x) => x.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      window.alert('Error deleting user. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditClick = (u: User) => {
    setSelectedUser(u);
    setIsUserModalOpen(true);
  };

  const handlePasswordClick = (u: User) => {
    setSelectedUser(u);
    setIsPasswordOpen(true);
  };

  const handleCreateUser = async (data: AddUserFormData) => {
    const schoolIdToCreate = (data.school_id || '').trim().toLowerCase();
    const alreadyExists = users.some((u) => (u.userId || '').trim().toLowerCase() === schoolIdToCreate);
    if (schoolIdToCreate && alreadyExists) {
      throw new Error(JSON.stringify({ school_id: ['School ID already exists. Try another one.'] }));
    }

    const r = await createUser(data);
    const mapped: User = {
      id: r.id,
      name: r.name || r.username,
      username: r.username || '',
      userId: r.userId || r.school_id || '',
      email: r.email,
      role: r.role,
      avatar: r.avatar,
      yearLevel: r.yearLevel || r.year_level || '',
      room: r.room || '',
      gender: r.gender || '',
    };
    setUsers((prev) => [...prev, mapped]);
  };

  const handleUpdateUser = async (id: number, data: Partial<User> | any) => {
    const apiPayload: any = {};
    if (data.username !== undefined) apiPayload.username = data.username;
    if (data.name !== undefined && data.username === undefined) {
      apiPayload.username = data.name;
    }
    if (data.email !== undefined) apiPayload.email = data.email;
    if (data.role !== undefined) apiPayload.role = data.role;
    if (data.userId !== undefined) apiPayload.school_id = data.userId;
    if (data.yearLevel !== undefined) apiPayload.year_level = data.yearLevel;
    if (data.room !== undefined) apiPayload.room = data.room;
    if (data.password) apiPayload.password = data.password;

    const updatedUser = await updateUser(id, apiPayload);
    const updatedList = users.map((u) =>
      u.id === id
        ? {
            ...u,
            ...updatedUser,
            username: updatedUser.username ?? u.username,
            userId: updatedUser.userId ?? u.userId,
            name: updatedUser.name || updatedUser.username || u.name,
            yearLevel: updatedUser.yearLevel || updatedUser.year_level || u.yearLevel,
            room: updatedUser.room ?? u.room,
            gender: updatedUser.gender ?? u.gender,
          }
        : u
    );
    setUsers(updatedList);
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-500';
      case 'Student': return 'bg-green-100 text-green-500';
      case 'Teacher': return 'bg-indigo-100 text-indigo-500';
      case 'Guidance': return 'bg-amber-100 text-amber-600';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  if (loading) return <div className={`p-8 ${isDark ? 'text-slate-400' : 'text-gray-700'}`}>Loading users...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className={`p-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className={`transition-all duration-300 ${!roleFilter ? 'scale-[1.02] ring-2 ring-blue-300 rounded-2xl animate-[pulse_900ms_ease-in-out_2]' : ''}`}> 
            <StatCard title="Total Users" value={stats.total} icon={Users} bgColor="bg-blue-50" iconBg="bg-blue-500" />
          </div>
          <div className={`transition-all duration-300 ${roleFilter === 'Guidance' ? 'scale-[1.02] ring-2 ring-yellow-300 rounded-2xl animate-[pulse_900ms_ease-in-out_2]' : ''}`}>
            <StatCard title="Guidance" value={stats.guidance} icon={UserCircle} bgColor="bg-yellow-50" iconBg="bg-yellow-500" />
          </div>
          <div className={`transition-all duration-300 ${roleFilter === 'Admin' ? 'scale-[1.02] ring-2 ring-red-300 rounded-2xl animate-[pulse_900ms_ease-in-out_2]' : ''}`}>
            <StatCard title="Admins" value={stats.admins} icon={ShieldAlert} bgColor="bg-red-50" iconBg="bg-red-500" />
          </div>
        </div>

        <div className={`rounded-2xl shadow-sm border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative" ref={roleFilterRef}>
                <button
                  type="button"
                  onClick={() => setRoleFilterOpen((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className={roleFilter ? (isDark ? 'text-slate-200' : 'text-gray-700') : (isDark ? 'text-slate-400' : 'text-gray-500')}>
                    {ROLE_FILTER_OPTIONS.find((opt) => opt.value === roleFilter)?.label || "Filter by role"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${roleFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                {roleFilterOpen && (
                  <div className={`absolute left-0 top-full mt-1 py-1 rounded-lg shadow-lg z-10 min-w-[160px] border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                    {ROLE_FILTER_OPTIONS.map((opt) => (
                      <button
                        key={opt.value || 'all'}
                        type="button"
                        onClick={() => {
                          setRoleFilter(opt.value);
                          setRoleFilterOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm ${
                          roleFilter === opt.value
                            ? isDark
                              ? 'bg-indigo-500/10 text-indigo-200 font-medium'
                              : 'bg-indigo-50 text-indigo-700 font-medium'
                            : isDark
                              ? 'text-slate-200 hover:bg-slate-800'
                              : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddUser}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
              <input
                type="text"
                placeholder="Search users (name, ID, email)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'bg-slate-950 border border-slate-700 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                    : 'bg-gray-50 border border-gray-200 text-gray-900 focus:ring-blue-500'
                }`}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={isDark ? 'border-b border-slate-800' : 'border-b border-gray-100'}>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>User</th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>ID</th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>Email</th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>Role</th>
                  <th className={`text-left py-4 px-4 text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-900'}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={isDark ? 'divide-y divide-slate-800' : 'divide-y divide-gray-100'}>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className={`transition-colors ${isDark ? 'hover:bg-slate-800/60' : 'hover:bg-gray-50'}`}>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                          {user.avatar ? (
                            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircle className={`w-6 h-6 ${isDark ? 'text-slate-500' : 'text-gray-400'}`} />
                          )}
                        </div>
                        <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{user.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4"><span className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{user.userId}</span></td>
                    <td className="py-4 px-4"><span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user.email}</span></td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getRoleColor(user.role)}`}>{user.role}</span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(user)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`} title="Edit Account">
                          <Pencil className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
                        </button>
                        <button onClick={() => handlePasswordClick(user)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-200'}`} title="Reset Password">
                          <Key className={`w-4 h-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`} />
                        </button>
                        <button onClick={() => handleDeleteClick(user)} className={`p-1 rounded transition-colors ${isDark ? 'hover:bg-red-500/10' : 'hover:bg-red-100'}`} title="Delete">
                          <Trash2 className={`w-4 h-4 ${isDark ? 'text-slate-300 hover:text-red-400' : 'text-gray-600 hover:text-red-500'}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <p className={`py-8 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {users.length === 0 ? 'No users yet.' : 'No users match your search or filters.'}
            </p>
          )}
        </div>

      <EditUserModal
        user={selectedUser}
        isOpen={isUserModalOpen}
        onClose={() => { setIsUserModalOpen(false); setSelectedUser(null); }}
        onSave={handleUpdateUser}
        onCreate={handleCreateUser}
      />

      {selectedUser && (
        <ResetPasswordModal
          user={selectedUser}
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordOpen(false)}
          onSave={handleUpdateUser}
        />
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete User"
        isLoading={deleting}
      />
    </div>
  );
}








