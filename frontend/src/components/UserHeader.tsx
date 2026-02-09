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
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle // Added for rejection icon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead, 
  type Notification
} from '../services/api';
import logoImg from '../assets/logo.png'; 

export default function UserHeader() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  // --- MENU STATE ---
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
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
      loadNotifications(); 
      const interval = setInterval(loadNotifications, 30000); 
      return () => clearInterval(interval);
    }
  }, [user]);

  // 2. Handle clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setIsReportsOpen(false); 
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

  // --- NOTIFICATION ACTIONS ---
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
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
    { 
      label: 'Reports',
      icon: FileText, 
      children: [
        { label: 'Report Lost', icon: FileText, path: '/report-lost' },
        { label: 'Report Found', icon: Search, path: '/report-found' }
      ]
    },
    { label: 'Matches', icon: Zap, path: '/matches' },
    { label: 'Profile', icon: User, path: '/profile' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm font-sans transition-all duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
        
          {/* LOGO AREA */}
          <div 
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/home')}
          >
            {/* Circular Logo Container with Rotating Ring */}
            <div className="relative w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              
              {/* Circular rotating ring */}
              <div
                className="absolute inset-0 rounded-full animate-spin-slow"
                style={{
                  padding: "3px",
                  background: "conic-gradient(#0059ff95, #f6a51f, #0059ff95)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                }}
              ></div>

              {/* Actual Logo Image Container */}
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm">
                <img 
                  src={logoImg} 
                  alt="uLostiFound Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>

            {/* Logo Text */}
            <span className="hidden sm:block font-bold text-lg text-black tracking-tight transition-colors">
              <span className="hover:text-blue-600 transition-colors duration-200 cursor-pointer">
                uLost
              </span>
              <span className="hover:text-orange-500 transition-colors duration-200 cursor-pointer">
                iFound
              </span>
            </span>
          </div>

          {/* CENTER: Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2 flex-1 justify-center">
            <button 
              onClick={() => navigate('/report-lost')} 
              className="px-4 py-2 rounded-full text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 font-medium text-sm transition-all duration-200"
            >
              Report Lost
            </button>
            <button 
              onClick={() => navigate('/report-found')} 
              className="px-4 py-2 rounded-full text-gray-600 hover:text-orange-600 hover:bg-orange-50 font-medium text-sm transition-all duration-200"
            >
              Report Found
            </button>
          </div>

          {/* RIGHT SIDE: Notification → Menu → Profile */}
          <div className="flex items-center gap-3">
            
            {/* NOTIFICATION BELL */}
            <div className="relative" ref={notifRef}>
              <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className={`relative p-2 rounded-full transition-all duration-200 ${isNotifOpen ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-100 hover:text-cyan-600'}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
              </button>

              {isNotifOpen && (
                  <div className="absolute right-0 top-full mt-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100/50 py-0 origin-top-right overflow-hidden z-50 ring-1 ring-black/5">
                      <div className="px-5 py-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
                          <span className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            Notifications <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>
                          </span>
                          {unreadCount > 0 && (
                              <button 
                                  onClick={handleMarkAllRead} 
                                  className="text-xs text-cyan-600 hover:text-cyan-700 hover:underline flex items-center gap-1 font-medium transition-all"
                              >
                                  <Check className="w-3 h-3" /> Mark all read
                              </button>
                          )}
                      </div>
                      
                      <div className="max-h-[20rem] overflow-y-auto custom-scrollbar">
                          {notifications.length === 0 ? (
                              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                  <Bell className="w-8 h-8 mb-2 opacity-20" />
                                  <p className="text-xs">No notifications yet.</p>
                              </div>
                          ) : (
                              notifications.map((notif) => {
                                // STEP 7 APPLICATION: Detect if it's a rejection notification to style it differently
                                const isRejection = notif.message.toLowerCase().includes('rejected');
                                
                                return (
                                  <div 
                                      key={notif.id} 
                                      onClick={() => handleMarkAsRead(notif.id)} 
                                      className={`px-5 py-4 border-b border-gray-50 cursor-pointer transition-colors group
                                        ${isRejection 
                                          ? (!notif.is_read ? 'bg-red-50/80 hover:bg-red-100/50' : 'hover:bg-red-50/30') 
                                          : (!notif.is_read ? 'bg-cyan-50/60 hover:bg-cyan-50/30' : 'hover:bg-gray-50')}
                                      `}
                                  >
                                      <div className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 
                                          ${!notif.is_read 
                                            ? (isRejection ? 'bg-red-500' : 'bg-cyan-500') 
                                            : 'bg-transparent'}`} 
                                        />
                                        <div>
                                          <p className={`text-sm leading-snug ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>
                                              {/* If Rejected, add an icon to draw attention */}
                                              {isRejection && <AlertCircle className="inline w-3 h-3 text-red-500 mr-1 mb-0.5" />}
                                              {notif.message}
                                          </p>
                                          {/* Explicitly show 'Reason' highlight if present in text (handled by backend string, but we style the container) */}
                                          <p className="text-[10px] text-gray-400 mt-1.5 font-medium group-hover:text-cyan-500 transition-colors">
                                              {new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                          </p>
                                        </div>
                                      </div>
                                  </div>
                                );
                              })
                          )}
                      </div>
                      <div className="bg-gray-50 px-4 py-2 text-center border-t border-gray-100">
                        <button className="text-[10px] text-gray-500 hover:text-cyan-600 font-medium transition-colors">View All Activity</button>
                      </div>
                  </div>
              )}
            </div>
            
            {/* MENU TOGGLE BUTTON */}
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className={`p-2 rounded-full transition-all duration-200 ${isMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>

              {/* MENU DROPDOWN */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100/50 py-2 origin-top-right z-50 ring-1 ring-black/5">
                  
                  {/* User Profile Snippet */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="w-full px-6 py-4 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#29b6f6] flex items-center justify-center overflow-hidden shrink-0">
                        {user?.avatar ? (
                          <img
                            src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-white font-bold text-lg">{user?.name?.charAt(0) || 'U'}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest'}</p>
                        <p className="text-xs text-gray-500 truncate font-medium bg-gray-200/50 inline-block px-1.5 rounded mt-0.5">{user?.role || 'User'}</p>
                      </div>
                    </div>
                  </button>

                  <div className="py-2 px-2 space-y-1">
                    {menuItems.map((item) => (
                      <div key={item.label}>
                        {/* Group Item (Reports) */}
                        {item.children ? (
                          <div className="rounded-xl overflow-hidden">
                            <button
                              onClick={() => setIsReportsOpen(!isReportsOpen)}
                              className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-all font-medium rounded-xl
                                ${isReportsOpen ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                              `}
                            >
                              <div className="flex items-center gap-3">
                                <item.icon className={`w-4 h-4 ${isReportsOpen ? 'text-cyan-500' : 'text-gray-400'}`} />
                                {item.label}
                              </div>
                              {isReportsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {/* Submenu Accordion */}
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isReportsOpen ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}>
                              <div className="bg-gray-50/50 mx-2 my-1 rounded-lg border border-gray-100/50">
                                {item.children.map((subItem) => (
                                  <button
                                    key={subItem.label}
                                    onClick={() => {
                                      setIsMenuOpen(false);
                                      setIsReportsOpen(false);
                                      navigate(subItem.path);
                                    }}
                                    className="w-full text-left pl-11 pr-4 py-2.5 text-xs text-gray-500 hover:text-cyan-600 hover:bg-white flex items-center gap-2 transition-all first:rounded-t-lg last:rounded-b-lg"
                                  >
                                    <subItem.icon className="w-3 h-3" />
                                    {subItem.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Standard Item
                          <button
                            onClick={() => {
                              setIsMenuOpen(false);
                              navigate(item.path);
                            }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-3 transition-all font-medium rounded-xl"
                          >
                            <item.icon className="w-4 h-4 text-gray-400 group-hover:text-cyan-500" />
                            {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-gray-100 pt-2 pb-2 px-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center gap-3 transition-colors font-medium rounded-xl"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* PROFILE BUTTON */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full transition-all duration-200 hover:bg-gray-100 text-gray-600 hover:text-gray-900"
            >
              <div className="w-9 h-9 rounded-full bg-[#29b6f6] flex items-center justify-center overflow-hidden shrink-0 border-2 border-white shadow-sm">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      const fb = e.currentTarget.nextElementSibling;
                      if (fb) (fb as HTMLElement).style.display = 'flex';
                    }}
                  />
                ) : null}
                <span
                  className="text-white font-bold text-sm"
                  style={{ display: user?.avatar ? 'none' : 'flex' }}
                >
                  {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-sm font-semibold text-gray-900 truncate max-w-[120px]">
                {user?.name || user?.username || 'User'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}