'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { projectApi } from '@/lib/api';
import { ProjectData } from '@/types/todo';

interface ActivityItem {
  id: number;
  project_id: number;
  user_id: number | null;
  action: string;
  details: string;
  created_at: string;
  username?: string | null;
}

interface WorkspaceActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
}

function formatTimeAgo(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Baru saja';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} jam lalu`;
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function getActionBadge(action: string) {
  switch (action) {
    case 'TASK_CREATED':
      return {
        label: 'Tugas Baru',
        badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        dotClass: 'bg-zinc-900',
      };
    case 'TASK_COMPLETED':
      return {
        label: 'Selesai',
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-600',
      };
    case 'TASK_UNCOMPLETED':
      return {
        label: 'Dibuka Kembali',
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-600',
      };
    case 'TASK_DELETED':
      return {
        label: 'Dihapus',
        badgeClass: 'bg-red-50 text-red-800 border-red-200',
        dotClass: 'bg-red-600',
      };
    case 'AI_ACTION':
      return {
        label: 'Aksi AI',
        badgeClass: 'bg-zinc-100 text-zinc-900 border-zinc-300 font-semibold',
        dotClass: 'bg-zinc-900',
      };
    case 'MEMBER_JOINED':
    case 'MEMBER_LEFT':
    case 'MEMBER_REMOVED':
      return {
        label: 'Anggota',
        badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
        dotClass: 'bg-zinc-600',
      };
    case 'OWNERSHIP_TRANSFERRED':
      return {
        label: 'Transfer Pemilik',
        badgeClass: 'bg-zinc-900 text-white font-semibold',
        dotClass: 'bg-zinc-900',
      };
    case 'PROJECT_RENAMED':
    case 'PROJECT_METADATA_UPDATED':
      return {
        label: 'Ruang Kerja',
        badgeClass: 'bg-zinc-100 text-zinc-800 border-zinc-200',
        dotClass: 'bg-zinc-700',
      };
    default:
      return {
        label: 'Aktivitas',
        badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200',
        dotClass: 'bg-zinc-400',
      };
  }
}

export default function WorkspaceActivityLogModal({
  isOpen,
  onClose,
  project,
}: WorkspaceActivityLogModalProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActivities = useCallback(async () => {
    if (!project) return;
    setLoading(true);
    setError(null);
    try {
      const res = await projectApi.getActivities(project.id);
      if (res.success && res.data) {
        setActivities(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat log aktivitas.');
    } finally {
      setLoading(false);
    }
  }, [project]);

  useEffect(() => {
    if (isOpen) {
      fetchActivities();
    }
  }, [isOpen, fetchActivities]);

  if (!isOpen || !project) return null;

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

        {/* Slide-over Right Drawer (Non-Popup & Simetris) */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 260 }}
          aria-label="Panel Log Aktivitas"
          className="fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[460px] bg-white border-l border-zinc-200/90 shadow-2xl flex flex-col z-50"
        >
          {/* Header Drawer */}
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-950 tracking-tight">
                  Log Aktivitas
                </h3>
                <p className="text-[11px] text-zinc-500 truncate max-w-[240px]">
                  {project.name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchActivities}
                title="Muat Ulang Log"
                disabled={loading}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
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
          </div>

          {/* Activity Timeline List */}
          <div className="p-5 overflow-y-auto space-y-3 flex-1 bg-zinc-50/20">
            {loading && activities.length === 0 ? (
              <div className="py-12 text-center text-xs text-zinc-400">
                Memuat riwayat aktivitas...
              </div>
            ) : error ? (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200">
                {error}
              </div>
            ) : activities.length === 0 ? (
              <div className="py-12 text-center space-y-1">
                <p className="text-xs font-medium text-zinc-700">Belum ada aktivitas tercatat</p>
                <p className="text-[11px] text-zinc-400">
                  Setiap perubahan tugas atau tim di ruang kerja ini akan muncul di sini.
                </p>
              </div>
            ) : (
              <div className="relative pl-4 border-l border-zinc-200 space-y-3.5 my-1">
                {activities.map((act) => {
                  const meta = getActionBadge(act.action);
                  return (
                    <div key={act.id} className="relative group">
                      {/* Timeline dot */}
                      <span
                        className={`absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${meta.dotClass}`}
                      />

                      <div className="bg-white border border-zinc-200/80 p-3 rounded-2xl shadow-2xs hover:border-zinc-300 transition-colors space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-[9px] font-medium px-1.5 py-0.2 rounded border ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                            <span className="text-xs font-semibold text-zinc-900">
                              @{act.username || 'Sistem'}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400 shrink-0 font-mono">
                            {formatTimeAgo(act.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-600 leading-relaxed">
                          {act.details}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 border-t border-zinc-100 bg-zinc-50/50 flex justify-between items-center text-xs text-zinc-400 shrink-0">
            <span className="text-[11px]">Total {activities.length} aktivitas</span>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-zinc-200/60 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  );
}
