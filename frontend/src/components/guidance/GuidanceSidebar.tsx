import { LayoutDashboard, ClipboardCheck, Sparkles, FileSearch, Search } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logoImg from '../../assets/logo.png';

export default function GuidanceSidebar() {
  return (
    <div className="w-64 bg-emerald-900 min-h-screen text-white flex flex-col flex-shrink-0 shadow-2xl">
      {/* HEADER SECTION WITH ANIMATED LOGO */}
      <div className="p-8 flex flex-col items-center border-b border-emerald-800/50">
        <div className="relative w-24 h-24 flex items-center justify-center mb-4">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              animationDuration: '8s',
              padding: "4px",
              background: "conic-gradient(#0059ff95, #f6a51f, #0059ff95)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          ></div>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-3 z-10 border-4 border-emerald-900/10">
            <img src={logoImg} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-xs font-black tracking-[0.2em] text-emerald-100 uppercase">Guidance Office</h2>
          <p className="text-[10px] font-bold text-emerald-400/80 mt-1 uppercase">San Isidro NHS</p>
        </div>
      </div>

      {/* NAVIGATION SECTION */}
      <nav className="flex-1 py-8 px-4 space-y-2">
        <p className="px-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4">Main Menu</p>
        
        <NavLink
          to="/guidance/dashboard"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive ? 'bg-white text-emerald-900 shadow-lg font-bold' : 'text-emerald-100 hover:bg-emerald-800/60 hover:translate-x-1'
            }`
          }
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-sm">Dashboard</span>
        </NavLink>

        <NavLink
          to="/guidance/claims"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive ? 'bg-white text-emerald-900 shadow-lg font-bold' : 'text-emerald-100 hover:bg-emerald-800/60 hover:translate-x-1'
            }`
          }
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-sm">Review Claims</span>
        </NavLink>

        <NavLink
          to="/guidance/ai-matches"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive ? 'bg-white text-emerald-900 shadow-lg font-bold' : 'text-emerald-100 hover:bg-emerald-800/60 hover:translate-x-1'
            }`
          }
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm">AI Matches</span>
        </NavLink>

        <div className="pt-6 pb-2">
          <p className="px-4 text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-4">Quick Reports</p>
        </div>

        <NavLink
          to="/report-lost"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive ? 'bg-white text-emerald-900 shadow-lg font-bold' : 'text-emerald-100 hover:bg-emerald-800/60 hover:translate-x-1'
            }`
          }
        >
          <FileSearch className="w-5 h-5" />
          <span className="text-sm">Report Lost</span>
        </NavLink>

        <NavLink
          to="/report-found"
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
              isActive ? 'bg-white text-emerald-900 shadow-lg font-bold' : 'text-emerald-100 hover:bg-emerald-800/60 hover:translate-x-1'
            }`
          }
        >
          <Search className="w-5 h-5" />
          <span className="text-sm">Report Found</span>
        </NavLink>
      </nav>

      {/* FOOTER - Clean & Empty */}
      <div className="p-8 border-t border-emerald-800/30 opacity-20">
         <div className="h-1 w-full bg-emerald-100 rounded-full" />
      </div>
    </div>
  );
}
