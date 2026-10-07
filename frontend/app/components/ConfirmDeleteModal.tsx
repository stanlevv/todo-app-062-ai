'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  projectName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function ConfirmDeleteModal({
  isOpen,
  projectName,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onCancel}
          className="fixed inset-0 bg-transparent"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={SPRING_TRANSITION}
          className="relative w-full max-w-md bg-white rounded-2xl p-5 sm:p-6 shadow-xl border border-zinc-200/90 z-10 space-y-4"
        >
          {/* Header & Warning Icon */}
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-sm sm:text-base text-zinc-950 tracking-tight">
                Hapus Ruang Kelompok?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Anda akan menghapus ruang <span className="font-semibold text-zinc-900">&ldquo;{projectName}&rdquo;</span>. Seluruh tugas tim, target milestones, dan keanggotaan kelompok akan dihapus secara permanen dari server.
              </p>
            </div>
          </div>

          <div className="p-3 bg-red-50/60 rounded-xl border border-red-200/60 text-[11px] text-red-700 leading-relaxed">
            ⚠️ Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              className="flex-1 py-2 text-xs font-medium text-zinc-700 hover:text-zinc-950 bg-zinc-100 hover:bg-zinc-200/70 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onConfirm}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Menghapus...</span>
                </>
              ) : (
                <span>Hapus Ruang Permanen</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
