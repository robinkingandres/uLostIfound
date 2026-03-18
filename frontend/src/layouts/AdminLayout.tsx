import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';
import DashboardHeader from '../components/admin/DashboardHeader';
import { AdminThemeProvider, useAdminTheme } from '../contexts/AdminThemeContext';

export default function AdminLayout() {
  return (
    <AdminThemeProvider>
      <AdminLayoutContent />
    </AdminThemeProvider>
  );
}

function AdminLayoutContent() {
  const { isDark } = useAdminTheme();

  return (
    <div className={`flex h-screen overflow-hidden ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-white text-gray-900'}`}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="sticky top-0 z-40">
          <DashboardHeader />
        </div>
        <main className={`flex-1 overflow-auto ${isDark ? 'bg-slate-950' : 'bg-gray-50'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

