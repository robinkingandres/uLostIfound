import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Menu, 
  Upload, 
  MapPin, 
  Info, 
  ChevronDown,
  Check,
  Home,
  FileText,
  Search,
  Zap,
  User,
  LogOut,
  X,
  ChevronUp
} from 'lucide-react';

// Assets
import logo from '../../assets/logo.png'; 
import chatbotIcon from '../../assets/chatbot.png';

// Components
import Chatbot from '../../components/Chatbot';
import UserHeader from '../../components/UserHeader'; // Added import

// API & Auth
import { 
  createReport, 
  type ReportPayload, 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  type Notification 
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

export default function ReportLost() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  // --- NOTIFICATION STATE (KEEPING AS REQUESTED) ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // --- MENU STATE (KEEPING AS REQUESTED) ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- NOTIFICATION & MENU LOGIC (KEEPING AS REQUESTED) ---
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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'Home', icon: Home, path: '/home' },
    { 
      label: 'Reports', 
      icon: FileText, 
      children: [
        { label: 'Report Lost', icon: FileText, path: '/report-lost' },
        { label: 'Report Found', icon: Search, path: '/report-found' }
      ]
    },
    { label: 'Matches', icon: Zap, path: '/matches' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  // --- FORM LOGIC ---
  const [formData, setFormData] = useState({
    itemTitle: '',
    category: 'Phone',
    dateLost: '',
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

    if (!formData.itemTitle || !formData.dateLost || !formData.location || !formData.description) {
      setError('Please fill out all required fields.');
      setLoading(false);
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
      navigate('/report-success');
    } catch (err) {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative pb-20">
      
      {/* REPLACED HEADER WITH COMPONENT AS REQUESTED */}
      <UserHeader />

      {/* --- FORM CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-2xl px-6 py-10">
        
        {/* DUPLICATED PROFILE BUTTON ADDED HERE */}
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

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Lost Item</h1>
        <p className="text-gray-500 text-sm mb-6">Fill in the details about the item you lost</p>
        
        <div className="bg-[#fdf4d8] bg-opacity-60 border border-[#faeebf] rounded-lg p-4 mb-6 flex items-start gap-3">
           <Info className="w-5 h-5 text-gray-400 mt-0.5" />
           <p className="text-xs text-[#9c865a] leading-relaxed ml-1">
             Your report will be viewed by admin before being published. You'll be notified once it's approved.
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Item Title *</label>
            <input
              type="text"
              name="itemTitle"
              required
              value={formData.itemTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="e.g., Blue Wallet"
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
              <label className="text-sm font-semibold text-gray-700">Date Lost *</label>
              <input
                type="date"
                name="dateLost"
                required
                value={formData.dateLost}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              Where did you lose it? *
            </label>
            <input
              type="text"
              name="location"
              required
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              placeholder="e.g., Room 303"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">Description *</label>
            <textarea
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm resize-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none"
              placeholder="Provide detailed description..."
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Upload Image (Optional)</label>
            <button
              type="button"
              onClick={() => document.getElementById('imageUploadLost')?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border border-cyan-200 rounded-lg text-cyan-600 text-sm font-semibold hover:bg-cyan-50 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              {image ? image.name : 'Add file'}
            </button>
            <input id="imageUploadLost" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
          </div>

          <div className="pt-8 flex gap-4 justify-end">
            <button type="button" onClick={() => navigate('/home')} className="px-8 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="px-8 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-bold shadow-md transition-all disabled:bg-gray-300">{loading ? 'Submitting...' : 'Submit Lost Item'}</button>
          </div>
        </form>
      </main>

      {/* --- FLOATING CHATBOT --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => setIsChatbotOpen(true)} className="bg-transparent p-0 border-0">
          <div className="w-16 h-16 relative">
            <img src={chatbotIcon} alt="Chatbot" className="w-full h-full object-contain" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </button>
      </div>
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}