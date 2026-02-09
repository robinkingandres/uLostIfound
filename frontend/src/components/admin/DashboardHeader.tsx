import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
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
  "/guidance/claims": { title: "Claim Review", subtitle: "Review and process claims" },
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

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // close on outside click + ESC
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

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    // If you have logout() in AuthContext, use it; otherwise just navigate to /login
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
              {i > 0 && <span className="mr-1.5">/</span>}
              <span className={i === breadcrumbs.length - 1 ? 'font-medium text-gray-900' : ''}>{b}</span>
            </span>
          ))}
        </nav>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle ? <p className="text-gray-600 mt-1">{subtitle}</p> : null}
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="w-8 h-8 bg-gray-800 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-semibold">
              {user?.username?.charAt(0).toUpperCase() || "L"}
            </span>
          </div>

          <div className="text-left">
            <p className="text-sm font-semibold text-gray-900">
              {user?.username || "Lewis Hamilton"}
            </p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>

          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-0 mt-2 w-60 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50"
          >
            <button
              role="menuitem"
              onClick={() => go("/admin/account-settings")}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-800 hover:bg-gray-50"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              Account Settings
            </button>

            {/* Add more items here later if you want */}

            <div className="h-px bg-gray-200" />

            <button
              role="menuitem"
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
