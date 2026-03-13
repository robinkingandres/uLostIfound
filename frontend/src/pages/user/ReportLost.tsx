import { useState, useEffect, useRef } from 'react';
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

import chatbotIcon from '../../assets/chatbot.png';
import Chatbot from '../../components/Chatbot';
import UserHeader from '../../components/UserHeader';
import GuidanceSidebar from '../../components/guidance/GuidanceSidebar';
import DashboardHeader from '../../components/admin/DashboardHeader';

import {
  createReport,
  type ReportPayload,
  fetchReports,
  fetchSiteSettings,
} from '../../services/api';
import type { Report } from '../../types/report';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportLost() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuidanceReporter = user?.role === 'Guidance';

  const isOthersCategory = (value: string) => value.trim().toLowerCase() === 'others';

  const [dbReports, setDbReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<string[]>([
    'School Supplies',
    'Tech & Gadgets',
    'Books & Modules',
    'Daily Essentials',
    'Food & Clothes',
    'Others'
  ]);
  const [showChatbot, setShowChatbot] = useState(true);
  
  const [formData, setFormData] = useState({
    itemTitle: '',
    personName: '',
    grade: '',
    section: '',
    category: 'School Supplies',
    dateLost: '',
    location: '',
    description: '',
  });
  const [isOtherCategory, setIsOtherCategory] = useState(false);
  const [otherCategory, setOtherCategory] = useState('');

  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isOtherLocation, setIsOtherLocation] = useState(false);
  const categoryTouchedRef = useRef(false);

  const CATEGORY_LABELS: Record<string, string> = {
    'School Supplies': 'School Supplies(Pens, notebooks, paper, markers, glue, and scissors)',
    'Tech & Gadgets': 'Tech & Gadgets(Laptop, tablet, calculator, chargers, and flash drives)',
    'Books & Modules': 'Books & Modules(Textbooks and printed modules)',
    'Daily Essentials': 'Daily Essentials(ID, umbrella, sanitizer, tissues, and alcohol)',
    'Food & Clothes': 'Food & Clothes(Water bottle, snacks, jacket, and PE uniform)',
    'Others': 'Others(Specify)',
  };

  const getCategoryLabel = (value: string) => CATEGORY_LABELS[value] ?? value;

  const handleLocationSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;

    if (selectedValue === "Other") {
      setIsOtherLocation(true);
      setFormData(prev => ({ ...prev, location: "" }));
    } else {
      setIsOtherLocation(false);
      setFormData(prev => ({ ...prev, location: selectedValue }));
    }
  };

  useEffect(() => {
    if (user) {
      const loadReportsForChatbot = async () => {
        try {
          const [reportsData, siteSettings] = await Promise.all([
            fetchReports(),
            fetchSiteSettings(),
          ]);
          setDbReports(reportsData);
          
          const nextCategory = categories[0] || 'Others';
          setFormData((prev) => {
            if (categoryTouchedRef.current) return prev;
            return { ...prev, category: nextCategory };
          });
          if (!categoryTouchedRef.current) {
            setIsOtherCategory(isOthersCategory(nextCategory));
          }
          
          setShowChatbot(siteSettings.user_home_chatbot_visible);
          setHasChatNotification(siteSettings.user_home_chat_notification_dot);
        } catch (err) {
          console.error("Error loading reports for chatbot", err);
        }
      };
      loadReportsForChatbot();
    }
  }, [user]);

  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [previewUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      categoryTouchedRef.current = true;
      const nextIsOther = isOthersCategory(value);
      setIsOtherCategory(nextIsOther);
      if (!nextIsOther) setOtherCategory('');
    }
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

    if (!formData.itemTitle || !formData.personName || !formData.dateLost || !formData.location || !formData.description) {
      setError('Please fill out all required fields marked with *');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isOtherCategory && !otherCategory.trim()) {
      setError('Please specify the category.');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      const payload: ReportPayload = {
        itemName: formData.itemTitle,
        personName: formData.personName.trim(),
        grade: formData.grade.trim(),
        section: formData.section.trim(),
        category: isOtherCategory ? otherCategory.trim() : formData.category,
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
    <div className={isGuidanceReporter ? "flex h-screen bg-gray-50 overflow-hidden" : "min-h-screen bg-gray-50/30 font-sans text-gray-800 relative pb-20"}>
      {isGuidanceReporter ? (
        <GuidanceSidebar />
      ) : (
        <UserHeader />
      )}
      <div className={isGuidanceReporter ? "flex-1 flex flex-col overflow-hidden" : ""}>
      {isGuidanceReporter ? <DashboardHeader /> : null}

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

      <main className={isGuidanceReporter ? "flex-1 overflow-auto p-8" : "max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col items-center"}>
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

            <div className={`w-full rounded-xl p-4 mb-8 flex items-start gap-3 ${
              isGuidanceReporter
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-[#fff8e1] border border-[#ffecb3]'
            }`}>
              <Info className={`w-5 h-5 mt-0.5 shrink-0 ${
                isGuidanceReporter ? 'text-emerald-600' : 'text-[#f57f17]'
              }`} />
              <p className={`text-xs leading-relaxed font-medium ${
                isGuidanceReporter ? 'text-emerald-700' : 'text-[#bf360c]'
              }`}>
                {isGuidanceReporter
                  ? "Guidance reports are automatically verified and posted immediately."
                  : "Your report will be reviewed by admin before being published. You'll be notified once it's approved."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Person Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="personName"
                    required
                    value={formData.personName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-gray-50/50 focus:bg-white"
                    placeholder="e.g., Juan Dela Cruz"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Grade & Section</label>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="grade"
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-gray-50/50 focus:bg-white"
                      placeholder="Grade"
                    />
                    <input
                      type="text"
                      name="section"
                      value={formData.section}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none transition-all bg-gray-50/50 focus:bg-white"
                      placeholder="Section"
                    />
                  </div>
                </div>
              </div>

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
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{getCategoryLabel(cat)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  {isOtherCategory && (
                    <input
                      type="text"
                      value={otherCategory}
                      onChange={(e) => setOtherCategory(e.target.value)}
                      className="mt-3 w-full px-4 py-3 border border-cyan-500 rounded-xl text-sm outline-none animate-in slide-in-from-top-2 duration-300 ring-2 ring-cyan-100 bg-white"
                      placeholder="Please specify category"
                      autoFocus
                    />
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Date Lost <span className="text-red-500">*</span></label>
                  <input 
                    type="date" 
                    name="dateLost" 
                    required 
                    max={new Date().toISOString().split('T')[0]}
                    value={formData.dateLost} 
                    onChange={handleInputChange} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all text-gray-600" 
                  />
                </div>
              </div>

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
                      <option value="TLE BUILDING">TLE BUILDING</option>
                      <option value="DPWH 2">DPWH 2</option>
                      <option value="YNARES 3">YNARES 3</option>
                      <option value="PLED 1">PLED 1</option>
                      <option value="PLED 3">PLED 3</option>
                      <option value="DPWH 1">DPWH 1</option>
                      <option value="YNARES 2">YNARES 2</option>
                      <option value="YNARES 1">YNARES 1</option>
                      <option value="ACG BUILDING">ACG BUILDING</option>
                      <option value="PLED 4">PLED 4</option>
                      <option value="PLED 5">PLED 5</option>
                      <option value="Gym">Gym</option>
                      <option value="Canteen">Canteen</option>
                      <option value="School Ground">School Ground</option>
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
                      placeholder="Please specify (e.g., School Parking Lot)"
                      autoFocus
                    />
                  )}
                </div>
              </div>

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
          
          <Chatbot 
            isOpen={isChatbotOpen} 
            onClose={() => setIsChatbotOpen(false)} 
            reports={dbReports}
          />
        </>
      )}
      </div>
    </div>
  );
}
