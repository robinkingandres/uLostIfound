import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Tag,
  User as UserIcon,
  Clock,
  X
} from 'lucide-react';
import { fetchReports, fetchSiteSettings, type SiteSettings } from '../../services/api';
import type { Report } from '../../types/report';
import UserHeader from '../../components/UserHeader';
import Chatbot from '../../components/Chatbot';
import chatbotIcon from '../../assets/chatbot.png';

interface PublicUpdateItem {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  read: boolean;
}

export default function UserHome() {
  // Data States
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
    
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null);
  const [publicUpdates, setPublicUpdates] = useState<PublicUpdateItem[]>([]);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = window.localStorage.getItem('public_home_dark_mode');
    if (saved !== null) return saved === '1';
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });
  const previousSnapshotRef = useRef<Map<number, string>>(new Map());
  const hasInitialSnapshotRef = useRef(false);

  // Chatbot States
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);

  const getStatusMeta = useCallback((report: Report) => {
    const isClaimed = report.status === 'Claimed' || report.publicStatus === 'Claimed';
    const isMatched = !isClaimed && (report.publicStatus === 'Matched' || !!report.isMatched);

    if (isClaimed) {
      return {
        isMatched: false,
        itemType: report.type,
        badgeLabel: 'Claimed',
      };
    }

    if (isMatched) {
      return {
        isMatched: true,
        itemType: report.type,
        badgeLabel: 'Matched',
      };
    }

    return {
      isMatched: false,
      itemType: report.type,
      badgeLabel: report.type,
    };
  }, []);

  const loadReports = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    setError('');
    try {
      const data = await fetchReports();
      setReports(data);

      const nextSnapshot = new Map<number, string>();
      const detectedUpdates: PublicUpdateItem[] = [];

      data.forEach((report) => {
        const statusKey = `${report.status}|${report.publicStatus || ''}|${report.isMatched ? '1' : '0'}`;
        nextSnapshot.set(report.id, statusKey);

        if (!hasInitialSnapshotRef.current) return;
        const prevStatus = previousSnapshotRef.current.get(report.id);
        if (!prevStatus) {
          detectedUpdates.push({
            id: `new-${report.id}-${Date.now()}`,
            title: 'New posted item',
            message: `${report.itemName} (${report.type}) was posted at ${report.location}.`,
            timeLabel: new Date().toLocaleString(),
            read: false,
          });
          return;
        }
        if (prevStatus !== statusKey) {
          const statusMeta = getStatusMeta(report);
          detectedUpdates.push({
            id: `update-${report.id}-${Date.now()}`,
            title: 'Post status updated',
            message: `${report.itemName} is now marked as ${statusMeta.badgeLabel}.`,
            timeLabel: new Date().toLocaleString(),
            read: false,
          });
        }
      });

      previousSnapshotRef.current = nextSnapshot;
      hasInitialSnapshotRef.current = true;

      if (detectedUpdates.length > 0) {
        setPublicUpdates((prev) => [...detectedUpdates, ...prev].slice(0, 25));
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          detectedUpdates.slice(0, 3).forEach((entry) => {
            new Notification(entry.title, { body: entry.message, tag: entry.id });
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch verified reports:', err);
      if (showLoader) setError('Failed to load items. Please check the server connection.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [getStatusMeta]);

  useEffect(() => {
    loadReports(true);
  }, [loadReports]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadReports(false);
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadReports]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserAlertsEnabled(Notification.permission === 'granted');
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('public_home_dark_mode', isDark ? '1' : '0');
    }
  }, [isDark]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSiteSettings();
        setSiteSettings(settings);
        setHasChatNotification(settings.user_home_chat_notification_dot);
      } catch (err) {
        console.error('Failed to load site settings:', err);
      }
    };
    loadSettings();
  }, []);

  const handleOpenChatbot = () => {
    setIsChatbotOpen(true);
    setHasChatNotification(false);
  };

  const handleMarkPublicUpdatesRead = () => {
    setPublicUpdates((prev) => prev.map((u) => ({ ...u, read: true })));
  };

  const handleEnableBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setBrowserAlertsEnabled(permission === 'granted');
  };

  const unreadPublicUpdates = publicUpdates.filter((u) => !u.read).length;

  const filteredReports = reports.filter((report) => {
    const statusMeta = getStatusMeta(report);
    const matchesSearch =
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType =
      statusFilter === 'All Status' ||
      (statusFilter === 'Matched' && statusMeta.isMatched) ||
      (statusFilter === 'Claimed' && report.status === 'Claimed') ||
      (statusFilter === 'Lost' && statusMeta.itemType === 'Lost' && statusMeta.badgeLabel !== 'Claimed') ||
      (statusFilter === 'Found' && statusMeta.itemType === 'Found' && statusMeta.badgeLabel !== 'Claimed');
    const matchesCategory = categoryFilter === 'All Categories' || report.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const categoryOptions = siteSettings?.categories?.map((c) => c.name) || [
    'Phone',
    'Wallet',
    'ID',
    'Electronics',
    'Documents',
    'Clothing',
    'Accessories',
    'Others',
  ];
  
  const getTopBadgeColor = (report: Report) => {
    const statusMeta = getStatusMeta(report);
    if (statusMeta.badgeLabel === 'Claimed') return 'bg-emerald-500';
    if (statusMeta.badgeLabel === 'Matched') return 'bg-indigo-500';
    return statusMeta.itemType === 'Lost' ? 'bg-rose-500' : 'bg-cyan-500';
  };

  const getPublicStatusBadge = (report: Report) => {
    const statusMeta = getStatusMeta(report);
    if (statusMeta.badgeLabel === 'Claimed') {
      return 'bg-emerald-100 text-emerald-700';
    }
    if (statusMeta.isMatched) {
      return 'bg-indigo-100 text-indigo-700';
    }
    if (statusMeta.badgeLabel === 'Lost') {
      return 'bg-rose-50 text-rose-700';
    }
    return 'bg-cyan-50 text-cyan-700';
  };

  const getDisplayReporterName = (report: Report) => {
    const personName = (report.personName || '').trim();
    if (personName) return personName;
    if (report.reporterRole === 'Guidance') return 'GUIDANCE';
    return report.reporterName || report.reporterUsername || report.reporter || 'User';
  };

  if (loading) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
             <div className="text-center p-8">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                 <p className={`font-medium ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>Loading verified reports...</p>
             </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
             <div className="text-center p-8 max-w-md">
                 <div className="text-red-500 mb-2 font-bold text-xl">Connection Error</div>
                 <p className={`mb-6 ${isDark ? 'text-slate-300' : 'text-gray-500'}`}>{error}</p>
                 <button onClick={() => loadReports(true)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                   Try Again
                 </button>
             </div>
        </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans relative transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-gray-800'}`}>
      <UserHeader
        publicView
        publicUpdates={publicUpdates}
        publicUnreadCount={unreadPublicUpdates}
        onMarkPublicUpdatesRead={handleMarkPublicUpdatesRead}
        onEnableBrowserAlerts={handleEnableBrowserAlerts}
        browserAlertsEnabled={browserAlertsEnabled}
        isDark={isDark}
        onToggleDarkMode={() => setIsDark((prev) => !prev)}
      />

      <main className="w-full max-w-none md:max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-24">
        {/* Header Section */}
        <div className="text-center mb-5 sm:mb-10">
          <h1 className={`text-xl sm:text-2xl md:text-4xl font-extrabold tracking-tight leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
            {(siteSettings?.org_name || 'San Isidro National High School')} <br />
            <span className="text-blue-600 text-[1.05em]">Lost and Found Tracking System</span>
          </h1>
          <p className={`text-xs sm:text-sm md:text-base mt-2 sm:mt-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            Public view: browse posted lost and found items.
          </p>
          <p className={`text-[11px] sm:text-xs mt-1.5 sm:mt-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            For reporting concerns, please proceed directly to the Guidance Office.
          </p>
        </div>
                
        {/* Search and Filters */}
        <div className={`rounded-2xl shadow-sm border p-3 sm:p-5 mb-6 sm:mb-10 space-y-3 sm:space-y-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="relative">
            <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`} />
            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-12 pr-4 py-3.5 border rounded-xl text-sm sm:text-base focus:ring-2 focus:ring-cyan-500 transition-all outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-400' : 'bg-white border-cyan-200 text-slate-800 shadow-sm'
              }`}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`w-full pl-4 pr-10 py-3.5 border rounded-xl text-sm appearance-none focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option>All Status</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
                <option value="Matched">Matched</option>
                <option value="Claimed">Claimed</option>
              </select>
              <Filter className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={`w-full pl-4 pr-10 py-3.5 border rounded-xl text-sm appearance-none focus:ring-2 focus:ring-cyan-500 outline-none cursor-pointer ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <option>All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <Tag className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
          {filteredReports.map((report) => {
            return (
              <div
                key={report.id}
                className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                {/* Image Section */}
                <div className={`relative h-44 sm:h-56 w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ src: report.image, alt: report.itemName })}
                    className="w-full h-full"
                    aria-label="View full image"
                  >
                    <img 
                      src={report.image} 
                      alt={report.itemName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  </button>
                  <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${getTopBadgeColor(report)}`}>
                    {getStatusMeta(report).badgeLabel}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-6 flex-1 flex flex-col">
                  <h3 className={`text-lg sm:text-xl font-extrabold leading-tight mb-1 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{report.itemName}</h3>
                  <div className={`flex items-center gap-2 text-xs mb-4 sm:mb-5 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{report.date}</span>
                  </div>

                  <div className="space-y-2.5 sm:space-y-3 mb-5 sm:mb-6">
                    <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <MapPin className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <span className="font-medium line-clamp-1 text-[13px] sm:text-sm">{report.location}</span>
                    </div>
                    <div className={`flex items-center gap-3 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                        <Tag className={`w-4 h-4 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                      </div>
                      <span className="font-medium text-[13px] sm:text-sm">{report.category}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className={`mt-auto pt-4 sm:pt-5 border-t flex items-center justify-between ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                    <div className="flex items-center gap-2">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-500 border overflow-hidden shrink-0 ${isDark ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                        {report.reporterAvatar ? (
                          <img 
                            src={report.reporterAvatar.startsWith('http') ? report.reporterAvatar : `http://localhost:8000${report.reporterAvatar}`} 
                            alt="Reporter" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-xs font-bold uppercase tracking-tight line-clamp-1 max-w-[120px] ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {getDisplayReporterName(report)}
                      </span>
                    </div>

                    <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border border-transparent ${getPublicStatusBadge(report)}`}>
                      {getStatusMeta(report).badgeLabel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredReports.length === 0 && (
            <div className="col-span-full text-center py-12">
               <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
                  <Search className={`w-8 h-8 ${isDark ? 'text-slate-500' : 'text-slate-300'}`} />
               </div>
               <p className={isDark ? 'text-slate-300' : 'text-slate-500'}>No items found matching your filters.</p>
            </div>
          )}
        </div>
      </main>

      {siteSettings?.user_home_chatbot_visible !== false && (
        <>
          {/* Floating Chatbot */}
          <div className="fixed bottom-6 right-6 z-50">
            <button
              onClick={handleOpenChatbot}
              className="relative group transition-transform duration-300 hover:scale-110 active:scale-95 outline-none"
            >
              <img
                src={chatbotIcon}
                alt="Chatbot"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
              />
              {hasChatNotification && siteSettings?.user_home_chat_notification_dot !== false && (
                <div className="absolute top-1 right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
                </div>
              )}
            </button>
          </div>

          <Chatbot
            isOpen={isChatbotOpen}
            onClose={() => setIsChatbotOpen(false)}
            reports={reports}
          />
        </>
      )}

      {previewImage && (
        <div
          className={`fixed inset-0 z-[70] p-3 sm:p-6 flex items-center justify-center ${isDark ? 'bg-black/85' : 'bg-black/80'}`}
          onClick={() => setPreviewImage(null)}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-black/60 hover:bg-black/75 text-white rounded-full p-2"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <img
            src={previewImage.src}
            alt={previewImage.alt}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}





