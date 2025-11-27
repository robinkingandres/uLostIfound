import DashboardHeader from '../components/admin/DashboardHeader';

interface PlaceholderPageProps {
  title: string;
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="flex-1 bg-gray-50">
      <DashboardHeader />
      <div className="p-8">
        <div className="bg-white rounded-2xl p-12 shadow-md text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-gray-600">This page is under construction.</p>
        </div>
      </div>
    </div>
  );
}
