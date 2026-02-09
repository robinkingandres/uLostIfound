import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  MapPin,
  Info,
  ChevronDown,
  Camera,
  X,
  Eye,
  Loader2
} from 'lucide-react';

// Assets
import chatbotIcon from '../../assets/chatbot.png';

// Components
import Chatbot from '../../components/Chatbot';
import UserHeader from '../../components/UserHeader';

// API & Auth
import {
  createReport,
  type ReportPayload
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    itemTitle: '',
    category: 'Phone',
    dateFound: '',
    location: '',
    description: '',
  });

  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleOpenChatbot = () => {
    setIsChatbotOpen(true);
    setHasChatNotification(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setIsSuccess(false);
    setError('');

    if (!image) {
      setError('An image of the found item is required for submission.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const payload: ReportPayload = {
        itemName: formData.itemTitle,
        category: formData.category,
        date: formData.dateFound,
        location: formData.location,
        description: formData.description,
        type: 'Found',
      };

      await createReport(payload, image);

      setIsSuccess(true);
      setLoading(false);

      setTimeout(() => {
        navigate('/report-found-success');
      }, 1000);
    } catch {
      setError('Failed to submit report. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 text-gray-800 relative pb-20">
      <UserHeader />

      {isZoomOpen && previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4"
          onClick={() => setIsZoomOpen(false)}
        >
          <button className="absolute top-4 right-4 p-3 text-white bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewUrl}
            alt="Zoomed Preview"
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="bg-white border rounded-xl shadow-sm p-8">
          <h1 className="text-2xl font-bold mb-2">Report Found Item</h1>
          <p className="text-gray-500 mb-6">
            Fill in the details about the item you found
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border text-red-600 rounded-lg flex gap-2">
              <Info className="w-4 h-4" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <input
              type="text"
              name="itemTitle"
              required
              value={formData.itemTitle}
              onChange={handleInputChange}
              placeholder="Item title"
              className="w-full px-4 py-3 border rounded-lg"
            />

            <div className="relative">
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border rounded-lg appearance-none"
              >
                <option>Phone</option>
                <option>Wallet</option>
                <option>ID</option>
                <option>Electronics</option>
                <option>Others</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>

            <input
              type="date"
              name="dateFound"
              required
              value={formData.dateFound}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border rounded-lg"
            />

            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleInputChange}
              placeholder="Location found"
              className="w-full px-4 py-3 border rounded-lg"
            />

            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Description"
              className="w-full px-4 py-3 border rounded-lg"
            />

            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-cyan-500 text-white font-bold flex justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Submit'}
            </button>
          </form>
        </div>
      </main>

      <div className="fixed bottom-6 right-6">
        <button onClick={handleOpenChatbot}>
          <img src={chatbotIcon} alt="Chatbot" className="w-16 h-16" />
        </button>
      </div>

      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}
