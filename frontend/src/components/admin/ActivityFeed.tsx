import { useState, useEffect } from 'react';
import { fetchActivityFeed, type Activity } from '../../services/api';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

export default function ActivityFeed() {
  const { isDark } = useAdminTheme();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const data = await fetchActivityFeed();
        setActivities(data);
      } catch (err) {
        console.error(err);
        setError('Unable to load feed.');
      } finally {
        setLoading(false);
      }
    };
    loadActivity();
  }, []);

  return (
    <div className={`rounded-2xl p-6 shadow-sm border h-full ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Activity Feed</h3>
        {/* Optional: Add a refresh button or live indicator here */}
      </div>
      
      {loading ? (
        <div className={`text-sm text-center py-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Loading updates...</div>
      ) : error ? (
        <div className="text-sm text-red-500 text-center py-4">{error}</div>
      ) : activities.length === 0 ? (
        <div className={`text-sm text-center py-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No recent activity</div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {activities.map((activity) => (
            <div key={activity.id} className={`text-sm flex items-start gap-2 pb-3 border-b last:border-0 ${isDark ? 'text-slate-300 border-slate-800' : 'text-gray-700 border-gray-50'}`}>
              {/* Simple avatar or icon based on role */}
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.role === 'Admin' ? 'bg-red-500' : 
                  activity.role === 'Teacher' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              
              <div>
                <p>
                  <span className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{activity.user}</span>
                  <span className={`text-xs mx-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>({activity.role})</span>
                </p>
                <p className={isDark ? 'text-slate-400' : 'text-gray-600'}>
                  {activity.action} <span className={`font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>'{activity.item}'</span>
                </p>
                <p className={`text-[10px] mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
