import { Router } from 'express';
import { authenticate, requirePermission } from '../../../common/middleware/authMiddleware';
import {
  getQuestions,
  getLatestCompletedAssessment,
  getAssessmentResult,
  startAssessment,
  submitAnswer,
  completeAssessment,
} from '../controllers/riskController';

const router = Router();

// All risk appetite routes require authentication
router.use(authenticate);

// Risk Question Bank Routes
router.get(
  '/risk-questions',
  requirePermission('riskappetite:read'),
  getQuestions
);

// Risk Assessment Lifecycle & Scoring Routes
// Start a new assessment or resume in-progress assessment for a client
router.post(
  '/risk-assessments/start-assessment',
  requirePermission('riskappetite:create'),
  startAssessment
);

// Submit or update an answer to a question in an active assessment
router.post(
  '/risk-assessments/:raId/submit-answer',
  requirePermission('riskappetite:update'),
  submitAnswer
);

// Finalize assessment and compute server-side score
router.post(
  '/risk-assessments/:raId/complete-assessment',
  requirePermission('riskappetite:update'),
  completeAssessment
);

// Query latest completed assessment for a client (accessible by riskappetite or portfolioreview)
router.get(
  '/risk-assessments/clients/:clientId/latest',
  requirePermission('riskappetite:read', 'portfolioreview:read'),
  getLatestCompletedAssessment
);

// Query detailed result for an assessment (used by completion modal)
router.get(
  '/risk-assessments/:raId/results',
  requirePermission('riskappetite:read'),
  getAssessmentResult
);

export default router;
