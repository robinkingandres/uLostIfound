import { useNavigate } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';

// --- Added logo import ---
import logo from '/src/assets/logo.png';

export default function ReportFoundSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto md:max-w-5xl flex items-center justify-between">
          
          {/* Header Logo Area - Updated */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/home')}
          >
            <div className="w-10 h-10 ">
              <img 
                src={logo} 
                alt="Antipolo Logo" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/report-lost')}
              className="text-gray-600 hover:text-cyan-500 font-medium text-sm transition-colors"
            >
              Report Lost
            </button>
            <button 
              onClick={() => navigate('/report-found')}
              className="text-gray-600 hover:text-cyan-500 font-medium text-sm transition-colors"
            >
              Report Found
            </button>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-cyan-500 transition-colors">
              <Bell className="w-6 h-6" />
            </button>
            <button className="text-gray-600 hover:text-cyan-500 transition-colors">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto px-6 pt-20 flex flex-col items-center text-center">
        
        {/* Large Central Logo */}
        <div className="relative w-48 h-48 mb-8">
          <img 
            src={logo} 
            alt="Antipolo Logo" 
            className="w-full h-full object-cover rounded-full shadow-lg"
          />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Report Submitted!
        </h1>
        
        <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
          Thank you for reporting your found item.
          We'll review the information you provided and
          notify you if a potential match is found.
        </p>

        {/* Optional: Back Home Button */}
        <button 
          onClick={() => navigate('/home')}
          className="mt-12 text-cyan-500 font-semibold hover:underline"
        >
          Return to Home
        </button>

      </main>
    </div>
  );
}
