import { Router } from 'express';
import { 
    createProject, 
    getUserProjects, 
    getProjectDetail, 
    updateProject,
    joinProject, 
    leaveProject, 
    removeMember,
    deleteProject,
    getProjectActivities,
    transferOwnership 
} from '../controllers/projectController.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Rute Ruang Kelompok / Team Workspaces
router.post('/', verifyToken, createProject);
router.get('/', verifyToken, getUserProjects);
router.get('/:id', verifyToken, getProjectDetail);
router.put('/:id', verifyToken, updateProject);
router.post('/join', verifyToken, joinProject);
router.post('/:id/leave', verifyToken, leaveProject);
router.delete('/:id/members/:userId', verifyToken, removeMember);
router.post('/:id/transfer-owner', verifyToken, transferOwnership);
router.delete('/:id', verifyToken, deleteProject);
router.get('/:id/activities', verifyToken, getProjectActivities);

export default router;
