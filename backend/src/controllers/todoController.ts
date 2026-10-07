import { Request, Response } from 'express';
import { TodoModel } from '../models/todoModel.js';
import { ProjectModel } from '../models/projectModel.js';
import { ProjectActivityModel } from '../models/projectActivityModel.js';
import type { CreateTodoRequest, UpdateTodoRequest, TodoResponse, TodoRow } from '../types/todo.js';
import type { PaginationMeta } from '../types/common.js';
import { sendSuccess, sendSuccessPagination, sendError } from '../utils/response.js';

const parsePositiveInt = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getTodos = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    const projectIdQuery = req.query.project_id || req.query.projectId;
    const projectId = projectIdQuery ? Number(projectIdQuery) : undefined;

    try {
        if (projectId) {
            const isMember = await ProjectModel.isMember(projectId, userId);
            if (!isMember) {
                sendError(res, 'Anda bukan anggota dari ruang project ini!', 403);
                return;
            }

            const todos = await TodoModel.getByProjectId(projectId);
            const data: TodoResponse[] = (todos as any[]).map((row) => ({
                id: row.id,
                todo: row.task,
                completed: Boolean(row.is_completed),
                project_id: row.project_id,
                creator_username: row.creator_username
            }));
            sendSuccess(res, 'Berhasil!', data);
            return;
        }

        const page = parsePositiveInt(req.query.page, 1);
        const perPage = Math.min(parsePositiveInt(req.query.perPage, 10), 50);
        const offset = (page - 1) * perPage;

        const [todos, total] = await Promise.all([
            TodoModel.getByUserId(userId, perPage, offset),
            TodoModel.countByUserId(userId)
        ]);

        const data: TodoResponse[] = (todos as TodoRow[]).map(({ id, task, is_completed, project_id, creator_username }) => ({
            id,
            todo: task,
            completed: Boolean(is_completed),
            project_id: project_id || null,
            creator_username
        }));

        const pagination: PaginationMeta = {
            page,
            perPage,
            total,
            totalPages: Math.ceil(total / perPage)
        };

        sendSuccessPagination(res, 'Berhasil!', data, pagination);
    } catch (error) {
        console.log(error);
        sendError(res, 'Gagal mengambil data.', 500);
    }
};

export const getTodoById = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const todo = await TodoModel.getById(Number(id));

        if (!todo) {
            sendError(res, 'Tugas tidak ditemukan!', 404);
            return;
        }

        const row = todo as TodoRow;
        if (row.project_id) {
            const isMember = await ProjectModel.isMember(row.project_id, userId);
            if (!isMember) {
                sendError(res, 'Akses ditolak!', 403);
                return;
            }
        } else if (row.user_id !== userId) {
            sendError(res, 'Akses ditolak!', 403);
            return;
        }

        const data: TodoResponse = {
            id: row.id,
            todo: row.task,
            completed: Boolean(row.is_completed),
            project_id: row.project_id || null
        };

        sendSuccess(res, 'Berhasil!', data);
    } catch {
        sendError(res, 'Gagal mengambil data.', 500);
    }
};

export const createTodo = async (req: Request, res: Response): Promise<void> => {
    const payload: CreateTodoRequest = req.body;
    const userId = req.user.id;
    const projectId = payload.project_id ? Number(payload.project_id) : null;

    try {
        if (projectId) {
            const isMember = await ProjectModel.isMember(projectId, userId);
            if (!isMember) {
                sendError(res, 'Anda bukan anggota dari ruang kelompok ini!', 403);
                return;
            }
        }

        const newId = await TodoModel.create(userId, payload.task, projectId);
        const data: TodoResponse = {
            id: newId,
            todo: payload.task,
            completed: false,
            project_id: projectId
        };

        if (projectId) {
            await ProjectActivityModel.log(
                projectId,
                userId,
                'TASK_CREATED',
                `Membuat tugas: "${payload.task}"`
            );
        }

        sendSuccess(res, 'Tugas berhasil ditambahkan!', data, 201);
    } catch {
        sendError(res, 'Gagal menambahkan tugas.', 500);
    }
};

export const updateTodo = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const payload: UpdateTodoRequest = req.body;
    const userId = req.user.id;

    try {
        const existing = await TodoModel.getById(Number(id));
        if (!existing) {
            sendError(res, 'Tugas tidak ditemukan!', 404);
            return;
        }

        if (existing.project_id) {
            const isMember = await ProjectModel.isMember(existing.project_id, userId);
            if (!isMember) {
                sendError(res, 'Anda bukan anggota dari ruang kelompok ini!', 403);
                return;
            }

            await TodoModel.update(Number(id), payload.task, payload.is_completed);

            let action = 'TASK_UPDATED';
            let detail = `Memperbarui tugas: "${payload.task || existing.task}"`;
            if (payload.is_completed !== undefined) {
                action = payload.is_completed ? 'TASK_COMPLETED' : 'TASK_UNCOMPLETED';
                detail = payload.is_completed
                    ? `Menandai selesai: "${existing.task}"`
                    : `Menandai belum selesai: "${existing.task}"`;
            }

            await ProjectActivityModel.log(existing.project_id, userId, action, detail);
        } else {
            if (existing.user_id !== userId) {
                sendError(res, 'Akses ditolak!', 403);
                return;
            }
            await TodoModel.update(Number(id), payload.task, payload.is_completed, userId);
        }

        sendSuccess(res, 'Tugas berhasil diperbarui!');
    } catch {
        sendError(res, 'Gagal memperbarui tugas.', 500);
    }
};

export const deleteTodo = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const existing = await TodoModel.getById(Number(id));
        if (!existing) {
            sendError(res, 'Tugas tidak ditemukan!', 404);
            return;
        }

        if (existing.project_id) {
            const isMember = await ProjectModel.isMember(existing.project_id, userId);
            if (!isMember) {
                sendError(res, 'Anda bukan anggota dari ruang kelompok ini!', 403);
                return;
            }

            await TodoModel.delete(Number(id));
            await ProjectActivityModel.log(
                existing.project_id,
                userId,
                'TASK_DELETED',
                `Menghapus tugas: "${existing.task}"`
            );
        } else {
            if (existing.user_id !== userId) {
                sendError(res, 'Akses ditolak!', 403);
                return;
            }
            await TodoModel.delete(Number(id), userId);
        }

        sendSuccess(res, 'Tugas berhasil dihapus!');
    } catch {
        sendError(res, 'Gagal menghapus tugas.', 500);
    }
};
