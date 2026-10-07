'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { ProjectData, ProjectMember, AiProjectPlan } from '@/types/todo';
import ConfirmDeleteModal from './ConfirmDeleteModal';

interface ProjectContextRailProps {
  project: ProjectData | null;
  members: ProjectMember[];
  currentUserId?: number;
  onLeave: (projectId: number) => Promise<any>;
  onDelete: (projectId: number) => Promise<any>;
  onOpenAiPlanner: () => void;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function ProjectContextRail({
  project,
  members,
  currentUserId,
  onLeave,
  onDelete,
  onOpenAiPlanner,
  onToast,
}: ProjectContextRailProps) {
  const isOwner = project && currentUserId === project.created_by;
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Parse plan_data jika ada
  const planData: AiProjectPlan | null = React.useMemo(() => {
    if (!project?.plan_data) return null;
    try {
      if (typeof project.plan_data === 'string') {
        return JSON.parse(project.plan_data);
      }
      return project.plan_data;
    } catch {
      return null;
    }
  }, [project?.plan_data]);

  const handleCopyCode = async () => {
    if (!project?.code) return;
    try {
      await navigator.clipboard.writeText(project.code);
      setCopied(true);
      onToast('success', `Kode tim "${project.code}" disalin ke clipboard.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      onToast('error', 'Gagal menyalin kode tim.');
    }
  };

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleProjectAction = () => {
    if (!project) return;
    if (isOwner) {
      setShowDeleteModal(true);
    } else {
      handleLeaveProject();
    }
  };

  const handleConfirmDelete = async () => {
    if (!project) return;
    setActionLoading(true);
    try {
      await onDelete(project.id);
      setShowDeleteModal(false);
      onToast('info', 'Ruang kelompok berhasil dihapus.');
    } catch (err: any) {
      onToast('error', err.message || 'Gagal menghapus ruang project.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveProject = async () => {
    if (!project) return;
    if (!confirm(`Keluar dari ruang kelompok "${project.name}"?`)) return;
    setActionLoading(true);
    try {
      await onLeave(project.id);
      onToast('info', 'Anda telah keluar dari ruang kelompok.');
    } catch (err: any) {
      onToast('error', err.message || 'Gagal keluar dari ruang project.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. PROJECT / WORKSPACE INFO CARD */}
      <Card className="border border-zinc-200/80">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
              Konteks Ruang Kerja
            </span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                project
                  ? 'bg-zinc-900 text-white border-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 border-zinc-200'
              }`}
            >
              {project ? 'Tim Terbuka' : 'Ruang Pribadi'}
            </span>
          </div>
          <CardTitle className="text-base sm:text-lg text-zinc-950 mt-1">
            {project ? project.name : 'Daftar Tugas Pribadi'}
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {project
              ? `Dikelola oleh @${project.creator_username || 'Admin'}`
              : 'Semua tugas terisolasi dan hanya dapat diakses oleh Anda.'}
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {project && (
            <>
              {/* Kode Undangan */}
              <div className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200/80">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Kode Undangan
                  </span>
                  <span className="font-mono font-bold text-xs text-zinc-900 tracking-wider">
                    {project.code}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={SPRING_TRANSITION}
                  type="button"
                  onClick={handleCopyCode}
                  className="px-2.5 py-1 text-xs font-semibold bg-white hover:bg-zinc-100 text-zinc-700 rounded-lg border border-zinc-200/80 transition-colors shadow-2xs cursor-pointer inline-flex items-center gap-1"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-emerald-700 font-bold">Disalin</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Salin</span>
                    </>
                  )}
                </motion.button>
              </div>

              {/* Danger Action: Leave / Delete */}
              <button
                type="button"
                onClick={handleProjectAction}
                disabled={actionLoading}
                className="w-full text-center text-xs font-semibold text-zinc-500 hover:text-red-600 transition-colors pt-1 cursor-pointer disabled:opacity-50"
              >
                {actionLoading
                  ? 'Memproses...'
                  : isOwner
                  ? 'Hapus Ruang Kelompok'
                  : 'Keluar dari Ruang'}
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {/* 2. AI INTELLIGENCE & PROJECT ARTIFACTS CARD */}
      <Card className="border border-zinc-200/80 bg-white shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
              AI Project Planner
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                planData
                  ? 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                  : 'bg-zinc-100 text-zinc-500'
              }`}
            >
              {planData ? 'Rencana Siap' : 'Belum Ada Rencana'}
            </span>
          </div>
          <CardTitle className="text-sm font-semibold text-zinc-950 mt-1">
            {planData ? planData.projectName : 'Rencanakan dengan AI'}
          </CardTitle>
          <p className="text-xs text-zinc-500">
            {planData
              ? `Tipe: ${planData.isSoftware !== false ? 'Software / Teknis' : 'Non-Software / Umum'}`
              : 'Jawab pertanyaan penajaman untuk menyusun PRD, ERD, dan tugas tim secara terstruktur.'}
          </p>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {/* Action Button: Open AI Modal */}
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            transition={SPRING_TRANSITION}
            type="button"
            onClick={onOpenAiPlanner}
            className="w-full inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <span>{planData ? 'Buka Dokumen & Rencana AI' : 'Mulai Sesi Grill-Me AI'}</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </motion.button>

          {/* Mini Milestones List if plan exists */}
          {planData && planData.milestones && planData.milestones.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <span className="text-[10px] font-medium text-zinc-400 block">
                Target Milestone
              </span>
              <ul className="space-y-1.5 text-xs">
                {planData.milestones.slice(0, 3).map((m, idx) => (
                  <li
                    key={idx}
                    className="p-2 bg-white rounded-lg border border-zinc-200/80 flex items-start gap-2 shadow-2xs"
                  >
                    <div className="w-4 h-4 rounded-full bg-zinc-100 text-zinc-800 text-[9px] font-mono font-medium flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-zinc-900 truncate">{m.title}</p>
                      <p className="text-[10px] text-zinc-400 truncate">{m.duration || m.phase}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. TEAM MEMBERS CARD (JIKA PROJECT AKTIF) */}
      {project && (
        <Card className="border border-zinc-200/80 bg-white">
          <CardHeader className="p-4 sm:p-5 pb-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-600">
                Anggota Tim Aktif
              </span>
              <span className="text-[10px] font-mono text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md border border-zinc-200">
                {members.length} Orang
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-5 pt-0">
            <ul className="divide-y divide-zinc-100">
              {members.map((member) => {
                const isMemberOwner = member.user_id === project.created_by;
                return (
                  <li
                    key={member.user_id}
                    className="py-2 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-zinc-100 text-zinc-800 font-mono font-medium text-xs flex items-center justify-center shrink-0 border border-zinc-200">
                        {member.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-zinc-900 truncate">
                          @{member.username}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          {isMemberOwner ? 'Ketua Proyek' : 'Anggota'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                        isMemberOwner
                          ? 'bg-zinc-900 text-white border-zinc-900'
                          : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                      }`}
                    >
                      {isMemberOwner ? 'Owner' : 'Member'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Pop-up Dialog Konfirmasi Hapus Workspace */}
      {project && (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          projectName={project.name}
          loading={actionLoading}
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
