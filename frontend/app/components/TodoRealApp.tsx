'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';
import { useTodos } from '@/hooks/useTodos';
import DashboardSidebar from './DashboardSidebar';
import DashboardKpiCards from './DashboardKpiCards';
import ProjectHeader from './ProjectHeader';
import TodoList from './TodoList';
import ProjectModal from './ProjectModal';
import AccountSettingsModal from './AccountSettingsModal';
import WorkspaceSettingsModal from './WorkspaceSettingsModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import WorkspaceAskAiDrawer from './WorkspaceAskAiDrawer';
import AiPlannerView from './AiPlannerView';
import CommandPaletteModal from './CommandPaletteModal';
import ToastNotification, { ToastState } from './ToastNotification';

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function TodoRealApp() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const {
    projects,
    activeProject,
    members,
    fetchProjects,
    selectProject,
    createProject,
    joinProject,
    leaveProject,
    deleteProject,
    updateProject,
    removeMember,
    transferOwnership,
  } = useProjects();

  // Navigation & Modals State
  const [activeView, setActiveView] = useState<'todos' | 'ai-planner'>('todos');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isAskAiOpen, setIsAskAiOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('openrouter/free');
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [isDeleteWorkspaceOpen, setIsDeleteWorkspaceOpen] = useState(false);
  const [deleteWorkspaceLoading, setDeleteWorkspaceLoading] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Global Shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedModel = localStorage.getItem('preferred_ai_model');
      if (savedModel) setCurrentModel(savedModel);
    }

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 3500);
  };

  // Todo hook with active project ID
  const {
    todos,
    loading: todosLoading,
    error: todosError,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    stats,
    addTodo,
    toggleTodo,
    updateTodoText,
    deleteTodo,
    refresh,
  } = useTodos(activeProject?.id);

  // Redirect to login if unauthenticated once auth resolves
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-7 h-7 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 flex font-sans">
      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={() => setToast(null)} />

      {/* 1. COLLAPSIBLE SIDEBAR */}
      <DashboardSidebar
        user={user}
        projects={projects}
        activeProject={activeProject}
        onSelectProject={selectProject}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        activeView={activeView}
        onSelectView={setActiveView}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      {/* 2. MAIN CONTENT AREA */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Mobile Header Bar */}
        <header className="lg:hidden bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
            aria-label="Buka Menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex items-center gap-2 font-medium text-sm text-zinc-900">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center text-[10px]">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="tracking-tight">
              {activeView === 'ai-planner'
                ? 'AI Project Planner'
                : activeProject
                ? activeProject.name
                : 'Tugas Pribadi'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsAccountModalOpen(true)}
            className="w-7 h-7 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs cursor-pointer"
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </button>
        </header>

        {/* View Switcher: Todos vs AI Planner View */}
        {activeView === 'ai-planner' ? (
          <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-6xl w-full mx-auto space-y-4">
            <AiPlannerView
              activeProject={activeProject}
              onBackToTodos={() => setActiveView('todos')}
              onPlanApplied={async ({ tasksCreated }) => {
                showToast('success', `${tasksCreated} tugas berhasil diterapkan ke workspace.`);
                await fetchProjects();
                refresh();
                setActiveView('todos');
              }}
              onToast={showToast}
            />
          </main>
        ) : (
          <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-5xl w-full mx-auto space-y-5 sm:space-y-6">
            {/* Top Title & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-200/70 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-900" />
                  <h1 className="text-xl sm:text-2xl font-semibold text-zinc-950 tracking-tight">
                    {activeProject ? activeProject.name : 'Daftar Tugas Pribadi'}
                  </h1>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  {activeProject
                    ? `Ruang kolaborasi tim • Kode: ${activeProject.code} • Dikelola oleh @${activeProject.creator_username || 'Admin'}`
                    : 'Workspace tugas pribadi Anda'}
                </p>
              </div>

              {/* Top Right: Workspace Context Controls */}
              <div className="flex items-center gap-2">
                {activeProject ? (
                  <>
                    {/* Ask AI Button (Membuka Side Drawer Kanan) */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_TRANSITION}
                      type="button"
                      onClick={() => setIsAskAiOpen(true)}
                      title="Buka AI Co-Pilot untuk ruang kerja ini"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Ask AI</span>
                    </motion.button>

                    {/* Setting Workspace Button (Menggantikan tombol Keluar) */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_TRANSITION}
                      type="button"
                      onClick={() => setIsWorkspaceSettingsOpen(true)}
                      title="Pengaturan ruang kerja dan anggota"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-xl border border-zinc-200/90 shadow-2xs transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Setting Workspace</span>
                    </motion.button>
                  </>
                ) : (
                  <>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_TRANSITION}
                      type="button"
                      onClick={() => setActiveView('ai-planner')}
                      title="Buka AI Project Planner & Grill-Me"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span>AI Project Planner</span>
                    </motion.button>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      transition={SPRING_TRANSITION}
                      type="button"
                      onClick={logout}
                      title="Keluar dari sesi dan kembali ke Landing Page"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-medium rounded-xl border border-zinc-200/90 shadow-2xs transition-colors cursor-pointer group"
                    >
                      <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-red-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Keluar</span>
                    </motion.button>
                  </>
                )}
              </div>
            </div>

            {/* 1. EXECUTIVE KPI SUMMARY METRICS */}
            <DashboardKpiCards
              stats={stats}
              filter={filter}
              onFilterChange={setFilter}
            />

            {/* 2. TEAM PROJECT HEADER (JIKA RUANG TIM AKTIF) */}
            {activeProject && (
              <ProjectHeader
                project={activeProject}
                members={members}
                onLeave={leaveProject}
                onDelete={deleteProject}
                onUpdateName={updateProject}
                onUpdateProject={updateProject}
                onRemoveMember={removeMember}
                onTasksUpdated={() => refresh()}
                onOpenSettings={() => setIsWorkspaceSettingsOpen(true)}
                onToast={showToast}
              />
            )}

            {/* 3. UNIFIED WORKSPACE (QUICK-ADD + TOOLBAR + TODO LIST / KANBAN) */}
            <TodoList
              todos={todos}
              loading={todosLoading}
              error={todosError}
              filter={filter}
              onFilterChange={setFilter}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              stats={stats}
              onToggleTodo={(id) => {
                toggleTodo(id);
                showToast('info', 'Status tugas diperbarui.');
              }}
              onDeleteTodo={(id) => {
                deleteTodo(id);
                showToast('info', 'Tugas telah dihapus.');
              }}
              onEditTodo={async (id, newText) => {
                await updateTodoText(id, newText);
                showToast('success', 'Tugas diperbarui.');
              }}
              onRefresh={() => {
                refresh();
                showToast('info', 'Data tugas disinkronkan ulang.');
              }}
              onAddTodo={async (task) => {
                await addTodo(task);
                showToast('success', 'Tugas ditambahkan.');
              }}
              activeProjectName={activeProject?.name}
            />
          </main>
        )}
      </div>

      {/* 3. MODAL BUAT / GABUNG RUANG KELOMPOK */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onCreate={async (name) => {
          const res = await createProject(name);
          showToast('success', `Ruang "${name}" dibuat.`);
          return res;
        }}
        onJoin={async (code) => {
          const res = await joinProject(code);
          showToast('success', 'Bergabung ke ruang project.');
          return res;
        }}
      />

      {/* 4. MODAL PENGATURAN AKUN */}
      <AccountSettingsModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        user={user}
        onLogout={logout}
        onToast={showToast}
      />

      {/* 5. SIDE DRAWER KANAN ASK AI CO-PILOT (NON-POPUP) */}
      {activeProject && (
        <WorkspaceAskAiDrawer
          isOpen={isAskAiOpen}
          onClose={() => setIsAskAiOpen(false)}
          project={activeProject}
          onTasksUpdated={() => refresh()}
          onToast={showToast}
        />
      )}

      {/* 6. MODAL PENGATURAN WORKSPACE */}
      {activeProject && (
        <WorkspaceSettingsModal
          isOpen={isWorkspaceSettingsOpen}
          onClose={() => setIsWorkspaceSettingsOpen(false)}
          project={activeProject}
          members={members}
          currentUserId={user?.id}
          onUpdateName={updateProject}
          onRemoveMember={removeMember}
          onTransferOwnership={transferOwnership}
          onRequestDelete={() => setIsDeleteWorkspaceOpen(true)}
          onLeaveProject={async (id) => {
            await leaveProject(id);
            setIsWorkspaceSettingsOpen(false);
          }}
          onToast={showToast}
        />
      )}

      {/* 7. MODAL KONFIRMASI HAPUS WORKSPACE */}
      {activeProject && (
        <ConfirmDeleteModal
          isOpen={isDeleteWorkspaceOpen}
          projectName={activeProject.name}
          loading={deleteWorkspaceLoading}
          onConfirm={async () => {
            setDeleteWorkspaceLoading(true);
            try {
              await deleteProject(activeProject.id);
              setIsDeleteWorkspaceOpen(false);
              setIsWorkspaceSettingsOpen(false);
              showToast('info', 'Ruang kerja berhasil dihapus.');
            } catch (err: any) {
              showToast('error', err.message || 'Gagal menghapus ruang kerja.');
            } finally {
              setDeleteWorkspaceLoading(false);
            }
          }}
          onCancel={() => setIsDeleteWorkspaceOpen(false)}
        />
      )}

      {/* 8. UNIVERSAL COMMAND PALETTE (CTRL+K) */}
      <CommandPaletteModal
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        projects={projects}
        todos={todos}
        currentModel={currentModel}
        onSelectProject={(proj) => {
          selectProject(proj);
          showToast('info', `Beralih ke ruang kerja: ${proj.name}`);
        }}
        onOpenAiPlanner={() => setActiveView('ai-planner')}
        onOpenAskAi={() => {
          if (!activeProject) {
            showToast('error', 'Pilih ruang kerja terlebih dahulu.');
            return;
          }
          setIsAskAiOpen(true);
        }}
        onOpenNewTask={() => setActiveView('todos')}
        onOpenAccountSettings={() => setIsAccountModalOpen(true)}
        onModelChange={(newModel) => {
          setCurrentModel(newModel);
          localStorage.setItem('preferred_ai_model', newModel);
          showToast('success', `Model AI aktif: ${newModel}`);
        }}
      />
    </div>
  );
}
