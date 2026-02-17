export type ClaimStatus = 'Pending' | 'Approved' | 'Claimed' | 'Rejected';

export interface Claim {
  id: number;
  itemName: string;
  claimantName: string;
  claimantRole: string;
  proofDescription: string;
  createdAt?: string;
  proofImage?: string | null;
  proof_image?: string | null;
  proofImageUrl?: string | null;
  proofImageBase64?: string | null;
  date: string;
  status: ClaimStatus;
  rejection_reason?: string; 
}
