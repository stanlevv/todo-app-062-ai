import dotenv from 'dotenv';
dotenv.config();

export interface AiTask {
    id: string;
    role: string;
    roleSlug: string;
    task: string;
    priority: 'high' | 'medium' | 'low';
    phase: string;
    estimatedDays: number;
}

export interface AiRole {
    roleName: string;
    slug: string;
    title: string;
    responsibilities: string[];
    deliverables: string[];
}

export interface AiErdTable {
    tableName: string;
    description: string;
    columns: Array<{
        name: string;
        type: string;
        key?: string;
        description?: string;
    }>;
}

export interface AiMilestone {
    phase: string;
    title: string;
    duration: string;
    description: string;
}

export interface AiProjectPlan {
    projectName: string;
    summary: string;
    targetDuration: string;
    isSoftware: boolean;
    prd: {
        background: string;
        problemStatement: string;
        proposedSolution: string;
        targetAudience: string[];
        functionalRequirements: Array<{
            module: string;
            features: string[];
        }>;
        nonFunctionalRequirements: string[];
        systemConstraints: string[];
    };
    erd: {
        description: string;
        mermaid: string;
        tables: AiErdTable[];
    } | null;
    roles: AiRole[];
    milestones: AiMilestone[];
    tasks: AiTask[];
}

export interface AiModelOption {
    id: string;
    name: string;
    provider: 'openrouter' | 'gemini';
    badge: string;
    description: string;
    isFree: boolean;
}

export const AVAILABLE_AI_MODELS: AiModelOption[] = [
    {
        id: 'openrouter/free',
        name: 'Auto Free Router',
        provider: 'openrouter',
        badge: '⚡ Auto Free',
        description: 'Otomatis me-route ke model gratis terbaik yang antreannya sepi',
        isFree: true
    },
    {
        id: 'deepseek/deepseek-r1:free',
        name: 'DeepSeek R1 Free',
        provider: 'openrouter',
        badge: '🧠 Reasoning',
        description: 'Model penalaran logika mendalam terbaik untuk PRD & arsitektur sistem',
        isFree: true
    },
    {
        id: 'meta-llama/llama-3.3-70b-instruct:free',
        name: 'Meta Llama 3.3 70B',
        provider: 'openrouter',
        badge: '🦙 Meta AI',
        description: 'Kecepatan tinggi dan kepatuhan format tugas presisi',
        isFree: true
    },
    {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash Free',
        provider: 'openrouter',
        badge: '✨ Gemini 2.0',
        description: 'Generasi kilat dan pemahaman konteks kolaborasi tim',
        isFree: true
    },
    {
        id: 'gemini-direct',
        name: 'Gemini Direct (Default)',
        provider: 'gemini',
        badge: '🔑 Google AI',
        description: 'Koneksi langsung ke Google AI Studio API dengan fail-safe offline',
        isFree: true
    }
];

export interface GrillMeQuestion {
    round: number;
    aspect: string;
    question: string;
    contextHint: string;
    suggestions: string[];
}

export interface GeneratePlanOptions {
    projectType?: string;
    duration?: string;
    teamSize?: number;
    isSoftware?: boolean;
    answers?: Array<{ question: string; answer: string }>;
    customApiKey?: string;
    model?: string;
}

/**
 * Universal OpenRouter / OpenAI-Compatible API Caller
 */
async function callOpenRouterCompletion(params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    apiKey?: string;
    jsonOutput?: boolean;
}): Promise<string | null> {
    const { model, systemPrompt, userPrompt, apiKey, jsonOutput } = params;
    const token = apiKey || process.env.OPENROUTER_API_KEY;
    if (!token) return null;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
        const bodyPayload: any = {
            model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3
        };
        if (jsonOutput) {
            bodyPayload.response_format = { type: 'json_object' };
        }

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                'HTTP-Referer': 'https://github.com/todo-app-062',
                'X-Title': 'Todo Workspace Multi-AI Planner'
            },
            body: JSON.stringify(bodyPayload)
        });
        clearTimeout(timeout);
        if (!res.ok) {
            const errText = await res.text();
            console.warn(`OpenRouter API error (${res.status}):`, errText);
            return null;
        }

        const data: any = await res.json();
        return data?.choices?.[0]?.message?.content || null;
    } catch (err) {
        clearTimeout(timeout);
        console.warn('OpenRouter request error:', err);
        return null;
    }
}

/**
 * Panggil Gemini API untuk menghasilkan pertanyaan Grill-Me dinamis
 */
