import { useState, useEffect } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import type { User, UserRole } from '../../types/user';

export type AddUserFormData = {
  username: string;
  email: string;
  school_id: string;
  role: string;
  password: string;
};

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<User> & { name?: string; userId?: string }) => Promise<void>;
  onCreate?: (data: AddUserFormData) => Promise<void>;
}

const ROLE_OPTIONS: UserRole[] = ['Student', 'Admin', 'Guidance'];

export default function EditUserModal({ user, isOpen, onClose, onSave, onCreate }: EditUserModalProps) {
  const isAddMode = user === null;
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'Student' as UserRole,
    userId: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          username: user.name || '',
          email: user.email || '',
          role: user.role,
          userId: user.userId || '',
          password: '',
        });
      } else {
        setFormData({
          username: '',
          email: '',
          role: 'Student',
          userId: '',
          password: '',
        });
      }
      setError('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isAddMode && onCreate) {
        await onCreate({
          username: formData.username,
          email: formData.email,
          school_id: formData.userId,
          role: formData.role,
          password: formData.password,
        });
      } else if (user && !isAddMode) {
        await onSave(user.id, {
          name: formData.username,
          email: formData.email,
          role: formData.role,
          userId: formData.userId,
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError(isAddMode ? 'Failed to create user. Please try again.' : 'Failed to update user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {isAddMode ? 'Add User' : 'Edit User Account'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username / Name</label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">School ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {isAddMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={isAddMode}
                minLength={8}
                placeholder="Min. 8 characters"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
            >
              {loading
                ? (isAddMode ? 'Creating...' : 'Saving...')
                : isAddMode
                  ? <><UserPlus className="w-4 h-4" /> Add User</>
                  : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
