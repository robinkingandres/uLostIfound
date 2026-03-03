import { useEffect, useState } from 'react';
import DashboardHeader from '../../components/admin/DashboardHeader';
import { fetchFoundClaimRecords } from '../../services/api';
import type { FoundClaimRecord } from '../../services/api';

export default function ClaimReview() {
  const [foundClaimRecords, setFoundClaimRecords] = useState<FoundClaimRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const foundClaimData = await fetchFoundClaimRecords();
        setFoundClaimRecords(foundClaimData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <DashboardHeader />

      <div className="p-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
            <h2 className="text-lg font-bold text-gray-900">Claimant Details (Found Items Marked Claimed)</h2>
            <p className="text-xs text-gray-500 mt-1">Information submitted by Guidance Officer from the Claimed modal form.</p>
          </div>

          {foundClaimRecords.length === 0 ? (
            <div className="px-6 py-8 text-sm text-gray-500">No claimed found-item records yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px] text-left">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Report</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Item</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Full Name</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Student ID</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Course/Year</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Date Lost</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Date Claimed</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Location Lost</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Detailed Description</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Proof</th>
                    <th className="px-4 py-3 text-xs font-bold text-gray-500 uppercase">Processed By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {foundClaimRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 text-sm text-gray-700">#{record.reportId}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">{record.itemName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.fullName}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.studentId}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.courseYear}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.contactNumber}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.dateLost}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.dateClaimed}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.locationLost}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-[360px] whitespace-pre-wrap">{record.detailedDescription}</td>
                      <td className="px-4 py-3 text-sm">
                        {record.proofImageUrl ? (
                          <a
                            href={record.proofImageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:text-blue-800 font-semibold whitespace-nowrap"
                          >
                            View proof
                          </a>
                        ) : (
                          <span className="text-gray-500">No proof</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{record.guidanceOfficerName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
