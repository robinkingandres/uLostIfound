interface InfoCardProps {
  title: string;
  value: number;
}

export default function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-5xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
