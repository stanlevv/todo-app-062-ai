'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Todo } from '@/types/todo';

type TodoItemProps = {
  todo: Todo;
  onToggle: (id: number) => void;
  onDelete?: (id: number) => void;
  onEdit?: (id: number, newText: string) => Promise<any>;
  onOpenDetail?: (todo: Todo) => void;
};

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function TodoItem({ todo, onToggle, onDelete, onEdit, onOpenDetail }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(todo.title || todo.task || '');
  const [editLoading, setEditLoading] = useState(false);

  const handleSaveEdit = async () => {
    if (!editText.trim() || !onEdit) return;
    setEditLoading(true);
    try {
      await onEdit(todo.id, editText.trim());
      setIsEditing(false);
    } catch {
      // Handled in parent
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <motion.li
      whileHover={{ y: -1 }}
      transition={SPRING_TRANSITION}
      className={`p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        todo.completed
          ? 'bg-zinc-50/70 border-zinc-200/60 opacity-85'
          : 'bg-white/85 backdrop-blur-md border-zinc-200/80 hover:border-zinc-300 shadow-2xs hover:shadow-xs'
      }`}
    >
      {/* Checkbox & Task Title / Inline Edit */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        <button
          type="button"
          onClick={() => onToggle(todo.id)}
          aria-label={todo.completed ? 'Tandai belum selesai' : 'Tandai selesai'}
          className={`w-5 h-5 mt-0.5 sm:mt-0 rounded-lg flex items-center justify-center border transition-all cursor-pointer flex-shrink-0 ${
            todo.completed
              ? 'bg-blue-600 border-blue-600 text-white shadow-2xs'
              : 'border-zinc-300 bg-white hover:border-blue-500'
          }`}
        >
          {todo.completed && (
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
                className="w-full px-3 py-1.5 text-xs sm:text-sm bg-white border border-blue-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={handleSaveEdit}
                disabled={editLoading}
                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors flex-shrink-0 cursor-pointer"
              >
                {editLoading ? '...' : 'Simpan'}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-zinc-100 text-zinc-700 text-xs font-semibold rounded-xl hover:bg-zinc-200 transition-colors flex-shrink-0 cursor-pointer"
              >
                Batal
              </motion.button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2">
              {(() => {
                const rawText = todo.title || todo.task || '';
                const match = rawText.match(/^\[([A-Z0-9\/\-]+)\]\s*(.*)$/);
                const role = match ? match[1] : null;
                const text = match ? match[2] : rawText;

                return (
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {role && (
                      <span className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-700 border border-zinc-200/80 shrink-0">
                        [{role}]
                      </span>
                    )}
                    <span
                      onClick={() => onToggle(todo.id)}
                      className={`text-xs sm:text-sm font-medium truncate cursor-pointer transition-all select-none ${
                        todo.completed ? 'line-through text-zinc-400' : 'text-zinc-900'
                      }`}
                    >
                      {text}
                    </span>
                  </div>
                );
              })()}

              {/* Creator Chip for Team Workspace */}
              {todo.creator_username && (
                <span className="inline-flex items-center text-[10px] font-medium text-zinc-500 bg-zinc-100 border border-zinc-200/70 px-2 py-0.5 rounded-md w-fit shrink-0">
                  @{todo.creator_username}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      {!isEditing && (
        <div className="flex items-center gap-1.5 self-end sm:self-auto flex-shrink-0 pt-1 sm:pt-0">
          {onEdit && !todo.completed && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => setIsEditing(true)}
              title="Edit teks tugas"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit</span>
            </motion.button>
          )}

          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} transition={SPRING_TRANSITION}>
            {onOpenDetail ? (
              <button
                type="button"
                onClick={() => onOpenDetail(todo)}
                title="Lihat Detail Tugas Instan"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors cursor-pointer"
              >
                <span>Detail</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <Link
                href={`/task/${todo.id}`}
                title="Lihat Detail Tugas"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50/80 hover:bg-blue-100 border border-blue-200/60 rounded-lg transition-colors"
              >
                <span>Detail</span>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            )}
          </motion.div>

          {onDelete && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={SPRING_TRANSITION}
              type="button"
              onClick={() => onDelete(todo.id)}
              title="Hapus tugas"
              className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </motion.button>
          )}
        </div>
      )}
    </motion.li>
  );
}