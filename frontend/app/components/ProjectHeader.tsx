'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, ProjectMember } from '@/types/todo';
import { useAuth } from '@/hooks/useAuth';
import WorkspaceActivityLogModal from './WorkspaceActivityLogModal';

export interface WorkspaceResourceLink {
  id: string;
  title: string;
  url: string;
  category?: 'figma' | 'github' | 'docs' | 'domain' | 'other';
}

interface ProjectHeaderProps {
  project: ProjectData;
  members: ProjectMember[];
  onLeave: (projectId: number) => Promise<any>;
  onDelete: (projectId: number) => Promise<any>;
  onUpdateName?: (projectId: number, newName: string) => Promise<any>;
  onUpdateProject?: (projectId: number, payload: string | { name?: string; plan_data?: any }) => Promise<any>;
  onRemoveMember?: (projectId: number, userId: number) => Promise<any>;
  onTasksUpdated?: (todos: any[]) => void;
  onOpenSettings?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

const ROLE_PRESETS = ['PM', 'Frontend', 'Backend', 'UI/UX', 'Fullstack', 'QA', 'DevOps'];

export default function ProjectHeader({
  project,
  members,
  onUpdateProject,
  onToast,
}: ProjectHeaderProps) {
  const { user } = useAuth();
  const isOwner = user?.id === project.created_by;
  const [copied, setCopied] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Parse metadata from plan_data
  const parsedMetadata = useMemo(() => {
    if (!project.plan_data) return { links: [] as WorkspaceResourceLink[], member_roles: {} as Record<string, string> };
    try {
      const data = typeof project.plan_data === 'string' ? JSON.parse(project.plan_data) : project.plan_data;
      return {
        ...data,
        links: Array.isArray(data.links) ? (data.links as WorkspaceResourceLink[]) : [],
        member_roles: (data.member_roles || {}) as Record<string, string>,
      };
    } catch {
      return { links: [] as WorkspaceResourceLink[], member_roles: {} as Record<string, string> };
    }
  }, [project.plan_data]);

  // State untuk resource links & member roles
  const [links, setLinks] = useState<WorkspaceResourceLink[]>(parsedMetadata.links || []);
  const [memberRoles, setMemberRoles] = useState<Record<string, string>>(parsedMetadata.member_roles || {});

  // State form tambah link
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkCategory, setNewLinkCategory] = useState<'figma' | 'github' | 'docs' | 'domain' | 'other'>('other');
  const [savingMetadata, setSavingMetadata] = useState(false);

  // State edit peran anggota
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [customRoleInput, setCustomRoleInput] = useState('');

  // Sinkronkan state lokal saat project berubah
  React.useEffect(() => {
    setLinks(parsedMetadata.links || []);
    setMemberRoles(parsedMetadata.member_roles || {});
  }, [parsedMetadata]);

  // Salin kode project
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(project.code);
      setCopied(true);
      if (onToast) onToast('success', `Kode "${project.code}" disalin.`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Simpan perubahan metadata ke backend
  const persistMetadata = async (newLinks: WorkspaceResourceLink[], newRoles: Record<string, string>) => {
    setSavingMetadata(true);
    try {
      let baseData: any = {};
      if (project.plan_data) {
        try {
          baseData = typeof project.plan_data === 'string' ? JSON.parse(project.plan_data) : project.plan_data;
        } catch {
          baseData = {};
        }
      }

      const updatedPayload = {
        ...baseData,
        links: newLinks,
        member_roles: newRoles,
      };

      if (onUpdateProject) {
        await onUpdateProject(project.id, { plan_data: updatedPayload });
      }
      setLinks(newLinks);
      setMemberRoles(newRoles);
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal menyimpan data ruang kerja.');
    } finally {
      setSavingMetadata(false);
    }
  };

  // Handler Tambah Link Baru
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      if (onToast) onToast('error', 'Nama tautan dan URL wajib diisi.');
      return;
    }

