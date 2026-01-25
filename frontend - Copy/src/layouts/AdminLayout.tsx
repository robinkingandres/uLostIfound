import { Outlet } from 'react-router-dom';
import Sidebar from '../components/admin/Sidebar';

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <Outlet />
    </div>
  );
}

