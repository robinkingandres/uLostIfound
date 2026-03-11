import { useState, useEffect, useRef } from 'react';
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
import GuidanceSidebar from '../../components/guidance/GuidanceSidebar';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { useAuth } from '../../contexts/AuthContext';

// API & Auth
// Make sure 'fetchReports' and 'Report' are exported from your api file
import { 
  createReport, 
  fetchReports, 
  fetchSiteSettings,
  type ReportPayload, 
  type Report 
} from '../../services/api';

const LOCATIONS = [
  'TLE BUILDING',
  'DPWH 2',
  'YNARES 3',
  'PLED 1',
  'PLED 3',
  'DPWH 1',
  'YNARES 2',
  'YNARES 1',
  'ACG BUILDING',
  'PLED 4',
  'PLED 5',
  'Gym',
  'Canteen',
  'School Ground',
];

export default function ReportFound() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuidanceReporter = user?.role === 'Guidance';

  // --- STATE ---
  
  // 1. Chatbot Database State
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<string[]>(['Phone', 'Wallet', 'ID', 'Electronics', 'Clothing', 'Others']);
  const [showChatbot, setShowChatbot] = useState(true);

  // 2. Form State
  const [formData, setFormData] = useState({
    itemTitle: '',
    personName: '',
    category: 'Phone',
    dateFound: '',
    location: '',
    description: '',
  });

  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [returnedByPhoto, setReturnedByPhoto] = useState<File | null>(null);
  const [returnedByPreviewUrl, setReturnedByPreviewUrl] = useState<string | null>(null);
  
  // 3. UI States
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // 4. Modal/Feature States
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);
  const [zoomImageSrc, setZoomImageSrc] = useState<string | null>(null);
  const [zoomImageAlt, setZoomImageAlt] = useState<string>('');
  const [isOtherLocation, setIsOtherLocation] = useState(false);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const returnedByInputRef = useRef<HTMLInputElement>(null);

  // --- LOGIC ---

  // FETCH REPORTS FOR CHATBOT CONTEXT
  useEffect(() => {
    const loadReportsForChatbot = async () => {
      try {
        const [data, siteSettings] = await Promise.all([
          fetchReports(),
          fetchSiteSettings(),
        ]);
        setReports(data);
        const dynamicCategories = siteSettings.categories?.map((c) => c.name) || [];
        if (dynamicCategories.length > 0) {
          setCategories(dynamicCategories);
          setFormData((prev) => ({ ...prev, category: dynamicCategories[0] }));
        }
        setShowChatbot(siteSettings.user_home_chatbot_visible);
        setHasChatNotification(siteSettings.user_home_chat_notification_dot);
      } catch (err) {
        console.error("Failed to load reports for chatbot:", err);
      }
    };
    loadReportsForChatbot();
  }, []);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);
  useEffect(() => {
    return () => { if (returnedByPreviewUrl) URL.revokeObjectURL(returnedByPreviewUrl); };
  }, [returnedByPreviewUrl]);

  // Handle Location Dropdown vs Custom Input
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
 
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size >= 8 * 1024 * 1024) {
        setError("Image size exceeds limit. Only below 8MB images are allowed.");
        return;
      }
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleReturnedByPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size >= 8 * 1024 * 1024) {
        setError("Image size exceeds limit. Only below 8MB images are allowed.");
        return;
      }
      setReturnedByPhoto(file);
      setReturnedByPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
    setImage(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  const removeReturnedByPhoto = () => {
    setReturnedByPhoto(null);
    if (returnedByPreviewUrl) URL.revokeObjectURL(returnedByPreviewUrl);
    setReturnedByPreviewUrl(null);
  };

  const triggerReturnedByInput = () => {
    returnedByInputRef.current?.click();
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
      setError('An image of the found item is required for verification.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (isGuidanceReporter && !returnedByPhoto) {
      setError('A Returned By photo is required for Guidance reports.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const payload: ReportPayload = {
        itemName: formData.itemTitle,
        personName: formData.personName.trim(),
        category: formData.category,
        date: formData.dateFound,
        location: formData.location,
        description: formData.description,
        type: 'Found',
      };
      
      await createReport(payload, image, returnedByPhoto);
      setIsSuccess(true);
      
      setTimeout(() => {
        navigate('/report-found-success');
      }, 1000);
    } catch (err) {
      console.error(err);
      setError('Failed to submit report. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get today's date for max attribute
  const today = new Date().toISOString().split("T")[0];
  const isPhotoEvidenceError =
    error === 'Image size exceeds limit. Only below 8MB images are allowed.' ||
    error === 'An image of the found item is required for verification.' ||
    error === 'A Returned By photo is required for Guidance reports.';

  return (
    <div className={isGuidanceReporter ? "flex h-screen bg-gray-50 overflow-hidden" : "min-h-screen bg-gray-50/30 font-sans text-gray-800 relative pb-20"}>
      {isGuidanceReporter ? (
        <GuidanceSidebar />
      ) : (
        <UserHeader />
      )}
      <div className={isGuidanceReporter ? "flex-1 flex flex-col overflow-hidden" : ""}>
      {isGuidanceReporter ? <DashboardHeader /> : null}

      {/* --- ZOOM MODAL --- */}
      {zoomImageSrc && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 animate-in fade-in duration-200"
          onClick={() => setZoomImageSrc(null)}
        >
          <button
            type="button"
            onClick={() => setZoomImageSrc(null)}
            className="absolute top-4 right-4 p-3 text-white bg-white/10 rounded-full z-[110] hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomImageSrc} 
            alt={zoomImageAlt || 'Zoomed Preview'} 
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* --- MAIN FORM --- */}
      <main className={isGuidanceReporter ? "flex-1 overflow-auto p-8" : "max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center"}>
        <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-10 flex flex-col items-start">
            
            <div className="text-left w-full mb-8">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Report Found Item</h1>
                <p className="text-gray-500 text-sm">Help return a lost item to its owner.</p>
            </div>

            {error && !isPhotoEvidenceError && (
              <div className="w-full mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                <span className="shrink-0"><Info className="w-4 h-4" /></span>
                <span className="leading-tight font-medium">{error}</span>
              </div>
            )}

            <div className={`w-full rounded-xl p-4 mb-8 flex items-start gap-3 ${
              isGuidanceReporter
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-[#e3f2fd] border border-[#bbdefb]'
            }`}>
              <Info className={`w-5 h-5 mt-0.5 shrink-0 ${
                isGuidanceReporter ? 'text-emerald-600' : 'text-[#1976d2]'
              }`} />
              <p className={`text-xs leading-relaxed font-medium ${
                isGuidanceReporter ? 'text-emerald-700' : 'text-[#1565c0]'
              }`}>
                {isGuidanceReporter
                  ? 'Guidance reports are automatically verified and posted immediately.'
                  : "Your report will be reviewed by the admin. After submitting a found item, please surrender it to the Guidance Office at the Ground Floor, Main Building, beside the Principal's Office."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">
                  Person Name <span className="text-xs font-normal text-gray-500">(Optional)</span>
                </label>
                <input
                  type="text"
                  name="personName"
                  value={formData.personName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-gray-50/50 focus:bg-white"
                  placeholder="Enter name if known"
                />
              </div>

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
                  placeholder="e.g., Black Leather Wallet" 
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
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Date Found <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="dateFound" 
                    required 
                    max={today}
                    value={formData.dateFound} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all text-gray-600" 
                  />
                </div>
              </div>

              {/* Location Logic */}
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-gray-400" />
                  Location Found <span className="text-red-500">*</span>
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
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                      <option value="Other">Others(Specify below)</option>
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
                      placeholder="Please specify (e.g., Near Main Gate)"
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
                  placeholder="Brand/Model • Color/Material • Unique Marks • Where "
                />
              </div>

              {/* Image Upload with Preview */}
              <div className="space-y-3 pt-2">
                <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-gray-400" /> Add Photo of Item <span className="text-red-500">*</span>
                </label>
                {isPhotoEvidenceError && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span className="leading-tight font-medium">{error}</span>
                  </div>
                )}

                {previewUrl ? (
                  <div className="relative w-full aspect-video sm:w-72 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group shadow-sm">
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={() => {
                          setZoomImageSrc(previewUrl);
                          setZoomImageAlt(formData.itemTitle || 'Add Photo of Item');
                        }}
                        className="p-2.5 bg-white rounded-full text-gray-700 hover:scale-110 transition-transform"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={removeImage} className="p-2.5 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"><X className="w-5 h-5" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <button 
                      type="button" 
                      onClick={triggerFileInput} 
                      className="flex items-center justify-center gap-2 px-6 py-3 border border-dashed border-cyan-300 rounded-xl text-cyan-600 text-sm font-bold bg-cyan-50/50 hover:bg-cyan-50 transition-colors"
                    >
                      <Upload className="w-4 h-4" /> Upload Photo
                    </button>
                    <span className="text-xs text-gray-400 italic">Required for verification</span>
                  </div>
                )}
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                />
              </div>

              {isGuidanceReporter && (
                <div className="space-y-3 pt-2">
                  <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-gray-400" /> Returned By: <span className="text-red-500">*</span>
                  </label>
                  <p className="text-xs text-gray-400">Photo of the person who surrendered the item.</p>

                  {returnedByPreviewUrl ? (
                    <div className="relative w-full aspect-video sm:w-72 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group shadow-sm">
                      <img src={returnedByPreviewUrl} alt="Returned By Preview" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-4 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200">
                        <button
                          type="button"
                          onClick={() => {
                            setZoomImageSrc(returnedByPreviewUrl);
                            setZoomImageAlt('Returned By Photo');
                          }}
                          className="p-2.5 bg-white rounded-full text-gray-700 hover:scale-110 transition-transform"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={removeReturnedByPhoto} className="p-2.5 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"><X className="w-5 h-5" /></button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <button
                        type="button"
                        onClick={triggerReturnedByInput}
                        className="flex items-center justify-center gap-2 px-6 py-3 border border-dashed border-cyan-300 rounded-xl text-cyan-600 text-sm font-bold bg-cyan-50/50 hover:bg-cyan-50 transition-colors"
                      >
                        <Upload className="w-4 h-4" /> Upload a Photo
                      </button>
                      <span className="text-xs text-gray-400 italic">Required</span>
                    </div>
                  )}
                  <input
                    ref={returnedByInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleReturnedByPhotoChange}
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-6 flex flex-col-reverse sm:flex-row gap-4 w-full">
                <button 
                  type="button" 
                  onClick={() => navigate(isGuidanceReporter ? '/guidance/dashboard' : '/home')} 
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
                    <div className="flex items-center gap-2 animate-in zoom-in-90">
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
      {!isGuidanceReporter && showChatbot && (
        <>
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
          
          {/* Chatbot with Reports Data */}
          <Chatbot 
            isOpen={isChatbotOpen} 
            onClose={() => setIsChatbotOpen(false)} 
            reports={reports} 
          />
        </>
      )}
      </div>
    </div>
  );
}


