import { useState, useRef, useEffect } from 'react';
import { X, Upload, ImageIcon, Info, Loader2, Camera, UserCircle2 } from 'lucide-react';
import { createClaim, fetchClaims, fetchSiteSettings, updateClaimProof } from '../services/api';
import type { Claim } from '../types/claim';
import { useAuth } from '../contexts/AuthContext';

interface ClaimModalProps {
  reportId: number;
  itemName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ClaimModal({ reportId, itemName, isOpen, onClose }: ClaimModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');

  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);

  const [claimantPhoto, setClaimantPhoto] = useState<File | null>(null);
  const [claimantPhotoPreview, setClaimantPhotoPreview] = useState<string | null>(null);
  const [claimantIdPhoto, setClaimantIdPhoto] = useState<File | null>(null);
  const [claimantIdPreview, setClaimantIdPreview] = useState<string | null>(null);
  const [authorizationLetter, setAuthorizationLetter] = useState<File | null>(null);
  const [authorizationPreview, setAuthorizationPreview] = useState<string | null>(null);
  const [claimantContact, setClaimantContact] = useState('');

  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<string | null>(null);
  const [existingClaim, setExistingClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(false);
  const [requireProofImage, setRequireProofImage] = useState(false);
  const [error, setError] = useState('');

  const proofImageInputRef = useRef<HTMLInputElement>(null);
  const claimantPhotoInputRef = useRef<HTMLInputElement>(null);
  const claimantIdInputRef = useRef<HTMLInputElement>(null);
  const authorizationInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSiteSettings()
      .then((s) => setRequireProofImage(!!s.claim_require_proof_image))
      .catch(() => setRequireProofImage(false));
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    const loadExistingClaim = async () => {
      try {
        const claims = await fetchClaims(reportId);
        if (!mounted) return;
        const current = claims[0] || null;
        setExistingClaim(current);

        if (current?.status === 'Pending') {
          const existingProofImage =
            current.proof_image ||
            current.proofImage ||
            current.proofImageUrl ||
            current.proofImageBase64 ||
            null;

          const existingClaimantPhoto = current.claimant_photo || current.claimantPhoto || null;
          const existingClaimantIdPhoto = current.claimant_id_photo || current.claimantIdPhoto || null;
          const existingAuthorizationLetter = current.authorization_letter || current.authorizationLetter || null;

          setDescription(current.proofDescription || '');
          setProofImagePreview(existingProofImage);
          setClaimantPhotoPreview(existingClaimantPhoto);
          setClaimantIdPreview(existingClaimantIdPhoto);
          setAuthorizationPreview(existingAuthorizationLetter);
          setClaimantContact(current.claimantContact || '');
        } else {
          setDescription('');
          setProofImagePreview(null);
          setClaimantPhotoPreview(null);
          setClaimantIdPreview(null);
          setAuthorizationPreview(null);
          setClaimantContact('');
        }
      } catch {
        if (!mounted) return;
        setExistingClaim(null);
      }
    };

    loadExistingClaim();
    return () => {
      mounted = false;
    };
  }, [isOpen, reportId]);

  if (!isOpen) return null;

  const isPendingExistingClaim = !!existingClaim && existingClaim.status === 'Pending';
  const hasNonEditableExistingClaim = !!existingClaim && existingClaim.status !== 'Pending';

  const validateImageFile = (file: File, label: string) => {
    if (!file.type.startsWith('image/')) {
      setError(`Please select a valid ${label} image file.`);
      return false;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError(`${label} image size must be less than 5MB.`);
      return false;
    }
    return true;
  };

  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file, 'proof')) return;

    setProofImage(file);
    setProofImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleClaimantPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file, 'claimant')) return;

    setClaimantPhoto(file);
    setClaimantPhotoPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleClaimantIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file, 'ID')) return;

    setClaimantIdPhoto(file);
    setClaimantIdPreview(URL.createObjectURL(file));
    setError('');
  };

  const handleAuthorizationLetterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!validateImageFile(file, 'authorization letter')) return;

    setAuthorizationLetter(file);
    setAuthorizationPreview(URL.createObjectURL(file));
    setError('');
  };

  const removeProofImage = () => {
    setProofImage(null);
    setProofImagePreview(null);
    if (proofImageInputRef.current) proofImageInputRef.current.value = '';
  };

  const removeClaimantPhoto = () => {
    setClaimantPhoto(null);
    setClaimantPhotoPreview(null);
    if (claimantPhotoInputRef.current) claimantPhotoInputRef.current.value = '';
  };

  const removeClaimantIdPhoto = () => {
    setClaimantIdPhoto(null);
    setClaimantIdPreview(null);
    if (claimantIdInputRef.current) claimantIdInputRef.current.value = '';
  };

  const removeAuthorizationLetter = () => {
    setAuthorizationLetter(null);
    setAuthorizationPreview(null);
    if (authorizationInputRef.current) authorizationInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!description.trim()) {
      setError('Please provide proof details for the item.');
      setLoading(false);
      return;
    }

    if (requireProofImage && !proofImage && !proofImagePreview) {
      setError('Proof image is required by current claim settings.');
      setLoading(false);
      return;
    }

    if (!claimantPhoto && !claimantPhotoPreview) {
      setError('Claimant photo is required for verification and documentation.');
      setLoading(false);
      return;
    }
    if (!claimantIdPhoto && !claimantIdPreview) {
      setError('Valid ID / Student ID photo is required.');
      setLoading(false);
      return;
    }

    if (hasNonEditableExistingClaim) {
      setError('You already submitted a claim for this item.');
      setLoading(false);
      return;
    }

    try {
      if (isPendingExistingClaim && existingClaim) {
        await updateClaimProof(
          existingClaim.id,
          description,
          proofImage,
          claimantPhoto,
          claimantIdPhoto,
          authorizationLetter,
          claimantContact.trim() || undefined
        );
        alert('Claim form updated successfully. Admin will continue reviewing your claim.');
      } else {
        await createClaim(
          reportId,
          description,
          proofImage,
          claimantPhoto,
          claimantIdPhoto,
          authorizationLetter,
          claimantContact.trim() || undefined
        );
        alert('Claim form submitted successfully.');
      }

      onClose();
      setDescription('');
      setProofImage(null);
      setProofImagePreview(null);
      setClaimantPhoto(null);
      setClaimantPhotoPreview(null);
      setClaimantIdPhoto(null);
      setClaimantIdPreview(null);
      setAuthorizationLetter(null);
      setAuthorizationPreview(null);
      setClaimantContact('');
      setExistingClaim(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to submit claim form. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  const openPreview = (src: string) => {
    setPreviewTarget(src);
    setShowImagePreview(true);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl overflow-hidden animate-fade-in max-h-[95vh] overflow-y-auto">
        <div className="p-5 sm:p-7 border-b border-gray-100 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Claim Form</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-1">Claim Item</h3>
            <p className="text-sm text-gray-500 mt-1">Submit proof of ownership and claimant identification.</p>
          </div>
          <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
          <div className="w-full rounded-xl p-4 flex items-start gap-3 bg-blue-50 border border-blue-100">
            <Info className="w-5 h-5 mt-0.5 shrink-0 text-blue-600" />
            <p className="text-xs leading-relaxed font-medium text-blue-700">
              Claim details will be reviewed by the Guidance Office before item release.
            </p>
          </div>

          {isPendingExistingClaim ? (
            <div className="bg-amber-50 text-amber-700 text-xs p-3 rounded-xl border border-amber-100">
              Your claim is currently pending review. You may update the form while pending.
            </div>
          ) : null}

          {hasNonEditableExistingClaim ? (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100">
              This claim is already finalized and cannot be edited.
            </div>
          ) : null}

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 flex items-start gap-2">
              <Info className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase font-bold text-gray-500">Item Name</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{itemName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
              <p className="text-xs uppercase font-bold text-gray-500">Claimant</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{user?.name || user?.username || 'Student'}</p>
              <p className="text-xs text-gray-500">{user?.userId || 'No school ID'}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Contact Number (Optional)</label>
            <input
              type="text"
              value={claimantContact}
              onChange={(e) => setClaimantContact(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all"
              placeholder="e.g., 0917-123-4567"
              disabled={hasNonEditableExistingClaim}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-700">Proof of Item <span className="text-red-500">*</span></label>
            <textarea
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 outline-none bg-gray-50/50 focus:bg-white transition-all resize-none"
              placeholder="Describe unique identifiers: marks, scratches, contents, serial notes, where last used, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={hasNonEditableExistingClaim}
            />
          </div>

          <input
            type="file"
            ref={proofImageInputRef}
            accept="image/*"
            onChange={handleProofImageChange}
            className="hidden"
          />

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              Proof Image {requireProofImage ? <span className="text-red-500">*</span> : <span className="text-gray-400 text-xs">(Optional)</span>}
            </label>

            {proofImagePreview ? (
              <div className="relative w-full sm:w-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                <img
                  src={proofImagePreview}
                  alt="Proof"
                  className="w-full h-48 object-cover cursor-zoom-in"
                  onClick={() => openPreview(proofImagePreview)}
                />
                {!hasNonEditableExistingClaim && (
                  <button
                    type="button"
                    onClick={removeProofImage}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => proofImageInputRef.current?.click()}
                disabled={hasNonEditableExistingClaim}
                className="w-full sm:w-80 border-2 border-dashed border-cyan-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-cyan-50/50 transition-colors"
              >
                <Upload className="w-7 h-7 text-cyan-500" />
                <span className="text-sm font-semibold text-cyan-700">Upload Proof Image</span>
                <span className="text-xs text-gray-500">PNG/JPG up to 5MB</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={claimantPhotoInputRef}
            accept="image/*"
            onChange={handleClaimantPhotoChange}
            className="hidden"
          />

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              Claimant Person Photo <span className="text-red-500">*</span>
            </label>

            {claimantPhotoPreview ? (
              <div className="relative w-full sm:w-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                <img
                  src={claimantPhotoPreview}
                  alt="Claimant"
                  className="w-full h-48 object-cover cursor-zoom-in"
                  onClick={() => openPreview(claimantPhotoPreview)}
                />
                {!hasNonEditableExistingClaim && (
                  <button
                    type="button"
                    onClick={removeClaimantPhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => claimantPhotoInputRef.current?.click()}
                disabled={hasNonEditableExistingClaim}
                className="w-full sm:w-80 border-2 border-dashed border-emerald-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-emerald-50/50 transition-colors"
              >
                <UserCircle2 className="w-7 h-7 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">Upload Claimant Photo</span>
                <span className="text-xs text-gray-500">Required for release documentation</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={claimantIdInputRef}
            accept="image/*"
            onChange={handleClaimantIdChange}
            className="hidden"
          />

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <Camera className="w-4 h-4 text-gray-400" />
              Valid ID / Student ID Photo <span className="text-red-500">*</span>
            </label>

            {claimantIdPreview ? (
              <div className="relative w-full sm:w-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                <img
                  src={claimantIdPreview}
                  alt="Claimant ID"
                  className="w-full h-48 object-cover cursor-zoom-in"
                  onClick={() => openPreview(claimantIdPreview)}
                />
                {!hasNonEditableExistingClaim && (
                  <button
                    type="button"
                    onClick={removeClaimantIdPhoto}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => claimantIdInputRef.current?.click()}
                disabled={hasNonEditableExistingClaim}
                className="w-full sm:w-80 border-2 border-dashed border-indigo-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50/50 transition-colors"
              >
                <Upload className="w-7 h-7 text-indigo-500" />
                <span className="text-sm font-semibold text-indigo-700">Upload ID Photo</span>
                <span className="text-xs text-gray-500">Required for identity verification</span>
              </button>
            )}
          </div>

          <input
            type="file"
            ref={authorizationInputRef}
            accept="image/*"
            onChange={handleAuthorizationLetterChange}
            className="hidden"
          />

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-gray-400" />
              Authorization Letter (Optional)
            </label>

            {authorizationPreview ? (
              <div className="relative w-full sm:w-80 rounded-xl border border-gray-200 overflow-hidden bg-gray-50 group">
                <img
                  src={authorizationPreview}
                  alt="Authorization letter"
                  className="w-full h-48 object-cover cursor-zoom-in"
                  onClick={() => openPreview(authorizationPreview)}
                />
                {!hasNonEditableExistingClaim && (
                  <button
                    type="button"
                    onClick={removeAuthorizationLetter}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => authorizationInputRef.current?.click()}
                disabled={hasNonEditableExistingClaim}
                className="w-full sm:w-80 border-2 border-dashed border-amber-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-amber-50/50 transition-colors"
              >
                <Upload className="w-7 h-7 text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">Upload Authorization Letter</span>
                <span className="text-xs text-gray-500">Use when claimant is not the owner</span>
              </button>
            )}
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-gray-300 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || hasNonEditableExistingClaim}
              className="w-full sm:flex-1 px-6 py-3 rounded-xl bg-[#29b6f6] hover:bg-[#039be5] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : isPendingExistingClaim ? 'Update Claim Form' : 'Submit Claim Form'}
            </button>
          </div>
        </form>
      </div>

      {showImagePreview && previewTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/85 p-3 sm:p-6 flex items-center justify-center"
          onClick={() => setShowImagePreview(false)}
        >
          <button
            type="button"
            onClick={() => setShowImagePreview(false)}
            className="absolute top-3 right-3 sm:top-5 sm:right-5 bg-black/60 hover:bg-black/75 text-white rounded-full p-2"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <img
            src={previewTarget}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
