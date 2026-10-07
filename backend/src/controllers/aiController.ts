import { Request, Response } from 'express';
import { AiPlannerService, AiProjectPlan, AVAILABLE_AI_MODELS } from '../services/aiPlannerService.js';
import { ProjectModel } from '../models/projectModel.js';
import { ProjectActivityModel } from '../models/projectActivityModel.js';
import { TodoModel } from '../models/todoModel.js';
import { sendSuccess, sendError } from '../utils/response.js';

function generateProjectCode(): string {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `KEL-${randomDigits}`;
}

export const getAvailableModels = async (req: Request, res: Response): Promise<void> => {
    sendSuccess(res, 'Daftar model AI aktif', AVAILABLE_AI_MODELS);
};

export const grillMeNext = async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, history, isSoftware, apiKey, model } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
            sendError(res, 'Prompt ide proyek minimal 3 karakter wajib diisi.', 400);
            return;
        }

        const question = await AiPlannerService.getGrillMeQuestion(prompt.trim(), history || [], {
            isSoftware,
            customApiKey: apiKey,
            model
        });

        sendSuccess(res, 'Pertanyaan penajaman Grill-Me berhasil dibuat.', question);
    } catch (error: any) {
        console.error('Error grillMeNext:', error);
        sendError(res, 'Gagal menghasilkan pertanyaan Grill-Me.', 500);
    }
};

export const generatePlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const { prompt, projectType, duration, teamSize, isSoftware, answers, apiKey, model } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
            sendError(res, 'Prompt ide proyek minimal 3 karakter wajib diisi.', 400);
            return;
        }

        const plan = await AiPlannerService.generatePlan(prompt.trim(), {
            projectType,
            duration,
            teamSize: teamSize ? Number(teamSize) : undefined,
            isSoftware,
            answers: Array.isArray(answers) ? answers : [],
            customApiKey: apiKey,
            model
        });

        sendSuccess(res, 'Perencanaan proyek berhasil dibuat oleh AI.', plan);
    } catch (error: any) {
        console.error('Error generatePlan:', error);
        sendError(res, 'Gagal menghasilkan rencana proyek AI.', 500);
    }
};

export const applyPlan = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user.id;
        const { projectId, projectName, planData, selectedTasks } = req.body;

        if (!planData || !planData.projectName) {
            sendError(res, 'Data perencanaan proyek (planData) tidak valid.', 400);
            return;
        }

        const tasksToInsert: string[] = Array.isArray(selectedTasks) && selectedTasks.length > 0
            ? selectedTasks
            : (planData.tasks || []).map((t: any) => t.task);

        let targetProjectId = projectId ? Number(projectId) : null;
        let createdProject = null;

        if (targetProjectId) {
            // Verifikasi keanggotaan project
            const isMember = await ProjectModel.isMember(targetProjectId, userId);
            if (!isMember) {
                sendError(res, 'Anda bukan anggota dari ruang proyek ini.', 403);
                return;
            }

            // Simpan / update dokumentasi PRD & ERD ke dalam ruang proyek
            await ProjectModel.updatePlanData(targetProjectId, JSON.stringify(planData));
            createdProject = await ProjectModel.getById(targetProjectId);
        } else if (projectId === null || projectId === undefined) {
            // Jika user memilih buat ruang kelompok baru
            const finalName = (projectName && projectName.trim()) || planData.projectName;
            let code = generateProjectCode();
            let attempts = 0;
            while (attempts < 5) {
                const existing = await ProjectModel.getByCode(code);
                if (!existing) break;
                code = generateProjectCode();
                attempts++;
            }

            const newId = await ProjectModel.create(
                finalName,
                code,
                userId,
                JSON.stringify(planData)
            );
            targetProjectId = newId;
            createdProject = await ProjectModel.getById(newId);
        }

        // Masukkan task ke database todos secara batch
        let insertedCount = 0;
        if (tasksToInsert.length > 0) {
            insertedCount = await TodoModel.createMany(userId, tasksToInsert, targetProjectId);
        }

        sendSuccess(res, 'Rencana proyek & tugas berhasil diterapkan ke workspace!', {
            project: createdProject,
            projectId: targetProjectId,
            tasksCreated: insertedCount
        }, 201);
    } catch (error: any) {
        console.error('Error applyPlan:', error);
        sendError(res, 'Gagal menerapkan rencana proyek.', 500);
    }
};

