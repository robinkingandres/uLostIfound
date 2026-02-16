import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/UserHeader';
import { useAuth } from '../../contexts/AuthContext';

// --- Assets ---
import logo from '/src/assets/logo.png';

export default function ReportFoundSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuidanceReporter = user?.role === 'Guidance';

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 relative">
      
      {/* --- HEADER --- */}
      <UserHeader />

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
          {isGuidanceReporter ? (
            <>
              Your <span className="font-semibold text-cyan-600">found item report</span> is already verified and posted.
              It is now visible on the homepage feed.
            </>
          ) : (
            <>
              Thank you for reporting the <span className="font-semibold text-cyan-600">found item</span>.
              We'll review the information you provided and
              notify you if a potential match is found.
            </>
          )}
        </p>

        {/* Back Home Button */}
        <button 
          onClick={() => navigate(isGuidanceReporter ? '/guidance/dashboard' : '/home')}
          className="mt-12 text-cyan-500 font-semibold hover:underline transition-all active:scale-95"
        >
          {isGuidanceReporter ? 'Return to Guidance Dashboard' : 'Return to Home'}
        </button>

      </main>
    </div>
  );
}
