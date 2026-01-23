import { useState } from 'react';
import { X, Hand } from 'lucide-react';
import { createClaim } from '../services/api';

interface ClaimModalProps {
  reportId: number;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimModal({ reportId, itemName, isOpen, onClose }: ClaimModalProps) {
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!description.trim()) {
      setError('Please provide a description.');
      setLoading(false);
      return;
    }

    try {
      await createClaim(reportId, description);
      alert('Claim submitted successfully! Admin will review your proof.');
      onClose();
      setDescription('');
    } catch (err) {
      console.error(err);
      setError('Failed to submit claim. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-xl overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
          <div className="flex items-center gap-2">
            <Hand className="w-5 h-5" />
            <h3 className="font-bold">Claim Item</h3>
          </div>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <p className="text-gray-700 text-sm mb-4">
            You are claiming: <span className="font-bold text-gray-900">{itemName}</span>
          </p>

          {error && <div className="bg-red-50 text-red-500 text-xs p-2 rounded mb-3">{error}</div>}

          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Proof of Ownership
            </label>
            <textarea
              rows={4}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Describe unique features (scratches, contents, wallpaper, stickers, etc.) that only the owner would know."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3">
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
              className="px-4 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}