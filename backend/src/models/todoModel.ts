import pool from '../config/db.js';

export const TodoModel = {
    // 1. Ambil data tugas dengan pagination
    getByUserId: async (userId: number, limit: number, offset: number) => {
        const [rows] = await pool.query(
            'SELECT id, user_id, project_id, task, is_completed FROM todos WHERE user_id = ? ORDER BY id DESC LIMIT ? OFFSET ?',
            [userId, limit, offset]
        );
        return rows;
    },

    // 2. Hitung total tugas user untuk pagination meta
    countByUserId: async (userId: number) => {
        const [rows]: any = await pool.query(
            'SELECT COUNT(*) AS total FROM todos WHERE user_id = ?',
            [userId]
        );
        return rows[0].total as number;
    },

    // 3. Ambil semua tugas dalam 1 Project Kelompok
    getByProjectId: async (projectId: number) => {
        const [rows] = await pool.query(
            `SELECT t.id, t.user_id, t.project_id, t.task, t.is_completed, u.username AS creator_username
             FROM todos t
             JOIN users u ON t.user_id = u.id
             WHERE t.project_id = ?
             ORDER BY t.id DESC`,
            [projectId]
        );
        return rows;
    },

    // 4. Ambil satu tugas berdasarkan ID
    getById: async (id: number, userId?: number) => {
        const query = userId
            ? 'SELECT id, user_id, project_id, task, is_completed FROM todos WHERE id = ? AND user_id = ? LIMIT 1'
            : 'SELECT id, user_id, project_id, task, is_completed FROM todos WHERE id = ? LIMIT 1';
        const params = userId ? [id, userId] : [id];

        const [rows]: any = await pool.query(query, params);
        return rows[0] || null;
    },

    // 5. Tambahkan tugas baru
    create: async (userId: number, task: string, projectId: number | null = null) => {
        const [result]: any = await pool.query(
            'INSERT INTO todos (user_id, project_id, task, is_completed) VALUES (?, ?, ?, 0)',
            [userId, projectId, task]
        );
        return result.insertId;
    },

    // 6. Update status atau isi tugas
    update: async (id: number, task?: string, is_completed?: boolean, userId?: number) => {
        const updates: string[] = [];
        const params: any[] = [];

        if (task !== undefined) {
            updates.push('task = ?');
            params.push(task);
        }
        if (is_completed !== undefined) {
            updates.push('is_completed = ?');
            params.push(is_completed ? 1 : 0);
        }

        if (updates.length === 0) return 0;

        let sql = `UPDATE todos SET ${updates.join(', ')} WHERE id = ?`;
        params.push(id);

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        const [result]: any = await pool.query(sql, params);
        return result.affectedRows;
    },

    // 7. Hapus tugas berdasarkan id
    delete: async (id: number, userId?: number) => {
        const query = userId
            ? 'DELETE FROM todos WHERE id = ? AND user_id = ?'
            : 'DELETE FROM todos WHERE id = ?';
        const params = userId ? [id, userId] : [id];

        const [result]: any = await pool.query(query, params);
        return result.affectedRows;
    },

    // 8. Batch tambah beberapa tugas sekaligus (misal dari AI Plan)
    createMany: async (userId: number, tasks: string[], projectId: number | null = null) => {
        if (!tasks || tasks.length === 0) return 0;
        const values = tasks.map((t) => [userId, projectId, t, 0]);
        const [result]: any = await pool.query(
            'INSERT INTO todos (user_id, project_id, task, is_completed) VALUES ?',
            [values]
        );
        return result.affectedRows;
    }
};
