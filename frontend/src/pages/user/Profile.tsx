import { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Camera, Edit2 } from 'lucide-react';
import UserHeader from '../../components/UserHeader'; 
import Chatbot from '../../components/Chatbot';
import EditProfileModal from '../../components/EditProfileModal';
import ItemsListModal from '../../components/ItemsListModal';
import { useAuth } from '../../contexts/AuthContext';
import { fetchMyReports, fetchClaims, uploadAvatar, updateProfile, fetchCurrentUser } from '../../services/api';
import type { Report } from '../../types/report';
import type { Claim } from '../../types/claim';
import chatbotIcon from '../../assets/chatbot.png';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for statistics and items
  const [stats, setStats] = useState({
    reported: 0,
    claimed: 0
  });
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [isClaimsModalOpen, setIsClaimsModalOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const loadData = async () => {
    try {
      // Fetch data in parallel
      const [reports, claims] = await Promise.all([
        fetchMyReports(),
        fetchClaims()
      ]);

      setMyReports(reports);
      setMyClaims(claims);
      setStats({
        reported: reports.length,
        claimed: claims.length
      });
    } catch (err) {
      console.error("Failed to load profile stats", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB.');
      return;
    }

    setUploadingAvatar(true);
    try {
      const updated = await uploadAvatar(user.id, file);
      const authUser = {
        id: updated.id,
        username: updated.username,
        role: updated.role,
        name: updated.name,
        userId: updated.userId,
        email: updated.email,
        avatar: updated.avatar
      };
      refreshUser(authUser);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleProfileUpdate = async () => {
    if (!user) return;
    try {
      const updatedUserData = await fetchCurrentUser(user.id);
      const authUser = {
        id: updatedUserData.id,
        username: updatedUserData.username,
        role: updatedUserData.role,
        name: updatedUserData.name,
        userId: updatedUserData.userId,
        email: updatedUserData.email,
        avatar: updatedUserData.avatar
      };
      refreshUser(authUser);
    } catch (err) {
      console.error('Failed to refresh user data:', err);
      await loadData();
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 pb-20">
      
      {/* 1. Reusable User Header */}
      <UserHeader />

      <main className="max-w-md mx-auto px-6 py-6">
        
        {/* 2. Blue Profile Card */}
        <div className="bg-[#29b6f6] rounded-xl p-6 shadow-md mb-6 flex items-center gap-6 text-white relative overflow-hidden">
          {/* User Avatar / Icon with Upload */}
          <div className="relative shrink-0">
            <div 
              className="w-24 h-24 bg-transparent border-4 border-black rounded-full flex items-center justify-center relative z-10 overflow-hidden bg-white/20 cursor-pointer group hover:opacity-90 transition-opacity"
              onClick={handleAvatarClick}
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <UserIcon className="w-16 h-16 text-black" strokeWidth={2.5} />
              )}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              {!uploadingAvatar && (
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          
          <div className="z-10 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-black tracking-tight">{user?.name || 'User Name'}</h2>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                title="Edit Profile"
              >
                <Edit2 className="w-4 h-4 text-black" />
              </button>
            </div>
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
            
            {/* Items Reported (Blue Box) - Clickable */}
            <button
              onClick={() => setIsReportsModalOpen(true)}
              className="flex-1 bg-[#b3e5fc] rounded-lg p-4 relative overflow-hidden hover:bg-[#81d4fa] transition-colors cursor-pointer text-left"
            >
               <p className="text-sm text-[#0277bd] font-medium mb-1">Items Reported</p>
               <p className="text-4xl font-bold text-[#01579b]">
                 {loading ? '-' : stats.reported}
               </p>
               <p className="text-xs text-[#0277bd] mt-2 opacity-75">Click to view details</p>
            </button>

            {/* Items Claimed (Green Box) - Clickable */}
            <button
              onClick={() => setIsClaimsModalOpen(true)}
              className="flex-1 bg-[#c8e6c9] rounded-lg p-4 relative overflow-hidden hover:bg-[#a5d6a7] transition-colors cursor-pointer text-left"
            >
               <p className="text-sm text-[#2e7d32] font-medium mb-1">Items Claimed</p>
               <p className="text-4xl font-bold text-[#1b5e20]">
                 {loading ? '-' : stats.claimed}
               </p>
               <p className="text-xs text-[#2e7d32] mt-2 opacity-75">Click to view details</p>
            </button>

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

      {/* Edit Profile Modal */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onUpdate={handleProfileUpdate}
      />

      {/* Items Reported Modal */}
      <ItemsListModal
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        title="Items Reported"
        items={myReports}
        type="reports"
      />

      {/* Items Claimed Modal */}
      <ItemsListModal
        isOpen={isClaimsModalOpen}
        onClose={() => setIsClaimsModalOpen(false)}
        title="Items Claimed"
        items={myClaims}
        type="claims"
      />

    </div>
  );
}