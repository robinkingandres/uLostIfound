import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Tag, MapPin, Clock, User as UserIcon } from 'lucide-react';
import { fetchReports, fetchSiteSettings, type SiteSettings } from '../services/api';
import type { Report } from '../types/report';

export default function LandingFeed() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load items. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await fetchSiteSettings();
        setSiteSettings(settings);
      } catch (err) {
        console.error('Failed to load site settings:', err);
      }
    };
    loadSettings();
  }, []);

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());

    const reportType = (report.type || '').toString().trim().toLowerCase();
    const reportStatus = (report.status || '').toString().trim().toLowerCase();

    const matchesType =
      statusFilter === 'All Status' ||
      (statusFilter === 'Lost' && reportType === 'lost' && reportStatus !== 'matched') ||
      (statusFilter === 'Found' && reportType === 'found' && reportStatus !== 'claimed') ||
      (statusFilter === 'Matched' && reportStatus === 'matched') ||
      (statusFilter === 'Claimed' && reportStatus === 'claimed');
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

  const getBadge = (report: Report) => {
    const status = (report.status || '').toString().trim().toLowerCase();
    const type = (report.type || '').toString().trim().toLowerCase();
    if (status === 'matched') {
      return { label: 'Matched', color: 'bg-emerald-600' };
    }
    if (status === 'claimed') {
      return { label: 'Claimed', color: 'bg-green-700' };
    }
    return type === 'lost'
      ? { label: 'Lost', color: 'bg-red-500' }
      : { label: 'Found', color: 'bg-blue-500' };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8 max-w-md">
          <div className="text-red-500 mb-2 font-bold text-xl">Connection Error</div>
          <p className="text-gray-500 mb-6">{error}</p>
          <button onClick={loadReports} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
              {siteSettings?.org_name || 'San Isidro National High School'}
            </h1>
            <p className="text-sm text-slate-500">
              {siteSettings?.org_tagline || 'Verified Lost & Found'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
          >
            Staff Login
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search item name or description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-xl text-sm text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option>All Status</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
                <option value="Matched">Matched</option>
                <option value="Claimed">Claimed</option>
              </select>
              <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-xl text-sm text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option>All Categories</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredReports.map((report) => {
            const badge = getBadge(report);
            return (
            <article
              key={report.id}
              className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all overflow-hidden"
            >
              <div className="relative h-52 w-full bg-slate-200 overflow-hidden">
                <img src={report.image} alt={report.itemName} className="w-full h-full object-cover" />
                <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${badge.color}`}>
                  {badge.label}
                </div>
              </div>

              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{report.itemName}</h3>
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-4">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{report.date}</span>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{report.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-slate-400" />
                    <span>{report.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-slate-400" />
                    <span>{report.reporterName || report.reporterUsername || 'User'}</span>
                  </div>
                </div>
              </div>
            </article>
          );
          })}

          {filteredReports.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-slate-500">No items found matching your filters.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
