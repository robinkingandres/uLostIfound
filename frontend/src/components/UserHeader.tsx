import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Menu, 
  Home, 
  Search, 
  FileText, 
  Zap, 
  User, 
  LogOut,
  X,
  Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
// Import notification services
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  type Notification 
} from '../services/api';

export default function UserHeader() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // --- NOTIFICATION STATE ---
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // 1. Poll for notifications every 30 seconds
  const loadNotifications = async () => {
    try {
      const data = await fetchNotifications();
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications(); // Initial fetch
      const interval = setInterval(loadNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  // 2. Handle clicking outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  // --- NOTIFICATION ACTIONS ---
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
        // Optimistic UI update
        setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
        await markNotificationRead(id);
    } catch (e) {
        console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
      try {
          setNotifications(prev => prev.map(n => ({...n, is_read: true})));
          await markAllNotificationsRead();
      } catch (e) {
          console.error(e);
      }
  };

  const menuItems = [
    { label: 'Home', icon: Home, path: '/home' },
    { label: 'Report Lost', icon: FileText, path: '/report-lost' },
    { label: 'Report Found', icon: Search, path: '/report-found' },
    { label: 'Matches', icon: Zap, path: '/matches' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm px-4 py-3 font-sans">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        
        {/* Logo Area */}
        <div 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/home')}
        >
           <div className="w-10 h-10 rounded-full bg-cyan-400 flex items-center justify-center overflow-hidden border-2 border-orange-400 relative">
               <div className="flex w-full h-full">
                   <div className="w-1/2 bg-cyan-400 h-full flex items-center justify-center">
                      <div className="w-3 h-3 text-white -ml-1 mt-1 transform -rotate-45 border-2 border-white rounded-sm" />
                   </div>
                   <div className="w-1/2 bg-orange-400 h-full flex items-center justify-center">
                      <Search className="w-3 h-3 text-gray-900 -mr-1 mb-1" />
                   </div>
               </div>
               <span className="absolute bottom-1 text-[6px] font-bold text-gray-900 drop-shadow-md bg-white/20 px-1 rounded">uLostiFound</span>
            </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
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

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          
          {/* --- NOTIFICATION BELL --- */}
          <div className="relative" ref={notifRef}>
            <button 
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="relative text-gray-600 hover:text-cyan-500 transition-colors p-1"
            >
              <Bell className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotifOpen && (
                <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 origin-top-right overflow-hidden z-50">
                    <div className="px-4 py-2 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <span className="font-bold text-gray-800 text-sm">Notifications</span>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead} 
                                className="text-xs text-cyan-600 hover:text-cyan-800 flex items-center gap-1 font-medium"
                            >
                                <Check className="w-3 h-3" /> Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-6 text-center text-gray-400 text-xs">
                                No notifications yet.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-cyan-50/30' : ''}`}
                                >
                                    <p className={`text-sm ${!notif.is_read ? 'font-bold text-gray-800' : 'text-gray-600'}`}>
                                        {notif.message}
                                    </p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
          </div>
          
          {/* --- MOBILE MENU --- */}
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-cyan-500 transition-colors p-1"
            >
              {isMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-3 w-60 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 z-50 origin-top-right">
                <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
                  <p className="text-sm font-bold text-gray-900">{user?.name || 'Guest'}</p>
                  <p className="text-xs text-gray-500 truncate font-medium">{user?.role}</p>
                </div>
                <div className="py-2">
                  {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full text-left px-5 py-3 text-sm text-gray-600 hover:bg-cyan-50 hover:text-cyan-600 flex items-center gap-3 transition-all"
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-gray-100 pt-2 pb-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-5 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}