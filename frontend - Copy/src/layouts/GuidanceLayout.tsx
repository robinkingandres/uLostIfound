import { Outlet } from 'react-router-dom';
import GuidanceSidebar from '../components/guidance/GuidanceSidebar';

export default function GuidanceLayout() {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <GuidanceSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}