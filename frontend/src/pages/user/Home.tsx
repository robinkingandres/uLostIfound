import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  MapPin,
  Tag,
  Bot,
  CheckCheck,
  Clock,
  X
} from 'lucide-react';
import { fetchReports, fetchSiteSettings, type SiteSettings } from '../../services/api';
import type { Report } from '../../types/report';
import UserHeader from '../../components/UserHeader';
import Chatbot from '../../components/Chatbot';
import chatbotIcon from '../../assets/chatbot.png';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const CATEGORY_V2 = [
  'School Supplies',
  'Tech & Gadgets',
  'Books & Modules',
  'Daily Essentials',
  'Food & Clothes',
  'Others',
];

const LEGACY_CATEGORY_MAP: Record<string, string> = {
  electronics: 'Tech & Gadgets',
  phone: 'Tech & Gadgets',
  documents: 'Books & Modules',
  clothing: 'Food & Clothes',
  accessories: 'Food & Clothes',
  wallet: 'Food & Clothes',
  id: 'Food & Clothes',
  other: 'Others',
  others: 'Others',
  'school supplies (ballpen, paper, notebook)': 'School Supplies',
  'electronics & gadgets (laptop / tablet, scientific calculator, charger / power bank, flash drive)': 'Tech & Gadgets',
  'books & notebooks (textbooks, subject notebooks, printed modules, planner / journal)': 'Books & Modules',
  'personal care & hygiene (hand sanitizer, pocket tissue, lip balm, small umbrella)': 'Daily Essentials',
  'food & beverage (water bottle, lunchbox, snacks)': 'Food & Clothes',
  'clothing & accessories (school id, extra sweater or jacket, pe uniform / gym clothes)': 'Food & Clothes',
  'art & project materials (colored pencils or markers, glue stick, scissors, construction paper)': 'School Supplies',
  'school supplies(pens, notebooks, paper, markers, glue, and scissors)': 'School Supplies',
  'tech & gadgets(laptop, tablet, calculator, chargers, and flash drives)': 'Tech & Gadgets',
  'books & modules(textbooks, printed modules, and notebook)': 'Books & Modules',
  'daily essentials(id, umbrella, sanitizer, tissues, and alcohol)': 'Daily Essentials',
  'food & clothes(water bottle, snacks, jacket, and pe uniform)': 'Food & Clothes',
};

const normalizeCategory = (value: string) => {
  const trimmed = (value || '').trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  return LEGACY_CATEGORY_MAP[key] ?? trimmed;
};

interface PublicUpdateItem {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  read: boolean;
}

