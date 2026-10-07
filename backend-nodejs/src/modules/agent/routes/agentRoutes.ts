import { Router } from 'express';
import { authenticate, requirePermission } from '../../../common/middleware/authMiddleware';
import { agentController } from '../controllers/agentController';

const router = Router();

// Protect agent routes with JWT authentication and RBAC
router.use(authenticate);

// POST /nodejs-wtc-api/v1/agent/run
router.post(
  ['/run', '/agent/run'],
  requirePermission('portfolioreview:create'),
  agentController.runAgent.bind(agentController)
);

export default router;
