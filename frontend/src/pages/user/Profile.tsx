import { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';
import UserHeader from '../../components/UserHeader'; 
import Chatbot from '../../components/Chatbot';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyReports, fetchClaims } from '../../services/api';
import chatbotIcon from '../../assets/chatbot.png';

export default function Profile() {
  const { user } = useAuth();
  
  // State for statistics
  const [stats, setStats] = useState({
    reported: 0,
    claimed: 0
  });
  const [loading, setLoading] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  useEffect(() => {
    const loadStats = async () => {
      try {
        // Fetch data in parallel
        const [myReports, myClaims] = await Promise.all([
          fetchMyReports(),
          fetchClaims()
        ]);

        setStats({
          reported: myReports.length,
          claimed: myClaims.length
        });
      } catch (err) {
        console.error("Failed to load profile stats", err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 pb-20">
      
      {/* 1. Reusable User Header */}
      <UserHeader />

      <main className="max-w-md mx-auto px-6 py-6">
        
        {/* 2. Blue Profile Card */}
        <div className="bg-[#29b6f6] rounded-xl p-6 shadow-md mb-6 flex items-center gap-6 text-white relative overflow-hidden">
          {/* User Avatar / Icon */}
          <div className="w-24 h-24 bg-transparent border-4 border-black rounded-full flex items-center justify-center relative z-10 shrink-0 overflow-hidden bg-white/20">
             {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
             ) : (
                <UserIcon className="w-16 h-16 text-black" strokeWidth={2.5} />
             )}
          </div>
          
          <div className="z-10">
            <h2 className="text-2xl font-bold text-black tracking-tight">{user?.name || 'User Name'}</h2>
            <p className="text-black font-medium">{user?.role || 'User'}</p>
          </div>

          {/* Decorative Background Element */}
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white opacity-10 rounded-full"></div>
        </div>

        {/* 3. Details List */}
        <div className="space-y-3 mb-6">
          
          {/* Full Name */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Full Name</p>
            <p className="font-bold text-gray-900">{user?.name || 'N/A'}</p>
          </div>

          {/* School ID - Now Real Data */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">School ID</p>
            <p className="font-bold text-gray-900">{user?.userId || 'N/A'}</p>
          </div>

          {/* Email Address - Now Real Data */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Email Address</p>
            <p className="font-bold text-gray-900">{user?.email || 'N/A'}</p>
          </div>

          {/* Year Level (Mock Data - Backend update required for dynamic) */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Year Level</p>
            <p className="font-bold text-gray-900">Grade 7</p>
          </div>

          {/* Room (Mock Data) */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Room</p>
            <p className="font-bold text-gray-900">Room 101</p>
          </div>

          {/* Gender (Mock Data) */}
          <div className="bg-gray-100 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500 mb-0.5">Gender</p>
            <p className="font-bold text-gray-900">Female</p>
          </div>

        </div>

        {/* 4. Account Statistics */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Account Statistics</h3>
          <div className="flex gap-4">
            
            {/* Items Reported (Blue Box) */}
            <div className="flex-1 bg-[#b3e5fc] rounded-lg p-4 relative overflow-hidden">
               <p className="text-sm text-[#0277bd] font-medium mb-1">Items Reported</p>
               <p className="text-4xl font-bold text-[#01579b]">
                 {loading ? '-' : stats.reported}
               </p>
            </div>

            {/* Items Claimed (Green Box) */}
            <div className="flex-1 bg-[#c8e6c9] rounded-lg p-4 relative overflow-hidden">
               <p className="text-sm text-[#2e7d32] font-medium mb-1">Items Claimed</p>
               <p className="text-4xl font-bold text-[#1b5e20]">
                 {loading ? '-' : stats.claimed}
               </p>
            </div>

          </div>
        </div>

      </main>

      {/* 5. Floating Chatbot Icon */}
      <div className="fixed bottom-6 right-4 z-50">
        <button 
          onClick={() => setIsChatbotOpen(true)}
          className="bg-transparent hover:scale-110 active:scale-95 transition-transform duration-200 shadow-none border-0 p-0 cursor-pointer focus:outline-none"
          aria-label="Open Support Chat"
        >
          <div className="w-16 h-16 relative">
            <img 
              src={chatbotIcon} 
              alt="Chatbot" 
              className="w-full h-full object-contain drop-shadow-xl"
            />
            {/* Notification Dot */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </button>
      </div>

      {/* Chatbot Component */}
      <Chatbot isOpen={isChatbotOpen} onClose={() => setIsChatbotOpen(false)} />

    </div>
  );
}