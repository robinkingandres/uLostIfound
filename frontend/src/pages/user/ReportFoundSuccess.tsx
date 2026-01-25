import { useNavigate } from 'react-router-dom';
import { Bell, Menu, Hand, Search } from 'lucide-react';

export default function ReportFoundSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="max-w-md mx-auto md:max-w-5xl flex items-center justify-between">
          
          {/* Header Logo Area */}
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/home')}
          >
            <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center overflow-hidden border-2 border-orange-400 relative">
               <div className="flex w-full h-full">
                   <div className="w-1/2 bg-cyan-400 h-full flex items-center justify-center">
                      <Hand className="w-3 h-3 text-white -ml-1 mt-1 transform -rotate-45" />
                   </div>
                   <div className="w-1/2 bg-orange-400 h-full flex items-center justify-center">
                      <Search className="w-3 h-3 text-gray-900 -mr-1 mb-1" />
                   </div>
               </div>
               <span className="absolute bottom-1 text-[6px] font-bold text-gray-900 drop-shadow-md bg-white/20 px-1 rounded">uLostiFound</span>
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
          <div className="w-full h-full rounded-full overflow-hidden flex shadow-lg">
            {/* Left Blue Half */}
            <div className="w-1/2 h-full bg-cyan-400 flex items-center justify-center relative">
               <Hand className="text-white w-20 h-20 absolute top-8 left-4 -rotate-12" strokeWidth={1.5} />
               {/* Decorative wallet-like shape */}
               <div className="absolute bottom-10 right-4 w-10 h-8 border-2 border-white/80 rounded-md"></div>
            </div>
            
            {/* Right Orange Half */}
            <div className="w-1/2 h-full bg-orange-400 flex items-center justify-center relative">
               <Search className="text-gray-900 w-16 h-16 absolute top-10 right-6" strokeWidth={2.5} />
            </div>
          </div>
          
          {/* Logo Text Overlay */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full">
            <span className="text-3xl font-extrabold text-[#1e293b] tracking-tighter drop-shadow-md">
              uLost<span className="text-[#1e293b]">iFound</span>
            </span>
          </div>
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