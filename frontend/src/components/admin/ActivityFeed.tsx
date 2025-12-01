import { useState, useEffect } from 'react';
import { fetchActivityFeed, type Activity } from '../../services/api';

export default function ActivityFeed() {
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900">Activity Feed</h3>
        {/* Optional: Add a refresh button or live indicator here */}
      </div>
      
      {loading ? (
        <div className="text-sm text-gray-500 text-center py-4">Loading updates...</div>
      ) : error ? (
        <div className="text-sm text-red-500 text-center py-4">{error}</div>
      ) : activities.length === 0 ? (
        <div className="text-sm text-gray-400 text-center py-4">No recent activity</div>
      ) : (
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {activities.map((activity) => (
            <div key={activity.id} className="text-sm text-gray-700 flex items-start gap-2 pb-3 border-b border-gray-50 last:border-0">
              {/* Simple avatar or icon based on role */}
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  activity.role === 'Admin' ? 'bg-red-500' : 
                  activity.role === 'Teacher' ? 'bg-yellow-500' : 'bg-blue-500'
              }`} />
              
              <div>
                <p>
                  <span className="font-semibold text-gray-900">{activity.user}</span>
                  <span className="text-xs text-gray-400 mx-1">({activity.role})</span>
                </p>
                <p className="text-gray-600">
                  {activity.action} <span className="font-medium text-gray-800">'{activity.item}'</span>
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
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