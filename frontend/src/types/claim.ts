export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Claim {
  id: number;
  itemName: string;
  claimantName: string;
  claimantRole: string;
  proofDescription: string;
  date: string;
  status: ClaimStatus;
}