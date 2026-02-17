import { useState, useRef } from 'react';
import { X, Upload, ChevronDown } from 'lucide-react';
import { updateReport } from '../services/api';
import type { Report } from '../types/report';

const CATEGORIES = ['Phone', 'Wallet', 'ID', 'Electronics', 'Clothing', 'Others'];


interface EditReportModalProps {
  report: Report;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditReportModal({ report, onClose, onSuccess }: EditReportModalProps) {
  const [formData, setFormData] = useState({
    itemName: report.itemName,
    category: report.category,
    date: report.date,
    location: report.location,
    description: report.description,
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().split('T')[0];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size too large. Please upload an image under 5MB.');
        return;
      }
      setImage(file);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateReport(report.id, {
        itemName: formData.itemName,
        category: formData.category,
        date: formData.date,
        location: formData.location,
        description: formData.description,
        type: report.type,
      }, image);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to update report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Edit Report</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Item Name *</label>
            <input
              type="text"
              name="itemName"
              required
              value={formData.itemName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Category *</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-gray-50 cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                name="date"
                required
                max={today}
                value={formData.date}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Location *</label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleInputChange}
              placeholder="e.g., Library, Room 101"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Description *</label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Photo (optional - replace existing)</label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 border border-dashed border-cyan-300 rounded-xl text-cyan-600 text-sm font-medium"
            >
              <Upload className="w-4 h-4" /> {image ? image.name : 'Choose new photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-sm font-bold disabled:opacity-70"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
