import type { LucideIcon } from 'lucide-react';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  bgColor: string;
  iconBg: string;
}

export default function StatCard({ title, value, icon: Icon, bgColor, iconBg }: StatCardProps) {
  const { isDark } = useAdminTheme();

  return (
    <div className={`${isDark ? 'bg-slate-900 border-slate-800' : `${bgColor} border-gray-100`} rounded-2xl p-6 shadow-sm border`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{title}</p>
          <p className={`text-5xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{value}</p>
        </div>
        <div className={`${iconBg} rounded-xl p-3 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
