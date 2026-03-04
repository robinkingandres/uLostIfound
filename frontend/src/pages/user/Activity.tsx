import { useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import UserHeader from '../../components/UserHeader';
import { fetchNotifications, markNotificationRead, type Notification } from '../../services/api';

export default function ActivityPage() {
  const [activities, setActivities] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchNotifications();
        setActivities(data);
      } catch (error) {
        console.error('Failed to load activity notifications', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleMarkRead = async (id: number) => {
    setActivities((prev) => prev.map((item) => (item.id === id ? { ...item, is_read: true } : item)));
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.error('Failed to mark notification as read', error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <UserHeader />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h1 className="text-xl font-bold text-slate-900">My Activities</h1>
            <p className="text-sm text-slate-500 mt-1">All your notification activities are listed here.</p>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-center text-slate-500">Loading activities...</div>
          ) : activities.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">No activities yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {activities.map((activity) => (
                <div key={activity.id} className={`px-6 py-4 flex items-start gap-3 ${!activity.is_read ? 'bg-blue-50/40' : ''}`}>
                  <div className={`mt-1 w-2 h-2 rounded-full ${activity.is_read ? 'bg-slate-300' : 'bg-blue-500'}`} />
                  <div className="flex-1">
                    <p className={`text-sm ${activity.is_read ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                      {activity.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {new Date(activity.created_at).toLocaleDateString()} | {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!activity.is_read ? (
                    <button
                      onClick={() => handleMarkRead(activity.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      <Check className="w-3 h-3" />
                      Read
                    </button>
                  ) : (
                    <Bell className="w-4 h-4 text-slate-300 mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

