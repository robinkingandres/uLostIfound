import { LayoutDashboard, FileText, Users, ShoppingCart, Sparkles, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import logo from '../../assets/logo.png';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: FileText, label: 'Manage Reports', path: '/admin/reports' },
  { icon: Users, label: 'User Management', path: '/admin/users' },
  { icon: ShoppingCart, label: 'Claim management', path: '/admin/claims' },
  { icon: Sparkles, label: 'Ai Matches', path: '/admin/ai-matches' },
  { icon: BarChart3, label: 'Lost & Found Analytics', path: '/admin/analytics-dashboard' },
];

export default function Sidebar() {
  return (
    <div className="w-60 bg-indigo-900 h-screen sticky top-0 text-white flex flex-col overflow-y-auto">
      <div className="p-6 flex flex-col items-center border-b border-indigo-800">
        
        {/* ANIMATED LOGO SECTION */}
        <div className="relative w-24 h-24 flex items-center justify-center mb-3">
          <div
            className="absolute inset-0 rounded-full animate-spin"
            style={{
              animationDuration: '8s',
              padding: "3px",
              background: "conic-gradient(#6366f1, #f6a51f, #6366f1)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          ></div>
          <img 
            src={logo} 
            alt="San Isidro National High School Logo"
            className="w-20 h-20 rounded-full object-cover relative z-10 bg-white p-1"
          />
        </div>
        
        <h2 className="text-sm font-medium text-center leading-tight">San Isidro National High School</h2>
      </div>

      <nav className="flex-1 py-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-white transition-colors ${
                  isActive ? 'bg-indigo-800 border-l-4 border-white' : 'hover:bg-indigo-800'
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
