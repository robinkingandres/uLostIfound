import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  MapPin,
  Tag,
  User as UserIcon,
  FileText,
  Clock,
  ChevronRight
} from 'lucide-react';
import { fetchReports } from '../../services/api';
import type { Report } from '../../types/report';
import ClaimModal from '../../components/ClaimModal';
import UserHeader from '../../components/UserHeader';
import Chatbot from '../../components/Chatbot';
import { useAuth } from '../../contexts/AuthContext';
import chatbotIcon from '../../assets/chatbot.png';

export default function UserHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data States
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
    
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // Modal States
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Chatbot States
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [hasChatNotification, setHasChatNotification] = useState(true);

  // Checks if the current user is the owner to adjust button states
  // Note: Adjust 'reporterUsername' to match your exact API response key if different (e.g., 'reporterId')
  const isReportOwner = (report: Report): boolean => {
    if (!user) return false;
    // Assuming report.reporterUsername matches user.username 
    // Or check IDs: return report.reporterId === user.id;
    return report.reporterUsername === user.username;
  };

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch verified reports:', err);
      setError('Failed to load items. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleClaimClick = (report: Report) => {
    setSelectedReport(report);
    setIsClaimModalOpen(true);
  };

  const handleOpenChatbot = () => {
    setIsChatbotOpen(true);
    setHasChatNotification(false);
  };

  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = statusFilter === 'All Status' || report.type === statusFilter;
    const matchesCategory = categoryFilter === 'All Categories' || report.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory;
  });
  
  const getTypeColor = (type: string) => {
    return type === 'Lost' ? 'bg-red-500' : 'bg-blue-500';
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
             <div className="text-center p-8">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                 <p className="text-gray-500 font-medium">Loading verified reports...</p>
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
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 relative">
      <UserHeader />

      <main className="max-w-md mx-auto md:max-w-6xl px-4 py-8 pb-24">
        
        {/* Header Section */}
        <div className="text-center mb-10">
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            San Isidro National High School <br />
            <span className="text-blue-600">Verified Lost & Found</span>
          </h1>
          <p className="text-slate-500 text-sm md:text-base mt-4">
            Welcome back, <span className="text-slate-900 font-bold">{user?.name || 'Student'}</span>!
          </p>
        </div>

        {/* Mobile Action Buttons (Visible only on small screens) */}
        <div className="flex sm:hidden items-center justify-center gap-8 mb-10 px-2">
          <button onClick={() => navigate('/report-lost')} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm border border-red-100 active:scale-95 transition-all">
              <FileText className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Report Lost</span>
          </button>

          <button onClick={() => navigate('/report-found')} className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100 active:scale-95 transition-all">
              <Search className="w-8 h-8" />
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Report Found</span>
          </button>
        </div>
               
        {/* Search and Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-10 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="What are you looking for?"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border-none rounded-xl text-sm text-slate-700 appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
              >
                <option>All Status</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
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
                <option>Electronics</option>
                <option>Documents</option>
                <option>Clothing</option>
                <option>Accessories</option>
              </select>
              <Tag className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredReports.map((report) => {
            const isOwner = isReportOwner(report);

            return (
              <div
                key={report.id}
                className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col relative overflow-hidden"
              >
                {/* Image Section */}
                <div className="relative h-56 w-full bg-slate-200 overflow-hidden">
                  <img 
                    src={report.image} 
                    alt={report.itemName} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white shadow-lg ${getTypeColor(report.type)}`}>
                    {report.type}
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="text-xl font-bold text-slate-900 leading-tight mb-1">{report.itemName}</h3>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{report.date}</span>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium line-clamp-1">{report.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center">
                        <Tag className="w-4 h-4 text-slate-400" />
                      </div>
                      <span className="font-medium">{report.category}</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-auto pt-5 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 border border-blue-100">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-tight line-clamp-1 max-w-[100px]">
                        {report.reporterName || report.reporterUsername || report.reporter || 'User'}
                      </span>
                    </div>

                    {!isOwner && report.type === 'Found' ? (
                      <button
                        onClick={() => handleClaimClick(report)}
                        className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100 active:scale-95"
                      >
                        Claim
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg">
                        {isOwner ? 'Your Report' : (report.type === 'Lost' ? 'Seeking' : 'Verified')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredReports.length === 0 && (
            <div className="col-span-full text-center py-12">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-slate-500">No items found matching your filters.</p>
            </div>
          )}
        </div>
      </main>

      {/* Floating Chatbot - Logo Only Version */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={handleOpenChatbot}
          className="relative group transition-transform duration-300 hover:scale-110 active:scale-95 outline-none"
        >
          {/* Logo Image */}
          <img
            src={chatbotIcon}
            alt="Chatbot"
            className="w-16 h-16 sm:w-20 sm:h-20 object-contain drop-shadow-md"
          />

          {/* Notification Dot */}
          {hasChatNotification && (
            <div className="absolute top-1 right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white"></span>
            </div>
          )}
        </button>
      </div>

      {/* Chatbot Component with Reports Data Passed */}
      <Chatbot
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        reports={reports} 
      />

      {selectedReport && (
        <ClaimModal
          isOpen={isClaimModalOpen}
          onClose={() => setIsClaimModalOpen(false)}
          reportId={selectedReport.id}
          itemName={selectedReport.itemName}
        />
      )}
    </div>
  );
}