import { Router } from 'express';
import multer from 'multer';
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
  uploadMasterFunds,
  downloadMasterFundsTemplate,
  uploadEcasStatement,
  getEcasDownloadUrl,
  getRecommendationDownloadUrl,
} from '../controllers/portfolioController';

const router = Router();

// In-memory multer storage for Excel spreadsheets and PDF statements (15MB cap)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 },
});

// Protect ALL routes in Portfolio Review with JWT authentication
router.use(authenticate);

// 1. Master Funds Management & Ingestion (S3 / LocalStack)
router.post(
  ['/eligible-funds/upload', '/admin/master-funds/upload'],
  requirePermission('eligiblefund:upload'),
  upload.single('file'),
  uploadMasterFunds
);

router.get(
  ['/eligible-funds/template', '/eligible-funds/upload-template', '/admin/master-funds/template'],
  requirePermission('eligiblefund:read'),
  downloadMasterFundsTemplate
);

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

// 2. eCAS Statement Upload & URL Retrieval (S3 / LocalStack)
// Note: Static subpaths must precede parameterized /:id routes
router.post(
  '/portfolio-reviews/ecas/upload',
  requirePermission('portfolioreview:create'),
  upload.single('file'),
  uploadEcasStatement
);

router.get(
  '/portfolio-reviews/ecas/download-url',
  requirePermission('portfolioreview:read'),
  getEcasDownloadUrl
);

router.get(
  '/portfolio-reviews/:id/ecas-url',
  requirePermission('portfolioreview:read'),
  getEcasDownloadUrl
);

// 3. Portfolio Reviews and Holdings
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

// 4. Portfolio Recommendation Proposals
router.post(
  '/portfolio-recommendations',
  requirePermission('portfolioreview:create'),
  createRecommendation
);

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

router.get(
  '/portfolio-recommendations/:id/download-url',
  requirePermission('portfolioreview:read'),
  getRecommendationDownloadUrl
);

// 5. Document Streaming / Download
router.get(
  '/documents/recommendations/:filename',
  requirePermission('portfolioreview:read'),
  downloadRecommendationPdf
);

export default router;
