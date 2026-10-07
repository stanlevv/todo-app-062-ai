import { Router } from 'express';
import { grillMeNext, generatePlan, applyPlan, workspaceAsk, getAvailableModels } from '../controllers/aiController.js';

const router = Router();

// Endpoint AI Project & Task Planner
router.get('/models', getAvailableModels);
router.post('/grill-me/next', grillMeNext);
router.post('/generate-plan', generatePlan);
router.post('/apply-plan', applyPlan);
router.post('/workspace-ask', workspaceAsk);

export default router;
