interface ChartData {
  month: string;
  value: number;
}

interface TotalReportsChartProps {
  data: ChartData[];
}

export default function TotalReportsChart({ data }: TotalReportsChartProps) {
  // Calculate max value dynamically to scale the bars (default to 10 to avoid division by zero)
  const maxValue = Math.max(...data.map((d) => d.value), 10);
  const currentYear = new Date().getFullYear();

  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-1">Total Reports</h3>
      <p className="text-gray-600 text-sm mb-6">Yearly Overview</p>

      {/* Bar Graph Container */}
      <div className="flex items-end justify-between h-48 gap-2">
        {data.map((item) => (
          <div key={item.month} className="flex-1 flex flex-col items-center gap-2 group">
             {/* Tooltip (optional hover effect) */}
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -mt-8 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none">
              {item.value}
            </div>
            
            <div className="w-full bg-gray-200 rounded-t-lg relative flex flex-col justify-end" style={{ height: '100%' }}>
              <div
                className="w-full bg-indigo-400 rounded-t-lg transition-all duration-1000 ease-out hover:bg-indigo-500"
                style={{ 
                  height: `${(item.value / maxValue) * 100}%`,
                  minHeight: item.value > 0 ? '4px' : '0' 
                }}
              ></div>
            </div>
            <span className="text-xs text-gray-600 font-medium">{item.month}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-2">
        <div className="w-3 h-3 bg-indigo-400 rounded"></div>
        <span className="text-sm text-gray-600">{currentYear}</span>
      </div>
    </div>
  );
}