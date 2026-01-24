import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Menu, 
  Upload, 
  Calendar, 
  MapPin, 
  Info, 
  ChevronDown 
} from 'lucide-react';

// Assets
import logo from '../../assets/logo.png'; 
import chatbotIcon from '../../assets/chatbot.png';

// Components
import Chatbot from '../../components/Chatbot';

// API Service
import { createReport, type ReportPayload } from '../../services/api';

export default function ReportLost() {
  const navigate = useNavigate();

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
      
      {/* --- EXACT USERHEADER IMPLEMENTATION --- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm transition-all duration-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* LOGO AREA */}
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/home')}>
              <div className="relative w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <div
                  className="absolute inset-0 rounded-full animate-spin-slow"
                  style={{
                    padding: "3px",
                    background: "conic-gradient(#0059ff95, #f6a51f, #0059ff95)",
                    WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                    WebkitMaskComposite: "xor",
                    maskComposite: "exclude",
                  }}
                ></div>
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm">
                  <img src={logo} alt="uLostiFound Logo" className="w-full h-full object-contain" />
                </div>
              </div>
              <span className="hidden sm:block font-bold text-lg text-black tracking-tight">
                <span className="hover:text-blue-600 transition-colors duration-200">uLost</span>
                <span className="hover:text-orange-500 transition-colors duration-200">iFound</span>
              </span>
            </div>

            {/* DESKTOP NAVIGATION (Centered logic via justify-between) */}
            <div className="hidden md:flex items-center gap-2">
              <button 
                onClick={() => navigate('/report-lost')} 
                className="px-4 py-2 rounded-full text-cyan-600 bg-cyan-50 font-medium text-sm transition-all duration-200"
              >
                Report Lost
              </button>
              <button 
                onClick={() => navigate('/report-found')} 
                className="px-4 py-2 rounded-full text-gray-600 hover:text-orange-600 hover:bg-orange-50 font-medium text-sm transition-all duration-200"
              >
                Report Found
              </button>
            </div>

            {/* RIGHT ACTIONS */}
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all">
                <Bell className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-all">
                <Menu className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-2xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Lost Item</h1>
        <p className="text-gray-500 text-sm mb-6">Fill in the details about the item you lost</p>

        <div className="bg-[#fdf4d8] border border-[#faeebf] rounded-lg p-4 mb-6 flex items-start gap-3">
           <Info className="w-5 h-5 text-gray-400 mt-0.5" />
           <p className="text-xs text-[#9c865a] leading-relaxed">
             Your report will be reviewed by admin before being published. You'll be notified once it's approved.
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
            <button 
              type="button" 
              onClick={() => navigate('/home')} 
              className="px-8 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-bold shadow-md transition-all active:scale-95 disabled:bg-gray-300"
            >
              {loading ? 'Submitting...' : 'Submit Lost Item'}
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

      {/* Chatbot Component */}
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />
    </div>
  );
}