export type MatchStatus = 'Pending' | 'Approved' | 'Rejected';

export interface ItemDetails {
  id: string;
  name: string;
  category: string;
  description: string;
  image: string;
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
}