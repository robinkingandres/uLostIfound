interface Activity {
  id: number;
  user: string;
  action: string;
  item: string;
}

const activities: Activity[] = [
  { id: 1, user: 'Admin User', action: 'Approved report for', item: 'Blue water bottle' },
  { id: 2, user: 'Teacher: Robert Honci', action: 'Reported a lost', item: 'Calculator' },
  { id: 3, user: 'Student: Ana Lopez', action: 'Claimed', item: 'Umbrella' },
  { id: 4, user: 'Admin User', action: 'Deleted user', item: 'Juan Cruz' },
  { id: 5, user: 'Student: Maria Santos', action: 'Submitted a lost item report', item: '' },
];

export default function ActivityFeed() {
  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-bold text-gray-900 mb-4">Activity Feed</h3>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div key={activity.id} className="text-sm text-gray-700">
            <span className="font-semibold">{activity.user}</span>{' '}
            <span>{activity.action}</span>{' '}
            {activity.item && <span className="font-medium">{activity.item}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
