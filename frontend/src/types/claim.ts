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
  claimantPhoto?: string | null;
  claimant_photo?: string | null;
  claimantIdPhoto?: string | null;
  claimant_id_photo?: string | null;
  authorizationLetter?: string | null;
  authorization_letter?: string | null;
  claimantContact?: string | null;
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