export const workspaceAsk = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id || res.locals.userId || (req as any).user?.id;
        const { projectId, message, history, apiKey, model } = req.body;

        const targetProjectId = Number(projectId);
        if (isNaN(targetProjectId) || targetProjectId <= 0) {
            sendError(res, 'ID ruang kerja (projectId) wajib valid.', 400);
            return;
        }

        if (!message || typeof message !== 'string' || message.trim() === '') {
            sendError(res, 'Pesan / instruksi ke AI tidak boleh kosong.', 400);
            return;
        }

        // 1. Validasi hak akses anggota
        const isMember = await ProjectModel.isMember(targetProjectId, userId);
        if (!isMember) {
            sendError(res, 'Akses ditolak. Anda bukan anggota dari ruang kerja ini.', 403);
            return;
        }

        // 2. Ambil konteks terisolasi HANYA dari workspace ini
        const project = await ProjectModel.getById(targetProjectId);
        if (!project) {
            sendError(res, 'Ruang kerja tidak ditemukan.', 404);
            return;
        }

        const members = await ProjectModel.getMembers(targetProjectId);
        const currentTodosRaw = await TodoModel.getByProjectId(targetProjectId);
        const currentTodos = (currentTodosRaw as any[]).map(t => ({
            id: t.id,
            task: t.task,
            completed: Boolean(t.is_completed),
            creator: t.creator_username
        }));

        let planSummary = '';
        if (project.plan_data) {
            try {
                const parsed = typeof project.plan_data === 'string' ? JSON.parse(project.plan_data) : project.plan_data;
                planSummary = parsed.summary || parsed.projectName || '';
            } catch {
                // Ignore parse error
            }
        }

        // 3. Panggil AI Service
        const aiResponse = await AiPlannerService.askWorkspaceAi({
            projectId: targetProjectId,
            projectName: project.name,
            members: members.map(m => `@${m.username}`),
            planSummary,
            currentTodos,
            userMessage: message.trim(),
            history: Array.isArray(history) ? history : [],
            customApiKey: apiKey,
            model
        });

        // 4. Eksekusi tindakan AI yang telah terisolasi aman ke workspace ini saja
        const executedActions: string[] = [];
        for (const action of aiResponse.actions) {
            if (action.type === 'CREATE_TASK' && action.task) {
                await TodoModel.create(userId, action.task, targetProjectId);
                await ProjectActivityModel.log(
                    targetProjectId,
                    userId,
                    'AI_ACTION',
                    `AI Assistant membuat tugas: "${action.task}"`
                );
                executedActions.push(`Membuat tugas: "${action.task}"`);
            } else if (action.type === 'TOGGLE_TASK' && action.taskId) {
                const targetTodo = await TodoModel.getById(action.taskId);
                if (targetTodo && targetTodo.project_id === targetProjectId) {
                    await TodoModel.update(action.taskId, undefined, action.completed);
                    const statusStr = action.completed ? 'selesai' : 'belum selesai';
                    await ProjectActivityModel.log(
                        targetProjectId,
                        userId,
                        'AI_ACTION',
                        `AI Assistant menandai tugas #${action.taskId} sebagai ${statusStr}`
                    );
                    executedActions.push(`Menandai tugas #${action.taskId} (${statusStr})`);
                }
            } else if (action.type === 'UPDATE_TASK' && action.taskId && action.task) {
                const targetTodo = await TodoModel.getById(action.taskId);
                if (targetTodo && targetTodo.project_id === targetProjectId) {
                    await TodoModel.update(action.taskId, action.task);
                    await ProjectActivityModel.log(
                        targetProjectId,
                        userId,
                        'AI_ACTION',
                        `AI Assistant memperbarui tugas #${action.taskId}: "${action.task}"`
                    );
                    executedActions.push(`Mengubah deskripsi tugas #${action.taskId}`);
                }
            } else if (action.type === 'DELETE_TASK' && action.taskId) {
                const targetTodo = await TodoModel.getById(action.taskId);
                if (targetTodo && targetTodo.project_id === targetProjectId) {
                    await TodoModel.delete(action.taskId);
                    await ProjectActivityModel.log(
                        targetProjectId,
                        userId,
                        'AI_ACTION',
                        `AI Assistant menghapus tugas #${action.taskId}: "${targetTodo.task}"`
                    );
                    executedActions.push(`Menghapus tugas #${action.taskId}`);
                }
            }
        }

        // 5. Ambil daftar tugas terbaru setelah dieksekusi
        const updatedTodosRaw = await TodoModel.getByProjectId(targetProjectId);
        const updatedTodos = (updatedTodosRaw as any[]).map(row => ({
            id: row.id,
            todo: row.task,
            completed: Boolean(row.is_completed),
            project_id: row.project_id,
            creator_username: row.creator_username
        }));

        sendSuccess(res, 'AI Assistant berhasil berinteraksi dengan ruang kerja.', {
            reply: aiResponse.reply,
            executedActions,
            todos: updatedTodos
        });
    } catch (error: any) {
        console.error('Error workspaceAsk:', error);
        sendError(res, 'Gagal memproses permintaan AI di ruang kerja.', 500);
    }
};
