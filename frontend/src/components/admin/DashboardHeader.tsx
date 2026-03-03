import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const ROUTE_HEADERS: Record<string, { title: string; subtitle: string }> = {
  "/admin/dashboard": { title: "Dashboard", subtitle: "Welcome back! Here's what's happening today." },
  "/admin/users": { title: "User Management", subtitle: "View and manage all the system users" },
  "/admin/reports": { title: "Manage Reports", subtitle: "Review and manage lost and found reports" },
  "/admin/claims": { title: "Claim Management", subtitle: "Review and process item claims" },
  "/admin/ai-matches": { title: "AI Matches", subtitle: "Review AI-suggested matches between lost and found items" },
  "/admin/analytics": { title: "Lost & Found Analytics", subtitle: "Single-page interactive dashboard with trends, heatmaps, and anomalies" },
  "/admin/lost-found-dashboard": { title: "Lost & Found Analytics", subtitle: "Single-page interactive dashboard with trends, heatmaps, and anomalies" },
  "/admin/account-settings": { title: "Account Settings", subtitle: "Manage your account and security" },
  "/guidance/dashboard": { title: "Dashboard", subtitle: "Welcome back! Here's what's happening today." },
  "/guidance/claims": { title: "Review Claims", subtitle: "" },
  "/guidance/ai-matches": { title: "AI Matches", subtitle: "Review AI-suggested matches between lost and found items" },
  "/guidance/settings": { title: "Account Settings", subtitle: "Manage your guidance account details and security" },
  "/report-lost": { title: "Report Lost", subtitle: "Submit details for a lost item" },
  "/report-found": { title: "Report Found", subtitle: "Submit details for a found item" },
};

function getRouteHeader(pathname: string): { title: string; subtitle: string } {
  if (ROUTE_HEADERS[pathname]) return ROUTE_HEADERS[pathname];
  const segment = pathname.split("/").filter(Boolean).pop() || "Dashboard";
  const title = segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { title, subtitle: "" };
}

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { title, subtitle } = useMemo(() => getRouteHeader(location.pathname), [location.pathname]);
  const roleKey = (user?.role || (location.pathname.startsWith('/guidance') ? 'Guidance' : location.pathname.startsWith('/admin') ? 'Admin' : 'User')).toLowerCase();
  const roleLabel = roleKey.charAt(0).toUpperCase() + roleKey.slice(1);
  const avatarAccentClass = roleKey === 'guidance' ? 'bg-emerald-700 border-emerald-600' : roleKey === 'admin' ? 'bg-blue-700 border-blue-600' : 'bg-slate-700 border-slate-600';
  const roleTextClass = roleKey === 'guidance' ? 'text-emerald-600' : roleKey === 'admin' ? 'text-blue-600' : 'text-slate-600';
  const menuLinkClass = roleKey === 'guidance' ? 'hover:bg-emerald-50 hover:text-emerald-700' : roleKey === 'admin' ? 'hover:bg-blue-50 hover:text-blue-700' : 'hover:bg-slate-50 hover:text-slate-700';
  const accountSettingsPath = roleKey === 'guidance' ? '/guidance/settings' : '/admin/account-settings';
  const avatarSrc = user?.avatar ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:8000${user.avatar}`) : null;

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    if (logout) await logout();
    navigate("/login");
  };

  const breadcrumbs = useMemo(() => {
    if (location.pathname.startsWith('/admin')) return ['Admin', title];
    if (location.pathname.startsWith('/guidance')) return ['Guidance', title];
    return [title];
  }, [location.pathname, title]);

  return (
    <div className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shrink-0">
      <div>
        <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-1">
          {breadcrumbs.map((b, i) => (
            <span key={b}>
              {i > 0 && <span className="mx-1.5">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : ''}>{b}</span>
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-gray-600 mt-1">{subtitle}</p> : null}
      </div>

      {/* PROFILE DROPDOWN (Back in the Header) */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border shadow-inner overflow-hidden ${avatarAccentClass}`}>
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-sm font-bold">
                {user?.name?.charAt(0).toUpperCase() || "R"}
              </span>
            )}
          </div>

          <div className="text-left hidden md:block">
            <p className="text-sm font-bold text-gray-900 leading-tight">
              {user?.name || "Robin"}
            </p>
            <p className={`text-[10px] font-bold uppercase tracking-tighter ${roleTextClass}`}>
              {roleLabel}
            </p>
          </div>

          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <Link
              to={accountSettingsPath}
              onClick={() => setOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 transition-colors ${menuLinkClass}`}
            >
              <Settings className="w-4 h-4" />
              <span className="font-semibold">Account Settings</span>
            </Link>

            <div className="h-px bg-gray-100" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-semibold">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
