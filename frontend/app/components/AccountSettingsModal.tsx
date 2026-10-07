'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '@/hooks/useAuth';
import { authApi } from '@/lib/api';

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TabType = 'profile' | 'security';

export default function AccountSettingsModal({
  isOpen,
  onClose,
  user,
  onLogout,
  onToast,
}: AccountSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  // Security Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword) {
      onToast('error', 'Semua kolom password wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      onToast('error', 'Password baru minimal 6 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      onToast('error', 'Konfirmasi password baru tidak cocok.');
      return;
    }

    setSecurityLoading(true);
    try {
      const res = await authApi.changePassword({ oldPassword, newPassword });
      if (res.success) {
        onToast('success', 'Password berhasil diperbarui.');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      onToast('error', err.message || 'Gagal mengubah password.');
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
          />

          {/* Slide-over Right Side Drawer (Non-Popup & Simetris) */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            aria-label="Panel Pengaturan Profil"
            className="fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[450px] bg-white border-l border-zinc-200/90 shadow-2xl flex flex-col z-50"
          >
            {/* Header Drawer */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                  <svg className="w-4 h-4 text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.8}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-zinc-950 tracking-tight">
                    Pengaturan Profil
                  </h2>
                  <p className="text-[11px] text-zinc-500">Kelola akun dan kredensial keamanan</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                title="Tutup Panel"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* 1. Symmetrical User Profile Card */}
              <div className="p-4 rounded-2xl bg-zinc-50/80 border border-zinc-200/80 flex items-center gap-3.5 shadow-2xs">
                <div className="w-12 h-12 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm text-zinc-950 truncate">
                      {user?.username || 'Pengguna'}
                    </h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 shrink-0">
                      ID #{user?.id || '-'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">
                    {user?.email || 'email@domain.com'}
                  </p>
                </div>
              </div>

              {/* 2. Symmetrical 50/50 Tab Switcher */}
              <div className="flex items-center p-1 bg-zinc-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                    activeTab === 'profile'
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Profil Pengguna
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('security')}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                    activeTab === 'security'
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Keamanan & Sandi
                </button>
              </div>

              {/* 3. Tab Contents */}
              {activeTab === 'profile' ? (
                <div className="space-y-3.5 pt-1">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Username
                      </label>
                      <span className="text-[10px] text-zinc-400">Permanen</span>
                    </div>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                        Alamat Email
                      </label>
                      <span className="text-[10px] text-zinc-400">Terdaftar</span>
                    </div>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-700 cursor-not-allowed select-none"
                    />
                  </div>

                  <div className="p-3 rounded-xl border border-zinc-200/70 bg-zinc-50/50 space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-700 font-medium text-xs">
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Status Akun Aktif</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">
                      Akun Anda terhubung dengan server MySQL lokal. Untuk memperbarui kredensial atau sandi, gunakan tab Keamanan & Sandi.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleChangePassword} className="space-y-3 pt-1">
                  {/* Password Lama */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      Password Lama:
                    </label>
                    <div className="relative">
                      <input
                        type={showOld ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Masukkan password saat ini"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900 text-xs shadow-2xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOld(!showOld)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                        title={showOld ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showOld ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Baru */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      Password Baru:
                    </label>
                    <div className="relative">
                      <input
                        type={showNew ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimal 6 karakter"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900 text-xs shadow-2xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNew(!showNew)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                        title={showNew ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showNew ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Konfirmasi Password Baru */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
                      Konfirmasi Password Baru:
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Ulangi password baru"
                        required
                        className="w-full px-3.5 py-2.5 pr-10 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white text-zinc-900 text-xs shadow-2xs transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-1 cursor-pointer"
                        title={showConfirm ? 'Sembunyikan' : 'Tampilkan'}
                      >
                        {showConfirm ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={securityLoading}
                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl transition-all shadow-xs text-xs cursor-pointer disabled:opacity-50"
                    >
                      {securityLoading ? 'Menyimpan...' : 'Simpan Password Baru'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer Drawer Symmetrical Actions: Logout */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between gap-3 shrink-0">
              <span className="text-[11px] text-zinc-500">
                Sesi masuk aktif
              </span>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-red-50 text-zinc-700 hover:text-red-600 font-medium rounded-xl border border-zinc-200/90 hover:border-red-200 transition-colors text-xs cursor-pointer shadow-2xs group"
              >
                <svg
                  className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span>Keluar (Logout)</span>
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
