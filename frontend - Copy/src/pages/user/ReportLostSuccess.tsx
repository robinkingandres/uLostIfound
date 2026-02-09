import { useNavigate } from 'react-router-dom';
import { Hand, Search } from 'lucide-react';
import UserHeader from '../../components/UserHeader';

export default function ReportLostSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative">
      
      {/* --- HEADER (Copied from Home) --- */}
      <UserHeader />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto px-6 pt-16 flex flex-col items-center text-center">
        
        {/* Large Central Logo (Preserved Custom CSS Graphic) */}
        <div className="relative w-48 h-48 mb-8 mt-10">
          <div className="w-full h-full rounded-full overflow-hidden flex shadow-lg border-4 border-white">
            {/* Left Blue Half */}
            <div className="w-1/2 h-full bg-cyan-400 flex items-center justify-center relative">
               <Hand className="text-white w-20 h-20 absolute top-8 left-4 -rotate-12" strokeWidth={1.5} />
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
          Thank you for reporting your lost item.
          We'll review the information you provided and
          notify you if a potential match is found.
        </p>

        {/* Back Home Button */}
        <button 
          onClick={() => navigate('/home')}
          className="mt-12 text-cyan-500 font-semibold hover:underline transition-all active:scale-95"
        >
          Return to Home
        </button>

      </main>
    </div>
  );
}