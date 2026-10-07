'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Todo } from '@/types/todo';

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  todo: Todo | null;
  onToggle?: (id: number) => void;
  onDelete?: (id: number) => void;
  projectName?: string;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function TaskDetailModal({
  isOpen,
  onClose,
  todo,
  onToggle,
  onDelete,
  projectName,
}: TaskDetailModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !todo) return null;

  const rawText = todo.title || todo.task || '';
  const match = rawText.match(/^\[([A-Z0-9\/\-]+)\]\s*(.*)$/);
  const role = match ? match[1] : null;
  const cleanTitle = match ? match[2] : rawText;

  const handleCopyText = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={SPRING_TRANSITION}
          className="relative w-full max-w-lg bg-white rounded-3xl border border-zinc-200/90 shadow-2xl p-6 sm:p-7 z-10 space-y-6"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                  {projectName || (todo.project_name ? `Ruang Tim: ${todo.project_name}` : 'Tugas Pribadi')}
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-100 text-zinc-600 rounded">
                  #{todo.id}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-zinc-950 tracking-tight mt-1">
                Detail Tugas
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Task Content */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Uraian Tugas
              </label>
              <div className="flex items-start gap-2 bg-zinc-50/80 p-3.5 rounded-2xl border border-zinc-200/70">
                {role && (
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 border border-blue-200 shrink-0">
                    [{role}]
                  </span>
                )}
                <p className="text-sm sm:text-base font-semibold text-zinc-900 leading-snug break-words flex-1">
                  {cleanTitle}
                </p>
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-2xs">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Status
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  {todo.completed ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-lg">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span>Selesai</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-lg">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      <span>Belum Selesai</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-zinc-100 shadow-2xs">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Pembuat
                </label>
                <div className="mt-1.5">
                  <span className="inline-flex items-center text-xs font-semibold text-zinc-700 bg-zinc-100 px-2.5 py-1 rounded-lg border border-zinc-200/70">
                    @{todo.creator_username || 'Anda'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-2 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              {onToggle && (
                <button
                  type="button"
                  onClick={() => {
                    onToggle(todo.id);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    todo.completed
                      ? 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                  }`}
                >
                  {todo.completed ? 'Batal Selesai' : 'Tandai Selesai'}
                </button>
              )}

              <button
                type="button"
                onClick={handleCopyText}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl transition-colors cursor-pointer"
              >
                <span>{copied ? 'Tersalin ✓' : 'Salin Teks'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/task/${todo.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                title="Buka halaman tautan langsung di tab baru"
              >
                <span>Buka Link Tab Baru ↗</span>
              </Link>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
