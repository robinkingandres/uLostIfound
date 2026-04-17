import { useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import type { User } from '../../types/user';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

interface ResetPasswordModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: number, data: any) => Promise<void>;
}

export default function ResetPasswordModal({ user, isOpen, onClose, onSave }: ResetPasswordModalProps) {
  const { isDark } = useAdminTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await onSave(user.id, { password: password });
      onClose();
      setPassword('');
      setConfirmPassword('');
      alert('Password updated successfully');
    } catch (err) {
      console.error(err);
      setError('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl w-full max-w-sm shadow-xl overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex justify-between items-center p-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            <KeyRound className="w-5 h-5 text-blue-500" />
            Reset Password
          </h3>
          <button onClick={onClose} className={`transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
            Enter a new password for <span className={`font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{user.name}</span>.
          </p>

          {error && <div className={`text-red-500 text-sm p-3 rounded ${isDark ? 'bg-red-500/10' : 'bg-red-50'}`}>{error}</div>}
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg focus:outline-none focus:ring-2 ${
                isDark
                  ? 'border border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:ring-blue-400/40'
                  : 'border border-gray-300 bg-white text-gray-900 focus:ring-blue-500'
              }`}
              required
            />
          </div>

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
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
