'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

type TodoFormProps = {
  onAddTodo: (title: string) => void;
};

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function TodoForm({ onAddTodo }: TodoFormProps) {
  const [title, setTitle] = useState('');

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    onAddTodo(trimmedTitle);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-center bg-white rounded-2xl border border-zinc-200/90 shadow-2xs hover:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-900/10 focus-within:border-zinc-900 p-1.5 transition-all">
        {/* Leading Search/Plus Vector Icon */}
        <div className="pl-3 pr-1 text-zinc-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ketik tugas baru atau catatan aktivitas..."
          className="flex-1 bg-transparent px-2 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
        />

        {/* Keyboard shortcut hint */}
        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-zinc-100 border border-zinc-200/70 rounded-md mr-1.5 select-none">
          ↵ Enter
        </kbd>

        {/* Submit Button */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={SPRING_TRANSITION}
          type="submit"
          disabled={!title.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none cursor-pointer shadow-xs"
        >
          <span>Tambah</span>
        </motion.button>
      </div>
    </form>
  );
}