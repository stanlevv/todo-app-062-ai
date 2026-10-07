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

interface WorkspaceAskAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  onTasksUpdated?: (todos: any[]) => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SPRING_TRANSITION = { duration: 0.15, ease: 'easeOut' as const };

const QUICK_PROMPTS = [
  'Analisis progres dan tugas yang belum selesai',
  'Buatkan 3 tugas pengujian sistem (QA & test)',
  'Tandai semua tugas riset sebagai selesai',
  'Rekomendasikan pembagian tugas untuk tim',
];

export default function WorkspaceAskAiModal({
  isOpen,
  onClose,
  project,
  onTasksUpdated,
  onToast,
}: WorkspaceAskAiModalProps) {
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

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: `Halo! Saya AI Co-Pilot untuk ruang kerja "${project.name}". Saya dapat melihat daftar tugas dan konteks di ruang kerja ini, serta membantu menambah, mengedit, atau menandai status tugas langsung ke ruang ini saja. Ada yang bisa saya bantu?`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, project.name, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isOpen || !project) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

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

        // Mulai streaming respons kata-per-kata secara real-time
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

        // Jika AI melakukan mutasi data tugas di workspace ini, sync ke TodoList
        if (executed.length && onTasksUpdated && Array.isArray(res.data.todos)) {
          onTasksUpdated(res.data.todos);
          if (onToast) {
            onToast('success', `AI menerapkan ${executed.length} perubahan di ruang kerja ini.`);
          }
        }
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'model',
          content: `Maaf, terjadi kesalahan: ${err.message || 'Gagal memproses instruksi.'}`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm"
        />

        {/* Modal Dialog Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={SPRING_TRANSITION}
          className="relative w-full max-w-xl bg-white rounded-2xl border border-zinc-200/90 shadow-xl overflow-hidden flex flex-col h-[600px] max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white flex items-center justify-center font-medium text-xs shadow-2xs">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-semibold text-zinc-950">
                    AI Co-Pilot Ruang Kerja
                  </h3>
                  <span className="text-[9px] font-mono bg-zinc-900 text-white px-1.5 py-0.2 rounded-md">
                    Workspace Scoped
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Terhubung ke: <span className="font-semibold text-zinc-800">{project.name}</span> &bull; Terisolasi di ruang ini
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
                className="text-[11px] font-medium bg-white text-zinc-800 border border-zinc-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer shadow-2xs"
                title="Pilih Model AI Gratis"
              >
                <option value="openrouter/free">⚡ Auto Free Router</option>
                <option value="deepseek/deepseek-r1:free">🧠 DeepSeek R1</option>
                <option value="meta-llama/llama-3.3-70b-instruct:free">🦙 Llama 3.3 70B</option>
                <option value="google/gemini-2.0-flash-exp:free">✨ Gemini 2.0</option>
                <option value="gemini-direct">🔑 Studio / Offline</option>
              </select>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Prompt Chips */}
          <div className="px-4 py-2 border-b border-zinc-100 bg-white flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
            <span className="text-[10px] uppercase font-bold text-zinc-400 shrink-0">
              Pintas:
            </span>
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt)}
                disabled={loading}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 text-[11px] whitespace-nowrap transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-zinc-50/30">
            {messages.map((m, idx) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={idx}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-2xs ${
                      isUser
                        ? 'bg-zinc-900 text-white rounded-br-xs'
                        : 'bg-white border border-zinc-200/80 text-zinc-800 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Action Executed Pills if any */}
                    {m.actionsExecuted && m.actionsExecuted.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-zinc-100 space-y-1">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                          Tindakan Dieksekusi ke Workspace:
                        </span>
                        {m.actionsExecuted.map((act, actIdx) => (
                          <div
                            key={actIdx}
                            className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60"
                          >
                            <svg className="w-3 h-3 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>{act}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-zinc-400 mt-1 px-1 font-mono">
                    {m.timestamp}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 bg-white border border-zinc-200/80 px-3 py-2 rounded-2xl max-w-[50%]">
                <svg className="w-3.5 h-3.5 animate-spin text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Menganalisis & merespon...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 border-t border-zinc-100 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Tanya atau perintahkan AI untuk ruang "${project.name}"...`}
              disabled={loading}
              className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 bg-zinc-50/50"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <span>Kirim</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
