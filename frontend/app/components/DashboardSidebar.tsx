'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { User } from '@/hooks/useAuth';
import { ProjectData } from '@/types/todo';

interface DashboardSidebarProps {
  user: User | null;
  projects: ProjectData[];
  activeProject: ProjectData | null;
  onSelectProject: (project: ProjectData | null) => void;
  onOpenProjectModal: () => void;
  onOpenAccountModal: () => void;
  onOpenAiPlanner?: () => void;
  activeView?: 'todos' | 'ai-planner';
  onSelectView?: (view: 'todos' | 'ai-planner') => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function DashboardSidebar({
  user,
  projects,
  activeProject,
  onSelectProject,
  onOpenProjectModal,
  onOpenAccountModal,
  onOpenAiPlanner,
  activeView = 'todos',
  onSelectView,
  isCollapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}: DashboardSidebarProps) {
  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onMobileClose}
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-white/85 backdrop-blur-xl border-r border-zinc-200/80 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* TOP SECTION: Header & Navigation */}
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Logo & Brand Header */}
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <Link
              href="/"
              title="Kembali ke Beranda"
              className="flex items-center gap-2.5 group overflow-hidden"
            >
              {/* Minimalist Geometric Mark Logo */}
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-medium text-xs transition-colors shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                </svg>
              </div>
              <div
                className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-40 opacity-100'
                }`}
              >
                <span className="font-bold text-sm text-zinc-900 tracking-tight leading-none block">
                  Todo Workspace
                </span>
                <span className="text-[10px] text-zinc-400 font-medium">
                  Tugas & Kolaborasi
                </span>
              </div>
            </Link>

            {/* Minimize Toggle on Desktop */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Perluas Sidebar' : 'Ciutkan Sidebar'}
              className="hidden lg:flex p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100/80 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <svg
                className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
                  isCollapsed ? 'rotate-180' : 'rotate-0'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </motion.button>
          </div>

          {/* Nav Items */}
          <div className="space-y-1">
            {/* 1. Tugas Pribadi */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => {
                onSelectProject(null);
                if (onSelectView) onSelectView('todos');
                onMobileClose();
              }}
              title="Tugas Pribadi"
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                isCollapsed ? 'justify-center' : 'gap-2.5'
              } ${
                activeView === 'todos' && activeProject === null
                  ? 'bg-zinc-900 text-white shadow-xs font-medium'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
              }`}
            >
              <svg
                className={`w-4 h-4 shrink-0 ${
                  activeView === 'todos' && activeProject === null ? 'text-white' : 'text-zinc-500'
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span
                className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
                }`}
              >
                Tugas Pribadi
              </span>
            </motion.button>

            {/* 2. Buat / Gabung Ruang Kelompok Button in Sidebar */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => {
                onOpenProjectModal();
                onMobileClose();
              }}
              title="Buat atau Gabung Ruang Kelompok"
              className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80 ${
                isCollapsed ? 'justify-center' : 'gap-2.5'
              }`}
            >
              <svg className="w-4 h-4 text-zinc-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span
                className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                  isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
                }`}
              >
                Buat / Gabung Ruang
              </span>
            </motion.button>

            {/* 3. AI Project Planner (Grill-Me) Button */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => {
                if (onSelectView) {
                  onSelectView('ai-planner');
                } else if (onOpenAiPlanner) {
                  onOpenAiPlanner();
                }
                onMobileClose();
              }}
              title="AI Project Planner & Grill-Me"
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                isCollapsed ? 'justify-center !px-2' : ''
              } ${
                activeView === 'ai-planner'
                  ? 'bg-zinc-900 text-white shadow-xs font-medium'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <svg
                  className={`w-4 h-4 shrink-0 ${
                    activeView === 'ai-planner' ? 'text-white' : 'text-zinc-500'
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span
                  className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                    isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
                  }`}
                >
                  AI Project Planner
                </span>
              </div>
              <span
                className={`text-[9px] font-mono px-1.5 py-0.5 rounded-md overflow-hidden transition-all duration-300 ease-in-out shrink-0 ${
                  isCollapsed ? 'max-w-0 opacity-0 p-0 m-0 border-0 pointer-events-none' : 'max-w-10 opacity-100'
                } ${
                  activeView === 'ai-planner'
                    ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                    : 'bg-zinc-100 text-zinc-600 border border-zinc-200'
                }`}
              >
                AI
              </span>
            </motion.button>
          </div>

          {/* TEAM WORKSPACES SECTION */}
          <div className="space-y-2 pt-3 border-t border-zinc-100">
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                isCollapsed ? 'max-h-0 opacity-0 pointer-events-none' : 'max-h-8 opacity-100'
              }`}
            >
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] font-medium text-zinc-400">
                  Ruang Kelompok
                </span>
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-md border border-zinc-200">
                  {projects.length}
                </span>
              </div>
            </div>

            {/* List Project Workspaces */}
            <div className="space-y-1">
              {projects.map((p) => {
                const isActive = activeView === 'todos' && activeProject?.id === p.id;
                return (
                  <motion.button
                    key={p.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                    transition={SPRING_TRANSITION}
                    type="button"
                    onClick={() => {
                      onSelectProject(p);
                      if (onSelectView) onSelectView('todos');
                      onMobileClose();
                    }}
                    title={p.name}
                    className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                      isCollapsed ? 'justify-center' : 'gap-2.5'
                    } ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-xs font-medium'
                        : 'text-zinc-700 hover:bg-zinc-100/80 hover:text-zinc-900'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-medium text-[10px] shrink-0 ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-zinc-100 text-zinc-700 border border-zinc-200/80'
                      }`}
                    >
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span
                      className={`truncate flex-1 text-left overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                        isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
                      }`}
                    >
                      {p.name}
                    </span>
                  </motion.button>
                );
              })}

              {/* Add / Join Team Space Button */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={SPRING_TRANSITION}
                type="button"
                onClick={onOpenProjectModal}
                title="Buat atau Gabung Ruang Kelompok"
                className={`w-full flex items-center px-3 py-2 text-xs font-medium rounded-xl border border-dashed border-zinc-300 hover:border-zinc-800 hover:text-zinc-900 hover:bg-zinc-50 text-zinc-500 transition-all cursor-pointer ${
                  isCollapsed ? 'justify-center' : 'gap-2'
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span
                  className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap ${
                    isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
                  }`}
                >
                  Tambah Ruang Tim
                </span>
              </motion.button>
            </div>
          </div>
        </div>

        {/* BOTTOM SECTION: Account Card & Settings */}
        <div className="p-3 border-t border-zinc-100 bg-zinc-50/50">
          <motion.div
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={SPRING_TRANSITION}
            onClick={onOpenAccountModal}
            title="Klik untuk Pengaturan Akun"
            className={`flex items-center p-2 rounded-2xl bg-white/70 hover:bg-white border border-zinc-200/60 hover:border-zinc-300 shadow-2xs hover:shadow-xs transition-all cursor-pointer group ${
              isCollapsed ? 'justify-center' : 'gap-2.5'
            }`}
          >
            {/* Refined User Avatar */}
            <div className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs shrink-0">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap min-w-0 flex-1 ${
                isCollapsed ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-xs opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-900 truncate block">
                  {user?.username || 'Pengguna'}
                </span>
                <svg className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-700 transition-colors shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-[10px] text-zinc-500 truncate block">
                {user?.email || 'email@domain.com'}
              </span>
            </div>
          </motion.div>
        </div>
      </aside>
    </>
  );
}
