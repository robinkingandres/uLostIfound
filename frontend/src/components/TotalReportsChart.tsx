export default function TotalReportsChart() {
  const data = [
    { month: 'Jan', value: 90 },
    { month: 'Feb', value: 60 },
    { month: 'Mar', value: 75 },
    { month: 'Apr', value: 95 },
    { month: 'May', value: 70 },
    { month: 'Jun', value: 85 },
  ];

  const maxValue = 100;

  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-1">Total Reports</h3>
      <p className="text-gray-600 text-sm mb-6">{maxValue}</p>

      <div className="flex items-end justify-between h-48 gap-4">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
            <div className="w-full bg-gray-200 rounded-t-lg relative" style={{ height: '100%' }}>
              <div
                className="w-full bg-indigo-400 rounded-t-lg absolute bottom-0 transition-all duration-500"
                style={{ height: `${(item.value / maxValue) * 100}%` }}
              ></div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{item.month}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="w-3 h-3 bg-indigo-400 rounded"></div>
        <span className="text-sm text-gray-600">2025</span>
      </div>
    </div>
  );
}
