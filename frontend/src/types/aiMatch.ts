export type MatchStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ItemDetails {
  id: number;
  itemName: string;
  name?: string; // For backward compatibility
  category: string;
  description: string;
  image: string;
  location?: string;
  reporterId?: number;
  reporterName?: string;
}

export interface AIMatch {
  id: number;
  date: string;
  status: MatchStatus;
  matchScore: number;
  visualScore: number;
  textScore: number;
  lostItem: ItemDetails;
  foundItem: ItemDetails;
  lost_reporter_notified?: boolean;
  found_reporter_notified?: boolean;
}