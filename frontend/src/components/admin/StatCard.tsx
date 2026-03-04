import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  bgColor: string;
  iconBg: string;
}

export default function StatCard({ title, value, icon: Icon, bgColor, iconBg }: StatCardProps) {
  return (
    <div className={`${bgColor} rounded-2xl p-6 shadow-sm border border-gray-100`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-semibold mb-2">{title}</p>
          <p className="text-5xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${iconBg} rounded-xl p-3 shadow-sm`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
