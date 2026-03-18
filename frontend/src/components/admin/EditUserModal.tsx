import { useState, useEffect } from 'react';
import { X, Save, UserPlus } from 'lucide-react';
import type { User, UserRole } from '../../types/user';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

export type AddUserFormData = {
  username: string;
  email: string;
  school_id: string;
  role: string;
  password: string;
  year_level?: string;
};

interface EditUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: Partial<User> & { name?: string; userId?: string }) => Promise<void>;
  onCreate?: (data: AddUserFormData) => Promise<void>;
}

const ROLE_OPTIONS: UserRole[] = ['Student', 'Teacher', 'Admin', 'Guidance'];
const YEAR_LEVEL_OPTIONS = [
  'Grade 7',
  'Grade 8',
  'Grade 9',
  'Grade 10',
  'Grade 11',
  'Grade 12',
] as const;

export default function EditUserModal({ user, isOpen, onClose, onSave, onCreate }: EditUserModalProps) {
  const { isDark } = useAdminTheme();
  const isAddMode = user === null;
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'Student' as UserRole,
    userId: '',
    password: '',
    yearLevel: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (user) {
        setFormData({
          username: user.username || user.name || '',
          email: user.email || '',
          role: user.role,
          userId: user.userId || '',
          password: '',
          yearLevel: user.yearLevel || (user as any).year_level || '',
        });
      } else {
        setFormData({
          username: '',
          email: '',
          role: 'Student',
          userId: '',
          password: '',
          yearLevel: '',
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
          year_level: formData.role === 'Student' ? formData.yearLevel : '',
        });
      } else if (user && !isAddMode) {
        await onSave(user.id, {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          userId: formData.userId,
          yearLevel: formData.role === 'Student' ? formData.yearLevel : '',
        });
      }
      onClose();
    } catch (err) {
      console.error(err);
      if (isAddMode) {
        const rawMessage = err instanceof Error ? err.message : '';
        let parsed: any = null;
        try {
          parsed = rawMessage ? JSON.parse(rawMessage) : null;
        } catch {
          parsed = null;
        }

        const schoolIdError = parsed?.school_id;
        const schoolIdText = Array.isArray(schoolIdError)
          ? schoolIdError.join(' ')
          : typeof schoolIdError === 'string'
            ? schoolIdError
            : '';
        const combined = `${rawMessage} ${schoolIdText}`.toLowerCase();

        const hasSchoolIdConflict = !!schoolIdError || (
          combined.includes('school') &&
          combined.includes('id') &&
          (
            (combined.includes('already') && (combined.includes('exist') || combined.includes('used'))) ||
            combined.includes('duplicate') ||
            combined.includes('unique')
          )
        );

        if (hasSchoolIdConflict) {
          setError('School ID already exists. Try another one.');
        } else {
          setError('Failed to create user. Please try again.');
        }
      } else {
        setError('Failed to update user. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl w-full max-w-md shadow-xl overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex justify-between items-center p-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {isAddMode ? 'Add User' : 'Edit User Account'}
          </h3>
          <button onClick={onClose} className={`transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className={`text-red-500 text-sm p-3 rounded ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>{error}</div>}

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>School ID</label>
            <input
              type="text"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              onInvalid={(e) => e.currentTarget.setCustomValidity('School ID must contain numbers only (0-9).')}
              onInput={(e) => e.currentTarget.setCustomValidity('')}
              inputMode="numeric"
              pattern="[0-9]+"
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {formData.role === 'Student' && (
            <>
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Year Level</label>
                <select
                  value={formData.yearLevel}
                  onChange={(e) => setFormData({ ...formData, yearLevel: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                    isDark
                      ? 'border border-slate-700 bg-slate-950 text-slate-100 focus:ring-blue-400/40'
                      : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                  }`}
                  required
                >
                  <option value="">Select year level</option>
                  {YEAR_LEVEL_OPTIONS.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

            </>
          )}

          {isAddMode && (
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Password</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                  isDark
                    ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                    : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
                }`}
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
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'border border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
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






