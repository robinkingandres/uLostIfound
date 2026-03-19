import { LayoutDashboard, FileText, Users, ShoppingCart, Sparkles, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.png';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: FileText, label: 'Manage Reports', path: '/admin/reports' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: ShoppingCart, label: 'Claim management', path: '/admin/claims' },
  { icon: Sparkles, label: 'Ai Matches', path: '/admin/ai-matches' },
  { icon: BarChart3, label: 'Lost & Found Analytics', path: '/admin/analytics-dashboard' },
];

export default function Sidebar() {
  const { isDark } = useAdminTheme();

  return (
    <div className={`w-60 h-screen sticky top-0 flex flex-col overflow-y-auto ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-indigo-900 text-white'}`}>
      <div className={`p-8 flex flex-col items-center border-b ${isDark ? 'border-slate-800' : 'border-indigo-800'}`}>
        <div className="relative w-24 h-24 flex items-center justify-center mb-4">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              animationDuration: '8s',
              padding: "4px",
              background: "conic-gradient(#6366f1, #f6a51f, #6366f1)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          ></div>
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-2xl overflow-hidden p-3 z-10">
            <img src={logo} alt="San Isidro National High School Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        <div className="text-center">
          <h2 className={`text-xs font-black tracking-[0.2em] uppercase ${isDark ? 'text-slate-100' : 'text-white'}`}>Admin</h2>
          <p className={`text-[10px] font-bold mt-1 uppercase ${isDark ? 'text-slate-400' : 'text-indigo-200'}`}>San Isidro NHS</p>
        </div>
      </div>

      <nav className="flex-1 py-8 px-4 flex flex-col gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 ${
                  isDark ? 'text-slate-200' : 'text-white'
                } ${
                  isActive
                    ? isDark
                      ? 'bg-slate-900 border-l-4 border-slate-400'
                      : 'bg-indigo-800 border-l-4 border-white'
                    : isDark
                      ? 'hover:bg-slate-900/70 hover:translate-x-1'
                      : 'hover:bg-indigo-800 hover:translate-x-1'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
