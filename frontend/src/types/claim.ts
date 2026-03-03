export type ClaimStatus = 'Pending' | 'Approved' | 'Claimed' | 'Rejected';

export interface Claim {
  id: number;
  itemName: string;
  claimantName: string;
  claimantRole: string;
  claimantSchoolId?: string;
  claimantEmail?: string;
  claimantUsername?: string;
  proofDescription: string;
  createdAt?: string;
  proofImage?: string | null;
  proof_image?: string | null;
  proofImageUrl?: string | null;
  proofImageBase64?: string | null;
  date: string;
  status: ClaimStatus;
  rejection_reason?: string; 
  reportRecordId?: number;
  reportType?: 'Lost' | 'Found';
  reportCategory?: string;
  reportLocation?: string;
  reportStatus?: string;
  reportDescription?: string;
  reportDate?: string;
  reportDateReported?: string;
  reportImage?: string | null;
  reporterName?: string;
  reporterRole?: string;
  reporterSchoolId?: string;
}
