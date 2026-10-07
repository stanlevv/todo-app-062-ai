'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProjectData, Todo } from '@/types/todo';

export interface CommandAction {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Aksi Cepat' | 'Ruang Kerja' | 'Model AI' | 'Tugas';
  icon: string;
  badge?: string;
  onSelect: () => void;
}

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects?: ProjectData[];
  todos?: Todo[];
  onSelectProject?: (proj: ProjectData) => void;
  onOpenAiPlanner?: () => void;
  onOpenAskAi?: () => void;
  onOpenNewTask?: () => void;
  onOpenAccountSettings?: () => void;
  onModelChange?: (modelId: string) => void;
  currentModel?: string;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function CommandPaletteModal({
  isOpen,
  onClose,
  projects = [],
  todos = [],
  onSelectProject,
  onOpenAiPlanner,
  onOpenAskAi,
  onOpenNewTask,
  onOpenAccountSettings,
  onModelChange,
  currentModel = 'openrouter/free',
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query and focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Build items list
  const baseActions: CommandAction[] = [
    {
      id: 'quick-new-task',
      title: 'Buat Tugas Baru',
      subtitle: 'Tambahkan tugas baru ke daftar aktif',
      category: 'Aksi Cepat',
      icon: '➕',
      onSelect: () => {
        onClose();
        if (onOpenNewTask) onOpenNewTask();
      },
    },
    {
      id: 'quick-ask-ai',
      title: 'Tanya AI Co-Pilot',
      subtitle: 'Konsultasi atau delegasikan aksi tugas ke AI',
      category: 'Aksi Cepat',
      icon: '🤖',
      onSelect: () => {
        onClose();
        if (onOpenAskAi) onOpenAskAi();
      },
    },
    {
      id: 'quick-ai-planner',
      title: 'Buka AI Project Planner',
      subtitle: 'Rancang PRD, ERD, peran dan jadwal tim lengkap',
      category: 'Aksi Cepat',
      icon: '📋',
      onSelect: () => {
        onClose();
        if (onOpenAiPlanner) onOpenAiPlanner();
      },
    },
    {
      id: 'quick-account',
      title: 'Pengaturan Akun & Profil',
      subtitle: 'Ubah kata sandi atau informasi akun',
      category: 'Aksi Cepat',
      icon: '⚙️',
      onSelect: () => {
        onClose();
        if (onOpenAccountSettings) onOpenAccountSettings();
      },
    },
  ];

  const modelActions: CommandAction[] = [
    {
      id: 'model-auto',
      title: 'Model: Auto Free Router',
      subtitle: 'Otomatis me-route ke model gratis terbaik',
      category: 'Model AI',
      icon: '⚡',
      badge: currentModel === 'openrouter/free' ? 'Aktif' : undefined,
      onSelect: () => {
        if (onModelChange) onModelChange('openrouter/free');
        if (typeof window !== 'undefined') localStorage.setItem('preferred_ai_model', 'openrouter/free');
        onClose();
      },
    },
    {
      id: 'model-deepseek',
      title: 'Model: DeepSeek R1 Free',
      subtitle: 'Reasoning logika mendalam untuk arsitektur',
      category: 'Model AI',
      icon: '🧠',
      badge: currentModel === 'deepseek/deepseek-r1:free' ? 'Aktif' : undefined,
      onSelect: () => {
        if (onModelChange) onModelChange('deepseek/deepseek-r1:free');
        if (typeof window !== 'undefined') localStorage.setItem('preferred_ai_model', 'deepseek/deepseek-r1:free');
        onClose();
      },
    },
    {
      id: 'model-llama',
      title: 'Model: Meta Llama 3.3 70B',
      subtitle: 'Kecepatan kilat dan format tugas presisi',
      category: 'Model AI',
      icon: '🦙',
      badge: currentModel === 'meta-llama/llama-3.3-70b-instruct:free' ? 'Aktif' : undefined,
      onSelect: () => {
        if (onModelChange) onModelChange('meta-llama/llama-3.3-70b-instruct:free');
        if (typeof window !== 'undefined') localStorage.setItem('preferred_ai_model', 'meta-llama/llama-3.3-70b-instruct:free');
        onClose();
      },
    },
    {
      id: 'model-gemini',
      title: 'Model: Gemini 2.0 Flash',
      subtitle: 'Respon cepat dengan konteks kolaborasi luas',
      category: 'Model AI',
      icon: '✨',
      badge: currentModel === 'google/gemini-2.0-flash-exp:free' ? 'Aktif' : undefined,
      onSelect: () => {
        if (onModelChange) onModelChange('google/gemini-2.0-flash-exp:free');
        if (typeof window !== 'undefined') localStorage.setItem('preferred_ai_model', 'google/gemini-2.0-flash-exp:free');
        onClose();
      },
    },
  ];

  const projectActions: CommandAction[] = projects.map((p) => ({
    id: `project-${p.id}`,
    title: `Lompat ke Ruang: ${p.name}`,
    subtitle: `Kode: ${p.code || '-'}`,
    category: 'Ruang Kerja',
    icon: '📁',
    onSelect: () => {
      if (onSelectProject) onSelectProject(p);
      onClose();
    },
  }));

  const taskActions: CommandAction[] = todos.slice(0, 15).map((t) => ({
    id: `todo-${t.id}`,
    title: t.title || t.task || 'Tugas',
    subtitle: t.completed ? 'Status: Selesai' : 'Status: Belum Selesai',
    category: 'Tugas',
    icon: t.completed ? '✅' : '⭕',
    badge: t.creator_username ? `@${t.creator_username}` : undefined,
    onSelect: () => {
      onClose();
    },
  }));

  const allActions = [...baseActions, ...modelActions, ...projectActions, ...taskActions];

  const filteredActions = allActions.filter((a) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      (a.subtitle && a.subtitle.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  });

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredActions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredActions.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredActions[selectedIndex]) {
        filteredActions[selectedIndex].onSelect();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={SPRING_TRANSITION}
          className="relative w-full max-w-xl bg-white rounded-2xl border border-zinc-200/90 shadow-2xl overflow-hidden flex flex-col z-10"
        >
          {/* Search Input Bar */}
          <div className="p-3.5 border-b border-zinc-100 flex items-center gap-2.5 bg-zinc-50/50">
            <svg className="w-4 h-4 text-zinc-400 shrink-0 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ketik aksi, ruang kerja, tugas, atau model AI... (Ctrl+K)"
              className="flex-1 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <span className="text-[10px] font-mono bg-zinc-200/70 text-zinc-600 px-1.5 py-0.5 rounded-md shrink-0">
              ESC
            </span>
          </div>

          {/* Action List */}
          <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {filteredActions.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Tidak ada aksi atau hasil yang cocok dengan &quot;{query}&quot;
              </div>
            ) : (
              filteredActions.map((action, idx) => {
                const isSelected = idx === selectedIndex;
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onSelect}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected ? 'bg-zinc-100 text-zinc-950 font-medium' : 'text-zinc-700 hover:bg-zinc-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base shrink-0">{action.icon}</span>
                      <div className="min-w-0">
                        <div className="text-xs truncate flex items-center gap-1.5">
                          <span>{action.title}</span>
                          {action.badge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-900 text-white font-mono">
                              {action.badge}
                            </span>
                          )}
                        </div>
                        {action.subtitle && (
                          <p className="text-[10px] text-zinc-400 truncate">{action.subtitle}</p>
                        )}
                      </div>
                    </div>

                    <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-2">
                      {action.category}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer Shortcuts Help */}
          <div className="px-4 py-2 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-[11px] text-zinc-400">
            <div className="flex items-center gap-3">
              <span><kbd className="font-mono bg-white border border-zinc-200 px-1 py-0.2 rounded text-[10px]">↑↓</kbd> Navigasi</span>
              <span><kbd className="font-mono bg-white border border-zinc-200 px-1 py-0.2 rounded text-[10px]">↵</kbd> Pilih</span>
            </div>
            <span className="text-[10px]">Command Center</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
