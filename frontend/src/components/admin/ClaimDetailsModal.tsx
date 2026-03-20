import { useEffect, useId, useState } from "react";
import { X, Check, X as XIcon, Clock, AlertTriangle } from "lucide-react";
import type { Claim, ClaimStatus } from "../../types/claim";
import { useAdminTheme } from '../../contexts/AdminThemeContext';

type Props = {
  open: boolean;
  claim: Claim | null;
  onClose: () => void;
  // Updated to accept an optional rejection reason
  onStatusChange: (id: number, newStatus: ClaimStatus, rejectionReason?: string) => void;
};

export default function ClaimDetailsModal({ open, claim, onClose, onStatusChange }: Props) {
  const { isDark } = useAdminTheme();
  const titleId = useId();
  const [imgError, setImgError] = useState(false);
  const [reportImgError, setReportImgError] = useState(false);
  const [claimantImgError, setClaimantImgError] = useState(false);
  
  // State for rejection logic
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Reset state when opening a different claim
  useEffect(() => {
    setImgError(false);
    setReportImgError(false);
    setClaimantImgError(false);
    setShowRejectInput(false);
    setRejectReason("");
  }, [claim?.id, open]);

  if (!open || !claim) return null;

  const handleConfirmReject = () => {
    onStatusChange(claim.id, "Rejected", rejectReason);
    // State reset is handled by the useEffect dependent on 'open' or parent unmounting,
    // but explicit cleanup implies immediate UI feedback
    setShowRejectInput(false);
    setRejectReason("");
  };

  const badgeColor =
    claim.status === "Approved"
      ? "bg-green-100 text-green-700"
      : claim.status === "Claimed"
        ? "bg-blue-100 text-blue-700"
        : claim.status === "Rejected"
          ? "bg-red-100 text-red-700"
          : "bg-yellow-100 text-yellow-700";

  // supports either URL or base64
  const proofImgSrc =
    claim.proof_image ||
    claim.proofImage ||
    // @ts-ignore
    (claim.proofImageUrl as string | undefined) ||
    // @ts-ignore
    (claim.proofImageBase64 as string | undefined) ||
    "";

  const reportImgSrc = claim.reportImage || "";
  const claimantImgSrc = claim.claimant_photo || claim.claimantPhoto || "";
  const claimantIdImgSrc = claim.claimant_id_photo || claim.claimantIdPhoto || "";
  const authorizationLetterSrc = claim.authorization_letter || claim.authorizationLetter || "";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full max-w-3xl rounded-2xl shadow-xl border overflow-hidden ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-start justify-between gap-4 p-5 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <div>
            <h3 id={titleId} className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              Claim Details
            </h3>
            <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>Review the claim before verifying or rejecting.</p>
          </div>

          <button type="button" onClick={onClose} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`} aria-label="Close">
            <X className={`w-5 h-5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* BodyTarget: Scrollable if content is long */}
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Item</div>
              <div className={`mt-1 text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.itemName}</div>
              <div className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>
                {claim.reportType || "Report"} • {claim.reportCategory || "Uncategorized"}
              </div>

              <div className={`mt-4 text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Status</div>
              <div className="mt-1">
                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                  {claim.status}
                </span>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Claimant</div>
              <div className={`mt-1 font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.claimantName}</div>
              <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'} italic`}>{claim.claimantRole}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{claim.claimantContact || "No contact number"}</div>
              <div className="mt-3">
                <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Claimant Photo</div>
                {!claimantImgSrc ? (
                  <div className="text-sm text-red-600 font-semibold">
                    Missing claimant photo. Required before release.
                  </div>
                ) : claimantImgError ? (
                  <div className="text-sm text-red-600 font-semibold">
                    Failed to load claimant photo.
                  </div>
                ) : (
                  <a href={claimantImgSrc} target="_blank" rel="noreferrer" className="block group relative">
                    <img
                      src={claimantImgSrc}
                      alt="Claimant"
                      className={`w-full max-h-56 object-cover rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                      onError={() => setClaimantImgError(true)}
                    />
                    <div className="hidden group-hover:block absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Click to expand
                    </div>
                  </a>
                )}
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Valid ID / Student ID</div>
              {!claimantIdImgSrc ? (
                <div className="text-sm text-red-600 font-semibold">
                  Missing ID photo. Required before release.
                </div>
              ) : (
                <a href={claimantIdImgSrc} target="_blank" rel="noreferrer" className="block group relative">
                  <img
                    src={claimantIdImgSrc}
                    alt="Claimant ID"
                    className={`w-full max-h-56 object-cover rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                  />
                  <div className="hidden group-hover:block absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to expand
                  </div>
                </a>
              )}
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Authorization Letter</div>
              {!authorizationLetterSrc ? (
                <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'} italic`}>No authorization letter uploaded.</div>
              ) : (
                <a href={authorizationLetterSrc} target="_blank" rel="noreferrer" className="block group relative">
                  <img
                    src={authorizationLetterSrc}
                    alt="Authorization letter"
                    className={`w-full max-h-56 object-cover rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                  />
                  <div className="hidden group-hover:block absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to expand
                  </div>
                </a>
              )}
            </div>

            <div className={`md:col-span-2 rounded-xl border p-4 ${isDark ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-100 bg-blue-50/50'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-blue-200' : 'text-blue-700'}`}>Reported Item Details</div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Reported by</div>
                  <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.reporterName || "Unknown reporter"}</div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{claim.reporterRole || "N/A"} • {claim.reporterSchoolId || "N/A"}</div>
                </div>
                <div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Location</div>
                  <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.reportLocation || "Unspecified"}</div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Status: {claim.reportStatus || "N/A"}</div>
                </div>
                <div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Date Lost/Found</div>
                  <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.reportDate || "N/A"}</div>
                </div>
                <div>
                  <div className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Date Reported</div>
                  <div className={`font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{claim.reportDateReported || "N/A"}</div>
                </div>
              </div>
              <p className={`mt-3 text-sm whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {claim.reportDescription || "No report description provided."}
              </p>
            </div>

            {/* Proof image */}
            <div className={`md:col-span-1 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Reported Item Image</div>

              {!reportImgSrc ? (
                <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'} italic`}>No report image uploaded.</div>
              ) : reportImgError ? (
                <div className="text-sm text-red-600 font-semibold">
                  Failed to load report image.
                </div>
              ) : (
                <a href={reportImgSrc} target="_blank" rel="noreferrer" className="block group relative">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                  <img
                    src={reportImgSrc}
                    alt="Reported item"
                    className={`w-full max-h-80 object-contain rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                    onError={() => setReportImgError(true)}
                  />
                  <div className="hidden group-hover:block absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to expand
                  </div>
                </a>
              )}
            </div>

            <div className={`md:col-span-1 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Proof Image</div>

              {!proofImgSrc ? (
                <div className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'} italic`}>No proof image uploaded.</div>
              ) : imgError ? (
                <div className="text-sm text-red-600 font-semibold">
                  Failed to load image. Check if the image URL is reachable.
                </div>
              ) : (
                <a href={proofImgSrc} target="_blank" rel="noreferrer" className="block group relative">
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
                  <img
                    src={proofImgSrc}
                    alt="Proof of ownership"
                    className={`w-full max-h-80 object-contain rounded-xl border ${isDark ? 'border-slate-800 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}
                    onError={() => setImgError(true)}
                  />
                  <div className="hidden group-hover:block absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    Click to expand
                  </div>
                </a>
              )}
            </div>

            <div className={`md:col-span-2 rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Proof / Description</div>
              <p className={`mt-2 text-sm whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {claim.proofDescription || "No proof description provided."}
              </p>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Claim ID</div>
              <div className={`mt-1 text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>#{claim.id}</div>
            </div>

            <div className={`rounded-xl border p-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
              <div className={`text-xs font-semibold ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>Next step</div>
              <div className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                {claim.status === "Pending" && "Review and verify details, then approve/reject or release as claimed."}
                {claim.status === "Approved" && (
                  <span className={`inline-flex items-center gap-2 ${isDark ? 'text-orange-300' : 'text-orange-600'}`}>
                    <Clock className="w-4 h-4" /> Ready for release processing.
                  </span>
                )}
                {(claim.status === "Claimed" || claim.status === "Rejected") && "Completed."}
              </div>
            </div>
          </div>
        </div>

        <div className={`p-5 border-t rounded-b-2xl ${isDark ? 'border-slate-800 bg-slate-900/60' : 'border-gray-100 bg-gray-50/50'}`}>
  {showRejectInput ? (
    <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className={`flex items-center gap-2 mb-2 font-semibold text-sm ${isDark ? 'text-red-400' : 'text-red-700'}`}>
        <AlertTriangle className="w-4 h-4" />
        Reason for Rejection
      </div>
      <textarea
        value={rejectReason}
        onChange={(e) => setRejectReason(e.target.value)}
        className={`w-full p-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 ${isDark ? 'border border-red-500/40 bg-slate-950 text-slate-100 placeholder:text-slate-500' : 'border border-red-200 bg-white text-gray-900'}`}
        placeholder="Please explain why this claim is being rejected..."
        rows={3}
        autoFocus
      />
      <div className="flex justify-end gap-3 mt-3">
        <button
          onClick={() => {
            setShowRejectInput(false);
            setRejectReason("");
          }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmReject}
          disabled={!rejectReason.trim()}
          className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Confirm Rejection
        </button>
      </div>
    </div>
  ) : (
    <div className="flex items-center justify-end gap-2">
      {claim.status === "Pending" ? (
        <>
          <button
            type="button"
            onClick={() => setShowRejectInput(true)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${isDark ? 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30' : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'}`}
          >
            <XIcon className="w-4 h-4" />
            Reject
          </button>

          <button
            type="button"
            onClick={() => onStatusChange(claim.id, "Approved")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-200 font-bold text-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve (Verify)
          </button>
        </>
      ) : (
        <span className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-500'} italic`}>
          No actions available.
        </span>
      )}
    </div>
  )}
</div>
      </div>
    </div>
  );
}