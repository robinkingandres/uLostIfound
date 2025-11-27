export type ReportStatus = 'Pending' | 'Verified' | 'Claimed' | 'Rejected';
export type ReportType = 'Lost' | 'Found';

export interface Report {
  id: number;
  reporter: string;
  reporterRole: string;
  itemName: string;
  description: string;
  type: ReportType;
  category: string;
  location: string;
  status: ReportStatus;
  date: string;
  image: string;
}