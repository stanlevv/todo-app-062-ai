import { Router } from 'express';
import authRoutes from './authRoutes.js';
import todoRoutes from './todoRoutes.js';
import projectRoutes from './projectRoutes.js';
import aiRoutes from './aiRoutes.js';
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = Router();

// Heartbeat & Uptime Monitoring (Public, No Auth)
router.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'System operational',
        data: {
            status: 'ok',
            uptime: Math.floor(process.uptime()),
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV || 'development',
        },
    });
});

router.use('/auth', authRoutes);
router.use('/todos', verifyToken, todoRoutes);
router.use('/projects', verifyToken, projectRoutes);
router.use('/ai', verifyToken, aiRoutes);

export default router;
