// frontend/src/components/admin/ClaimedUnclaimedChart.tsx
import { useAdminTheme } from '../../contexts/AdminThemeContext';

interface ClaimedUnclaimedChartProps {
  claimed: number;
  unclaimed: number;
}

export default function ClaimedUnclaimedChart({ claimed, unclaimed }: ClaimedUnclaimedChartProps) {
  const { isDark } = useAdminTheme();
  const total = claimed + unclaimed;

  // Calculate percentages safely to avoid NaN if total is 0
  const claimedPercentage = total > 0 ? (claimed / total) * 100 : 0;
  const unclaimedPercentage = total > 0 ? (unclaimed / total) * 100 : 0;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const claimedLength = total > 0 ? (claimed / total) * circumference : 0;
  const unclaimedLength = total > 0 ? (unclaimed / total) * circumference : 0;

  return (
    <div className={`rounded-2xl p-6 shadow-sm border h-full min-h-[420px] flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <h3 className={`text-xl font-bold mb-6 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Claimed & Unclaimed</h3>

      <div className="flex-1 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background Circle (Optional, for empty state) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={isDark ? '#1f2937' : '#e5e7eb'} // gray-200 / slate-800
              strokeWidth="20"
            />
            
            {/* Unclaimed Segment (Red) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#f87171"
              strokeWidth="20"
              strokeDasharray={`${unclaimedLength} ${circumference}`}
              // Ensure it starts after the claimed segment if you want them to touch, 
              // or keep existing logic if it stacks correctly. 
              // The original logic just overlaid them. 
              // Usually, you rotate one by the length of the other.
            />
            
            {/* Claimed Segment (Blue) */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="20"
              strokeDasharray={`${claimedLength} ${circumference}`}
              // Offset it backwards by the unclaimed amount so they don't overlap if they sum to 360
              strokeDashoffset={-unclaimedLength}
            />
          </svg>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Claimed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm font-semibold">{claimed}</span>
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>({claimedPercentage.toFixed(1)}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Unclaimed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm font-semibold">{unclaimed}</span>
              <span className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>({unclaimedPercentage.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
