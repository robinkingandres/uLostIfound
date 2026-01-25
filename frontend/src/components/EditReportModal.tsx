import { useState, useEffect } from 'react';
import { X, Edit2, MapPin, ChevronDown, Upload, Camera, Eye, Loader2 } from 'lucide-react';
import { updateReport, type ReportPayload } from '../services/api';
import type { Report } from '../types/report';

interface EditReportModalProps {
  report: Report;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditReportModal({ report, isOpen, onClose, onSuccess }: EditReportModalProps) {
  const [formData, setFormData] = useState({
    itemName: '',
    category: '',
    date: '',
    location: '',
    description: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Initialize form data when report changes
  useEffect(() => {
    if (report && isOpen) {
      setFormData({
        itemName: report.itemName,
        category: report.category,
        date: report.date,
        location: report.location,
        description: report.description,
      });
      setPreviewUrl(report.image || null);
      setImage(null);
      setError('');
    }
  }, [report, isOpen]);

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== report.image) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl, report.image]);

  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      if (previewUrl && previewUrl !== report.image) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl && previewUrl !== report.image) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.itemName || !formData.date || !formData.location || !formData.description) {
      setError('Please fill out all required fields.');
      setLoading(false);
      return;
    }

    try {
      const payload: Partial<ReportPayload> = {
        itemName: formData.itemName,
        category: formData.category,
        date: formData.date,
        location: formData.location,
        description: formData.description,
      };

      await updateReport(report.id, payload, image);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to update report:', err);
      const errorMessage = err.message || 'Failed to update report. Please try again.';
      try {
        const parsed = JSON.parse(errorMessage);
        setError(parsed.detail || 'Failed to update report. Please try again.');
      } catch {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Zoom Modal */}
      {isZoomOpen && previewUrl && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button className="absolute top-4 right-4 p-3 text-white bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <img 
            src={previewUrl} 
            alt="Zoomed preview" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Main Modal */}
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
          
          {/* Header */}
          <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <div className="flex items-center gap-2">
              <Edit2 className="w-5 h-5" />
              <h3 className="font-bold">Edit Report</h3>
            </div>
            <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Form Content */}
          <div className="overflow-y-auto flex-1 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${report.type === 'Lost' ? 'bg-red-500' : 'bg-blue-500'}`}>
                {report.type}
              </span>
              <span className="text-sm text-gray-500">Editing: <span className="font-medium text-gray-700">{report.itemName}</span></span>
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-sm p-3 rounded-lg mb-4 border border-red-100">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="itemName" 
                  required 
                  value={formData.itemName} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all" 
                  placeholder="e.g., Black Phone" 
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      name="category" 
                      value={formData.category} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="Phone">Phone</option>
                      <option value="Wallet">Wallet</option>
                      <option value="ID">ID</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Documents">Documents</option>
                      <option value="Clothing">Clothing</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Others">Others</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Date <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="date" 
                    required 
                    value={formData.date} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Location <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="location" 
                  required 
                  value={formData.location} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="e.g., Room 101" 
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Description <span className="text-red-500">*</span></label>
                <textarea 
                  name="description" 
                  required 
                  rows={3} 
                  value={formData.description} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" 
                  placeholder="Provide detailed description..." 
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" />
                  Image <span className="text-[13px] font-normal text-gray-400 italic">(Optional)</span>
                </label>

                {previewUrl ? (
                  <div className="relative w-full h-40 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 group">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button 
                        type="button" 
                        onClick={() => setIsZoomOpen(true)} 
                        className="p-2 bg-white rounded-full text-gray-700 shadow-lg hover:scale-110 transition-transform" 
                        title="Zoom"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button 
                        type="button" 
                        onClick={removeImage} 
                        className="p-2 bg-white rounded-full text-red-500 shadow-lg hover:scale-110 transition-transform" 
                        title="Remove"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => document.getElementById('editImageUpload')?.click()} 
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-blue-600 text-sm font-medium bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Upload Image
                  </button>
                )}
                <input 
                  id="editImageUpload" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
