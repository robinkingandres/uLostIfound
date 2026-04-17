import { X, Trash2 } from 'lucide-react';
import { useAdminTheme } from '../../contexts/AdminThemeContext';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message?: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this? This action cannot be undone.',
  confirmLabel = 'Delete',
  isLoading = false,
}: DeleteConfirmModalProps) {
  const { isDark } = useAdminTheme();
  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep modal open on error; parent handles user feedback
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl w-full max-w-md shadow-xl overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-white'}`}>
        <div className={`flex justify-between items-center p-6 border-b ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
          <h3 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{title}</h3>
          <button onClick={onClose} className={`transition-colors ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-gray-400 hover:text-gray-600'}`}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <p className={isDark ? 'text-slate-300' : 'text-gray-600'}>{message}</p>
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDark
                  ? 'border border-slate-700 text-slate-200 hover:bg-slate-800'
                  : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? 'Deleting...' : <><Trash2 className="w-4 h-4" />{confirmLabel}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
