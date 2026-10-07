'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, ProjectMember } from '@/types/todo';

interface WorkspaceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  members: ProjectMember[];
  currentUserId?: number;
  onUpdateName: (projectId: number, newName: string) => Promise<any>;
  onRemoveMember: (projectId: number, userId: number) => Promise<any>;
  onTransferOwnership?: (projectId: number, targetUserId: number) => Promise<any>;
  onRequestDelete: () => void;
  onLeaveProject: (projectId: number) => Promise<any>;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function WorkspaceSettingsModal({
  isOpen,
  onClose,
  project,
  members,
  currentUserId,
  onUpdateName,
  onRemoveMember,
  onTransferOwnership,
  onRequestDelete,
  onLeaveProject,
  onToast,
}: WorkspaceSettingsModalProps) {
  const isOwner = project && currentUserId === project.created_by;
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'danger'>('general');
  const [name, setName] = useState(project?.name || '');
  const [savingName, setSavingName] = useState(false);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedTransferUserId, setSelectedTransferUserId] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setActiveTab('general');
      setSelectedTransferUserId(null);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === project.name) return;

    setSavingName(true);
    try {
      await onUpdateName(project.id, name.trim());
      if (onToast) onToast('success', 'Nama ruang kerja berhasil diperbarui.');
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal mengubah nama ruang kerja.');
    } finally {
      setSavingName(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(project.code);
      setCopied(true);
      if (onToast) onToast('success', `Kode undangan "${project.code}" disalin.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleKick = async (memberUserId: number, memberUsername: string) => {
    if (!confirm(`Keluarkan @${memberUsername} dari ruang kelompok ini?`)) return;
    setActionLoading(true);
    try {
      await onRemoveMember(project.id, memberUserId);
      if (onToast) onToast('info', `@${memberUsername} telah dikeluarkan.`);
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal mengeluarkan anggota.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferOwnership = async (memberUserId: number, memberUsername: string) => {
    if (
      !confirm(
        `Yakin ingin mentransfer kepemilikan ruang "${project.name}" kepada @${memberUsername}?\n\nSetelah transfer berhasil, Anda akan menjadi anggota biasa.`
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      if (onTransferOwnership) {
        await onTransferOwnership(project.id, memberUserId);
        if (onToast) onToast('success', `Kepemilikan berhasil ditransfer kepada @${memberUsername}.`);
      }
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal mentransfer kepemilikan.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!confirm(`Keluar dari ruang kelompok "${project.name}"?`)) return;
    setActionLoading(true);
    try {
      await onLeaveProject(project.id);
      onClose();
      if (onToast) onToast('info', 'Anda telah keluar dari ruang kerja.');
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal keluar dari ruang kerja.');
    } finally {
      setActionLoading(false);
    }
  };

  const nonOwnerMembers = members.filter((m) => m.user_id !== currentUserId);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden font-sans">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
        />

        {/* Side-over Right Drawer (Non-Popup & Simetris) */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          aria-label="Panel Pengaturan Ruang Kerja"
          className="fixed inset-y-0 right-0 w-full sm:w-[440px] md:w-[480px] bg-white border-l border-zinc-200/90 shadow-2xl flex flex-col z-50"
        >
          {/* Header Drawer */}
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 tracking-tight">
                  Pengaturan Ruang Kerja
                </h3>
                <p className="text-[11px] text-zinc-500">
                  {project.name}
                </p>
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

          {/* Symmetrical Navigation Tabs */}
          <div className="p-3 border-b border-zinc-100 bg-zinc-50/30">
            <div className="flex items-center p-1 bg-zinc-100 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('general')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === 'general'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                Informasi Umum
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
                  activeTab === 'members'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950'
                }`}
              >
                <span>Anggota</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeTab === 'members' ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-zinc-700'
                }`}>
                  {members.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('danger')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer text-center ${
                  activeTab === 'danger'
                    ? 'bg-red-600 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-red-600'
                }`}
              >
                Zona Bahaya
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-5 overflow-y-auto space-y-4 flex-1">
            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                {/* Form Ubah Nama */}
                <form onSubmit={handleSaveName} className="space-y-2">
                  <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                    Nama Ruang Kerja
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Masukkan nama workspace..."
                      className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 bg-white"
                    />
                    <button
                      type="submit"
                      disabled={savingName || !name.trim() || name.trim() === project.name}
                      className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                    >
                      {savingName ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </form>

                {/* Kode Undangan */}
                <div className="p-4 bg-zinc-50/80 rounded-2xl border border-zinc-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Kode Undangan Ruang
                      </span>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        Bagikan kode ini kepada rekan tim untuk bergabung.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-800 text-xs font-mono font-medium rounded-xl border border-zinc-200 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span>{project.code}</span>
                      <span className="text-[10px] font-sans text-zinc-500">
                        {copied ? 'Tersalin!' : 'Salin'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Metadata Ruang */}
                <div className="text-xs text-zinc-500 space-y-1.5 pt-2 border-t border-zinc-100">
                  <div className="flex justify-between">
                    <span>Pemilik Ruang:</span>
                    <span className="font-medium text-zinc-800">@{project.creator_username || 'Admin'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Dibuat Pada:</span>
                    <span className="font-mono text-zinc-700">
                      {project.created_at ? new Date(project.created_at).toLocaleDateString('id-ID') : '-'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === 'members' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    Anggota yang memiliki akses kolaborasi pada ruang kerja ini.
                  </p>
                </div>

                <div className="divide-y divide-zinc-100 border border-zinc-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                  {members.map((m) => {
                    const isMemberOwner = m.user_id === project.created_by;
                    const isSelf = m.user_id === currentUserId;
                    return (
                      <div key={m.id} className="p-3.5 flex items-center justify-between hover:bg-zinc-50/50 transition-colors gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-mono font-medium text-xs shrink-0 shadow-2xs">
                            {m.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-zinc-900 truncate">
                                {m.username}
                              </span>
                              {isSelf && (
                                <span className="text-[9px] bg-zinc-100 text-zinc-600 px-1.5 py-0.2 rounded font-medium">
                                  Anda
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-zinc-400 truncate block">
                              {m.email}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                              isMemberOwner
                                ? 'bg-zinc-900 text-white'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {isMemberOwner ? 'Pemilik' : 'Anggota'}
                          </span>

                          {/* Tombol Transfer Kepemilikan (Khusus Pemilik terhadap anggota lain) */}
                          {isOwner && !isMemberOwner && !isSelf && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleTransferOwnership(m.user_id, m.username)}
                              title={`Transfer kepemilikan ke @${m.username}`}
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-zinc-600 hover:text-amber-800 hover:bg-amber-50/80 rounded-lg border border-transparent hover:border-amber-200 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 16l3-8 4 4 4-4 3 8H5z" />
                              </svg>
                              <span className="hidden sm:inline">Transfer</span>
                            </button>
                          )}

                          {/* Tombol Keluarkan Anggota (Hanya Pemilik dan bukan diri sendiri) */}
                          {isOwner && !isMemberOwner && !isSelf && (
                            <button
                              type="button"
                              disabled={actionLoading}
                              onClick={() => handleKick(m.user_id, m.username)}
                              title="Keluarkan dari ruang"
                              className="p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-4">
                {/* 1. Transfer Kepemilikan (Jika Pemilik) */}
                {isOwner && (
                  <div className="p-4 bg-zinc-50 border border-zinc-200/80 rounded-2xl space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 16l3-8 4 4 4-4 3 8H5z" />
                        </svg>
                        <h4 className="text-xs font-semibold text-zinc-950">
                          Transfer Kepemilikan Ruang Kerja
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed mt-1">
                        Serahkan hak pemilik penuh ruang kerja ini kepada anggota tim lain. Setelah transfer, status Anda berubah menjadi anggota biasa.
                      </p>
                    </div>

                    {nonOwnerMembers.length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic">
                        Belum ada anggota lain di ruang kerja ini yang bisa menerima kepemilikan.
                      </p>
                    ) : (
                      <div className="flex gap-2">
                        <select
                          value={selectedTransferUserId || ''}
                          onChange={(e) => setSelectedTransferUserId(Number(e.target.value) || null)}
                          className="flex-1 px-3 py-2 text-xs rounded-xl border border-zinc-200 bg-white text-zinc-800 focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                        >
                          <option value="">-- Pilih Anggota Tim Baru --</option>
                          {nonOwnerMembers.map((m) => (
                            <option key={m.id} value={m.user_id}>
                              @{m.username} ({m.email})
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={actionLoading || !selectedTransferUserId}
                          onClick={() => {
                            const target = nonOwnerMembers.find((m) => m.user_id === selectedTransferUserId);
                            if (target) handleTransferOwnership(target.user_id, target.username);
                          }}
                          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shrink-0 shadow-2xs"
                        >
                          Transfer
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Hapus atau Keluar Ruang */}
                <div className="p-4 bg-red-50/60 border border-red-200/80 rounded-2xl space-y-2">
                  <h4 className="text-xs font-semibold text-red-900">
                    Tindakan Kritis
                  </h4>
                  <p className="text-xs text-red-700/80 leading-relaxed">
                    {isOwner
                      ? 'Menghapus ruang kelompok ini akan menghapus seluruh data tugas bersama dan riwayat kolaborasi secara permanen.'
                      : 'Keluar dari ruang kelompok ini akan mencabut akses Anda terhadap tugas-tugas di dalamnya.'}
                  </p>
                </div>

                <div className="pt-1">
                  {isOwner ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => {
                        onClose();
                        onRequestDelete();
                      }}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      Hapus Ruang Kerja Permanen
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleLeave}
                      className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      Keluar dari Ruang Kerja
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
