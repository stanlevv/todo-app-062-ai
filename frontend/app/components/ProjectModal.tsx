'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<any>;
  onJoin: (code: string) => Promise<any>;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function ProjectModal({
  isOpen,
  onClose,
  onCreate,
  onJoin,
}: ProjectModalProps) {
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [projectName, setProjectName] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setProjectName('');
      setProjectCode('');
      setError(null);
    }
  }, [isOpen]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onCreate(projectName.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat ruang project.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectCode.trim()) return;

    setLoading(true);
    setError(null);
    try {
      await onJoin(projectCode.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal bergabung ke project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            className="relative w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl p-6 sm:p-7 shadow-2xl border border-zinc-200/90 z-10 space-y-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3.5">
              <h3 className="font-bold text-base sm:text-lg text-zinc-950 tracking-tight">
                {tab === 'create' ? 'Buat Ruang Kelompok Baru' : 'Gabung Ruang Kelompok'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-zinc-400 hover:text-zinc-700 p-1 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tab Selector */}
            <div className="flex bg-zinc-100 p-1 rounded-2xl gap-1">
              <button
                type="button"
                onClick={() => {
                  setTab('create');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                  tab === 'create'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>1. Buat Ruang Baru</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setTab('join');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                  tab === 'join'
                    ? 'bg-zinc-900 text-white shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>2. Gabung via Kode</span>
              </button>
            </div>

            {/* Mode Explanatory Banner */}
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/80 text-xs flex items-start gap-2.5">
              <div className="w-5 h-5 rounded-md bg-zinc-900 text-white flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                {tab === 'create' ? '+' : '🔑'}
              </div>
              <div className="space-y-0.5">
                <span className="font-semibold text-zinc-900 block text-xs">
                  {tab === 'create' ? 'Mode Terpilih: Buat Ruang Kelompok Baru' : 'Mode Terpilih: Gabung Ruang Kelompok'}
                </span>
                <p className="text-[11px] text-zinc-500 leading-normal">
                  {tab === 'create'
                    ? 'Anda akan menjadi pengelola ruang dan otomatis menerima kode undangan unik untuk dibagikan ke tim.'
                    : 'Gunakan kode undangan (misal: KEL-8942) yang Anda terima dari ketua ruang kelompok.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                {error}
              </div>
            )}

            {/* Tab 1: Buat Project */}
            {tab === 'create' && (
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Nama Ruang Proyek Kelompok:
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Contoh: Tim Tugas Akhir PWF"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Kode undangan unik akan dibuat otomatis setelah ruang dibuat.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                    type="submit"
                    disabled={loading || !projectName.trim()}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Membuat...' : 'Buat Ruang Baru'}
                  </motion.button>
                </div>
              </form>
            )}

            {/* Tab 2: Gabung Project */}
            {tab === 'join' && (
              <form onSubmit={handleJoin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                    Masukkan Kode Undangan Ruang:
                  </label>
                  <input
                    type="text"
                    value={projectCode}
                    onChange={(e) => setProjectCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: KEL-8942"
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs sm:text-sm font-mono tracking-wider text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 transition-all shadow-2xs"
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Pastikan kode undangan sesuai dengan yang dibagikan ketua kelompok Anda.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-2 text-xs font-medium text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                    type="submit"
                    disabled={loading || !projectCode.trim()}
                    className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Memverifikasi...' : 'Gabung Ruang Sekarang'}
                  </motion.button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
