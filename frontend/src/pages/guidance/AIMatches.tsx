import DashboardHeader from '../../components/admin/DashboardHeader';
import AIMatchNotification from '../admin/AIMatchNotification';

export default function GuidanceAIMatches() {
  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <DashboardHeader />
      <AIMatchNotification />
    </div>
  );
}
