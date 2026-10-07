'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import TodoItem from './TodoItem';
import { Todo } from '@/types/todo';
import { FilterType } from '@/hooks/useTodos';

type ViewMode = 'list' | 'board';

type TodoListProps = {
  todos: Todo[];
  loading?: boolean;
  error?: string | null;
  filter?: FilterType;
  onFilterChange?: (f: FilterType) => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  stats?: { total: number; completed: number; pending: number };
  onToggleTodo: (id: number) => void;
  onDeleteTodo: (id: number) => void;
  onEditTodo?: (id: number, newText: string) => Promise<any>;
  onRefresh?: () => void;
  onAddTodo?: (task: string) => Promise<any> | void;
  activeProjectName?: string;
};

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

const QUICK_ROLES = ['PM', 'FE', 'BE', 'UI/UX', 'QA'];

export default function TodoList({
  todos,
  loading = false,
  error = null,
  filter: propFilter,
  onFilterChange: propOnFilterChange,
  searchQuery: propSearchQuery,
  onSearchChange: propOnSearchChange,
  stats: propStats,
  onToggleTodo,
  onDeleteTodo,
  onEditTodo,
  onRefresh,
  onAddTodo,
  activeProjectName,
}: TodoListProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Local fallback states
  const [localFilter, setLocalFilter] = useState<FilterType>('all');
  const [localSearch, setLocalSearch] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');

  const filter = propFilter !== undefined ? propFilter : localFilter;
  const onFilterChange = propOnFilterChange || setLocalFilter;
  const searchQuery = propSearchQuery !== undefined ? propSearchQuery : localSearch;
  const onSearchChange = propOnSearchChange || setLocalSearch;

  // Ekstrak tag peran [ROLE]
  const availableRoles = React.useMemo(() => {
    const rolesSet = new Set<string>();
    todos.forEach((t) => {
      const match = (t.task || t.title || '').match(/\[([A-Z0-9\/\-]+)\]/);
      if (match && match[1]) {
        rolesSet.add(match[1]);
      }
    });
    return Array.from(rolesSet);
  }, [todos]);

  // Filter list
  const filteredTodos = React.useMemo(() => {
    return todos.filter((t) => {
      if (filter === 'pending' && t.completed) return false;
      if (filter === 'completed' && !t.completed) return false;

      if (selectedRole !== 'ALL') {
        const taskText = t.task || t.title || '';
        if (!taskText.includes(`[${selectedRole}]`)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const taskText = (t.task || t.title || '').toLowerCase();
        const creator = (t.creator_username || '').toLowerCase();
        if (!taskText.includes(q) && !creator.includes(q)) return false;
      }

      return true;
    });
  }, [todos, filter, selectedRole, searchQuery]);

  const pendingTodos = React.useMemo(
    () => filteredTodos.filter((t) => !t.completed),
    [filteredTodos]
  );
  const completedTodos = React.useMemo(
    () => filteredTodos.filter((t) => t.completed),
    [filteredTodos]
  );

  const total = todos.length;
  const completed = todos.filter((t) => t.completed).length;
  const pending = total - completed;
  const stats = propStats || { total, completed, pending };

  const handleQuickAdd = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = quickTaskText.trim();
    if (!trimmed || !onAddTodo) return;

    setQuickAddLoading(true);
    try {
      await onAddTodo(trimmed);
      setQuickTaskText('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } finally {
      setQuickAddLoading(false);
    }
  };

  const handleInjectRole = (role: string) => {
    const tag = `[${role}] `;
    if (quickTaskText.startsWith('[')) {
      const withoutRole = quickTaskText.replace(/^\[.*?\]\s*/, '');
      setQuickTaskText(`${tag}${withoutRole}`);
    } else {
      setQuickTaskText(`${tag}${quickTaskText}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. UNIFIED WORKSPACE PANEL (QUICK ADD + SEARCH + TOOLBAR) */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        {/* Header Bar with Workspace Info & Tambah Tugas Trigger */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
              {activeProjectName ? `Tugas: ${activeProjectName}` : 'Daftar Tugas'}
            </h3>
            <p className="text-[11px] text-zinc-400">
              {stats.pending} tugas pending &bull; {stats.completed} selesai dari total {stats.total}
            </p>
          </div>

          {onAddTodo && !isAddFormOpen && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => {
                setIsAddFormOpen(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              }}
              title="Buka formulir tambah tugas"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Tambah Tugas</span>
            </motion.button>
          )}
        </div>

        {/* Collapsible Quick Add Form (Hanya terbuka saat ditekan) */}
        <AnimatePresence>
          {onAddTodo && isAddFormOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              className="space-y-2.5 pb-4 border-b border-zinc-100 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wider block">
                  {activeProjectName
                    ? `Tambah Tugas ke ${activeProjectName}`
                    : 'Tambah Tugas Baru'}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-400 font-medium mr-1 hidden sm:inline">
                    Peran:
                  </span>
                  {QUICK_ROLES.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => handleInjectRole(role)}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200/80 transition-colors cursor-pointer"
                    >
                      +{role}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddFormOpen(false);
                      setQuickTaskText('');
                    }}
                    title="Tutup formulir"
                    className="ml-2 p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={inputRef}
                    type="text"
                    value={quickTaskText}
                    onChange={(e) => setQuickTaskText(e.target.value)}
                    placeholder="Ketik tugas baru..."
                    className="w-full pl-3.5 pr-20 py-2 bg-zinc-50 border border-zinc-200/90 rounded-xl text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:bg-white transition-all shadow-2xs"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-white border border-zinc-200 rounded">
                    Enter
                  </kbd>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsAddFormOpen(false);
                    setQuickTaskText('');
                  }}
                  className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={!quickTaskText.trim() || quickAddLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>{quickAddLoading ? '...' : 'Tambah'}</span>
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search, Filter Pills & View Mode */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 flex items-center pointer-events-none">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Cari tugas..."
                className="w-full pl-8 pr-7 py-1.5 bg-zinc-50 border border-zinc-200/90 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 focus:bg-white transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700 p-0.5 rounded cursor-pointer"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Controls: Filter Pills & View Mode */}
            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Semua ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange('pending')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    filter === 'pending'
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Aktif ({stats.pending})
                </button>
                <button
                  type="button"
                  onClick={() => onFilterChange('completed')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                    filter === 'completed'
                      ? 'bg-white text-zinc-900 font-semibold shadow-2xs'
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Selesai ({stats.completed})
                </button>
              </div>

              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  title="Tampilan List"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('board')}
                  title="Tampilan Papan Kanban"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === 'board'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                </button>
              </div>

              {/* Refresh */}
              {onRefresh && (
                <button
                  type="button"
                  onClick={onRefresh}
                  title="Perbarui Data"
                  className="p-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-xl transition-colors cursor-pointer text-xs shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Role Filter Chips */}
          {availableRoles.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-zinc-100 text-xs">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider shrink-0 mr-1">
                Peran:
              </span>
              <button
                type="button"
                onClick={() => setSelectedRole('ALL')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  selectedRole === 'ALL'
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                }`}
              >
                Semua ({todos.length})
              </button>
              {availableRoles.map((role) => {
                const count = todos.filter((t) =>
                  (t.task || t.title || '').includes(`[${role}]`)
                ).length;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedRole === role
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200/80'
                    }`}
                  >
                    [{role}] ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ERROR ALERT */}
      {error && (
        <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200/80 rounded-xl flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <Link
            href="/login"
            className="text-xs font-semibold text-red-700 underline hover:text-red-900 shrink-0"
          >
            Masuk Kembali
          </Link>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && filteredTodos.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400 font-medium">Memuat data...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && filteredTodos.length === 0 && (
        <div className="text-center py-12 px-4 border border-dashed border-zinc-200/80 rounded-2xl bg-white space-y-2">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-500 flex items-center justify-center mx-auto mb-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-semibold text-xs text-zinc-900">
            {searchQuery || selectedRole !== 'ALL'
              ? 'Tidak ada tugas yang sesuai filter'
              : 'Belum ada tugas'}
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {searchQuery || selectedRole !== 'ALL'
              ? 'Ubah kata kunci pencarian atau pilih filter peran lain.'
              : 'Tambahkan tugas baru melalui formulir di atas.'}
          </p>
        </div>
      )}

      {/* 2A. LIST VIEW */}
      {viewMode === 'list' && filteredTodos.length > 0 && (
        <ul className="space-y-2">
          {filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggleTodo}
              onDelete={onDeleteTodo}
              onEdit={onEditTodo}
            />
          ))}
        </ul>
      )}

      {/* 2B. KANBAN BOARD (2 KOLOM STATUS) */}
      {viewMode === 'board' && filteredTodos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* LANE 1: PERLU DIKERJAKAN */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-zinc-400" />
                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Perlu Dikerjakan
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                {pendingTodos.length}
              </span>
            </div>

            {pendingTodos.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Tidak ada tugas aktif.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingTodos.map((todo) => {
                  const match = (todo.task || todo.title || '').match(
                    /\[([A-Z0-9\/\-]+)\]/
                  );
                  const roleTag = match ? match[1] : null;
                  const cleanTitle = (todo.task || todo.title || '').replace(
                    /\[([A-Z0-9\/\-]+)\]\s*/,
                    ''
                  );

                  return (
                    <motion.div
                      key={todo.id}
                      whileHover={{ y: -1 }}
                      transition={SPRING_TRANSITION}
                      className="p-3 bg-zinc-50/60 rounded-xl border border-zinc-200/80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleTodo(todo.id)}
                            title="Tandai selesai"
                            className="w-4 h-4 mt-0.5 rounded border border-zinc-300 bg-white hover:border-blue-600 cursor-pointer shrink-0"
                          />
                          <p className="text-xs font-medium text-zinc-900 break-words flex-1">
                            {cleanTitle}
                          </p>
                        </div>

                        {onDeleteTodo && (
                          <button
                            type="button"
                            onClick={() => onDeleteTodo(todo.id)}
                            title="Hapus"
                            className="text-zinc-400 hover:text-red-600 transition-colors cursor-pointer shrink-0 p-0.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {roleTag && (
                            <span className="font-mono px-1.5 py-0.2 rounded bg-zinc-200/70 text-zinc-700">
                              [{roleTag}]
                            </span>
                          )}
                          {todo.creator_username && (
                            <span className="text-zinc-400 truncate">
                              @{todo.creator_username}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/task/${todo.id}`}
                          className="font-medium text-blue-600 hover:underline shrink-0"
                        >
                          Detail
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* LANE 2: SUDAH SELESAI */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <h4 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider">
                  Sudah Selesai
                </h4>
              </div>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600">
                {completedTodos.length}
              </span>
            </div>

            {completedTodos.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-400">
                Belum ada tugas selesai.
              </div>
            ) : (
              <div className="space-y-2">
                {completedTodos.map((todo) => {
                  const match = (todo.task || todo.title || '').match(
                    /\[([A-Z0-9\/\-]+)\]/
                  );
                  const roleTag = match ? match[1] : null;
                  const cleanTitle = (todo.task || todo.title || '').replace(
                    /\[([A-Z0-9\/\-]+)\]\s*/,
                    ''
                  );

                  return (
                    <motion.div
                      key={todo.id}
                      whileHover={{ y: -1 }}
                      transition={SPRING_TRANSITION}
                      className="p-3 bg-zinc-50/40 rounded-xl border border-zinc-200/60 opacity-80 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 flex-1 min-w-0">
                          <button
                            type="button"
                            onClick={() => onToggleTodo(todo.id)}
                            title="Tandai belum selesai"
                            className="w-4 h-4 mt-0.5 rounded bg-blue-600 border border-blue-600 text-white flex items-center justify-center cursor-pointer shrink-0"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </button>
                          <p className="text-xs font-medium line-through text-zinc-400 break-words flex-1">
                            {cleanTitle}
                          </p>
                        </div>

                        {onDeleteTodo && (
                          <button
                            type="button"
                            onClick={() => onDeleteTodo(todo.id)}
                            title="Hapus"
                            className="text-zinc-400 hover:text-red-600 transition-colors cursor-pointer shrink-0 p-0.5"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-zinc-200/50 text-[10px]">
                        <div className="flex items-center gap-1.5 truncate">
                          {roleTag && (
                            <span className="font-mono px-1.5 py-0.2 rounded bg-zinc-200/60 text-zinc-500">
                              [{roleTag}]
                            </span>
                          )}
                          {todo.creator_username && (
                            <span className="text-zinc-400 truncate">
                              @{todo.creator_username}
                            </span>
                          )}
                        </div>

                        <Link
                          href={`/task/${todo.id}`}
                          className="font-medium text-blue-600 hover:underline shrink-0"
                        >
                          Detail
                        </Link>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}