export default function ClaimedUnclaimedChart() {
  const claimed = 60;
  const unclaimed = 40;
  const total = claimed + unclaimed;

  const claimedPercentage = (claimed / total) * 100;
  const unclaimedPercentage = (unclaimed / total) * 100;

  const claimedDegrees = (claimedPercentage / 100) * 360;
  const unclaimedDegrees = (unclaimedPercentage / 100) * 360;

  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Claimed & Unclaimed</h3>

      <div className="flex items-center justify-between">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#f87171"
              strokeWidth="20"
              strokeDasharray={`${unclaimedDegrees} 360`}
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="none"
              stroke="#60a5fa"
              strokeWidth="20"
              strokeDasharray={`${claimedDegrees} 360`}
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
              <span className="text-red-400 text-sm font-semibold">12</span>
              <span className="text-sm text-gray-600">{claimedPercentage.toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <span className="text-sm text-gray-600">Unclaimed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm font-semibold">8</span>
              <span className="text-sm text-gray-600">{unclaimedPercentage.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
