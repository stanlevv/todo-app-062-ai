import { Request, Response } from 'express';
import { ProjectModel } from '../models/projectModel.js';
import { ProjectActivityModel } from '../models/projectActivityModel.js';

// Helper membuat kode unik acak (contoh: KEL-8942)
function generateProjectCode(): string {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    return `KEL-${randomDigits}`;
}

export const createProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const { name } = req.body;

        if (!name || typeof name !== 'string' || name.trim() === '') {
            res.status(400).json({ success: false, message: 'Nama ruang project wajib diisi!' });
            return;
        }

        let code = generateProjectCode();
        let attempts = 0;
        while (attempts < 5) {
            const existing = await ProjectModel.getByCode(code);
            if (!existing) break;
            code = generateProjectCode();
            attempts++;
        }

        const projectId = await ProjectModel.create(name.trim(), code, userId);
        const newProject = await ProjectModel.getById(projectId);

        await ProjectActivityModel.log(
            projectId,
            userId,
            'PROJECT_CREATED',
            `Membuat ruang kelompok "${name.trim()}"`
        );

        res.status(201).json({
            success: true,
            message: 'Ruang project kelompok berhasil dibuat!',
            data: newProject
        });
    } catch (error: any) {
        console.error('Error createProject:', error);
        res.status(500).json({ success: false, message: 'Gagal membuat ruang project.' });
    }
};

export const getUserProjects = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projects = await ProjectModel.getByUserId(userId);

        res.status(200).json({
            success: true,
            data: projects
        });
    } catch (error: any) {
        console.error('Error getUserProjects:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil daftar project.' });
    }
};

export const getProjectDetail = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);

        if (isNaN(projectId)) {
            res.status(400).json({ success: false, message: 'ID project tidak valid!' });
            return;
        }

        const isMember = await ProjectModel.isMember(projectId, userId);
        if (!isMember) {
            res.status(403).json({ success: false, message: 'Anda bukan anggota dari ruang project ini!' });
            return;
        }

        const project = await ProjectModel.getById(projectId);
        const members = await ProjectModel.getMembers(projectId);

        res.status(200).json({
            success: true,
            data: {
                ...project,
                members
            }
        });
    } catch (error: any) {
        console.error('Error getProjectDetail:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil detail project.' });
    }
};

export const updateProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);
        const { name, plan_data } = req.body;

        if (isNaN(projectId)) {
            res.status(400).json({ success: false, message: 'ID project tidak valid!' });
            return;
        }

        if (!name && plan_data === undefined) {
            res.status(400).json({ success: false, message: 'Data pembaruan wajib diisi!' });
            return;
        }

        const project = await ProjectModel.getById(projectId);
        if (!project) {
            res.status(404).json({ success: false, message: 'Project tidak ditemukan.' });
            return;
        }

        const isMember = await ProjectModel.isMember(projectId, userId);
        if (!isMember) {
            res.status(403).json({ success: false, message: 'Anda bukan anggota dari ruang project ini!' });
            return;
        }

        if (name && typeof name === 'string' && name.trim() !== '') {
            if (project.owner_id !== userId && project.created_by !== userId) {
                res.status(403).json({ success: false, message: 'Hanya pemilik yang berhak mengubah nama ruang kerja!' });
                return;
            }
            await ProjectModel.updateName(projectId, name.trim());
            await ProjectActivityModel.log(
                projectId,
                userId,
                'PROJECT_RENAMED',
                `Mengubah nama ruang kerja menjadi "${name.trim()}"`
            );
        }

        if (plan_data !== undefined) {
            const planString = typeof plan_data === 'string' ? plan_data : JSON.stringify(plan_data);
            await ProjectModel.updatePlanData(projectId, planString);
            await ProjectActivityModel.log(
                projectId,
                userId,
                'PROJECT_METADATA_UPDATED',
                'Memperbarui dokumentasi, tautan, atau peran tim di ruang kerja'
            );
        }

        const updated = await ProjectModel.getById(projectId);
        res.status(200).json({
            success: true,
            message: 'Ruang kerja berhasil diperbarui!',
            data: updated
        });
    } catch (error: any) {
        console.error('Error updateProject:', error);
        res.status(500).json({ success: false, message: 'Gagal memperbarui ruang project.' });
    }
};

export const joinProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const { code } = req.body;

        if (!code || typeof code !== 'string') {
            res.status(400).json({ success: false, message: 'Kode undangan project wajib diisi!' });
            return;
        }

        const project = await ProjectModel.getByCode(code.trim());
        if (!project) {
            res.status(404).json({ success: false, message: 'Kode project tidak ditemukan!' });
            return;
        }

        const success = await ProjectModel.addMember(project.id, userId);
        if (!success) {
            res.status(400).json({ success: false, message: 'Anda sudah menjadi anggota di ruang project ini!' });
            return;
        }

        await ProjectActivityModel.log(
            project.id,
            userId,
            'MEMBER_JOINED',
            'Bergabung ke ruang kelompok'
        );

        res.status(200).json({
            success: true,
            message: `Berhasil bergabung ke kelompok "${project.name}"!`,
            data: project
        });
    } catch (error: any) {
        console.error('Error joinProject:', error);
        res.status(500).json({ success: false, message: 'Gagal bergabung ke project.' });
    }
};

