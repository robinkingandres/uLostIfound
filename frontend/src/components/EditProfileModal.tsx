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
  const [yearLevel, setYearLevel] = useState('');
  const [room, setRoom] = useState('');
  const [gender, setGender] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      const nameParts = (user.name || '').split(' ');
      setFirstName(nameParts[0] || '');
      setLastName(nameParts.slice(1).join(' ') || '');
      setEmail(user.email || '');
      
      // Handle both camelCase and snake_case for robust initial loading
      setYearLevel(user.yearLevel || (user as any).year_level || '');
      setRoom(user.room || '');
      setGender(user.gender || '');
      setError('');
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      // Backend expects snake_case keys
      await updateProfile(user.id, {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        year_level: yearLevel,
        room: room.trim(),
        gender: gender,
      });
      
      // Trigger parent refresh
      await onUpdate();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-[#29b6f6] p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-black" />
            <h3 className="font-bold text-black">Edit Profile</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded transition-colors">
            <X className="w-5 h-5 text-black" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 max-h-[80vh] overflow-y-auto">
          {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4 border border-red-200">{error}</div>}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">First Name</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] outline-none" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Last Name</label>
                <input type="text" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] outline-none" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] outline-none" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Year Level</label>
              <select className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] outline-none" value={yearLevel} onChange={(e) => setYearLevel(e.target.value)}>
                <option value="">Select Year Level</option>
                <option value="Grade 7">Grade 7</option>
                <option value="Grade 8">Grade 8</option>
                <option value="Grade 9">Grade 9</option>
                <option value="Grade 10">Grade 10</option>
                <option value="Grade 11">Grade 11</option>
                <option value="Grade 12">Grade 12</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Room</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#29b6f6] outline-none" placeholder="e.g. Room 101" value={room} onChange={(e) => setRoom(e.target.value)} />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Gender</label>
              <div className="grid grid-cols-3 gap-2">
                {['Male', 'Female', 'Prefer not to say'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGender(option)}
                    className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-all ${
                      gender === option 
                      ? 'bg-[#29b6f6] border-[#29b6f6] text-white' 
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#29b6f6]'
                    }`}
                  >
                    {option === 'Prefer not to say' ? 'Secret' : option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 text-sm bg-[#29b6f6] text-white font-bold rounded-lg hover:bg-[#0288d1] transition-colors disabled:opacity-70">
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}