'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { aiApi } from '@/lib/api';
import { ProjectData } from '@/types/todo';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  actionsExecuted?: string[];
  timestamp: string;
}

interface WorkspaceAskAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  onTasksUpdated?: (todos: any[]) => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const QUICK_PROMPTS = [
  'Analisis progres dan tugas yang belum selesai',
  'Buatkan 3 tugas pengujian sistem (QA & test)',
  'Tandai tugas riset sebagai selesai',
  'Rekomendasikan pembagian tugas untuk tim',
];

export default function WorkspaceAskAiDrawer({
  isOpen,
  onClose,
  project,
  onTasksUpdated,
  onToast,
}: WorkspaceAskAiDrawerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('openrouter/free');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred_ai_model');
      if (saved) setSelectedModel(saved);
    }
  }, []);

  // Inisialisasi pesan sambutan saat drawer pertama kali dibuka
  useEffect(() => {
    if (isOpen && messages.length === 0 && project) {
      setMessages([
        {
          role: 'model',
          content: `Halo! Saya AI Co-Pilot khusus ruang kerja "${project.name}". Saya dapat membaca daftar tugas terkini dan membantu menambah, menandai status, atau mengelola tugas langsung di ruang ini saja. Ada yang bisa saya bantu?`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, project, messages.length]);

  // Scroll otomatis ke pesan terbaru
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading, isOpen]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading || !project) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const historyPayload = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await aiApi.workspaceAsk({
        projectId: project.id,
        message: text,
        history: historyPayload,
        model: selectedModel,
      });

      if (res.success && res.data) {
        const fullReply = res.data.reply;
        const executed = res.data.executedActions || [];
        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        setMessages((prev) => [
          ...prev,
          {
            role: 'model',
            content: '',
            actionsExecuted: executed,
            timestamp: timeStr,
          },
        ]);

        let curIndex = 0;
        const step = Math.max(2, Math.floor(fullReply.length / 40));
        const streamTimer = setInterval(() => {
          curIndex += step;
          if (curIndex >= fullReply.length) {
            clearInterval(streamTimer);
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullReply,
                };
              }
              return updated;
            });
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: fullReply.slice(0, curIndex) + '▌',
                };
              }
              return updated;
            });
          }
        }, 20);

        if (executed.length && onTasksUpdated && Array.isArray(res.data.todos)) {
          onTasksUpdated(res.data.todos);
          if (onToast) {
            onToast('success', `AI mengeksekusi ${executed.length} perubahan tugas.`);
          }
        }
      } else {
        throw new Error(res.message || 'Gagal memproses permintaan');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        role: 'model',
        content: `Maaf, terjadi kesalahan: ${err.message || 'Gagal menghubungi AI'}. Silakan coba lagi.`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      if (onToast) onToast('error', err.message || 'Gagal meminta saran AI');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && project && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop Overlay Halus */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
          />

          {/* Slide-over Drawer Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            aria-label="Panel Ask AI"
            className="fixed inset-y-0 right-0 w-full sm:w-[420px] md:w-[460px] bg-white border-l border-zinc-200/90 shadow-2xl flex flex-col z-50"
          >
            {/* Header Drawer */}
            <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between shrink-0 bg-zinc-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-2xs">
                  <svg className="w-4 h-4 text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-zinc-950">Ask AI</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-100 font-mono text-zinc-600 font-medium">
                      Co-Pilot
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 truncate max-w-[240px]">
                    {project.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedModel(val);
                    if (typeof window !== 'undefined') localStorage.setItem('preferred_ai_model', val);
                  }}
                  className="text-[11px] font-medium bg-white text-zinc-800 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer shadow-2xs max-w-[130px] truncate"
                  title="Pilih Model AI Gratis"
                >
                  <option value="openrouter/free">⚡ Auto Free</option>
                  <option value="deepseek/deepseek-r1:free">🧠 DeepSeek R1</option>
                  <option value="meta-llama/llama-3.3-70b-instruct:free">🦙 Llama 3.3</option>
                  <option value="google/gemini-2.0-flash-exp:free">✨ Gemini 2.0</option>
                  <option value="gemini-direct">🔑 Studio</option>
                </select>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                  title="Tutup Panel Ask AI"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-4 py-2.5 border-b border-zinc-100 bg-zinc-50/30 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1.5">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSend(prompt)}
                    className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200/80 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-zinc-50/20">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={index}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-2xs ${
                        isUser
                          ? 'bg-zinc-900 text-white rounded-br-xs'
                          : 'bg-white text-zinc-800 border border-zinc-200/80 rounded-bl-xs'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Pill Aksi Mutasi Tugas (Jika Ada) */}
                      {msg.actionsExecuted && msg.actionsExecuted.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 space-y-1">
                          <p className="text-[10px] font-medium text-emerald-600">
                            Aksi yang dieksekusi:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {msg.actionsExecuted.map((act, actIdx) => (
                              <span
                                key={actIdx}
                                className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                              >
                                {act}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 px-1">
                      {msg.timestamp}
                    </span>
                  </div>
                );
              })}

              {/* Loading Indicator */}
              {loading && (
                <div className="flex flex-col items-start">
                  <div className="bg-white border border-zinc-200/80 rounded-2xl rounded-bl-xs px-3.5 py-2.5 text-xs text-zinc-500 shadow-2xs flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                    <span>Menganalisis konteks ruang kerja...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar Footer */}
            <div className="p-3.5 border-t border-zinc-100 bg-white">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={loading}
                  placeholder="Ketik instruksi AI untuk ruang kerja ini..."
                  className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  disabled={!input.trim() || loading}
                  onClick={() => handleSend()}
                  aria-label="Kirim Pesan"
                  className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 text-white rounded-xl text-xs font-medium transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shrink-0 shadow-2xs"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </div>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