async function callGeminiGrillMe(
    prompt: string,
    history: Array<{ question: string; answer: string }>,
    apiKey: string,
    isSoftware: boolean,
    model?: string
): Promise<GrillMeQuestion | null> {
    const systemPrompt = `Kamu adalah Lead Tech Architect & Agile Coach.
Tugasmu adalah mengajukan SATU pertanyaan penajaman arsitektur (Grill-Me) berikutnya yang sangat relevan untuk ide proyek pengguna.
Kategori: ${isSoftware ? 'Proyek Rekayasa Perangkat Lunak' : 'Rencana Jadwal / Kegiatan Umum Non-Software'}.
Format respon HARUS JSON valid tanpa markdown fence backticks:
{
  "round": ${history.length + 1},
  "aspect": string,
  "question": string,
  "contextHint": string,
  "suggestions": [string, string, string]
}`;

    const userPrompt = `Ide Proyek: "${prompt}".
Riwayat tanya-jawab sejauh ini:
${history.map((h, i) => `Q${i + 1}: ${h.question} -> A: ${h.answer}`).join('\n')}

Ajukan pertanyaan penajaman berikutnya yang belum terjawab (misal: aktor/hak akses, workflow utama, arsitektur data & keamanan untuk software; atau sasaran capaian, timeline, pembagian tim untuk non-software). Berikan 3 pilihan cepat (suggestions).`;

    // 1. Coba OpenRouter jika model dipilih adalah model OpenRouter
    if (model && model !== 'gemini-direct') {
        const rawOpenRouter = await callOpenRouterCompletion({
            model,
            systemPrompt,
            userPrompt,
            apiKey,
            jsonOutput: true
        });
        if (rawOpenRouter) {
            try {
                const cleaned = rawOpenRouter.replace(/```json/g, '').replace(/```/g, '').trim();
                const parsed = JSON.parse(cleaned);
                if (parsed && parsed.question && Array.isArray(parsed.suggestions)) {
                    return parsed as GrillMeQuestion;
                }
            } catch {
                // fall through
            }
        }
    }

    // 2. Jalur Gemini Studio (Kunci Google atau fallback default)
    const geminiKey = process.env.GEMINI_API_KEY || (apiKey && !apiKey.startsWith('sk-or-') ? apiKey : '');
    if (!geminiKey) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
        const res = await fetch(url, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: systemPrompt }, { text: userPrompt }] }],
                generationConfig: { responseMimeType: 'application/json', temperature: 0.4 }
            })
        });
        clearTimeout(timeout);
        if (!res.ok) return null;
        const data: any = await res.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) return null;
        const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaned) as GrillMeQuestion;
    } catch {
        clearTimeout(timeout);
        return null;
    }
}

/**
 * Pertanyaan Grill-Me Berbasis Rule / Offline
 */
function getDeterministicGrillMe(
    prompt: string,
    history: Array<{ question: string; answer: string }>,
    isSoftware: boolean
): GrillMeQuestion {
    const round = history.length + 1;

    if (isSoftware) {
        if (round === 1) {
            return {
                round: 1,
                aspect: 'Aktor & Hak Akses',
                question: 'Siapa saja aktor/pengguna utama sistem ini dan bagaimana pemisahan hak aksesnya?',
                contextHint: 'Menentukan tabel users, role guard, dan batasan privasi data.',
                suggestions: [
                    'Admin pengelola penuh & Pengguna terdaftar umum',
                    'Multi-Role: Owner/Supervisor, Kasir/Operator, dan Pelanggan',
                    'Publik tanpa login untuk katalog + Akun khusus untuk transaksi'
                ]
            };
        }
        if (round === 2) {
            return {
                round: 2,
                aspect: 'Alur Kerja (Workflow) Kunci',
                question: 'Bagaimana urutan alur transaksi atau proses kerja utama dari awal hingga selesai?',
                contextHint: 'Menentukan modul fungsional dan status perubahan state di sistem.',
                suggestions: [
                    'Pilih Item -> Keranjang -> Checkout Transaksi -> Bukti/Invoice',
                    'Pengajuan Data -> Validasi/Review Petugas -> Status Selesai',
                    'Dashboard Monitoring -> Tindakan Aksi -> Log Riwayat Aktivitas'
                ]
            };
        }
        if (round === 3) {
            return {
                round: 3,
                aspect: 'Arsitektur Data & Integrasi',
                question: 'Bagaimana kebutuhan entitas basis data MySQL dan apakah membutuhkan integrasi pihak ketiga?',
                contextHint: 'Menentukan rancangan relasi foreign key ERD dan API eksternal.',
                suggestions: [
                    'Basis data relasional MySQL murni (Tabel ternormalisasi)',
                    'MySQL + Integrasi Payment Gateway / QRIS dinamis',
                    'MySQL + Ekspor Laporan Excel/PDF & Notifikasi Pesan'
                ]
            };
        }
        if (round === 4) {
            return {
                round: 4,
                aspect: 'Keamanan & Penanganan Edge-Case',
                question: 'Bagaimana standar keamanan dan penanganan kesalahan (edge-case) yang wajib dipenuhi?',
                contextHint: 'Menentukan validator middleware, hashing bcrypt, dan prepared statements.',
                suggestions: [
                    'JWT Bearer Token + Prepared Statements anti SQL Injection + Hashing bcrypt',
                    'Audit Log perubahan data + Rate limiting request',
                    'Validasi schema ketat pada input form + Error response seragam'
                ]
            };
        }
        return {
            round,
            aspect: 'Strategi Rilis & Validasi',
            question: `Apa target kriteria penerimaan (Acceptance Criteria) paling kritis sebelum sistem dirilis?`,
            contextHint: 'Menentukan skenario testing QA dan sign-off UAT.',
            suggestions: [
                'Uji performa transaksi stabil tanpa selisih perhitungan',
                'Responsif 100% pada mobile dan desktop tanpa error console',
                'Dokumentasi API lengkap dan lulus security audit dasar'
            ]
        };
    } else {
        // Non-Software (Jadwal, Riset, Skripsi, Event)
        if (round === 1) {
            return {
                round: 1,
                aspect: 'Sasaran & Output Capaian',
                question: 'Apa bentuk output nyata atau target capaian utama yang harus diselesaikan?',
                contextHint: 'Menentukan batas scope dan tolok ukur keberhasilan proyek.',
                suggestions: [
                    'Dokumen Laporan Lengkap (Bab 1 sampai Penutup)',
                    'Eksekusi Rundown Kegiatan & Acara Berjalan Sukses',
                    'Materi Presentasi, Portofolio & Berkas Evaluasi'
                ]
            };
        }
        if (round === 2) {
            return {
                round: 2,
                aspect: 'Target Waktu & Milestone Kritis',
                question: 'Bagaimana pembagian tenggat waktu (deadline) per tahapan kegiatan?',
                contextHint: 'Menentukan jadwal roadmap per minggu atau per sprint.',
                suggestions: [
                    'Target Mingguan Terstruktur (Minggu 1 Riset, M2 Draf, M3 Review, M4 Final)',
                    'Sprint Cepat 2 Minggu Penuh dengan Checkpoint Harian',
                    'Milestone Fleksibel dengan Target Evaluasi 2 Pekan Sekali'
                ]
            };
        }
        if (round === 3) {
            return {
                round: 3,
                aspect: 'Struktur Kerja & Delegasi Tim',
                question: 'Bagaimana pembagian tanggung jawab di antara anggota tim?',
                contextHint: 'Menentukan jobdesk ketua, riset, penyusunan materi, dan dokumentasi.',
                suggestions: [
                    'Koordinator Proyek + Tim Riset/Materi + Tim Dokumentasi & Desain',
                    'Bagi rata per bagian modul/bab materi secara mandiri',
                    'Ketua Tim merangkap review + Anggota mengeksekusi operasional lapangan'
                ]
            };
        }
        return {
            round,
            aspect: 'Review & Monitoring Kemajuan',
            question: 'Bagaimana tim akan memantau kemajuan tugas dan mengatasi kendala waktu?',
            contextHint: 'Menentukan alur review berkala dan acceptance checklist.',
            suggestions: [
                'Review berkala setiap akhir pekan menggunakan checklist Todo',
                'Standup singkat 10 menit untuk update blocker tugas',
                'Pengecekan mandiri sesuai target deadline masing-masing'
            ]
        };
    }
}

