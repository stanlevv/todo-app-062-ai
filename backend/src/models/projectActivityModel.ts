import pool from '../config/db.js';

export interface ProjectActivity {
    id: number;
    project_id: number;
    user_id: number | null;
    action: string;
    details: string;
    created_at: string;
    username?: string | null;
}

export const ProjectActivityModel = {
    // 1. Catat log aktivitas baru di ruang project
    log: async (projectId: number, userId: number | null, action: string, details: string): Promise<number> => {
        try {
            const [result]: any = await pool.query(
                'INSERT INTO project_activities (project_id, user_id, action, details) VALUES (?, ?, ?, ?)',
                [projectId, userId, action, details]
            );
            return result.insertId;
        } catch (error) {
            console.error('Error logging project activity:', error);
            return 0;
        }
    },

    // 2. Ambil riwayat aktivitas ruang project
    getByProjectId: async (projectId: number, limit = 50): Promise<ProjectActivity[]> => {
        const [rows]: any = await pool.query(
            `SELECT pa.id, pa.project_id, pa.user_id, pa.action, pa.details, pa.created_at, u.username
             FROM project_activities pa
             LEFT JOIN users u ON pa.user_id = u.id
             WHERE pa.project_id = ?
             ORDER BY pa.id DESC
             LIMIT ?`,
            [projectId, limit]
        );
        return rows;
    }
};