export const leaveProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);

        const project = await ProjectModel.getById(projectId);
        if (!project) {
            res.status(404).json({ success: false, message: 'Project tidak ditemukan.' });
            return;
        }

        if (project.owner_id === userId || project.created_by === userId) {
            res.status(400).json({ success: false, message: 'Pemilik ruang tidak dapat meninggalkan project. Silakan transfer kepemilikan terlebih dahulu atau hapus project.' });
            return;
        }

        await ProjectModel.leave(projectId, userId);
        await ProjectActivityModel.log(
            projectId,
            userId,
            'MEMBER_LEFT',
            'Keluar dari ruang kelompok'
        );

        res.status(200).json({ success: true, message: 'Berhasil keluar dari project.' });
    } catch (error: any) {
        console.error('Error leaveProject:', error);
        res.status(500).json({ success: false, message: 'Gagal keluar dari project.' });
    }
};

export const removeMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);
        const targetUserId = parseInt(req.params.userId as string, 10);

        if (isNaN(projectId) || isNaN(targetUserId)) {
            res.status(400).json({ success: false, message: 'Parameter tidak valid!' });
            return;
        }

        const project = await ProjectModel.getById(projectId);
        if (!project) {
            res.status(404).json({ success: false, message: 'Project tidak ditemukan.' });
            return;
        }

        if (project.owner_id !== userId && project.created_by !== userId) {
            res.status(403).json({ success: false, message: 'Hanya pemilik ruang yang dapat mengeluarkan anggota.' });
            return;
        }

        if (targetUserId === userId || targetUserId === project.owner_id) {
            res.status(400).json({ success: false, message: 'Pemilik ruang tidak dapat dikeluarkan dari anggota.' });
            return;
        }

        await ProjectModel.removeMember(projectId, targetUserId);
        await ProjectActivityModel.log(
            projectId,
            userId,
            'MEMBER_REMOVED',
            `Pemilik mengeluarkan anggota dari ruang kerja`
        );

        res.status(200).json({ success: true, message: 'Anggota berhasil dikeluarkan dari ruang project.' });
    } catch (error: any) {
        console.error('Error removeMember:', error);
        res.status(500).json({ success: false, message: 'Gagal mengeluarkan anggota.' });
    }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);

        const project = await ProjectModel.getById(projectId);
        if (!project) {
            res.status(404).json({ success: false, message: 'Project tidak ditemukan.' });
            return;
        }

        if (project.owner_id !== userId && project.created_by !== userId) {
            res.status(403).json({ success: false, message: 'Hanya pemilik ruang yang dapat menghapus project ini.' });
            return;
        }

        await ProjectModel.delete(projectId);
        res.status(200).json({ success: true, message: 'Ruang project berhasil dihapus.' });
    } catch (error: any) {
        console.error('Error deleteProject:', error);
        res.status(500).json({ success: false, message: 'Gagal menghapus project.' });
    }
};

export const getProjectActivities = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);

        if (isNaN(projectId)) {
            res.status(400).json({ success: false, message: 'ID project tidak valid!' });
            return;
        }

        const isMember = await ProjectModel.isMember(projectId, userId);
        if (!isMember) {
            res.status(403).json({ success: false, message: 'Anda bukan anggota dari ruang project ini!' });
            return;
        }

        const activities = await ProjectActivityModel.getByProjectId(projectId);
        res.status(200).json({
            success: true,
            data: activities
        });
    } catch (error: any) {
        console.error('Error getProjectActivities:', error);
        res.status(500).json({ success: false, message: 'Gagal mengambil log aktivitas ruang.' });
    }
};

export const transferOwnership = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = res.locals.userId || (req as any).user?.id;
        const projectId = parseInt(req.params.id as string, 10);
        const { targetUserId } = req.body;

        if (isNaN(projectId) || !targetUserId || isNaN(parseInt(targetUserId, 10))) {
            res.status(400).json({ success: false, message: 'ID project atau anggota tujuan tidak valid!' });
            return;
        }

        const newOwnerId = parseInt(targetUserId, 10);

        if (userId === newOwnerId) {
            res.status(400).json({ success: false, message: 'Anda sudah menjadi pemilik ruang kerja ini!' });
            return;
        }

        const project = await ProjectModel.getById(projectId);
        if (!project) {
            res.status(404).json({ success: false, message: 'Ruang kerja tidak ditemukan.' });
            return;
        }

        if (project.created_by !== userId && project.owner_id !== userId) {
            res.status(403).json({ success: false, message: 'Hanya pemilik yang berhak mentransfer kepemilikan ruang kerja!' });
            return;
        }

        const isTargetMember = await ProjectModel.isMember(projectId, newOwnerId);
        if (!isTargetMember) {
            res.status(400).json({ success: false, message: 'Pengguna tujuan belum terdaftar sebagai anggota di ruang kerja ini!' });
            return;
        }

        const members = await ProjectModel.getMembers(projectId);
        const targetMember = members.find((m) => m.user_id === newOwnerId);
        const targetUsername = targetMember ? targetMember.username : `User #${newOwnerId}`;

        await ProjectModel.transferOwnership(projectId, userId, newOwnerId);

        await ProjectActivityModel.log(
            projectId,
            userId,
            'OWNERSHIP_TRANSFERRED',
            `Mentransfer kepemilikan ruang kerja kepada @${targetUsername}`
        );

        const updatedProject = await ProjectModel.getById(projectId);
        const updatedMembers = await ProjectModel.getMembers(projectId);

        res.status(200).json({
            success: true,
            message: `Kepemilikan ruang kerja berhasil ditransfer kepada @${targetUsername}!`,
            data: {
                project: updatedProject,
                members: updatedMembers
            }
        });
    } catch (error: any) {
        console.error('Error transferOwnership:', error);
        res.status(500).json({ success: false, message: 'Gagal mentransfer kepemilikan ruang kerja.' });
    }
};