/**
 * Adaptasi peran tim berdasarkan ukuran tim (teamSize)
 */
function getAdaptiveRoles(teamSize: number, isSoftware: boolean): AiRole[] {
    if (isSoftware) {
        if (teamSize <= 1) {
            return [
                {
                    roleName: 'Full-Stack Lead (Solo)',
                    slug: 'solo',
                    title: 'Full-Stack Software Engineer (Solo)',
                    responsibilities: [
                        'Merancang arsitektur sistem, PRD, dan skema database MySQL',
                        'Mengembangkan REST API Express.js dan antarmuka Next.js React 19',
                        'Melakukan pengujian mandiri dan deployment akhir'
                    ],
                    deliverables: ['PRD & ERD', 'Full-stack Web App', 'Production Release']
                }
            ];
        }

        if (teamSize === 2) {
            return [
                {
                    roleName: 'Lead & Backend Developer',
                    slug: 'be',
                    title: 'Project Lead & Backend Engineer',
                    responsibilities: [
                        'Memimpin scope proyek dan koordinasi sprint',
                        'Merancang skema database MySQL dengan Prepared Statements',
                        'Membangun REST API Express.js terproteksi JWT'
                    ],
                    deliverables: ['Dokumen PRD & ERD', 'REST API & Database MySQL']
                },
                {
                    roleName: 'Frontend & UI/UX Developer',
                    slug: 'fe',
                    title: 'Frontend & Product Designer',
                    responsibilities: [
                        'Merancang wireframe dan komponen UI menggunakan shadcn/ui',
                        'Implementasi halaman Next.js responsif dan state management',
                        'Pengujian antarmuka dan validasi form interaktif'
                    ],
                    deliverables: ['UI/UX Design System', 'Frontend Next.js Terintegrasi']
                }
            ];
        }

        if (teamSize <= 4) {
            return [
                {
                    roleName: 'Project Manager & QA',
                    slug: 'pm',
                    title: 'Project Manager & Quality Assurance',
                    responsibilities: [
                        'Menyusun WBS, backlog prioritas, dan jadwal milestone',
                        'Menguji fungsionalitas fitur dan verifikasi laporan bug'
                    ],
                    deliverables: ['WBS Roadmap', 'Test Cases & Bug Report']
                },
                {
                    roleName: 'UI/UX Designer',
                    slug: 'uiux',
                    title: 'UI/UX & Visual Designer',
                    responsibilities: [
                        'Merancang alur pengguna (user flow) dan wireframe',
                        'Menstandarkan token warna Tailwind dan primitif shadcn/ui'
                    ],
                    deliverables: ['Wireframe Figma', 'Design System Guidelines']
                },
                {
                    roleName: 'Backend Developer',
                    slug: 'be',
                    title: 'Backend & Database Engineer',
                    responsibilities: [
                        'Merancang dan mengeksekusi migrasi DDL MySQL',
                        'Membangun REST API Express.js dengan middleware validator & auth'
                    ],
                    deliverables: ['Skema Database MySQL', 'Endpoints REST API']
                },
                {
                    roleName: 'Frontend Developer',
                    slug: 'fe',
                    title: 'Frontend Developer (Next.js)',
                    responsibilities: [
                        'Slicing antarmuka modular Next.js berbasis shadcn/ui',
                        'Integrasi HTTP Client dengan caching dan custom hooks'
                    ],
                    deliverables: ['Halaman Web Responsif', 'State Management & Form']
                }
            ];
        }

        // 5+ Anggota Tim: 5 Peran Penuh
        return [
            {
                roleName: 'Project Manager',
                slug: 'pm',
                title: 'Project Manager & Scrum Master',
                responsibilities: [
                    'Menentukan scope, backlog prioritas, dan sprint timeline',
                    'Mengawasi beban kerja tim, memfasilitasi UAT dan sign-off rilis'
                ],
                deliverables: ['Dokumen PRD & WBS', 'Sprint Roadmap & UAT Sign-off']
            },
            {
                roleName: 'UI/UX Designer',
                slug: 'uiux',
                title: 'UI/UX Product Designer',
                responsibilities: [
                    'Merancang Information Architecture, wireframe, dan prototype interaktif',
                    'Menetapkan konsistensi token Tailwind dan komponen shadcn/ui'
                ],
                deliverables: ['Figma Prototype', 'Aset SVG & Design System']
            },
            {
                roleName: 'Frontend Engineer',
                slug: 'fe',
                title: 'Frontend Developer (Next.js & React 19)',
                responsibilities: [
                    'Implementasi halaman web Next.js App Router dan micro-interactions',
                    'Integrasi REST API, filter peran, dan caching data'
                ],
                deliverables: ['Komponen UI Modular', 'Integrasi API Terproteksi']
            },
            {
                roleName: 'Backend Engineer',
                slug: 'be',
                title: 'Backend Developer (Express.js & MySQL)',
                responsibilities: [
                    'Merancang skema DDL MySQL dan query prepared statements (? )',
                    'Membangun RESTful API dengan endpoint CRUD dan JWT Bearer'
                ],
                deliverables: ['Skema Database MySQL', 'REST API & Auth Middleware']
            },
            {
                roleName: 'Quality Assurance',
                slug: 'qa',
                title: 'QA Engineer & Security Auditor',
                responsibilities: [
                    'Menyusun skenario pengujian fungsional dan edge-case testing',
                    'Audit keamanan input terhadap SQL Injection dan pelacakan bug'
                ],
                deliverables: ['Test Matrix & Validasi', 'Laporan Audit & Checklist Rilis']
            }
        ];
    } else {
        // Non-Software Adaptive Roles
        if (teamSize <= 1) {
            return [
                {
                    roleName: 'Pelaksana Mandiri',
                    slug: 'mandiri',
                    title: 'Penanggung Jawab & Pelaksana Kegiatan',
                    responsibilities: [
                        'Menyusun kerangka acuan kegiatan dan jadwal eksekusi',
                        'Melakukan riset, penyusunan materi, dan evaluasi hasil kegiatan'
                    ],
                    deliverables: ['Rencana Kerja', 'Hasil Laporan & Dokumentasi']
                }
            ];
        }

        if (teamSize <= 3) {
            return [
                {
                    roleName: 'Koordinator Proyek',
                    slug: 'lead',
                    title: 'Koordinator & Pengarah Kegiatan',
                    responsibilities: [
                        'Menetapkan target capaian, membagi tugas, dan memantau timeline kegiatan',
                        'Review akhir laporan dan koordinasi stakeholder'
                    ],
                    deliverables: ['Rencana Kerja & Timeline', 'Laporan Hasil Evaluasi']
                },
                {
                    roleName: 'Tim Riset & Konten',
                    slug: 'riset',
                    title: 'Spesialis Riset & Penyusunan Materi',
                    responsibilities: [
                        'Mengumpulkan data, referensi studi, dan menyusun draf materi utama',
                        'Melakukan verifikasi keakuratan informasi'
                    ],
                    deliverables: ['Draf Konten/Materi', 'Kumpulan Data & Referensi']
                },
                {
                    roleName: 'Tim Dokumentasi & Desain',
                    slug: 'media',
                    title: 'Spesialis Dokumentasi & Presentasi',
                    responsibilities: [
                        'Menyusun tata letak dokumen, slide presentasi, dan materi visual',
                        'Merekap hasil kegiatan dan notulensi evaluasi'
                    ],
                    deliverables: ['Slide Presentasi', 'Dokumen Final Terformat']
                }
            ];
        }

        // 4+ Orang Non-Software
        return [
            {
                roleName: 'Koordinator Tim',
                slug: 'lead',
                title: 'Ketua / Koordinator Kegiatan',
                responsibilities: [
                    'Memimpin perencanaan, penjadwalan, dan sinkronisasi tugas anggota tim',
                    'Melakukan final review dan memimpin sesi presentasi/evaluasi'
                ],
                deliverables: ['Master Timeline & WBS', 'Laporan Pertanggungjawaban']
            },
            {
                roleName: 'Tim Riset & Kajian',
                slug: 'riset',
                title: 'Analis Riset & Pengumpul Data',
                responsibilities: [
                    'Menggali data pendukung, literatur, dan bahan rujukan kegiatan',
                    'Menyusun draf substansi dan analisis pembahasan'
                ],
                deliverables: ['Ringkasan Kajian', 'Draf Bab Utama']
            },
            {
                roleName: 'Tim Penulis & Editor',
                slug: 'penulis',
                title: 'Penyusun Naskah & Editor Dokumen',
                responsibilities: [
                    'Menyatukan kontribusi tulisan ke dalam format dokumen standar',
                    'Memeriksa tata bahasa, konsistensi istilah, dan kelengkapan bab'
                ],
                deliverables: ['Naskah Final Terpadu', 'Executive Summary']
            },
            {
                roleName: 'Tim Desain & Presentasi',
                slug: 'media',
                title: 'Spesialis Visual & Media Presentasi',
                responsibilities: [
                    'Merancang dek presentasi visual yang memikat dan mudah dipahami',
                    'Menyiapkan infografis, tabel ringkasan, dan aset media pendukung'
                ],
                deliverables: ['Slide Deck Profesional', 'Infografis Ringkasan']
            },
            {
                roleName: 'Tim Operasional & Logistik',
                slug: 'ops',
                title: 'Penanggung Jawab Operasional',
                responsibilities: [
                    'Mengelola jadwal pertemuan, notulensi, dan arsip dokumen bersama',
                    'Memastikan seluruh kebutuhan perlengkapan dan tenggat waktu terpenuhi'
                ],
                deliverables: ['Log Notulensi Rapat', 'Checklist Kesiapan Final']
            }
        ];
    }
}

