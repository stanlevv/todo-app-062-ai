'use client';

import React, { useState, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { ProjectData, AiProjectPlan } from '@/types/todo';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface AiPlannerViewProps {
  activeProject: ProjectData | null;
  onPlanApplied: (result: { projectId: number; tasksCreated: number; projectName?: string }) => void;
  onBackToTodos?: () => void;
  onToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

type TabType = 'prd' | 'erd' | 'roles' | 'milestones' | 'tasks';

interface GrillMeHistoryItem {
  question: string;
  answer: string;
  aspect?: string;
}

export default function AiPlannerView({
  activeProject,
  onPlanApplied,
  onBackToTodos,
  onToast,
}: AiPlannerViewProps) {
  // Mobile responsive view switcher: 'cockpit' | 'inspector'
  const [mobileView, setMobileView] = useState<'cockpit' | 'inspector'>('cockpit');

  // Planning phase: 'setup' | 'grillme' | 'plan_ready'
  const [phase, setPhase] = useState<'setup' | 'grillme' | 'plan_ready'>('setup');

  // Setup Form State
  const [prompt, setPrompt] = useState('');
  const [teamSize, setTeamSize] = useState<number>(4);
  const [isSoftware, setIsSoftware] = useState<boolean>(true);
  const [duration, setDuration] = useState('4 Minggu');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // In-App Grill-Me State
  const [grillHistory, setGrillHistory] = useState<GrillMeHistoryItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<{
    round: number;
    aspect: string;
    question: string;
    contextHint: string;
    suggestions: string[];
  } | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loadingGrill, setLoadingGrill] = useState(false);
  const [loadingFinalPlan, setLoadingFinalPlan] = useState(false);

  // Result Plan State
  const [plan, setPlan] = useState<AiProjectPlan | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('prd');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Apply Target State
  const [targetApply, setTargetApply] = useState<'current_project' | 'new_project' | 'personal'>('new_project');
  const [customProjectName, setCustomProjectName] = useState('');
  const [applying, setApplying] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Initial load check: if activeProject already has saved plan_data, load it directly
  useEffect(() => {
    if (activeProject && activeProject.plan_data) {
      try {
        const parsed =
          typeof activeProject.plan_data === 'string'
            ? JSON.parse(activeProject.plan_data)
            : activeProject.plan_data;
        if (parsed && parsed.projectName) {
          setPlan(parsed);
          setIsSoftware(parsed.isSoftware ?? true);
          setPhase('plan_ready');
          setTargetApply('current_project');
          setCustomProjectName(activeProject.name);
          const ids = new Set<string>((parsed.tasks || []).map((t: any) => t.id || t.task));
          setSelectedTaskIds(ids);
          return;
        }
      } catch (e) {
        console.warn('Gagal memuat plan_data:', e);
      }
    }

    // Default fresh state
    setPhase('setup');
    setTargetApply(activeProject ? 'current_project' : 'new_project');
    setPlan(null);
    setGrillHistory([]);
    setCurrentQuestion(null);
    setCurrentAnswer('');
  }, [activeProject]);

  // Auto-detect software vs non-software when user types prompt
  const handlePromptChange = (val: string) => {
    setPrompt(val);
    const text = val.toLowerCase();
    const softwareKw = ['aplikasi', 'web', 'sistem', 'software', 'app', 'pos', 'kasir', 'toko', 'ecommerce', 'crud', 'coding', 'database'];
    const nonSoftwareKw = ['skripsi', 'makalah', 'laporan', 'event', 'seminar', 'kegiatan', 'belajar', 'ujian', 'rundown'];

    const hasSw = softwareKw.some((kw) => text.includes(kw));
    const hasNonSw = nonSoftwareKw.some((kw) => text.includes(kw));

    if (hasNonSw && !hasSw) {
      setIsSoftware(false);
    } else if (hasSw) {
      setIsSoftware(true);
    }
  };

  // Step 1: Start Grill-Me Session
  const handleStartGrillMe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || prompt.trim().length < 3) {
      if (onToast) onToast('error', 'Masukkan deskripsi ide atau sasaran proyek minimal 3 karakter.');
      return;
    }

    setLoadingGrill(true);
    setPhase('grillme');

    try {
      const res = await aiApi.grillMeNext({
        prompt: prompt.trim(),
        history: [],
        isSoftware,
        apiKey: apiKey.trim() || undefined,
      });

      if (res.success && res.data) {
        setCurrentQuestion(res.data);
        setCurrentAnswer('');
      } else {
        throw new Error(res.message || 'Gagal memulai Grill-Me.');
      }
    } catch (err: any) {
      setPhase('setup');
      if (onToast) onToast('error', err.message || 'Gagal memulai sesi tanya-jawab.');
    } finally {
      setLoadingGrill(false);
    }
  };

  // Step 2A: Next Question in Grill-Me
  const handleNextGrillQuestion = async () => {
    if (!currentQuestion) return;
    const ans = currentAnswer.trim() || 'Sesuai rekomendasi standar tim.';
    const updatedHistory: GrillMeHistoryItem[] = [
      ...grillHistory,
      {
        question: currentQuestion.question,
        answer: ans,
        aspect: currentQuestion.aspect,
      },
    ];
    setGrillHistory(updatedHistory);
    setCurrentAnswer('');
    setLoadingGrill(true);

    try {
      const res = await aiApi.grillMeNext({
        prompt: prompt.trim(),
        history: updatedHistory,
        isSoftware,
        apiKey: apiKey.trim() || undefined,
      });

      if (res.success && res.data) {
        setCurrentQuestion(res.data);
        if (onToast) onToast('info', `Putaran #${res.data.round}: ${res.data.aspect}`);
      } else {
        throw new Error(res.message || 'Gagal mengambil pertanyaan berikutnya.');
      }
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal mengambil pertanyaan berikutnya.');
    } finally {
      setLoadingGrill(false);
    }
  };

  // Step 2B: Finalize Plan
  const handleFinalizePlan = async () => {
    let finalHistory = [...grillHistory];
    if (currentQuestion && currentAnswer.trim()) {
      finalHistory.push({
        question: currentQuestion.question,
        answer: currentAnswer.trim(),
        aspect: currentQuestion.aspect,
      });
      setGrillHistory(finalHistory);
    }

    setLoadingFinalPlan(true);

    try {
      const res = await aiApi.generatePlan({
        prompt: prompt.trim(),
        duration,
        teamSize,
        isSoftware,
        answers: finalHistory,
        apiKey: apiKey.trim() || undefined,
      });

      if (res.success && res.data) {
        const generatedPlan: AiProjectPlan = res.data;
        setPlan(generatedPlan);
        setCustomProjectName(generatedPlan.projectName);
        const ids = new Set<string>((generatedPlan.tasks || []).map((t) => t.id));
        setSelectedTaskIds(ids);
        setPhase('plan_ready');
        setActiveTab('prd');
        setMobileView('inspector');
        if (onToast) onToast('success', 'Rencana proyek komprehensif berhasil dirumuskan.');
      } else {
        throw new Error(res.message || 'Gagal menyusun rencana akhir.');
      }
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal menghasilkan rencana akhir.');
    } finally {
      setLoadingFinalPlan(false);
    }
  };

  // Toggle checklist tugas
  const toggleTask = (taskId: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const selectAllTasks = () => {
    if (!plan) return;
    setSelectedTaskIds(new Set(plan.tasks.map((t) => t.id)));
  };

  const deselectAllTasks = () => {
    setSelectedTaskIds(new Set());
  };

  // Copy helper
  const handleCopy = async (content: string, label: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback(label);
      if (onToast) onToast('info', `${label} disalin ke clipboard.`);
      setTimeout(() => setCopyFeedback(null), 2200);
    } catch {
      // Fallback
    }
  };

  // Copy PRD as Markdown
  const handleCopyPrdMarkdown = () => {
    if (!plan) return;
    const md = `# ${plan.isSoftware ? 'PRD' : 'Rencana Kerja'}: ${plan.projectName}

## Ringkasan Eksekutif
${plan.summary}

## 1. Latar Belakang & Pernyataan Masalah
- **Latar Belakang**: ${plan.prd.background}
- **Problem Statement**: ${plan.prd.problemStatement}
- **Solusi**: ${plan.prd.proposedSolution}

## 2. Sasaran Pengguna / Stakeholder
${plan.prd.targetAudience.map((a) => `- ${a}`).join('\n')}

## 3. Modul Kebutuhan
${plan.prd.functionalRequirements
  .map(
    (mod) => `### Modul: ${mod.module}
${mod.features.map((f) => `- ${f}`).join('\n')}`
  )
  .join('\n\n')}

## 4. Kebutuhan Non-Fungsional
${plan.prd.nonFunctionalRequirements.map((nf) => `- ${nf}`).join('\n')}
`;
    handleCopy(md, 'Dokumen PRD (Markdown)');
  };

  // Step 4: Apply Plan to Workspace / Todos
  const handleApply = async () => {
    if (!plan) return;
    const selectedTasks = plan.tasks
      .filter((t) => selectedTaskIds.has(t.id))
      .map((t) => t.task);

    if (selectedTasks.length === 0) {
      if (onToast) onToast('error', 'Pilih minimal satu tugas untuk diterapkan.');
      return;
    }

    setApplying(true);
    try {
      let payloadProjectId: number | null = null;
      let payloadProjectName: string | undefined = customProjectName.trim() || plan.projectName;

      if (targetApply === 'current_project' && activeProject) {
        payloadProjectId = activeProject.id;
        payloadProjectName = activeProject.name;
      } else if (targetApply === 'new_project') {
        payloadProjectId = null;
      }

      const res = await aiApi.applyPlan({
        projectId: payloadProjectId,
        projectName: payloadProjectName,
        planData: plan,
        selectedTasks,
      });

      if (res.success && res.data) {
        if (onToast) {
          onToast(
            'success',
            `Rencana diterapkan. ${res.data.tasksCreated} tugas dimasukkan ke workspace.`
          );
        }
        onPlanApplied({
          projectId: res.data.projectId,
          tasksCreated: res.data.tasksCreated,
          projectName: payloadProjectName,
        });
      } else {
        throw new Error(res.message || 'Gagal menerapkan rencana.');
      }
    } catch (err: any) {
      if (onToast) onToast('error', err.message || 'Gagal menyimpan rencana ke database.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-zinc-200/90 shadow-2xs flex flex-col overflow-hidden min-h-[720px] lg:h-[calc(100vh-7rem)] font-sans">
      {/* TOP COMMAND BAR */}
      <div className="px-5 py-3 border-b border-zinc-200/80 bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white flex items-center justify-center shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-zinc-950">
                Perencana Proyek AI & Penajaman (Grill-Me)
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                {isSoftware ? 'Rekayasa Software' : 'Jadwal & Riset'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              {activeProject
                ? `Konteks Ruang: ${activeProject.name}`
                : 'Workspace Tugas & Perencanaan Terpadu'}
            </p>
          </div>
        </div>

        {/* Right Action: Mobile Toggle & Back Button */}
        <div className="flex items-center gap-2">
          {/* Mobile View Toggle Buttons */}
          <div className="flex lg:hidden items-center bg-zinc-100 p-0.5 rounded-lg text-xs font-medium">
            <button
              type="button"
              onClick={() => setMobileView('cockpit')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mobileView === 'cockpit' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-600'
              }`}
            >
              Grill-Me
            </button>
            <button
              type="button"
              onClick={() => setMobileView('inspector')}
              className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                mobileView === 'inspector' ? 'bg-white text-zinc-950 shadow-2xs' : 'text-zinc-600'
              }`}
            >
              Dokumen {plan ? '✓' : ''}
            </button>
          </div>

          {/* Back to Todos Navigation Button */}
          {onBackToTodos && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBackToTodos}
              className="text-xs h-8 text-zinc-700 hover:text-zinc-950 border-zinc-200 cursor-pointer rounded-lg"
            >
              <svg className="w-3.5 h-3.5 mr-1 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Kembali ke Tugas
            </Button>
          )}
        </div>
      </div>

      {/* TWO-PANE MAIN WORKSPACE CONTAINER */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
        {/* ======================================================== */}
        {/* LEFT PANE (40% Desktop): GRILL-ME COCKPIT & INTERVIEW    */}
        {/* ======================================================== */}
        <div
          className={`w-full lg:w-[40%] border-r border-zinc-200/80 bg-zinc-50/50 flex flex-col justify-between overflow-y-auto ${
            mobileView === 'cockpit' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* PANE CONTENT */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* 1. SETUP PHASE */}
            {phase === 'setup' && (
              <form onSubmit={handleStartGrillMe} className="space-y-4">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-zinc-900">
                    Inisiasi Kebutuhan Proyek
                  </h4>
                  <p className="text-xs text-zinc-500">
                    Jelaskan ide atau sasaran proyek untuk membuka penajaman arsitektur.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 block">
                    Deskripsi / Ide Proyek
                  </label>
                  <Textarea
                    rows={4}
                    value={prompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder="Contoh: Sistem POS kasir kafe modern dengan pemesanan menu cepat, cetak nota struk, kalkulasi omset harian..."
                    required
                    className="text-xs border-zinc-200 focus:border-zinc-900 focus:ring-zinc-900"
                  />
                </div>

                {/* Kategori Proyek Switcher */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 block">
                    Jenis Rencana
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSoftware(true)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        isSoftware
                          ? 'border-zinc-900 bg-zinc-50 text-zinc-950 ring-1 ring-zinc-900 shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <span className="font-semibold text-xs block">Rekayasa Software</span>
                      <span className="text-[10px] text-zinc-400">PRD, ERD database & peran FE/BE</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSoftware(false)}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        !isSoftware
                          ? 'border-zinc-900 bg-zinc-50 text-zinc-950 ring-1 ring-zinc-900 shadow-2xs'
                          : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300'
                      }`}
                    >
                      <span className="font-semibold text-xs block">Jadwal & Riset Umum</span>
                      <span className="text-[10px] text-zinc-400">Timeline kerja tim (Tanpa ERD)</span>
                    </button>
                  </div>
                </div>

                {/* Team Size Selector Chips */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 block">
                    Jumlah Anggota Tim
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { size: 1, label: '1 (Solo)' },
                      { size: 2, label: '2 Orang' },
                      { size: 3, label: '3-4 Tim' },
                      { size: 5, label: '5+ Penuh' },
                    ].map((item) => (
                      <button
                        key={item.size}
                        type="button"
                        onClick={() => setTeamSize(item.size)}
                        className={`py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer ${
                          teamSize === item.size
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-2xs'
                            : 'bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Estimation */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 block">
                    Estimasi Durasi Target:
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-zinc-900/20 text-zinc-800"
                  >
                    <option value="1 Minggu (Sprint Cepat)">Sprint Cepat (1 Minggu)</option>
                    <option value="2 Minggu (Standar Mini)">Standar Mini (2 Minggu)</option>
                    <option value="4 Minggu (1 Bulan)">Standar (4 Minggu / 1 Bulan)</option>
                    <option value="8-12 Minggu (Semester / Rilis)">Jangka Menengah (2-3 Bulan)</option>
                  </select>
                </div>

                {/* Optional Custom Gemini API Key Collapsible */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 flex items-center justify-between w-full p-2 rounded-lg bg-zinc-100/80 border border-zinc-200/60 cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Google Gemini API Key (Opsional)
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {showApiKey ? 'Tutup' : 'Buka'}
                    </span>
                  </button>

                  {showApiKey && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 space-y-1.5">
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="AIzaSy... (kosongkan untuk engine cerdas bawaan)"
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  disabled={loadingGrill}
                  variant="default"
                  size="sm"
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium h-10 shadow-xs cursor-pointer rounded-xl"
                >
                  {loadingGrill ? (
                    <span className="flex items-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menganalisis Kebutuhan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Mulai Sesi Grill-Me
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  )}
                </Button>
              </form>
            )}

            {/* 2. IN-APP GRILL-ME INTERVIEW STREAM */}
            {(phase === 'grillme' || phase === 'plan_ready') && (
              <div className="space-y-4">
                {/* Header Sesi */}
                <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-900 animate-pulse" />
                    <span className="text-xs font-semibold text-zinc-900">Sesi Penajaman (Grill-Me)</span>
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    {grillHistory.length} Putaran Terjawab
                  </span>
                </div>

                {/* Question & Answer History Stream */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {grillHistory.map((item, idx) => (
                    <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-white border border-zinc-200/80 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-medium text-zinc-900 uppercase">
                          Q{idx + 1}: {item.aspect || 'Penajaman'}
                        </span>
                        <span className="text-[10px] text-zinc-500 font-medium">Terjawab</span>
                      </div>
                      <p className="text-xs font-semibold text-zinc-900">{item.question}</p>
                      <p className="text-xs text-zinc-600 bg-zinc-50 p-2 rounded-lg border border-zinc-100">
                        💬 {item.answer}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Active Question Card (if still in grillme phase) */}
                {phase === 'grillme' && currentQuestion && (
                  <div className="p-4 rounded-2xl bg-white border border-zinc-300 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="neutral" size="default">
                        Putaran #{currentQuestion.round}: {currentQuestion.aspect}
                      </Badge>
                      <span className="text-[10px] text-zinc-400">Pertanyaan AI</span>
                    </div>

                    <p className="text-xs font-bold text-zinc-950 leading-relaxed">
                      {currentQuestion.question}
                    </p>
                    <p className="text-[11px] text-zinc-500 leading-normal">
                      💡 {currentQuestion.contextHint}
                    </p>

                    {/* Suggestion Pills */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block">
                        Pilihan Cepat (Klik untuk memilih):
                      </span>
                      <div className="flex flex-col gap-1.5">
                        {currentQuestion.suggestions.map((sug, sIdx) => (
                          <button
                            key={sIdx}
                            type="button"
                            onClick={() => setCurrentAnswer(sug)}
                            className={`text-left text-xs p-2.5 rounded-xl border transition-all cursor-pointer ${
                              currentAnswer === sug
                                ? 'bg-zinc-900 border-zinc-900 text-white font-medium'
                                : 'bg-zinc-50 border-zinc-200/80 text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300'
                            }`}
                          >
                            {sug}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Answer Input */}
                    <div className="space-y-1 pt-1">
                      <Input
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Atau ketik jawaban/penajaman khusus..."
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* Grill-Me Cockpit Action Buttons */}
                {phase === 'grillme' && (
                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingGrill || loadingFinalPlan}
                      onClick={handleNextGrillQuestion}
                      className="flex-1 text-xs border-zinc-300 hover:bg-white cursor-pointer rounded-xl h-9"
                    >
                      {loadingGrill ? (
                        <div className="w-3.5 h-3.5 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin mx-auto" />
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Lanjut Grill-Me (Tanya Lagi)
                        </span>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      disabled={loadingFinalPlan}
                      onClick={handleFinalizePlan}
                      className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs cursor-pointer shadow-xs rounded-xl h-9"
                    >
                      {loadingFinalPlan ? (
                        <span className="flex items-center justify-center gap-1.5">
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Menyusun Dokumen...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Selesai & Susun Rencana
                        </span>
                      )}
                    </Button>
                  </div>
                )}

                {/* Reset Button if already in plan_ready phase */}
                {phase === 'plan_ready' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPhase('setup');
                      setPlan(null);
                    }}
                    className="w-full text-xs text-zinc-600 hover:text-zinc-950 cursor-pointer"
                  >
                    Mulai Ulang Rencana Baru
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANE (60% Desktop): LIVE ARTIFACT INSPECTOR        */}
        {/* ======================================================== */}
        <div
          className={`w-full lg:w-[60%] bg-white flex flex-col justify-between overflow-hidden ${
            mobileView === 'inspector' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* TOP TABS & EXPORT TOOLS */}
          <div className="px-5 py-3 border-b border-zinc-200/80 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-2 shrink-0">
            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('prd')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'prd'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                1. {isSoftware ? 'PRD' : 'Rencana Kerja'}
              </button>

              {/* ERD Tab is conditionally rendered only if isSoftware */}
              {isSoftware && (
                <button
                  type="button"
                  onClick={() => setActiveTab('erd')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'erd'
                      ? 'bg-zinc-900 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                  }`}
                >
                  2. ERD & Skema
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveTab('roles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'roles'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                3. Peran ({plan ? plan.roles.length : teamSize})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('milestones')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'milestones'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                4. Milestone
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'tasks'
                    ? 'bg-zinc-900 text-white shadow-2xs'
                    : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-200/60'
                }`}
              >
                5. Tugas ({selectedTaskIds.size})
              </button>
            </div>

            {/* Export / Copy Tools */}
            {plan && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  onClick={handleCopyPrdMarkdown}
                  className="text-[11px] border-zinc-200 hover:bg-white"
                >
                  <svg className="w-3 h-3 mr-1 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copyFeedback === 'Dokumen PRD (Markdown)' ? 'Tersalin' : 'Salin Markdown'}
                </Button>
              </div>
            )}
          </div>

          {/* VIEWPORT CANVAS (SCROLLABLE ARTIFACT DETAILS) */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {!plan ? (
              /* Waiting for Plan Generation Placeholder */
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="max-w-xs space-y-1">
                  <h5 className="text-sm font-semibold text-zinc-900">Live Artifact Inspector</h5>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Mulai sesi Grill-Me di panel kiri. Dokumen PRD, ERD Mermaid, jobdesk peran, dan daftar tugas akan langsung terkompilasi di kanvas ini.
                  </p>
                </div>
              </div>
            ) : (
              /* Live Render of Generated Plan */
              <div className="space-y-4">
                {/* Project Header Banner */}
                <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-950">{plan.projectName}</h4>
                    <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{plan.summary}</p>
                  </div>
                  <Badge variant="neutral" size="sm">{plan.targetDuration}</Badge>
                </div>

                {/* TAB 1: PRD / RENCANA KERJA */}
                {activeTab === 'prd' && (
                  <div className="space-y-3">
                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-xs">1. Latar Belakang & Pernyataan Masalah</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3 space-y-2 text-xs text-zinc-700">
                        <div>
                          <span className="font-semibold text-zinc-900 block">Latar Belakang:</span>
                          <p className="leading-relaxed text-zinc-600">{plan.prd.background}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 block">Pernyataan Masalah:</span>
                          <p className="leading-relaxed text-zinc-600">{plan.prd.problemStatement}</p>
                        </div>
                        <div>
                          <span className="font-semibold text-zinc-900 block">Solusi yang Diajukan:</span>
                          <p className="leading-relaxed text-zinc-600">{plan.prd.proposedSolution}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="py-3 px-4">
                        <CardTitle className="text-xs">2. Modul Fungsional</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {plan.prd.functionalRequirements.map((mod, mIdx) => (
                            <div key={mIdx} className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 space-y-1.5">
                              <h6 className="text-[11px] font-mono font-medium text-zinc-900 uppercase">{mod.module}</h6>
                              <ul className="space-y-1 text-xs text-zinc-600">
                                {mod.features.map((feat, fIdx) => (
                                  <li key={fIdx} className="flex items-start gap-1.5">
                                    <span className="text-zinc-400 font-bold shrink-0">•</span>
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* TAB 2: ERD & SKEMA DATA (HANYA SOFTWARE) */}
                {activeTab === 'erd' && plan.erd && (
                  <div className="space-y-3">
                    <Card>
                      <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
                        <CardTitle className="text-xs">Diagram ERD (Mermaid Format)</CardTitle>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => handleCopy(plan.erd!.mermaid, 'Sintaks Mermaid ERD')}
                          className="text-[10px] border-zinc-200"
                        >
                          {copyFeedback === 'Sintaks Mermaid ERD' ? 'Tersalin' : 'Salin Mermaid'}
                        </Button>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="bg-zinc-900 text-zinc-100 p-3.5 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-zinc-800">
                          <pre>{plan.erd.mermaid}</pre>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Database Tables Specification */}
                    <div className="space-y-2">
                      <h6 className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">
                        Rincian Tabel Basis Data MySQL
                      </h6>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {plan.erd.tables.map((tbl, tIdx) => (
                          <div key={tIdx} className="border border-zinc-200/80 rounded-xl p-3 bg-white space-y-1.5">
                            <div className="flex items-center justify-between border-b border-zinc-100 pb-1.5">
                              <span className="font-mono text-xs font-medium text-zinc-900">{tbl.tableName}</span>
                              <span className="text-[10px] text-zinc-400">{tbl.description}</span>
                            </div>
                            <div className="space-y-1">
                              {tbl.columns.map((col, cIdx) => (
                                <div key={cIdx} className="flex items-center justify-between text-[11px]">
                                  <span className="font-mono font-medium text-zinc-800">{col.name}</span>
                                  <span className="text-zinc-400 font-mono text-[10px]">{col.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ROLES & JOBDESK */}
                {activeTab === 'roles' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {plan.roles.map((r, rIdx) => (
                        <div key={rIdx} className="border border-zinc-200/80 rounded-2xl p-3.5 bg-white space-y-2 shadow-2xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-xs text-zinc-950">{r.title}</span>
                            <Badge variant="neutral" size="default">[{r.slug.toUpperCase()}]</Badge>
                          </div>
                          <ul className="space-y-1 text-xs text-zinc-600">
                            {r.responsibilities.map((resp, idx) => (
                              <li key={idx} className="flex items-start gap-1.5">
                                <span className="text-zinc-400 font-bold shrink-0">•</span>
                                <span>{resp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: MILESTONES */}
                {activeTab === 'milestones' && (
                  <div className="space-y-2.5">
                    {plan.milestones.map((ms, mIdx) => (
                      <div key={mIdx} className="border border-zinc-200/80 rounded-xl p-3 bg-white flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center font-mono font-medium text-xs shrink-0">
                            {mIdx + 1}
                          </div>
                          <div>
                            <span className="font-medium text-xs text-zinc-950 block">{ms.title}</span>
                            <span className="text-[11px] text-zinc-500">{ms.description}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md shrink-0">
                          {ms.duration}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* TAB 5: TASKS CHECKLIST */}
                {activeTab === 'tasks' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 font-medium">
                        {selectedTaskIds.size} dari {plan.tasks.length} tugas terpilih
                      </span>
                      <div className="flex items-center gap-2 text-[11px]">
                        <button type="button" onClick={selectAllTasks} className="text-zinc-900 hover:underline font-medium cursor-pointer">
                          Pilih Semua
                        </button>
                        <span className="text-zinc-300">|</span>
                        <button type="button" onClick={deselectAllTasks} className="text-zinc-500 hover:underline font-medium cursor-pointer">
                          Batal Semua
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                      {plan.tasks.map((task) => {
                        const isChecked = selectedTaskIds.has(task.id);
                        return (
                          <div
                            key={task.id}
                            onClick={() => toggleTask(task.id)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                              isChecked ? 'bg-zinc-50 border-zinc-300' : 'bg-white border-zinc-200/80 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleTask(task.id)}
                                className="w-4 h-4 text-zinc-900 rounded border-zinc-300 accent-zinc-900 cursor-pointer"
                              />
                              <span className="text-xs font-medium text-zinc-900 truncate">
                                {task.task}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded border border-zinc-200 shrink-0">
                              {task.priority.toUpperCase()}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* BOTTOM ACTION BAR */}
          {plan && (
            <div className="p-3.5 border-t border-zinc-200/80 bg-zinc-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-700">Terapkan ke:</span>
                <select
                  value={targetApply}
                  onChange={(e: any) => setTargetApply(e.target.value)}
                  className="h-8.5 px-2.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-900/20 text-zinc-800"
                >
                  <option value="new_project">Buat Ruang Kelompok Baru</option>
                  {activeProject && (
                    <option value="current_project">Ruang Aktif ({activeProject.name})</option>
                  )}
                  <option value="personal">Daftar Tugas Pribadi (Personal)</option>
                </select>

                {targetApply === 'new_project' && (
                  <Input
                    value={customProjectName}
                    onChange={(e) => setCustomProjectName(e.target.value)}
                    placeholder="Nama Ruang Proyek"
                    className="h-8.5 text-xs w-44"
                  />
                )}
              </div>

              <div className="flex items-center gap-2 justify-end">
                {onBackToTodos && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onBackToTodos}
                  >
                    Batal
                  </Button>
                )}
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={applying || selectedTaskIds.size === 0}
                  onClick={handleApply}
                  className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs h-9 cursor-pointer rounded-xl"
                >
                  {applying ? (
                    <span className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Menerapkan...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Terapkan ke Workspace ({selectedTaskIds.size} Tugas)
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
