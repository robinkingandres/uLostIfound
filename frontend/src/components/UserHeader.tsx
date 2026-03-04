import { Bell, CheckCheck, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logoImg from '../assets/logo.png';

interface PublicUpdateItem {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  read: boolean;
}

interface UserHeaderProps {
  publicView?: boolean;
  publicUpdates?: PublicUpdateItem[];
  publicUnreadCount?: number;
  onMarkPublicUpdatesRead?: () => void;
  onEnableBrowserAlerts?: () => void;
  browserAlertsEnabled?: boolean;
  isDark?: boolean;
  onToggleDarkMode?: () => void;
}

export default function UserHeader({
  publicView = false,
  publicUpdates = [],
  publicUnreadCount = 0,
  onMarkPublicUpdatesRead,
  onEnableBrowserAlerts,
  browserAlertsEnabled = false,
  isDark = false,
  onToggleDarkMode,
}: UserHeaderProps) {
  const navigate = useNavigate();
  const [publicUpdatesOpen, setPublicUpdatesOpen] = useState(false);

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b shadow-sm font-sans transition-all duration-300 ${isDark ? 'bg-[#071739] border-[#0f2a56] shadow-none' : 'bg-white/80 border-gray-200/50'}`}>
      <div className="max-w-6xl mx-auto px-0 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          <div
            className="flex items-center gap-3 cursor-pointer group ml-2 sm:ml-0"
            onClick={() => navigate('/home')}
          >
            <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
              <div
                className="absolute inset-0 rounded-full animate-spin-slow"
                style={{
                  padding: '3px',
                  background: 'conic-gradient(#0059ff95, #f6a51f, #0059ff95)',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                }}
              ></div>
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden flex items-center justify-center bg-white shadow-sm">
                <img src={logoImg} alt="uLostiFound Logo" className="w-full h-full object-contain" />
              </div>
            </div>

            <span className={`hidden sm:block font-bold text-lg tracking-tight transition-colors ${isDark ? 'text-white' : 'text-black'}`}>
              <span className={`${isDark ? 'text-white hover:text-blue-300' : 'hover:text-blue-600'} transition-colors duration-200 cursor-pointer`}>uLost</span>
              <span className={`${isDark ? 'text-white hover:text-orange-300' : 'hover:text-orange-500'} transition-colors duration-200 cursor-pointer`}>iFound</span>
            </span>
          </div>

          {publicView && (
            <div className="relative pr-2 sm:pr-0 flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleDarkMode}
                className={`relative p-2 sm:w-9 sm:h-9 rounded-full transition-colors inline-flex items-center justify-center ${
                  isDark
                    ? 'text-slate-100 bg-[#0f244a] hover:bg-[#173564] border border-[#1c3d72]'
                    : 'text-gray-600 sm:bg-gray-100 sm:hover:bg-gray-200'
                }`}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                title={isDark ? 'Light mode' : 'Dark mode'}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setPublicUpdatesOpen((prev) => !prev);
                  onMarkPublicUpdatesRead?.();
                }}
                className={`relative p-2 sm:w-9 sm:h-9 rounded-full transition-colors inline-flex items-center justify-center ${
                  isDark
                    ? 'text-slate-100 bg-[#0f244a] hover:bg-[#173564] border border-[#1c3d72]'
                    : 'text-gray-600 sm:bg-gray-100 sm:hover:bg-gray-200'
                }`}
                aria-label="Notification updates"
                title="Notification updates"
              >
                <Bell className="w-4 h-4" />
                {publicUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {publicUnreadCount > 9 ? '9+' : publicUnreadCount}
                  </span>
                )}
              </button>
              {publicUpdatesOpen && (
                <div className="absolute right-2 sm:right-0 top-full mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100/80 py-3 z-50 ring-1 ring-black/5">
                  <div className="px-4 pb-3 border-b border-gray-100 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-gray-900 truncate">Notification Updates</p>
                    {onEnableBrowserAlerts && (
                      <button
                        type="button"
                        onClick={onEnableBrowserAlerts}
                        className="text-[10px] font-semibold px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100"
                      >
                        {browserAlertsEnabled ? 'Alerts On' : 'Enable Alerts'}
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-auto px-2 pt-2">
                    {publicUpdates.length === 0 ? (
                      <p className="text-xs text-gray-500 px-2 py-4">No new updates yet.</p>
                    ) : (
                      <div className="space-y-1">
                        {publicUpdates.map((item) => (
                          <div key={item.id} className="rounded-xl px-3 py-2 hover:bg-gray-50">
                            <p className="text-xs font-bold text-gray-900">{item.title}</p>
                            <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{item.message}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{item.timeLabel}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="px-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={onMarkPublicUpdatesRead}
                      className="w-full inline-flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg py-2"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all as read
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
