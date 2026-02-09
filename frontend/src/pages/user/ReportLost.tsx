import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload,
  MapPin,
  Info,
  ChevronDown,
  X,
  Camera,
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
  type ReportPayload,
  fetchNotifications,
  type Notification
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportLost() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // --- STATE ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const [formData, setFormData] = useState({
    itemTitle: '',
    category: 'Phone',
    dateLost: '',
    location: '',
    description: '',
  });

  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // UI States
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Feature States
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isOtherLocation, setIsOtherLocation] = useState(false);

  // --- LOGIC ---

  // Location Dropdown Handler
  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === "Other") {
      setIsOtherLocation(true);
      setFormData(prev => ({ ...prev, location: "" })); // Clear for custom input
    } else {
      setIsOtherLocation(false);
      setFormData(prev => ({ ...prev, location: selectedValue }));
    }
  };

  // Background fetch for notifications
  useEffect(() => {
    if (user) {
      const loadNotifications = async () => {
        try {
          await fetchNotifications();
          // Logic to update local state if needed
        } catch (error) {
          console.error("Error loading notifications", error);
        }
      };
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Cleanup preview URL
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
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

    // Basic Validation
    if (!formData.itemTitle || !formData.dateLost || !formData.location || !formData.description) {
      setError('Please fill out all required fields marked with *');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const payload: ReportPayload = {
        itemName: formData.itemTitle,
        category: formData.category,
        date: formData.dateLost,
        location: formData.location,
        description: formData.description,
        type: 'Lost',
      };
      
      await createReport(payload, image);
      setIsSuccess(true);
      setLoading(false);
     
      setTimeout(() => {
        navigate('/report-success');
      }, 1000);
    } catch (err) {
      setError('Failed to submit report. Please check your connection and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30 font-sans text-gray-800 relative pb-20">
      <UserHeader />

      {/* --- ZOOM MODAL --- */}
      {isZoomOpen && previewUrl && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <button className="absolute top-4 right-4 p-3 text-white bg-white/10 rounded-full z-[110] hover:bg-white/20 transition-colors">
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewUrl}
            alt="Zoomed preview"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* --- MAIN FORM --- */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center">
        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-10 flex flex-col items-start">
           
            <div className="text-left w-full mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Report Lost Item</h1>
                <p className="text-gray-500 text-sm">Fill in the details about the item you lost.</p>
            </div>

            {error && (
              <div className="w-full mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <span className="shrink-0"><Info className="w-4 h-4 shrink-0" /></span>
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <div className="w-full bg-[#fff8e1] border border-[#ffecb3] rounded-xl p-4 mb-8 flex items-start gap-3">
              <Info className="w-5 h-5 text-[#f57f17] mt-0.5 shrink-0" />
              <p className="text-xs text-[#bf360c] leading-relaxed font-medium">
                Your report will be reviewed by admin before being published. You'll be notified once it's approved.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              {/* Item Title */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Item Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  name="itemTitle" 
                  required 
                  value={formData.itemTitle} 
                  onChange={handleInputChange} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-gray-50/50 focus:bg-white" 
                  placeholder="e.g., Black Phone" 
                />
              </div>

              {/* Category & Date Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Category <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <select 
                      name="category" 
                      value={formData.category} 
                      onChange={handleInputChange} 
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-gray-50/50 cursor-pointer focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none focus:bg-white transition-all"
                    >
                      <option value="Phone">Phone</option>
                      <option value="Wallet">Wallet</option>
                      <option value="ID">ID</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Others">Others</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">When did you lose it? <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="dateLost" 
                    required 
                    value={formData.dateLost} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all text-gray-600" 
                  />
                </div>
              </div>

              {/* Location Section */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Where did you lose it? <span className="text-red-500">*</span>
                </label>
               
                <div className="flex flex-col gap-3">
                  <div className="relative">
                    <select
                      required
                      value={isOtherLocation ? "Other" : formData.location}
                      onChange={handleLocationSelect}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm appearance-none bg-gray-50/50 cursor-pointer focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none focus:bg-white transition-all"
                    >
                      <option value="" disabled>Select a location...</option>
                      <option value="Room 101">Room 101</option>
                      <option value="Room 102">Room 102</option>
                      <option value="Library">Library</option>
                      <option value="Cafeteria">Cafeteria</option>
                      <option value="Gym">Gym</option>
                      <option value="School Grounds">School Grounds</option>
                      <option value="Other">Other (Specify below...)</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>

                  {isOtherLocation && (
                    <input
                      type="text"
                      name="location"
                      required
                      value={formData.location}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-cyan-500 rounded-xl text-sm outline-none animate-in slide-in-from-top-2 duration-300 ring-2 ring-cyan-100 bg-white"
                      placeholder="Please specify (e.g., School Parking Lot)"
                      autoFocus
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">Description <span className="text-red-500">*</span></label>
                <textarea
                  name="description"
                  required
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm resize-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all"
                  placeholder="Brand/Model • Color/Material • Unique Marks • Where you last saw it"
                />
              </div>

              {/* Image Upload with Preview */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" />
                  Upload a Photo <span className="text-[13px] font-normal text-gray-400 italic">(Optional)</span>
                </label>

                {previewUrl ? (
                  <div className="relative w-full aspect-video sm:w-72 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group shadow-sm">
                    <img src={previewUrl} alt="Lost Item Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <button type="button" onClick={() => setIsZoomOpen(true)} className="p-2.5 bg-white rounded-full text-gray-700 hover:scale-110 transition-transform shadow-xl" title="Zoom In">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={removeImage} className="p-2.5 bg-white rounded-full text-red-500 hover:scale-110 transition-transform shadow-xl" title="Remove">
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('imageUploadLost')?.click()} 
                      className="flex items-center justify-center gap-2 px-6 py-3 border border-dashed border-cyan-300 rounded-xl text-cyan-600 text-sm font-bold bg-cyan-50/50 hover:bg-cyan-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Add file
                    </button>
                  </div>
                )}
                <input id="imageUploadLost" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row gap-4 w-full">
                <button 
                  type="button" 
                  onClick={() => navigate('/home')} 
                  className="w-full py-3.5 sm:px-8 border border-gray-300 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || isSuccess}
                  className={`w-full py-3.5 sm:px-8 rounded-xl text-sm font-bold shadow-md shadow-cyan-100 transition-all flex items-center justify-center gap-2 text-white disabled:opacity-70 disabled:cursor-not-allowed
                    ${isSuccess ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-[#29b6f6] hover:bg-[#039be5] active:scale-95'}
                  `}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  ) : isSuccess ? (
                    <div className="flex items-center gap-2 animate-in zoom-in-90 duration-300">
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <span>Submitted!</span>
                    </div>
                  ) : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Floating Chatbot */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpenChatbot}
          className="relative group transition-transform duration-300 hover:scale-110 active:scale-95 outline-none"
        >
          <img
            src={chatbotIcon}
            alt="Chatbot"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
          />
          {hasChatNotification && (
            <div className="absolute top-1 right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
            </div>
          )}
        </button>
      </div>
      
      {/* Chatbot (General help mode) */}
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}