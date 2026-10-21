import React, { useEffect, useCallback } from 'react';
import { AlertTriangle, Trash2, X, Loader2, ShieldAlert } from 'lucide-react';

export interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  recordName: string;
  recordType?: string;
  consequences?: string;
  consequenceMessage?: string;
  warningNote?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  onConfirm,
  title = 'Delete Record',
  recordName,
  recordType = 'Record',
  consequences,
  consequenceMessage,
  warningNote,
  confirmButtonText = 'Delete Record',
  cancelButtonText = 'Cancel',
  isDeleting = false,
}) => {
  const handleDismiss = onCancel || onClose || (() => {});
  const message = consequences || consequenceMessage;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || isDeleting) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        handleDismiss();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    },
    [isOpen, isDeleting, handleDismiss, onConfirm]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
        {/* Header with Danger Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-900/60">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3
                id="delete-dialog-title"
                className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white leading-tight"
              >
                {title}
              </h3>
              <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold tracking-wide uppercase">
                Destructive Action
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isDeleting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Record Identifier Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 space-y-1">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            {recordType} to be removed:
          </div>
          <div className="font-bold text-sm text-slate-900 dark:text-white break-words">
            {recordName}
          </div>
        </div>

        {/* Consequence Description */}
        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          <p>
            {message ||
              `Are you sure you want to delete this ${recordType.toLowerCase()}? This action cannot be undone and permanently removes this record from active management.`}
          </p>
          {warningNote && (
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{warningNote}</span>
            </div>
          )}
        </div>

        {/* Action Buttons: Cancel (safe) & Delete (danger) */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer disabled:opacity-50"
          >
            {cancelButtonText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs flex items-center gap-2 transition shadow-sm shadow-rose-600/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{confirmButtonText}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
