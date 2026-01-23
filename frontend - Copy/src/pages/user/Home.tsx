import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  MapPin, 
  Tag, 
  User as UserIcon
} from 'lucide-react';
import { fetchReports } from '../../services/api';
import type { Report } from '../../types/report';
import ClaimModal from '../../components/ClaimModal'; 
import UserHeader from '../../components/UserHeader';
import { useAuth } from '../../contexts/AuthContext';
import chatbotIcon from '../../assets/chatbot.png'; // Chatbot Logo

export default function UserHome() {
  const navigate = useNavigate(); 
  const { user } = useAuth(); // Get current user to check ownership
  
  // State: Loading, Error, and Live Reports
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
    
  // State: Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status'); 
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // State: Claim Modal
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  // Fetch logic
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

  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = statusFilter === 'All Status' || report.type === statusFilter;
    const matchesCategory = categoryFilter === 'All Categories' || report.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory; 
  });
  
  const getTypeColor = (type: string) => {
    return type === 'Lost' ? 'bg-[#f06565]' : 'bg-[#3b82f6]';
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white font-sans">
             <div className="text-center p-8">
                 <div className="animate-spin rounded-full h-10 w-10 border-4 border-t-4 border-blue-500 border-opacity-50 mx-auto mb-4"></div>
                 <p className="text-gray-600">Loading verified reports...</p>
             </div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-white font-sans">
            <div className="text-center p-8 border border-red-300 bg-red-50 rounded-lg max-w-md">
                <h1 className="text-xl font-bold text-red-700 mb-2">Error Loading Items</h1>
                <p className="text-red-600">{error}</p>
                <button 
                  onClick={loadReports} 
                  className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Try Again
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-gray-800 relative">
      
      {/* --- NEW HEADER IMPLEMENTATION --- */}
      <UserHeader />

      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-5xl px-4 py-6 pb-24">
        
        <div className="text-center mb-8">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-tight">
            San Isidro National High School <br />
            <span className="text-gray-900">Verified Lost & Found Items</span> 
          </h1>
          <p className="text-gray-500 text-sm mt-3">
            Browse through verified reports from the community
          </p>
        </div>

        {/* --- FILTERS SECTION --- */}
        <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-4 mb-8 space-y-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search Items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option>All Status</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
          </div>

          <div className="relative">
             <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 appearance-none focus:outline-none focus:border-blue-400 cursor-pointer"
            >
              <option>All Categories</option>
              <option>Electronics</option>
              <option>Documents</option>
              <option>Clothing</option>
              <option>Accessories</option>
            </select>
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
             </div>
          </div>
        </div>

        {/* --- ITEMS LIST --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
              
              <div className="relative h-48 w-full bg-gray-100">
                <img 
                  src={report.image} 
                  alt={report.itemName} 
                  className="w-full h-full object-cover"
                />
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white
                  ${getTypeColor(report.type)}`}>
                  {report.type}
                </span>
              </div>

              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{report.itemName}</h3>
                <p className="text-xs text-gray-400 mb-3">{report.date}</p>
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {report.description}
                </p>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{report.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>{report.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{report.reporter || report.reporter}</span>
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-gray-100">
                  {report.type === 'Found' ? (
                    // Prevent claiming own reports
                    (user && Number(report.reporter) === user.id) ? (
                        <button 
                          disabled
                          className="w-full py-2.5 bg-gray-100 text-gray-500 rounded-lg text-sm font-medium cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          Reported by You
                        </button>
                    ) : (
                        <button 
                          onClick={() => handleClaimClick(report)}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm flex items-center justify-center gap-2"
                        >
                          <img src="https://cdn-icons-png.flaticon.com/512/10697/10697240.png" className="w-4 h-4 invert brightness-0" alt="" />
                          Claim This Item
                        </button>
                    )
                  ) : (
                    <button className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-lg text-sm font-medium cursor-default">
                      Reported as Lost
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-10 text-gray-400 col-span-full">
              No verified items found matching your filters.
            </div>
          )}
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-50">
        <button 
          className="bg-transparent hover:scale-110 active:scale-95 transition-transform duration-200 shadow-none border-0 p-0 cursor-pointer focus:outline-none"
          aria-label="Open Support Chat"
        >
           <div className="w-16 h-16 relative">
             <img 
               src={chatbotIcon} // Swapped the URL for the imported local asset
               alt="Chatbot" 
               className="w-full h-full object-contain drop-shadow-xl"
             />
             {/* Notification Dot */}
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
           </div>
        </button>
      </div>

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