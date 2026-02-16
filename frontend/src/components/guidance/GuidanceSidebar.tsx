import { LayoutDashboard, ClipboardCheck, LogOut, Home, FileSearch, Search } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function GuidanceSidebar() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="w-64 bg-emerald-900 min-h-screen text-white flex flex-col flex-shrink-0">
      <div className="p-6 flex flex-col items-center border-b border-emerald-800">
        <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center mb-3 shadow-lg">
          <Home className="w-10 h-10 text-emerald-900" />
        </div>
        <h2 className="text-sm font-bold text-center tracking-wide">GUIDANCE OFFICE</h2>
        <p className="text-xs text-emerald-300">San Isidro NHS</p>
      </div>

      <nav className="flex-1 py-6 space-y-1">
        <NavLink
          to="/guidance/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-4 transition-colors ${
              isActive ? 'bg-emerald-800 border-l-4 border-white' : 'hover:bg-emerald-800/50'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </NavLink>

        <NavLink
          to="/guidance/claims"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-4 transition-colors ${
              isActive ? 'bg-emerald-800 border-l-4 border-white' : 'hover:bg-emerald-800/50'
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="font-medium">Review Claims</span>
        </NavLink>

        <NavLink
          to="/report-lost"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-4 transition-colors ${
              isActive ? 'bg-emerald-800 border-l-4 border-white' : 'hover:bg-emerald-800/50'
            }`
          }
        >
          <FileSearch className="w-5 h-5" />
          <span className="font-medium">Report Lost</span>
        </NavLink>

        <NavLink
          to="/report-found"
          className={({ isActive }) =>
            `flex items-center gap-3 px-6 py-4 transition-colors ${
              isActive ? 'bg-emerald-800 border-l-4 border-white' : 'hover:bg-emerald-800/50'
            }`
          }
        >
          <Search className="w-5 h-5" />
          <span className="font-medium">Report Found</span>
        </NavLink>
      </nav>

      <div className="p-4 border-t border-emerald-800">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-emerald-100 hover:bg-emerald-800 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}
