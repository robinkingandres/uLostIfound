import { useState, useEffect } from 'react';
import { X, User } from 'lucide-react';
import { updateProfile } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void | Promise<void>;
}

export default function EditProfileModal({ isOpen, onClose, onUpdate }: EditProfileModalProps) {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      // Parse name into first and last name
      const nameParts = (user.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      setError('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('First name and last name are required.');
      setLoading(false);
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      setLoading(false);
      return;
    }

    try {
      await updateProfile(user!.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
      });
      await onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      try {
        const errorData = JSON.parse(err.message);
        setError(errorData.detail || errorData.email?.[0] || 'Failed to update profile. Please try again.');
      } catch {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-[#29b6f6] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5" />
            <h3 className="font-bold text-black">Edit Profile</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4 border border-red-200">{error}</div>}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                First Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] focus:outline-none"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Last Name
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] focus:outline-none"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] focus:outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-[#29b6f6] text-white font-bold rounded-lg hover:bg-[#0288d1] transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
