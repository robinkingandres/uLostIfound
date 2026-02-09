import { useNavigate } from 'react-router-dom';
import UserHeader from '../../components/UserHeader';
import logo from '/src/assets/logo.png';

export default function ReportFoundSuccess() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative">
      
      {/* SHARED HEADER */}
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

        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Report Submitted!
        </h1>
        
        <p className="text-gray-600 text-sm leading-relaxed max-w-xs mx-auto">
          Thank you for reporting your found item.
          We'll review the information you provided and
          notify you if a potential match is found.
        </p>

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
