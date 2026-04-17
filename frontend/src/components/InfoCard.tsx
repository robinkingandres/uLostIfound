import { useAdminTheme } from '../contexts/AdminThemeContext';

interface InfoCardProps {
  title: string;
  value: number;
}

export default function InfoCard({ title, value }: InfoCardProps) {
  const { isDark } = useAdminTheme();

  return (
    <div className={`rounded-2xl p-6 shadow-sm border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{title}</h3>
      <p className={`text-5xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
