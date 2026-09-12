import { Router } from 'express';
import { authenticate, requirePermission } from '../../../common/middleware/authMiddleware';
import {
  getEligibleFunds,
  getFlowTypes,
  getReview,
  getLatestReview,
  getReviewHistory,
  createSampleReview,
  createRecommendation,
  getRecommendation,
  getRecommendationsByClient,
  triggerPdfGeneration,
  downloadRecommendationPdf,
} from '../controllers/portfolioController';

const router = Router();

// Protect ALL routes in Portfolio Review with JWT authentication
router.use(authenticate);

// Eligible Funds
router.get(
  '/eligible-funds',
  requirePermission('portfolioreview:read'),
  getEligibleFunds
);

router.get(
  '/portfolio-recommendations/flow-types',
  requirePermission('portfolioreview:read'),
  getFlowTypes
);

// Portfolio Reviews and Holdings
// Specific collection/client routes MUST precede /portfolio-reviews/:id
router.get(
  '/portfolio-reviews/client/:clientId/latest',
  requirePermission('portfolioreview:read'),
  getLatestReview
);

router.get(
  '/portfolio-reviews/client/:clientId',
  requirePermission('portfolioreview:read'),
  getReviewHistory
);

router.post(
  '/portfolio-reviews/sample',
  requirePermission('portfolioreview:create'),
  createSampleReview
);

router.get(
  '/portfolio-reviews/:id',
  requirePermission('portfolioreview:read'),
  getReview
);

// Portfolio Recommendation Proposals
router.post(
  '/portfolio-recommendations',
  requirePermission('portfolioreview:create'),
  createRecommendation
);

// Collection query: GET /portfolio-recommendations?clientId=...
router.get(
  '/portfolio-recommendations',
  requirePermission('portfolioreview:read'),
  getRecommendationsByClient
);

router.get(
  '/portfolio-recommendations/:id',
  requirePermission('portfolioreview:read'),
  getRecommendation
);

router.post(
  '/portfolio-recommendations/:id/generate-pdf',
  requirePermission('portfolioreview:update'),
  triggerPdfGeneration
);

// Document Streaming / Download
router.get(
  '/documents/recommendations/:filename',
  requirePermission('portfolioreview:read'),
  downloadRecommendationPdf
);

export default router;
