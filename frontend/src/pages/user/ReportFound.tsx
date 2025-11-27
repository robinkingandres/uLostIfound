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

export default function ReportFound() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    itemTitle: '',
    category: 'Phone',
    dateFound: '',
    location: '',
    description: '',
    image: null as File | null
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Submitting Found Item Report:', formData);
    
    // 1. (Future) Add your backend API call here
    
    // 2. Redirect to the success page
    navigate('/report-found-success');
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative pb-20">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto md:max-w-5xl flex items-center justify-between">
          
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/home')}>
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center overflow-hidden border-2 border-orange-400 relative">
               <div className="flex w-full h-full">
                   <div className="w-1/2 bg-blue-400 h-full"></div>
                   <div className="w-1/2 bg-orange-400 h-full"></div>
               </div>
               <span className="absolute text-[8px] font-bold text-white drop-shadow-md">uLostFound</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/report-lost')}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Report Lost
            </button>
            <button className="text-[#29b6f6] font-bold text-sm">
              Report Found
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
            <button className="text-gray-600 hover:text-blue-600 transition-colors">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-2xl px-6 py-6">
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Found Item</h1>
        <p className="text-gray-500 text-sm mb-6">Fill in the details about the item you found</p>

        <div className="bg-[#a3d9c2] bg-opacity-60 border border-[#8fcbad] rounded-lg p-4 mb-6 flex items-start gap-3">
           <div className="min-w-[20px] pt-0.5">
             <Info className="w-5 h-5 text-[#3d6852]" />
           </div>
           <p className="text-xs text-[#2c5340] leading-relaxed ml-1">
             Your report will be viewed by admin before being published. We'll check for potential matches with lost items!
           </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Item Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="itemTitle"
              placeholder="e.g., Laptop"
              value={formData.itemTitle}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 relative">
              <label className="text-sm font-semibold text-gray-700">
                Category <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 appearance-none focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6] cursor-pointer"
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
              <label className="text-sm font-semibold text-gray-700">
                When did you find it? <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  name="dateFound"
                  value={formData.dateFound}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-500 placeholder-gray-400 focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6]"
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-gray-500" />
              Where did you find it? <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="location"
              placeholder="e.g., Room 303"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-700">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Provide detailed description of the item..."
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:border-[#29b6f6] focus:ring-1 focus:ring-[#29b6f6] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-600 rounded-sm flex items-center justify-center">
                  <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
              </div>
              Upload Image here (Optional)
            </label>
            
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-white border border-blue-200 rounded-lg text-[#29b6f6] text-sm font-semibold hover:bg-blue-50 transition-colors shadow-sm"
              onClick={() => document.getElementById('imageUploadFound')?.click()}
            >
              <Upload className="w-4 h-4" />
              Add file
            </button>
            <input 
              id="imageUploadFound" 
              type="file" 
              className="hidden" 
              accept="image/*"
              onChange={(e) => setFormData(prev => ({...prev, image: e.target.files?.[0] || null}))}
            />
          </div>

          <div className="pt-8 flex gap-4 justify-end items-center">
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="px-8 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-2.5 bg-[#29b6f6] hover:bg-[#0288d1] text-white rounded-lg text-sm font-bold shadow-md transition-colors"
            >
              Submit <br/> Found Item
            </button>
          </div>
        </form>
      </main>

      <div className="fixed bottom-6 right-4 z-50 pointer-events-none">
         <div className="w-20 h-20 relative">
             <img 
               src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" 
               alt="Chatbot" 
               className="w-full h-full object-contain drop-shadow-xl"
             />
             <div className="absolute top-4 right-0 w-8 h-12 bg-blue-900 rounded-md -z-10 rotate-12"></div>
         </div>
      </div>

    </div>
  );
}