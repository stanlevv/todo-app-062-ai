'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from './ui/card';

interface DashboardKpiCardsProps {
  stats: {
    total: number;
    completed: number;
    pending: number;
  };
  filter: 'all' | 'pending' | 'completed';
  onFilterChange: (filter: 'all' | 'pending' | 'completed') => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

export default function DashboardKpiCards({
  stats,
  filter,
  onFilterChange,
}: DashboardKpiCardsProps) {
  const completionPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. TOTAL TUGAS */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={SPRING_TRANSITION}
        onClick={() => onFilterChange('all')}
        className="cursor-pointer"
      >
        <Card
          className={`h-full border transition-all ${
            filter === 'all'
              ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/30 shadow-2xs'
              : 'hover:border-zinc-300'
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Total Tugas
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-zinc-950 tracking-tight">
                  {stats.total}
                </span>
                <span className="text-xs text-zinc-400 font-medium">tugas</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 2. PERLU DIKERJAKAN */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={SPRING_TRANSITION}
        onClick={() => onFilterChange('pending')}
        className="cursor-pointer"
      >
        <Card
          className={`h-full border transition-all ${
            filter === 'pending'
              ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/30 shadow-2xs'
              : 'hover:border-zinc-300'
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Perlu Dikerjakan
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-zinc-950 tracking-tight">
                  {stats.pending}
                </span>
                <span className="text-xs text-zinc-400 font-medium">aktif</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3. SUDAH SELESAI */}
      <motion.div
        whileHover={{ y: -1 }}
        transition={SPRING_TRANSITION}
        onClick={() => onFilterChange('completed')}
        className="cursor-pointer"
      >
        <Card
          className={`h-full border transition-all ${
            filter === 'completed'
              ? 'border-blue-600 ring-1 ring-blue-600/20 bg-blue-50/30 shadow-2xs'
              : 'hover:border-zinc-300'
          }`}
        >
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 block">
                Sudah Selesai
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-zinc-950 tracking-tight">
                  {stats.completed}
                </span>
                <span className="text-xs text-zinc-400 font-medium">selesai</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 4. PROGRESS PROYEK */}
      <Card className="h-full border border-zinc-200/80">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Progress
            </span>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
              {completionPercentage}%
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-zinc-400 font-medium">
              <span>{stats.completed} selesai</span>
              <span>{stats.pending} tersisa</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
