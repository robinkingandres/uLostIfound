// frontend/src/components/admin/ClaimedUnclaimedChart.tsx

interface ClaimedUnclaimedChartProps {
  claimed: number;
  unclaimed: number;
}

export default function ClaimedUnclaimedChart({ claimed, unclaimed }: ClaimedUnclaimedChartProps) {
  const total = claimed + unclaimed;

  // Calculate percentages safely to avoid NaN if total is 0
  const claimedPercentage = total > 0 ? (claimed / total) * 100 : 0;
  const unclaimedPercentage = total > 0 ? (unclaimed / total) * 100 : 0;

  // Calculate degrees for the SVG stroke
  const claimedDegrees = (claimedPercentage / 100) * 360;
  const unclaimedDegrees = (unclaimedPercentage / 100) * 360;

  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Claimed & Unclaimed</h3>

      <div className="flex items-center justify-between">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {/* Background Circle (Optional, for empty state) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#e5e7eb" // gray-200
              strokeWidth="20"
            />
            
            {/* Unclaimed Segment (Red) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#f87171"
              strokeWidth="20"
              strokeDasharray={`${unclaimedDegrees} 360`}
              // Ensure it starts after the claimed segment if you want them to touch, 
              // or keep existing logic if it stacks correctly. 
              // The original logic just overlaid them. 
              // Usually, you rotate one by the length of the other.
            />
            
            {/* Claimed Segment (Blue) */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="20"
              strokeDasharray={`${claimedDegrees} 360`}
              // Offset it backwards by the unclaimed amount so they don't overlap if they sum to 360
              strokeDashoffset={-unclaimedDegrees}
            />
          </svg>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Claimed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm font-semibold">{claimed}</span>
              <span className="text-sm text-gray-600">({claimedPercentage.toFixed(1)}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Unclaimed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-400 text-sm font-semibold">{unclaimed}</span>
              <span className="text-sm text-gray-600">({unclaimedPercentage.toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}