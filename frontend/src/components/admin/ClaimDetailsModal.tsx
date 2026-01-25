import { useEffect, useId, useState } from "react";
import { X, Check, X as XIcon, Clock } from "lucide-react";
import type { Claim, ClaimStatus } from "../../types/claim";

type Props = {
  open: boolean;
  claim: Claim | null;
  onClose: () => void;
  onStatusChange: (id: number, newStatus: ClaimStatus) => void;
};

export default function ClaimDetailsModal({ open, claim, onClose, onStatusChange }: Props) {
  const titleId = useId();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // reset image error when opening a different claim
  useEffect(() => {
    setImgError(false);
  }, [claim?.id]);

  if (!open || !claim) return null;

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
    // @ts-ignore (in case your Claim type not updated yet)
    (claim.proofImageUrl as string | undefined) ||
    // @ts-ignore
    (claim.proofImageBase64 as string | undefined) ||
    "";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-gray-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
          <div>
            <h3 id={titleId} className="text-xl font-bold text-gray-900">
              Claim Details
            </h3>
            <p className="text-sm text-gray-600 mt-1">Review the claim before verifying or rejecting.</p>
          </div>

          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500">Item</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{claim.itemName}</div>

            <div className="mt-4 text-xs font-semibold text-gray-500">Status</div>
            <div className="mt-1">
              <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
                {claim.status}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500">Claimant</div>
            <div className="mt-1 font-bold text-gray-900">{claim.claimantName}</div>
            <div className="text-xs text-gray-500 italic">{claim.claimantRole}</div>
          </div>

          {/* NEW: Proof image */}
          <div className="md:col-span-2 rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500 mb-2">Proof Image</div>

            {!proofImgSrc ? (
              <div className="text-sm text-gray-500 italic">No proof image uploaded.</div>
            ) : imgError ? (
              <div className="text-sm text-red-600 font-semibold">
                Failed to load image. Check if the image URL is reachable.
              </div>
            ) : (
              <a href={proofImgSrc} target="_blank" rel="noreferrer" className="block">
                <img
                  src={proofImgSrc}
                  alt="Proof of ownership"
                  className="w-full max-h-80 object-contain rounded-xl border border-gray-200 bg-gray-50"
                  onError={() => setImgError(true)}
                />
                <div className="text-xs text-gray-500 mt-2">Click image to open in new tab</div>
              </a>
            )}
          </div>

          <div className="md:col-span-2 rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500">Proof / Description</div>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">
              {claim.proofDescription || "No proof description provided."}
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500">Claim ID</div>
            <div className="mt-1 text-sm font-semibold text-gray-900">#{claim.id}</div>
          </div>

          <div className="rounded-xl border border-gray-100 p-4">
            <div className="text-xs font-semibold text-gray-500">Next step</div>
            <div className="mt-2 text-sm text-gray-700">
              {claim.status === "Pending" && "Admin must approve or reject."}
              {claim.status === "Approved" && (
                <span className="inline-flex items-center gap-2 text-orange-600">
                  <Clock className="w-4 h-4" /> Forwarded to Guidance.
                </span>
              )}
              {(claim.status === "Claimed" || claim.status === "Rejected") && "Completed."}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {claim.status === "Pending" ? (
              <>
                <button
                  type="button"
                  onClick={() => onStatusChange(claim.id, "Approved")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold text-sm"
                >
                  <Check className="w-4 h-4" />
                  Approve (Verify)
                </button>

                <button
                  type="button"
                  onClick={() => onStatusChange(claim.id, "Rejected")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm"
                >
                  <XIcon className="w-4 h-4" />
                  Reject
                </button>
              </>
            ) : (
              <span className="text-sm text-gray-500 italic">No actions available.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
