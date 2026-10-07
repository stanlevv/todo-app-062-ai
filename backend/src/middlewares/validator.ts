import { Request, Response, NextFunction } from 'express';
import type { RegisterRequest, LoginRequest } from '../types/auth.js';
import type { CreateTodoRequest, UpdateTodoRequest } from '../types/todo.js';
import { sendError } from '../utils/response.js';

export const validateRegister = (req: Request, res: Response, next: NextFunction): void => {
    const payload: RegisterRequest = req.body;

    if (!payload.username || !payload.email || !payload.password) {
        sendError(res, 'Username, email, dan password wajib diisi!', 400);
        return;
    }

    if (!payload.email.includes('@')) {
        sendError(res, 'Format email tidak valid!', 400);
        return;
    }

    if (payload.password.length < 6) {
        sendError(res, 'Password minimal 6 karakter!', 400);
        return;
    }

    next();
};

export const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
    const payload: LoginRequest = req.body;

    if (!payload.username || !payload.password) {
        sendError(res, 'Username dan password wajib diisi!', 400);
        return;
    }

    next();
};

export const validateTodo = (req: Request, res: Response, next: NextFunction): void => {
    const payload: CreateTodoRequest = req.body;

    if (!payload.task || typeof payload.task !== 'string') {
        sendError(res, 'Task wajib diisi dengan format string!', 400);
        return;
    }

    next();
};

export const validateUpdateTodo = (req: Request, res: Response, next: NextFunction): void => {
    const payload: UpdateTodoRequest = req.body;

    if (payload.task === undefined && payload.is_completed === undefined) {
        sendError(res, 'Isi minimal task atau is_completed!', 400);
        return;
    }

    if (payload.task !== undefined && typeof payload.task !== 'string') {
        sendError(res, 'Task harus berupa string!', 400);
        return;
    }

    if (payload.is_completed !== undefined && typeof payload.is_completed !== 'boolean') {
        sendError(res, 'is_completed harus berupa true atau false!', 400);
        return;
    }

    next();
};
