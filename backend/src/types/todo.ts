export interface CreateTodoRequest {
    task: string;
    project_id?: number | null;
}

export interface UpdateTodoRequest {
    task?: string;
    is_completed?: boolean;
}

export interface TodoResponse {
    id: number;
    todo: string;
    completed: boolean;
    project_id?: number | null;
    creator_username?: string;
}

export interface TodoRow {
    id: number;
    user_id?: number;
    project_id?: number | null;
    task: string;
    is_completed: number | boolean;
    creator_username?: string;
}