    let formattedUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Auto-detect category jika masih 'other'
    let detectedCategory = newLinkCategory;
    if (detectedCategory === 'other') {
      const lower = formattedUrl.toLowerCase();
      if (lower.includes('figma.com')) detectedCategory = 'figma';
      else if (lower.includes('github.com')) detectedCategory = 'github';
      else if (lower.includes('docs.') || lower.includes('notion.site') || lower.includes('/docs')) detectedCategory = 'docs';
      else detectedCategory = 'domain';
    }

    const newLinkItem: WorkspaceResourceLink = {
      id: `link-${Date.now()}`,
      title: newLinkTitle.trim(),
      url: formattedUrl,
      category: detectedCategory,
    };

    const updated = [...links, newLinkItem];
    await persistMetadata(updated, memberRoles);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkCategory('other');
    setIsAddingLink(false);
    if (onToast) onToast('success', `Tautan "${newLinkItem.title}" berhasil ditambahkan.`);
  };

  // Handler Hapus Link
  const handleDeleteLink = async (id: string, title: string) => {
    const updated = links.filter((l) => l.id !== id);
    await persistMetadata(updated, memberRoles);
    if (onToast) onToast('info', `Tautan "${title}" dihapus.`);
  };

  // Handler Simpan Role Anggota
  const handleSaveRole = async (userId: number, roleText: string) => {
    const updatedRoles = {
      ...memberRoles,
      [userId]: roleText.trim(),
    };
    await persistMetadata(links, updatedRoles);
    setEditingUserId(null);
    setCustomRoleInput('');
    if (onToast) onToast('success', 'Peran anggota berhasil diperbarui.');
  };

  // Helper render ikon kategori link
  const renderLinkIcon = (category?: string, url?: string) => {
    const targetCat = category || '';
    const lowerUrl = (url || '').toLowerCase();

    if (targetCat === 'github' || lowerUrl.includes('github.com')) {
      return (
        <svg className="w-3.5 h-3.5 text-zinc-800" fill="currentColor" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
        </svg>
      );
    }

    if (targetCat === 'figma' || lowerUrl.includes('figma.com')) {
      return (
        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h10a2 2 0 012 2v12a4 4 0 01-4 4H7z" />
        </svg>
      );
    }

    if (targetCat === 'docs' || lowerUrl.includes('notion') || lowerUrl.includes('docs.')) {
      return (
        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }

    return (
      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    );
  };

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-zinc-200/80 p-5 shadow-2xs space-y-4">
      {/* 1. BAGIAN ATAS: NAMA PROJECT, INFO DASAR, LOG & KODE SALIN */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3.5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-base sm:text-lg font-semibold text-zinc-950 tracking-tight">
              {project.name}
            </h2>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Dikelola oleh <span className="font-medium text-zinc-700">@{project.creator_username || 'Admin'}</span>
          </p>
        </div>

        {/* Action Controls: Salin Kode & Buka Log */}
        <div className="flex items-center gap-2 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
            type="button"
            onClick={handleCopyCode}
            title="Klik untuk menyalin kode ruang"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-800 text-xs font-mono font-medium rounded-xl border border-zinc-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>{project.code}</span>
            <span className="text-[10px] text-zinc-500 font-sans font-medium ml-0.5">
              {copied ? 'Tersalin' : 'Salin'}
            </span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
            type="button"
            onClick={() => setShowActivityModal(true)}
            title="Lihat log audit aktivitas workspace"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-xl border border-zinc-200/90 shadow-2xs transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Log</span>
          </motion.button>
        </div>
      </div>

      {/* 2. BAGIAN ANGGOTA TIM: 1.xxxx pm, 2.xxxx frontend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-900 tracking-tight">
            Project Team Members ({members.length})
          </span>
          <span className="text-[11px] text-zinc-400">
            Klik peran untuk menyesuaikan tugas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {members.map((member, index) => {
            const isMemberOwner = member.user_id === project.created_by;
            const currentRole =
              memberRoles[member.user_id] || (isMemberOwner ? 'Project Manager' : 'Developer');
            const isEditing = editingUserId === member.user_id;

            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-200/70 bg-zinc-50/50 hover:bg-white transition-colors gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-mono font-medium text-zinc-400 shrink-0">
                    {index + 1}.
                  </span>
                  <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium text-[10px] shrink-0">
                    {member.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 truncate">
                    <p className="text-xs font-medium text-zinc-900 truncate">
                      {member.username}
                    </p>
                  </div>
                </div>

                {/* Role Pill & Inline Editor */}
                {isEditing ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="text"
                      autoFocus
                      value={customRoleInput}
                      onChange={(e) => setCustomRoleInput(e.target.value)}
                      placeholder="Role (cth. PM, Frontend)"
                      className="w-24 px-1.5 py-0.5 text-[11px] border border-zinc-300 rounded-md bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRole(member.user_id, customRoleInput || currentRole)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                      title="Simpan"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUserId(null)}
                      className="p-1 text-zinc-400 hover:bg-zinc-100 rounded-md transition-colors"
                      title="Batal"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUserId(member.user_id);
                      setCustomRoleInput(currentRole);
                    }}
                    title="Klik untuk mengubah peran anggota"
                    className="shrink-0 text-[11px] px-2 py-0.5 rounded-lg bg-zinc-200/80 hover:bg-zinc-300/80 text-zinc-800 font-medium transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{currentRole}</span>
                    <svg className="w-2.5 h-2.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BAGIAN DOKUMENTASI & TAUTAN PROYEK (FIGMA, REPO GITHUB, DOCS, DOMAIN) */}
      <div className="space-y-2.5 border-t border-zinc-100 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-zinc-900 tracking-tight">
              Dokumentasi & Tautan Resource
            </span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-500 font-mono">
              {links.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAddingLink(!isAddingLink)}
            className="text-xs text-zinc-700 hover:text-zinc-950 font-medium inline-flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>{isAddingLink ? 'Tutup Form' : '+ Tambah Tautan'}</span>
          </button>
        </div>

        {/* Form Tambah Tautan Fleksibel */}
        <AnimatePresence>
          {isAddingLink && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddLink}
              className="p-3 bg-zinc-50 border border-zinc-200/90 rounded-xl space-y-2.5 overflow-hidden"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Nama Tautan (cth. Figma UI, Repo GitHub)"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900"
                />
                <input
                  type="text"
                  placeholder="URL (cth. https://github.com/...)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-zinc-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-zinc-900 sm:col-span-2"
                />
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs text-zinc-600">
                  <span className="text-[11px]">Kategori:</span>
                  {(['github', 'figma', 'docs', 'domain', 'other'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewLinkCategory(cat)}
                      className={`text-[10px] px-2 py-0.5 rounded-md capitalize transition-colors ${
                        newLinkCategory === cat
                          ? 'bg-zinc-900 text-white font-medium'
                          : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingLink(false)}
                    className="px-2.5 py-1 text-xs text-zinc-500 hover:text-zinc-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={savingMetadata}
                    className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingMetadata ? 'Menyimpan...' : 'Simpan Tautan'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Grid List Tautan Fleksibel */}
        {links.length === 0 ? (
          <p className="text-xs text-zinc-400 italic py-1">
            Belum ada tautan resource. Klik &ldquo;+ Tambah Tautan&rdquo; untuk menambahkan link repo GitHub, Figma, dokumen PRD, atau domain.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 shadow-2xs transition-colors group"
              >
                <div className="shrink-0">{renderLinkIcon(link.category, link.url)}</div>
                <a
                  href={/^https?:\/\//i.test(link.url) ? link.url : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-800 hover:text-zinc-950 hover:underline flex items-center gap-1"
                >
                  <span>{link.title}</span>
                  <svg className="w-3 h-3 text-zinc-400 group-hover:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <button
                  type="button"
                  onClick={() => handleDeleteLink(link.id, link.title)}
                  title="Hapus tautan ini"
                  className="p-0.5 text-zinc-300 hover:text-red-600 rounded-md transition-colors cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Log Aktivitas Workspace */}
      <WorkspaceActivityLogModal
        isOpen={showActivityModal}
        onClose={() => setShowActivityModal(false)}
        project={project}
      />
    </div>
  );
}
