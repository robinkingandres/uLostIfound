import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Menu, Home, Search, FileText, Zap, User, LogOut, Check, ChevronDown, ChevronUp,
  Clock, Edit2, Trash2, MapPin, Loader2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  fetchNotifications, 
  markNotificationRead, 
  markAllNotificationsRead,
  fetchMyReports,
  deleteReport,
  type Notification 
} from '../services/api';
import type { Report } from '../types/report';
import EditReportModal from './EditReportModal';
import logoImg from '../assets/logo.png';

export default function UserHeader() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // Pending reports state
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const [activeTab, setActiveTab] = useState<'notifications' | 'pending'>('notifications');
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadNotifications = async () => {
    try {
        const data = await fetchNotifications();
        setNotifications(Array.isArray(data) ? data : []);
    } catch (error) {
        console.error("Error loading notifications", error);
        setNotifications([]); 
    }
  };

  const loadPendingReports = async () => {
    try {
      const myReports = await fetchMyReports();
      // Filter only Pending reports
      const pending = myReports.filter((r: Report) => r.status === 'Pending');
      setPendingReports(pending);
    } catch (error) {
      console.error("Error loading pending reports", error);
      setPendingReports([]);
    }
  };

  const handleEditPending = (report: Report) => {
    setEditingReport(report);
    setIsEditModalOpen(true);
  };

  const handleDeletePending = async (report: Report) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${report.itemName}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(report.id);
    try {
      await deleteReport(report.id);
      setPendingReports(prev => prev.filter(r => r.id !== report.id));
    } catch (err: any) {
      console.error('Failed to delete report:', err);
      alert(err.message || 'Failed to delete report.');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
      loadPendingReports();
      const interval = setInterval(() => {
        loadNotifications();
        loadPendingReports();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAsRead = async (id: number) => {
    try {
        setNotifications(prev => prev.map(n => n.id === id ? {...n, is_read: true} : n));
        await markNotificationRead(id);
    } catch (e) { console.error(e); }
  };

  const handleMarkAllRead = async () => {
      try {
          setNotifications(prev => prev.map(n => ({...n, is_read: true})));
          await markAllNotificationsRead();
      } catch (e) { console.error(e); }
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
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
        
          {/* LOGO AREA */}
          <div className="flex items-center gap-3 cursor-pointer group shrink-0" onClick={() => navigate('/home')}>
            <div className="relative w-12 h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <div className="absolute inset-0 rounded-full animate-spin-slow" style={{ padding: "3px", background: "conic-gradient(#0059ff95, #f6a51f, #0059ff95)", WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "exclude", maskComposite: "exclude" }}></div>
              <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm">
                <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
              </div>
            </div>
            <span className="font-bold text-lg text-black tracking-tight">
              <span className="hover:text-blue-600">uLost</span>
              <span className="hover:text-orange-500">iFound</span>
            </span>
          </div>

          {/* CENTER NAVIGATION */}
          <div className="hidden sm:flex items-center gap-2 flex-1 justify-center">
            <button onClick={() => navigate('/report-lost')} className="px-4 py-2 rounded-full text-gray-600 hover:text-cyan-600 hover:bg-cyan-50 font-medium text-sm transition-all whitespace-nowrap">Report Lost</button>
            <button onClick={() => navigate('/report-found')} className="px-4 py-2 rounded-full text-gray-600 hover:text-orange-600 hover:bg-orange-50 font-medium text-sm transition-all whitespace-nowrap">Report Found</button>
          </div>

          {/* RIGHT SIDE ACTIONS */}
          <div className="flex items-center gap-3 shrink-0">
            {/* NOTIFICATION BELL */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`p-2 rounded-full transition-all ${isNotifOpen ? 'bg-cyan-50 text-cyan-600' : 'text-gray-500 hover:bg-gray-100'}`}>
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border-2 border-white"></span>
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="fixed inset-x-4 top-20 md:absolute md:inset-auto md:right-0 md:top-full md:mt-4 md:w-[420px] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                  {/* Tab Header */}
                  <div className="flex border-b border-gray-100">
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'notifications'
                          ? 'text-cyan-600 border-b-2 border-cyan-500 bg-cyan-50/50'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => setActiveTab('pending')}
                      className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                        activeTab === 'pending'
                          ? 'text-orange-600 border-b-2 border-orange-500 bg-orange-50/50'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <Clock className="w-4 h-4" />
                        Pending Reports
                        {pendingReports.length > 0 && (
                          <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {pendingReports.length}
                          </span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Notifications Tab Content */}
                  {activeTab === 'notifications' && (
                    <>
                      {unreadCount > 0 && (
                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-end">
                          <button onClick={handleMarkAllRead} className="text-xs text-cyan-600 font-medium hover:underline flex items-center gap-1">
                            <Check className="w-3 h-3" /> Mark all read
                          </button>
                        </div>
                      )}
                      <div className="max-h-[50vh] md:max-h-[18rem] overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <Bell className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-xs">No notifications yet.</p>
                          </div>
                        ) : (
                          notifications.map((notif) => (
                            <div key={notif.id} onClick={() => { handleMarkAsRead(notif.id); setIsNotifOpen(false); }} className={`px-5 py-4 border-b border-gray-50 hover:bg-cyan-50/30 cursor-pointer transition-colors ${!notif.is_read ? 'bg-cyan-50/60' : ''}`}>
                              <p className={`text-sm ${!notif.is_read ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{notif.message}</p>
                              <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.created_at).toLocaleDateString()} • {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}

                  {/* Pending Reports Tab Content */}
                  {activeTab === 'pending' && (
                    <div className="max-h-[50vh] md:max-h-[20rem] overflow-y-auto">
                      {pendingReports.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                          <Clock className="w-8 h-8 mb-2 opacity-20" />
                          <p className="text-xs">No pending reports.</p>
                          <p className="text-[10px] mt-1">Your submitted reports will appear here for review.</p>
                        </div>
                      ) : (
                        <div className="p-3 space-y-3">
                          {pendingReports.map((report) => (
                            <div 
                              key={report.id} 
                              className={`bg-gray-50 rounded-xl p-4 border border-gray-100 transition-all ${deletingId === report.id ? 'opacity-40' : ''}`}
                            >
                              <div className="flex gap-3">
                                {/* Report Image Thumbnail */}
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                                  {report.image ? (
                                    <img src={report.image} alt={report.itemName} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                      <FileText className="w-6 h-6" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Report Info */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h4 className="font-bold text-sm text-gray-900 truncate">{report.itemName}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full text-white ${report.type === 'Lost' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                          {report.type}
                                        </span>
                                        <span className="text-[10px] font-medium text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                                          Pending Review
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-500">
                                    <MapPin className="w-3 h-3" />
                                    <span className="truncate">{report.location}</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                                <button
                                  onClick={() => handleEditPending(report)}
                                  disabled={deletingId === report.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeletePending(report)}
                                  disabled={deletingId === report.id}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                                >
                                  {deletingId === report.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3.5 h-3.5" />
                                  )}
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* USER PILL MENU */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className={`flex items-center gap-2 p-1 px-1.5 sm:pl-3 sm:pr-4 rounded-full border transition-all bg-white hover:shadow-md ${isMenuOpen ? 'border-cyan-500' : 'border-gray-200'}`}>
                <Menu className={`w-5 h-5 ${isMenuOpen ? 'text-cyan-600' : 'text-gray-500'}`} />
                <div className="w-8 h-8 rounded-full bg-[#29b6f6] flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                  {user?.avatar ? (
                    <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`} alt="" className="w-full h-full object-cover" />
                  ) : <span className="text-white font-bold text-xs">{user?.name ? user.name.charAt(0) : 'U'}</span>}
                </div>
                <span className="hidden sm:block text-sm font-semibold text-gray-700 truncate max-w-[100px]">
                  {user?.name ? user.name.split(' ')[0] : 'Account'}
                </span>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-4 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 py-2 z-50">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#29b6f6] flex items-center justify-center overflow-hidden shrink-0">
                        {user?.avatar ? (
                          <img src={user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`} alt="" className="w-full h-full object-cover" />
                        ) : <span className="text-white font-bold text-lg">{user?.name ? user.name.charAt(0) : 'U'}</span>}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-bold text-gray-900 truncate">{user?.name || 'Guest'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.role || 'User'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="py-2 px-2 space-y-1">
                    {menuItems.map((item) => (
                      <div key={item.label}>
                        {item.children ? (
                          <div className="rounded-xl overflow-hidden">
                            <button onClick={() => setIsReportsOpen(!isReportsOpen)} className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between transition-all font-medium rounded-xl ${isReportsOpen ? 'bg-cyan-50 text-cyan-700' : 'text-gray-600 hover:bg-gray-50'}`}>
                              <div className="flex items-center gap-3"><item.icon className="w-4 h-4" />{item.label}</div>
                              {isReportsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                            {isReportsOpen && (
                              <div className="bg-gray-50/50 mx-2 my-1 rounded-lg border border-gray-100/50">
                                {item.children.map((sub) => (
                                  <button key={sub.label} onClick={() => { setIsMenuOpen(false); navigate(sub.path); }} className="w-full text-left pl-11 pr-4 py-2.5 text-xs text-gray-500 hover:text-cyan-600 hover:bg-white flex items-center gap-2 transition-all">
                                    <sub.icon className="w-3 h-3" /> {sub.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => { setIsMenuOpen(false); navigate(item.path); }} className="w-full text-left px-4 py-3 text-sm text-gray-600 hover:bg-cyan-50 hover:text-cyan-700 flex items-center gap-3 transition-all font-medium rounded-xl">
                            <item.icon className="w-4 h-4" /> {item.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-gray-100 pt-2 pb-2 px-2">
                    <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors font-medium rounded-xl">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Report Modal for Pending Reports */}
      {editingReport && (
        <EditReportModal
          report={editingReport}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingReport(null);
          }}
          onSuccess={() => {
            loadPendingReports();
            setIsNotifOpen(false);
          }}
        />
      )}
    </header>
  );
}