type FeedItem =
  | { kind: 'report'; report: Report }
  | { kind: 'match'; matchId: number; lost: Report; found: Report };

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
  const [showGuidanceToast, setShowGuidanceToast] = useState(false);
  const [showChatbotBubble, setShowChatbotBubble] = useState(true);
  const previousSnapshotRef = useRef<Map<number, string>>(new Map());
  const hasInitialSnapshotRef = useRef(false);

  // Chatbot States
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);

  const isApprovedMatch = useCallback((report: Report) => {
    if (report.matchStatus) return report.matchStatus === 'Approved';
    return report.publicStatus === 'Matched';
  }, []);

  const getStatusMeta = useCallback((report: Report) => {
    const isClaimed = report.status === 'Claimed' || report.publicStatus === 'Claimed';
    const isMatched = !isClaimed && (report.publicStatus === 'Matched' || (report.isMatched && isApprovedMatch(report)));

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
  }, [isApprovedMatch]);

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
    if (!showGuidanceToast) return;
    const timer = window.setTimeout(() => setShowGuidanceToast(false), 4000);
    return () => window.clearTimeout(timer);
  }, [showGuidanceToast]);

  useEffect(() => {
    if (!showChatbotBubble) return;
    const timer = window.setTimeout(() => setShowChatbotBubble(false), 6000);
    return () => window.clearTimeout(timer);
  }, [showChatbotBubble]);

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
    const hideClaimedFoundDuplicate =
      report.status === 'Claimed' &&
      report.type === 'Found' &&
      (report.isMatched || report.publicStatus === 'Matched');
    if (hideClaimedFoundDuplicate) return false;

    const statusMeta = getStatusMeta(report);
    const matchesSearch =
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType =
      statusFilter === 'All Status' ||
      (statusFilter === 'Matched' && statusMeta.isMatched) ||
      (statusFilter === 'Claimed' && report.status === 'Claimed') ||
      (statusFilter === 'Lost' && statusMeta.itemType === 'Lost' && !statusMeta.isMatched && statusMeta.badgeLabel !== 'Claimed') ||
      (statusFilter === 'Found' && statusMeta.itemType === 'Found' && !statusMeta.isMatched && statusMeta.badgeLabel !== 'Claimed');
    const matchesCategory =
      categoryFilter === 'All Categories' ||
      normalizeCategory(report.category) === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });

  const toFeedItems = (items: Report[]): FeedItem[] => {
    const seenMatches = new Set<number>();
    const results: FeedItem[] = [];
    items.forEach((report) => {
      if (report.matchId && report.matchedReport && isApprovedMatch(report)) {
        if (seenMatches.has(report.matchId)) return;
        const counterpart: Report = {
          ...report,
          id: report.matchedReport.id,
          type: report.matchedReport.type,
          itemName: report.matchedReport.itemName,
          category: report.matchedReport.category,
          image: report.matchedReport.image || '',
          reporterName: report.matchedReport.reporterName,
          reporterAvatar: report.matchedReport.reporterAvatar || null,
          personName: report.matchedReport.personName || '',
          grade: report.matchedReport.grade || '',
          section: report.matchedReport.section || '',
        };
        const found = report.type === 'Found' ? report : counterpart;
        const lost = report.type === 'Lost' ? report : counterpart;
        seenMatches.add(report.matchId);
        results.push({ kind: 'match', matchId: report.matchId, lost, found });
      } else {
        results.push({ kind: 'report', report });
      }
    });
    return results;
  };

  const feedItems = toFeedItems(filteredReports);

  const categoryOptions = CATEGORY_V2;
  
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
    const personName = normalizeText(report.personName).trim();
    if (personName) return personName;
    if (report.reporterRole === 'Guidance') return 'GUIDANCE';
    const fallback =
      report.reporterName ||
      report.reporterUsername ||
      report.reporter ||
      'User';
    return normalizeText(fallback);
  };
  const getReporterInitial = (report: Report) => {
    const name = getDisplayReporterName(report).trim();
    if (!name) return 'U';
    const first = name[0].toUpperCase();
    return /[A-Z]/.test(first) ? first : 'U';
  };

  const normalizeText = (value: unknown) => {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
  };

  const getGradeSectionLabel = (report: Report) => {
    const rawGrade =
      (report.grade as string | undefined) ??
      (report as { person_grade?: string }).person_grade ??
      (report as { personGrade?: string }).personGrade ??
      '';
    const rawSection =
      (report.section as string | undefined) ??
      (report as { person_section?: string }).person_section ??
      (report as { personSection?: string }).personSection ??
      '';
    const grade = normalizeText(rawGrade).trim();
    const section = normalizeText(rawSection).trim();
    if (!grade && !section) return '';
    if (grade && section) return `Grade ${grade} - ${section}`;
    if (grade) return `Grade ${grade}`;
    return `Section ${section}`;
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
            <span className="text-blue-600 text-[1.05em]">Lost and Found Managing System</span>
          </h1>
          <p className={`text-xs sm:text-sm md:text-base mt-2 sm:mt-4 ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
            Public view: browse posted lost and found items
          </p>
          <p className={`text-[11px] sm:text-xs mt-1.5 sm:mt-2 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
            For reporting or claiming of items, please proceed directly to the{' '}
            <button
              type="button"
              onClick={() => setShowGuidanceToast(true)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold transition-colors ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Guidance Office
            </button>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 lg:block lg:columns-2 lg:gap-8">
          {feedItems.map((item) => {
            if (item.kind === 'match') {
              const { lost, found, matchId } = item;
              const ownerName = getDisplayReporterName(lost);
              const finderName = getDisplayReporterName(found);
              const ownerLabel = getGradeSectionLabel(lost);
              const finderLabel = getGradeSectionLabel(found);
              return (
                <div
                  key={`match-${matchId}`}
                  className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden lg:inline-block lg:w-full lg:break-inside-avoid lg:mb-8 lg:[column-span:all] ${
                    isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                  }`}
                >
                  <div className={`relative h-52 sm:h-64 w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                    <div className="grid grid-cols-2 h-full">
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: lost.image, alt: lost.itemName })}
                        className="relative w-full h-full"
                        aria-label="View lost item image"
                      >
                        {lost.image ? (
                          <img
                            src={lost.image}
                            alt={lost.itemName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No Image
                          </div>
                        )}
                        <div className="absolute bottom-5 left-2 z-20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white bg-rose-500/95 shadow-md ring-2 ring-white/70">
                          Lost
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewImage({ src: found.image, alt: found.itemName })}
                        className="relative w-full h-full"
                        aria-label="View found item image"
                      >
                        {found.image ? (
                          <img
                            src={found.image}
                            alt={found.itemName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            No Image
                          </div>
                        )}
                        <div className="absolute bottom-5 right-2 z-20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest text-white bg-cyan-500/95 shadow-md ring-2 ring-white/70">
                          Found
                        </div>
                      </button>
                    </div>
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg bg-indigo-500">
                      MATCHED
                    </div>
                  </div>

                  <div className="p-4 sm:p-6 flex-1 flex flex-col">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase font-bold tracking-widest text-indigo-600 mb-2">
                      Matched
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-6 mb-4">
                      <h3 className={`text-lg sm:text-2xl font-extrabold leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {lost.itemName} ↔ {found.itemName}
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                      <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Owner (Lost)</p>
                        </div>
                        <p className={`mt-2 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{lost.itemName}</p>
                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lost.location}</p>
                        <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{lost.date}</span>
                        </div>
                      </div>
                      <div className={`rounded-2xl border p-4 ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-100 bg-slate-50'}`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-[11px] uppercase font-bold tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Finder (Found)</p>
                        </div>
                        <p className={`mt-2 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>{found.itemName}</p>
                        <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{found.location}</p>
                        <div className={`mt-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          <Clock className="w-3.5 h-3.5" />
                          <span>{found.date}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`mt-auto pt-4 sm:pt-5 border-t ${isDark ? 'border-slate-800' : 'border-slate-50'}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-500 border overflow-hidden shrink-0 ${isDark ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                          {found.reporterAvatar ? (
                            <img
                              src={found.reporterAvatar.startsWith('http') ? found.reporterAvatar : `${API_BASE}${found.reporterAvatar}`}
                              alt="Finder"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                              <span className="text-xs font-bold text-blue-600">{getReporterInitial(found)}</span>
                          )}
                        </div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold uppercase tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{finderName}</div>
                            {finderLabel && (
                              <div className={`text-[10px] font-semibold tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{finderLabel}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 text-indigo-500">
                          <CheckCheck className="w-5 h-5" />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Success</span>
                        </div>
                        <div className="flex items-center gap-2 min-w-0 justify-end">
                          <div className="min-w-0 text-right">
                            <div className={`text-xs font-bold uppercase tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>{ownerName}</div>
                            {ownerLabel && (
                              <div className={`text-[10px] font-semibold tracking-tight ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{ownerLabel}</div>
                            )}
                          </div>
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-500 border overflow-hidden shrink-0 ${isDark ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                            {lost.reporterAvatar ? (
                              <img
                                src={lost.reporterAvatar.startsWith('http') ? lost.reporterAvatar : `${API_BASE}${lost.reporterAvatar}`}
                                alt="Owner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs font-bold text-blue-600">{getReporterInitial(lost)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            const report = item.report;
            return (
              <div
                key={report.id}
                className={`group rounded-3xl border shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden lg:inline-block lg:w-full lg:break-inside-avoid lg:mb-8 ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
                }`}
              >
                {/* Image Section */}
                <div className={`relative h-44 sm:h-56 w-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                  {report.image ? (
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
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      No Image
                    </div>
                  )}
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
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-blue-500 border overflow-hidden shrink-0 ${isDark ? 'bg-blue-950/30 border-blue-800' : 'bg-blue-50 border-blue-100'}`}>
                        {report.reporterAvatar ? (
                          <img 
                            src={report.reporterAvatar.startsWith('http') ? report.reporterAvatar : `${API_BASE}${report.reporterAvatar}`} 
                            alt="Reporter" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs font-bold text-blue-600">{getReporterInitial(report)}</span>
                        )}
                      </div>
                    <div className="min-w-0 flex flex-col">
                      <div className={`text-xs font-bold uppercase tracking-tight break-words whitespace-normal leading-snug ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {getDisplayReporterName(report)}
                      </div>
                      {getGradeSectionLabel(report) && (
                        <div className={`mt-1 text-[10px] font-semibold tracking-tight break-words whitespace-normal leading-snug ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {getGradeSectionLabel(report)}
                        </div>
                      )}
                    </div>
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
            <div className="relative">
              {showChatbotBubble && (
                <div className={`chatbot-bubble absolute bottom-full right-0 mb-3 w-56 sm:w-60 px-4 py-2.5 rounded-2xl rounded-br-md shadow-xl text-[11px] sm:text-xs font-semibold ${isDark ? 'bg-indigo-950/90 text-indigo-50 border border-indigo-800' : 'bg-indigo-50 text-indigo-700 border border-indigo-200'}`}>
                  <span
                    className={`absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-r border-b ${isDark ? 'bg-indigo-950/90 border-indigo-800' : 'bg-indigo-50 border-indigo-200'}`}
                  />
                  <div className="flex items-start gap-2">
                    <div className={`mt-0.5 h-7 w-7 rounded-xl flex items-center justify-center border ${isDark ? 'bg-indigo-900 border-indigo-700 text-indigo-100' : 'bg-indigo-100 border-indigo-200 text-indigo-600'}`}>
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] uppercase tracking-widest font-bold text-indigo-500">uLost AI</div>
                      <div className="text-[11px] sm:text-xs leading-snug">Need help? Tap here.</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChatbotBubble(false)}
                      className={`rounded-full p-1 transition-colors ${isDark ? 'hover:bg-indigo-900' : 'hover:bg-indigo-100'}`}
                      aria-label="Dismiss"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
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

      {showGuidanceToast && (
        <div className="fixed bottom-24 left-1/2 z-[70] w-[92%] max-w-lg -translate-x-1/2">
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl text-xs sm:text-sm font-medium ${isDark ? 'bg-slate-900/95 border-slate-700 text-slate-100' : 'bg-white/95 border-slate-200 text-slate-700'} backdrop-blur`}>
            <div className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-full ${isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-600'}`}>
              <MapPin className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-widest font-bold text-blue-500">Guidance Office</div>
              <div className="mt-0.5 text-[12px] sm:text-sm">
                Located at ACG Building, Ground Floor, beside the Principal&apos;s Office.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuidanceToast(false)}
              className={`ml-auto rounded-full p-1.5 transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100'}`}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <style>{`
        .chatbot-bubble {
          animation: chatbot-bubble-float 2.6s ease-in-out infinite;
        }
        @keyframes chatbot-bubble-float {
          0%, 100% { transform: translateY(0); opacity: 0.95; }
          50% { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}





