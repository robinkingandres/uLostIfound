interface InfoCardProps {
  title: string;
  value: number;
}

export default function InfoCard({ title, value }: InfoCardProps) {
  return (
    <div className="bg-gray-100 rounded-2xl p-6 shadow-md">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-5xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