/**
 * Deteksi apakah ide proyek adalah Software vs Non-Software
 */
export function detectIsSoftware(prompt: string, projectType?: string): boolean {
    const text = `${prompt} ${projectType || ''}`.toLowerCase();
    const softwareKeywords = [
        'aplikasi', 'web', 'sistem informasi', 'software', 'app', 'pos', 'kasir',
        'e-commerce', 'ecommerce', 'toko online', 'database', 'api', 'frontend',
        'backend', 'fullstack', 'crud', 'coding', 'program', 'login', 'portal',
        'marketplace', 'fitur', 'mysql', 'nextjs', 'express'
    ];
    return softwareKeywords.some(kw => text.includes(kw));
}

export const AiPlannerService = {
    // 1. Ambil pertanyaan Grill-Me berikutnya
    getGrillMeQuestion: async (
        prompt: string,
        history: Array<{ question: string; answer: string }> = [],
        options: { isSoftware?: boolean; customApiKey?: string; model?: string } = {}
    ): Promise<GrillMeQuestion> => {
        const isSoftware = options.isSoftware ?? detectIsSoftware(prompt);
        const apiKey = options.customApiKey || process.env.GEMINI_API_KEY || process.env.OPENROUTER_API_KEY;

        if (apiKey || options.model) {
            try {
                const q = await callGeminiGrillMe(prompt, history, apiKey || '', isSoftware, options.model);
                if (q && q.question && q.suggestions && q.suggestions.length > 0) {
                    return q;
                }
            } catch {
                // Fallback
            }
        }

        return getDeterministicGrillMe(prompt, history, isSoftware);
    },

    // 2. Susun Rencana Akhir (PRD, ERD jika software, Peran, Milestones, Tasks)
    generatePlan: async (
        prompt: string,
        options: GeneratePlanOptions = {}
    ): Promise<AiProjectPlan> => {
        const isSoftware = options.isSoftware ?? detectIsSoftware(prompt, options.projectType);
        const teamSize = options.teamSize || 4;
        const duration = options.duration || '4 Minggu';
        const roles = getAdaptiveRoles(teamSize, isSoftware);
        const answers = options.answers || [];

        // Konteks ringkasan hasil interview grill-me
        const interviewContext = answers.length > 0
            ? answers.map(a => `${a.question}: ${a.answer}`).join('; ')
            : 'Perencanaan langsung terstruktur standar.';

        if (isSoftware) {
            // Software Project Plan
            const p = prompt.toLowerCase();
            let baseName = 'Sistem Informasi Digital Terpadu';
            if (p.includes('kasir') || p.includes('pos') || p.includes('kafe')) {
                baseName = 'Sistem POS & Kasir Terintegrasi';
            } else if (p.includes('toko') || p.includes('e-commerce') || p.includes('market')) {
                baseName = 'Platform E-Commerce & Toko Digital';
            } else if (p.includes('klinik') || p.includes('kesehatan') || p.includes('medis')) {
                baseName = 'Sistem Informasi Manajemen Klinik';
            } else if (p.includes('kampus') || p.includes('akademik') || p.includes('sekolah')) {
                baseName = 'Portal Informasi Akademik Terpadu';
            } else if (prompt.trim().length > 3) {
                baseName = prompt.trim().split(' ').slice(0, 5).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            }

            const tasks: AiTask[] = [];
            let taskIdCounter = 1;

            roles.forEach(role => {
                role.responsibilities.forEach((resp, rIdx) => {
                    const tag = `[${role.slug.toUpperCase()}]`;
                    const priority = rIdx === 0 ? 'high' : rIdx === 1 ? 'medium' : 'low';
                    const phase = rIdx === 0 ? 'Fase 1' : rIdx === 1 ? 'Fase 2' : 'Fase 3';
                    tasks.push({
                        id: `task-${taskIdCounter++}`,
                        role: role.roleName,
                        roleSlug: role.slug,
                        task: `${tag} ${resp}`,
                        priority,
                        phase,
                        estimatedDays: rIdx === 0 ? 3 : 2
                    });
                });
            });

            return {
                projectName: baseName,
                summary: `Aplikasi perangkat lunak terintegrasi untuk "${prompt.trim()}". Disesuaikan berdasarkan sesi Grill-Me (${answers.length} putaran) untuk tim ${teamSize} orang.`,
                targetDuration: duration,
                isSoftware: true,
                prd: {
                    background: `Kebutuhan digitalisasi operasional untuk "${prompt.trim()}". Hasil penajaman arsitektur: ${interviewContext}`,
                    problemStatement: 'Proses pencatatan manual sering memicu fragmentasi data, inkonsistensi transaksi, dan lambatnya koordinasi antar peran.',
                    proposedSolution: 'Membangun aplikasi web full-stack modern menggunakan Next.js (React 19) dan Express.js (TypeScript) dengan integrasi MySQL Laragon port 3306.',
                    targetAudience: ['Pengguna Operasional & Kasir/Staf', 'Super Admin & Tim Pengelola', 'Reviewer / Penguji Praktikum'],
                    functionalRequirements: [
                        {
                            module: 'Modul Utama & Transaksi',
                            features: ['Pencatatan dan validasi data entitas utama', 'Filter pencarian cepat dan pagination cerdas', 'Pembaruan status operasional real-time']
                        },
                        {
                            module: 'Otentikasi & Keamanan',
                            features: ['Otentikasi aman dengan password hashing bcrypt', 'Proteksi endpoint via JWT Bearer Token', 'Tracing request menggunakan header X-Request-Id']
                        },
                        {
                            module: 'Workspace & Koordinasi Peran',
                            features: ['Daftar tugas terbagi per peran tim ([PM], [FE], [BE], dll.)', 'Filter chip peran di antarmuka Todo', 'Penyimpanan dokumentasi PRD/ERD permanen']
                        }
                    ],
                    nonFunctionalRequirements: [
                        'Response time API di bawah 200ms dengan Prepared Statements (?, connection pooling)',
                        'Komponen UI mematuhi token dan primitif shadcn/ui dengan warna primer blue-600',
                        'Responsif pada layar smartphone, tablet, dan desktop'
                    ],
                    systemConstraints: [
                        'Database relasional MySQL Laragon port 3306 (database: todo_db)',
                        'Express.js backend port 5000 dan Next.js frontend port 3000'
                    ]
                },
                erd: {
                    description: 'Arsitektur relasional database MySQL dengan kunci relasi terstruktur dan prepared statements.',
                    mermaid: `erDiagram
    USERS ||--o{ PROJECTS : "membuat"
    PROJECTS ||--|{ PROJECT_MEMBERS : "memuat"
    USERS ||--o{ PROJECT_MEMBERS : "bergabung"
    PROJECTS ||--o{ TODOS : "memiliki"
    USERS ||--o{ TODOS : "menugaskan"
    USERS {
        int id PK
        string username
        string email
        string password
    }
    PROJECTS {
        int id PK
        string name
        string code
        int owner_id FK
        text plan_data
    }
    PROJECT_MEMBERS {
        int id PK
        int project_id FK
        int user_id FK
        string role
    }
    TODOS {
        int id PK
        int user_id FK
        int project_id FK
        string task
        boolean is_completed
    }`,
                    tables: [
                        {
                            tableName: 'users',
                            description: 'Pengguna terotentikasi dalam sistem',
                            columns: [
                                { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', description: 'ID Pengguna' },
                                { name: 'username', type: 'VARCHAR(255)', key: 'UNIQUE', description: 'Nama unik pengguna' },
                                { name: 'email', type: 'VARCHAR(255)', key: 'UNIQUE', description: 'Surel akun' },
                                { name: 'password', type: 'VARCHAR(255)', description: 'Hash bcrypt' }
                            ]
                        },
                        {
                            tableName: 'projects',
                            description: 'Ruang kerja kelompok dan rencana proyek',
                            columns: [
                                { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', description: 'ID Ruang Proyek' },
                                { name: 'name', type: 'VARCHAR(255)', description: 'Nama proyek' },
                                { name: 'code', type: 'VARCHAR(20)', key: 'UNIQUE', description: 'Kode gabung tim' },
                                { name: 'owner_id', type: 'INT', key: 'FOREIGN KEY', description: 'Pembuat ruang' },
                                { name: 'plan_data', type: 'LONGTEXT', description: 'Dokumen PRD & ERD AI' }
                            ]
                        },
                        {
                            tableName: 'todos',
                            description: 'Daftar tugas kerja yang dieksekusi per peran',
                            columns: [
                                { name: 'id', type: 'INT AUTO_INCREMENT', key: 'PRIMARY KEY', description: 'ID Tugas' },
                                { name: 'user_id', type: 'INT', key: 'FOREIGN KEY', description: 'ID Pembuat/Eksekutor' },
                                { name: 'project_id', type: 'INT', key: 'FOREIGN KEY', description: 'ID Ruang Proyek' },
                                { name: 'task', type: 'VARCHAR(255)', description: 'Deskripsi tugas berlabel peran' },
                                { name: 'is_completed', type: 'TINYINT(1)', description: 'Status selesai (0/1)' }
                            ]
                        }
                    ]
                },
                roles,
                milestones: [
                    { phase: 'Fase 1', title: 'Perencanaan & UI/UX Design System', duration: 'Minggu 1', description: 'Finalisasi spesifikasi PRD, wireframe shadcn/ui, dan skema database.' },
                    { phase: 'Fase 2', title: 'Backend Core & Schema Database', duration: 'Minggu 2', description: 'Migrasi DDL MySQL, pembuatan endpoint API CRUD, dan autentikasi JWT.' },
                    { phase: 'Fase 3', title: 'Frontend Integration & State Management', duration: 'Minggu 3', description: 'Slicing antarmuka Next.js, integrasi Fetch API, dan filter chip peran.' },
                    { phase: 'Fase 4', title: 'QA Testing, Security Audit & Deployment', duration: 'Minggu 4', description: 'Pengujian edge-case, audit prepared statements, dan acceptance testing final.' }
                ],
                tasks
            };
        } else {
            // Non-Software Plan (Riset, Skripsi, Event, Tugas Belajar)
            const cleanName = prompt.trim().length > 3
                ? prompt.trim().split(' ').slice(0, 6).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
                : 'Rencana Kegiatan & Jadwal Kerja';

            const tasks: AiTask[] = [];
            let taskIdCounter = 1;

            roles.forEach(role => {
                role.responsibilities.forEach((resp, rIdx) => {
                    const tag = `[${role.slug.toUpperCase()}]`;
                    tasks.push({
                        id: `task-${taskIdCounter++}`,
                        role: role.roleName,
                        roleSlug: role.slug,
                        task: `${tag} ${resp}`,
                        priority: rIdx === 0 ? 'high' : 'medium',
                        phase: rIdx === 0 ? 'Tahap 1' : 'Tahap 2',
                        estimatedDays: rIdx === 0 ? 3 : 2
                    });
                });
            });

            return {
                projectName: cleanName,
                summary: `Rencana kegiatan dan jadwal kerja terstruktur untuk "${prompt.trim()}". Berdasarkan sesi penajaman Grill-Me (${answers.length} putaran) untuk tim ${teamSize} orang.`,
                targetDuration: duration,
                isSoftware: false,
                prd: {
                    background: `Kerangka acuan kerja untuk "${prompt.trim()}". Catatan penajaman: ${interviewContext}`,
                    problemStatement: 'Kurangnya pembagian tanggung jawab yang jelas dan jadwal milestone yang terukur menyebabkan target sering mundur.',
                    proposedSolution: 'Menyusun jadwal terarah (WBS) dengan pembagian peran tim dan pemantauan checklist berkala.',
                    targetAudience: ['Anggota Tim Pelaksana', 'Koordinator Kegiatan', 'Pembimbing / Penilai'],
                    functionalRequirements: [
                        {
                            module: 'Tahap Persiapan & Riset',
                            features: ['Pengumpulan bahan rujukan dan data acuan', 'Penyusunan kerangka kerja awal', 'Pembagian beban tugas anggota']
                        },
                        {
                            module: 'Tahap Pelaksanaan & Penyusunan',
                            features: ['Penulisan substansi materi kegiatan', 'Koordinasi berkala untuk update hambatan', 'Penyusunan draf laporan awal']
                        },
                        {
                            module: 'Tahap Finalisasi & Presentasi',
                            features: ['Review kelengkapan draf bersama koordinator', 'Penyusunan slide presentasi visual', 'Evaluasi akhir dan arsip laporan']
                        }
                    ],
                    nonFunctionalRequirements: [
                        'Seluruh tugas terdokumentasi jelas dengan penanggung jawab spesifik',
                        'Tenggat waktu terdistribusi merata sesuai target durasi'
                    ],
                    systemConstraints: [
                        'Dipantau melalui Todo Workspace secara terpusat'
                    ]
                },
                erd: null, // ERD ditiadakan karena non-software
                roles,
                milestones: [
                    { phase: 'Tahap 1', title: 'Persiapan & Pengumpulan Data', duration: 'Pekan 1', description: 'Kickoff tim, perumusan sasaran kegiatan, dan pembagian penanggung jawab.' },
                    { phase: 'Tahap 2', title: 'Pelaksanaan & Draf Utama', duration: 'Pekan 2-3', description: 'Penyusunan naskah/konten materi dan koordinasi progres berkala.' },
                    { phase: 'Tahap 3', title: 'Review & Finalisasi Presentasi', duration: 'Pekan 4', description: 'Pemeriksaan akhir, desain slide visual, dan simulasi evaluasi.' }
                ],
                tasks
            };
        }
    },

    // 3. AI Co-Pilot khusus Ruang Kerja (Scoped to 1 Workspace)
    askWorkspaceAi: async (params: {
        projectId: number;
        projectName: string;
        members: string[];
        planSummary?: string;
        currentTodos: Array<{ id: number; task: string; completed: boolean; creator?: string }>;
        userMessage: string;
        history?: Array<{ role: 'user' | 'model'; content: string }>;
        customApiKey?: string;
        model?: string;
    }): Promise<{ reply: string; actions: Array<{ type: 'CREATE_TASK' | 'TOGGLE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'; task?: string; taskId?: number; completed?: boolean }> }> => {
        const { projectName, members, planSummary, currentTodos, userMessage, history = [], customApiKey, model } = params;
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;

        const todosContext = currentTodos.length > 0
            ? currentTodos.map((t) => `[ID: ${t.id}] [${t.completed ? 'SELESAI' : 'BELUM'}] [Oleh: @${t.creator || 'Member'}] ${t.task}`).join('\n')
            : '(Belum ada tugas di ruang kerja ini)';

        const systemPrompt = `Kamu adalah AI Co-Pilot khusus Ruang Kerja "${projectName}".
BATASAN MUTLAK: Kamu HANYA boleh membaca konteks dan mengelola tugas di dalam ruang kerja "${projectName}" ini saja. Dilarang mengakses konteks ruang lain.

KONTEKS RUANG KERJA AKTIF:
- Nama Ruang: ${projectName}
- Anggota: ${members.join(', ')}
${planSummary ? `- Rangkuman PRD/Perencanaan: ${planSummary}` : ''}
- Daftar Tugas Saat Ini di Ruang Kerja Ini (${currentTodos.length} tugas):
${todosContext}

KEMAMPUAN AKSI:
Kamu dapat memberikan saran teks DAN melakukan perubahan tugas jika pengguna meminta (tambah tugas, ubah status selesai/belum, edit deskripsi, hapus tugas).

FORMAT RESPON (JSON valid TANPA backticks markdown):
{
  "reply": "Penjelasan/jawaban yang jelas dan santun dalam bahasa Indonesia mengenai kondisi ruang atau aksi yang telah disiapkan/dilakukan.",
  "actions": [
    // Opsional, isi jika pengguna menginstruksikan aksi. Contoh:
    // { "type": "CREATE_TASK", "task": "Nama tugas baru..." },
    // { "type": "TOGGLE_TASK", "taskId": 123, "completed": true },
    // { "type": "UPDATE_TASK", "taskId": 123, "task": "Nama tugas revisi..." },
    // { "type": "DELETE_TASK", "taskId": 123 }
  ]
}
Catatan: Pastikan taskId hanya merujuk pada nomor ID yang valid dari daftar tugas saat ini di atas. Jika hanya tanya-jawab atau analisa, biarkan "actions" kosong [].`;

        // 1. Jalur OpenRouter Multi-Model
        if (model && model !== 'gemini-direct') {
            const userHistoryPrompt = `${history.map((h) => `${h.role === 'user' ? 'Pengguna' : 'AI'}: ${h.content}`).join('\n')}\nInstruksi Pengguna: ${userMessage}`;
            const rawOpenRouter = await callOpenRouterCompletion({
                model,
                systemPrompt,
                userPrompt: userHistoryPrompt,
                apiKey: customApiKey,
                jsonOutput: true
            });
            if (rawOpenRouter) {
                try {
                    const cleaned = rawOpenRouter.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(cleaned);
                    if (parsed && typeof parsed.reply === 'string') {
                        return {
                            reply: parsed.reply,
                            actions: Array.isArray(parsed.actions) ? parsed.actions : []
                        };
                    }
                } catch {
                    // fall through ke Gemini / fallback
                }
            }
        }

        if (apiKey) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 14000);

                const contents = [
                    { parts: [{ text: systemPrompt }] },
                    ...history.map((h) => ({
                        parts: [{ text: `${h.role === 'user' ? 'Pengguna' : 'AI'}: ${h.content}` }]
                    })),
                    { parts: [{ text: `Instruksi Pengguna: ${userMessage}` }] }
                ];

                const res = await fetch(url, {
                    method: 'POST',
                    signal: controller.signal,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents,
                        generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
                    })
                });
                clearTimeout(timeout);

                if (res.ok) {
                    const data: any = await res.json();
                    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (raw) {
                        const cleaned = raw.replace(/```json/g, '').replace(/```/g, '').trim();
                        const parsed = JSON.parse(cleaned);
                        if (parsed && typeof parsed.reply === 'string') {
                            return {
                                reply: parsed.reply,
                                actions: Array.isArray(parsed.actions) ? parsed.actions : []
                            };
                        }
                    }
                }
            } catch (err) {
                console.warn('Gemini workspace-ask error, falling back to deterministic response:', err);
            }
        }

        // Fallback Heuristik Cerdas jika offline / no API key
        const msg = userMessage.toLowerCase();
        const actions: Array<{ type: 'CREATE_TASK' | 'TOGGLE_TASK' | 'UPDATE_TASK' | 'DELETE_TASK'; task?: string; taskId?: number; completed?: boolean }> = [];
        let reply = '';

        const completedCount = currentTodos.filter(t => t.completed).length;
        const pendingCount = currentTodos.length - completedCount;
        const progressPct = currentTodos.length > 0 ? Math.round((completedCount / currentTodos.length) * 100) : 0;

        if (msg.includes('tambah') || msg.includes('buat') || msg.includes('add')) {
            const rawTask = userMessage.replace(/(tambah|buatkan|buat|tolong buatkan|add)\s*(tugas|task|todo)?/i, '').trim();
            const taskText = rawTask.length > 2 ? rawTask : `Tugas baru dari AI: ${userMessage}`;
            actions.push({ type: 'CREATE_TASK', task: taskText });
            reply = `Saya telah menambahkan 1 tugas baru ke ruang "${projectName}": "${taskText}".`;
        } else if (msg.includes('selesai') && (msg.includes('tandai') || msg.includes('semua') || msg.includes('checklist'))) {
            // Tandai task yang belum selesai
            const targets = currentTodos.filter(t => !t.completed).slice(0, 3);
            targets.forEach(t => {
                actions.push({ type: 'TOGGLE_TASK', taskId: t.id, completed: true });
            });
            reply = targets.length > 0
                ? `Saya telah memperbarui status ${targets.length} tugas menjadi selesai.`
                : 'Semua tugas di ruang ini sudah dalam status selesai.';
        } else if (msg.includes('progres') || msg.includes('status') || msg.includes('rekap') || msg.includes('ringkasan')) {
            reply = `Progres ruang "${projectName}": ${completedCount} dari ${currentTodos.length} tugas selesai (${progressPct}%). Masih ada ${pendingCount} tugas pending yang perlu dikerjakan oleh tim.`;
        } else {
            reply = `Halo! Saya AI Co-Pilot khusus ruang "${projectName}". Saat ini terdapat ${currentTodos.length} tugas (${completedCount} selesai, ${pendingCount} pending). Anda dapat meminta saya menambah tugas, menandai status selesai, atau menganalisis prioritas tim.`;
        }

        return { reply, actions };
    }
};
