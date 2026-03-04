import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/UserHeader';
import { useAuth } from '../../contexts/AuthContext';

// --- Assets ---
import logo from '/src/assets/logo.png';

export default function ReportLostSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isGuidanceReporter = user?.role === 'Guidance';

  return (
    <div
      className="min-h-screen font-sans relative bg-white text-gray-800"
    >
      
      {/* --- HEADER --- */}
      {!isGuidanceReporter ? <UserHeader /> : null}

      {/* --- MAIN CONTENT --- */}
      <main className={`max-w-md mx-auto px-6 flex flex-col items-center text-center ${isGuidanceReporter ? 'pt-12' : 'pt-20'}`}>
        
        {/* Large Central Logo (Matches ReportFoundSuccess) */}
        <div className="relative w-48 h-48 mb-8">
          <img 
            src={logo} 
            alt="Antipolo Logo" 
            className="w-full h-full object-cover rounded-full shadow-lg"
          />
        </div>

        {/* Success Message */}
        <h1 className="text-2xl font-bold mb-4 text-gray-900">
          Report Submitted!
        </h1>
        
        <p className="text-sm leading-relaxed max-w-xs mx-auto text-gray-600">
          {isGuidanceReporter ? (
            <>
              Your <span className="font-semibold text-cyan-600">lost item report</span> is already verified and posted.
              It is now visible on the homepage feed.
            </>
          ) : (
            <>
              Thank you for reporting your <span className="font-semibold text-cyan-600">lost item</span>.
              We'll review the information you provided and
              notify you if a potential match is found.
            </>
          )}
        </p>

        {/* Back Home Button */}
        <button 
          onClick={() => navigate(isGuidanceReporter ? '/guidance/dashboard' : '/home')}
          className="mt-12 font-semibold hover:underline transition-all active:scale-95 text-cyan-500"
        >
          {isGuidanceReporter ? 'Return to Guidance Dashboard' : 'Return to Home'}
        </button>

      </main>
    </div>
  );
}
