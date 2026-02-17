import { useState, useRef, useEffect } from 'react';
import { X, Hand, Upload, ImageIcon } from 'lucide-react';
import { createClaim, fetchSiteSettings } from '../services/api';

interface ClaimModalProps {
  reportId: number;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimModal({ reportId, itemName, isOpen, onClose }: ClaimModalProps) {
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requireProofImage, setRequireProofImage] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => setRequireProofImage(!!s.claim_require_proof_image))
      .catch(() => setRequireProofImage(false));
  }, []);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file.');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB.');
        return;
      }
      setProofImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeImage = () => {
    setProofImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!description.trim()) {
      setError('Please provide a description.');
      setLoading(false);
      return;
    }
    if (requireProofImage && !proofImage) {
      setError('Proof image is required by current claim settings.');
      setLoading(false);
      return;
    }

    try {
      await createClaim(reportId, description, proofImage);
      alert('Claim submitted successfully! Admin will review your proof.');
      onClose();
      setDescription('');
      setProofImage(null);
      setImagePreview(null);
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
              rows={3}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              placeholder="Describe unique features (scratches, contents, wallpaper, stickers, etc.) that only the owner would know."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Image Upload Section */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 uppercase mb-1">
              Upload Proof Image ({requireProofImage ? 'Required' : 'Optional'})
            </label>
            
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />

            {!imagePreview ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm text-gray-500">Click to upload an image</span>
                <span className="text-xs text-gray-400">PNG, JPG up to 5MB</span>
              </button>
            ) : (
              <div className="relative border border-gray-300 rounded-lg overflow-hidden">
                <img
                  src={imagePreview}
                  alt="Proof preview"
                  className="w-full h-32 object-cover"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {proofImage?.name}
                </div>
              </div>
            )}
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
