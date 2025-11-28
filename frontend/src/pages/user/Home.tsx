import { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Bell, 
  Menu, 
  MapPin, 
  Calendar, 
  Tag, 
  User as UserIcon,
  Bot
} from 'lucide-react';
// import { mockReports } from '../../data/mockReports'; // REMOVED MOCK DATA
import { fetchReports } from '../../services/api'; // IMPORT API
import type { Report } from '../../types/report';

export default function UserHome() {
  const navigate = useNavigate(); 
  
  // NEW STATE: Loading, Error, and Live Reports
  const [reports, setReports] = useState<Report[]>([]); // Initialize with empty array
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
    
  // Filter states (kept from original component)
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status'); // Filters report.type
  const [categoryFilter, setCategoryFilter] = useState('All Categories');

  // New fetch logic encapsulated in a callback
  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Calling fetchReports() with no parameters returns ALL Verified reports for public users (backend logic)
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch verified reports:', err);
      setError('Failed to load items. Please check the server connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to load data on mount
  useEffect(() => {
    loadReports();
  }, [loadReports]);


  // Filter Logic (Applied to the fetched 'reports' state)
  const filteredReports = reports.filter((report) => {
    const matchesSearch = 
      report.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter filters by report.type (Lost/Found)
    const matchesType = statusFilter === 'All Status' || report.type === statusFilter;
    
    // Category filter
    const matchesCategory = categoryFilter === 'All Categories' || report.category === categoryFilter;

    return matchesSearch && matchesType && matchesCategory; 
  });
  
  // Helper for Status Badge Color (kept from original)
  const getTypeColor = (type: string) => {
    return type === 'Lost' ? 'bg-[#f06565]' : 'bg-[#3b82f6]';
  };

  // --- Render Loading/Error States ---
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
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          
          {/* Logo Area */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-yellow-400">
              NHS
            </div>
          </div>

          {/* Navigation Actions (Desktop/Tablet) */}
          <div className="hidden md:flex items-center gap-6">
            <button 
              onClick={() => navigate('/report-lost')} 
              className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Report Lost
            </button>
            <button 
              onClick={() => navigate('/report-found')} 
              className="text-gray-600 hover:text-blue-600 font-medium text-sm transition-colors"
            >
              Report Found
            </button>
          </div>

          {/* Icons */}
          <div className="flex items-center gap-4">
            <button className="relative text-gray-600 hover:text-blue-600 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="text-gray-600 hover:text-blue-600 transition-colors">
              <Menu className="w-7 h-7" />
            </button>
          </div>
        </div>
      </header>


      {/* --- MAIN CONTENT --- */}
      <main className="max-w-md mx-auto md:max-w-5xl px-4 py-6 pb-24">
        
        {/* Title */}
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
          
          {/* Search Input */}
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

          {/* Type Select (labeled as Status, filters 'type') */}
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
              {/* Removed "Claimed" as the reports here are verified and this filter should ideally only filter by item TYPE, not status */}
            </select>
          </div>

          {/* Category Select */}
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
        <div className="space-y-6">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              
              {/* Image Section */}
              <div className="relative h-48 w-full bg-gray-100">
                {/* Note: Ensure the 'image' field contains a valid public URL from Django/Media folder */}
                <img 
                  src={report.image} 
                  alt={report.itemName} 
                  className="w-full h-full object-cover"
                />
                
                {/* Status Badge */}
                <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold text-white
                  ${getTypeColor(report.type)}`}>
                  {report.type}
                </span>
              </div>

              {/* Content Section */}
              <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-1">{report.itemName}</h3>
                
                {/* Date */}
                <p className="text-xs text-gray-400 mb-3">{report.date} • </p>

                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {report.description}
                </p>

                {/* Meta Details */}
                <div className="space-y-2 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{report.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{report.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span>{report.category}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-700">{report.reporter}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredReports.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              No verified items found matching your filters.
            </div>
          )}
        </div>
      </main>

      {/* --- FLOATING CHATBOT --- */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-transparent hover:scale-110 transition-transform duration-200 shadow-none border-0 p-0">
           <div className="w-16 h-16 relative">
             <img 
               src="https://cdn-icons-png.flaticon.com/512/4712/4712139.png" 
               alt="Chatbot" 
               className="w-full h-full object-contain drop-shadow-xl"
             />
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
           </div>
        </button>
      </div>

    </div>
  );
}