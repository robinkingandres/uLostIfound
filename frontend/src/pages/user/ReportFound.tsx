import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Upload, 
  MapPin, 
  Info,
  ChevronDown,
  Home,
  FileText,
  Search,
  Zap,
  User
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

export default function ReportFound() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // --- NOTIFICATION & MENU STATE (Synced with ReportLost) ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- NOTIFICATION & MENU LOGIC ---
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications(); 
      const interval = setInterval(loadNotifications, 30000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsReportsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- FORM LOGIC ---
  const [formData, setFormData] = useState({
    itemTitle: '',
    category: 'Phone',
    dateFound: '',
    location: '',
    description: '',
  });
  const [image, setImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImage(e.target.files?.[0] || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
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
      navigate('/report-found-success');
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative pb-20">
      
      {/* SHARED HEADER COMPONENT */}
      <UserHeader />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-2xl px-6 py-10">
        
        {/* DUPLICATED PROFILE BUTTON (Mobile view consistency) */}
        <div className="flex justify-end mb-4 md:hidden">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-gray-50 border border-gray-100 shadow-sm transition-all duration-200 hover:bg-gray-100 text-gray-600"
          >
            <div className="w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center overflow-hidden shrink-0 border border-white">
              {user?.avatar ? (
                <img
                  src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fb = e.currentTarget.nextElementSibling;
                    if (fb) (fb as HTMLElement).style.display = 'flex';
                  }}
                />
              ) : null}
              <span
                className="text-white font-bold text-xs"
                style={{ display: user?.avatar ? 'none' : 'flex' }}
              >
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs font-semibold text-gray-900">My Profile</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Found Item</h1>
        <p className="text-gray-500 text-sm mb-6">Fill in the details about the item you found</p>

        <div className="bg-[#a3d9c2] bg-opacity-60 border border-[#8fcbad] rounded-lg p-4 mb-6 flex items-start gap-3">
           <Info className="w-5 h-5 text-[#3d6852] mt-0.5" />
           <p className="text-xs text-[#2c5340] leading-relaxed ml-1">
             Your report will be viewed by admin before being published. We'll check for potential matches with lost items!
           </p>
        </div>
        
        {error && <p className="text-sm text-red-500 bg-red-100 p-3 rounded-lg mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Item Title *</label>
            <input
              type="text"
              name="itemTitle"
              required
              placeholder="e.g., Laptop"
              value={formData.itemTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-sm font-semibold text-gray-700">Category *</label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm appearance-none bg-white cursor-pointer"
                >
                  <option value="Phone">Phone</option>
                  <option value="Wallet">Wallet</option>
                  <option value="ID">ID</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Others">Others</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-gray-700">When did you find it? *</label>
              <input
                type="date"
                name="dateFound"
                required
                value={formData.dateFound}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              Where did you find it? *
            </label>
            <input
              type="text"
              name="location"
              required
              placeholder="e.g., Room 303"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Description *</label>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Provide detailed description..."
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Upload Image (Optional)</label>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-orange-200 rounded-lg text-orange-500 text-sm font-semibold hover:bg-orange-50 transition-colors shadow-sm"
              onClick={() => document.getElementById('imageUploadFound')?.click()}
            >
              <Upload className="w-4 h-4" />
              {image ? image.name : 'Add file'}
            </button>
            <input id="imageUploadFound" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="pt-8 flex gap-4 justify-end items-center">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="px-8 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 disabled:bg-gray-300"
            >
              {loading ? 'Submitting...' : 'Submit Found Item'}
            </button>
          </div>
        </form>
      </main>

      {/* --- FLOATING CHATBOT --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <button 
          onClick={() => setIsChatbotOpen(true)}
          className="bg-transparent hover:scale-110 active:scale-95 transition-transform p-0 border-0 focus:outline-none"
        >
          <div className="w-16 h-16 relative">
            <img src={chatbotIcon} alt="Chatbot" className="w-full h-full object-contain drop-shadow-xl" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </button>
      </div>

      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}