import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { portfolioReviewService } from '../services/portfolioReviewService';
import { RecommendationFlowType } from '../enums/portfolioEnums';

// Eligible Funds
// GET /eligible-funds - Master fund universe with optional category filtering
export const getEligibleFunds = asyncHandler(async (req: Request, res: Response) => {
  const category = typeof req.query.category === 'string' ? req.query.category : undefined;
  const funds = await portfolioReviewService.getEligibleFunds(category);
  return res.status(200).json(funds);
});

// GET /portfolio-recommendations/flow-types - Strategy flow types (REPLACE_FUNDS, NEW_PORTFOLIO)
export const getFlowTypes = asyncHandler(async (_req: Request, res: Response) => {
  const flowTypes = portfolioReviewService.getFlowTypes();
  return res.status(200).json(flowTypes);
});

// Portfolio Reviews
// GET /portfolio-reviews/:id - Get single review by reviewId
export const getReview = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    logger.warn({ ip: req.ip }, 'Get review failed: Missing id in params');
    throw new AppError('Review ID is required', 400);
  }

  const review = await portfolioReviewService.getReview(id);
  return res.status(200).json(review);
});

// GET /portfolio-reviews/client/:clientId/latest - Latest review for a client
export const getLatestReview = asyncHandler(async (req: Request, res: Response) => {
  const { clientId } = req.params;
  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Get latest review failed: Missing clientId in params');
    throw new AppError('Client ID is required', 400);
  }

  const review = await portfolioReviewService.getLatestReview(clientId);
  return res.status(200).json(review);
});

// GET /portfolio-reviews/client/:clientId - Complete review history for a client
export const getReviewHistory = asyncHandler(async (req: Request, res: Response) => {
  const { clientId } = req.params;
  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Get review history failed: Missing clientId in params');
    throw new AppError('Client ID is required', 400);
  }

  const history = await portfolioReviewService.getReviewHistory(clientId);
  return res.status(200).json(history);
});

// POST /portfolio-reviews/sample - Create realistic eCAS sample review session
export const createSampleReview = asyncHandler(async (req: Request, res: Response) => {
  const clientId =
    typeof req.query.clientId === 'string'
      ? req.query.clientId
      : typeof req.body?.clientId === 'string'
        ? req.body.clientId
        : undefined;

  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Create sample review failed: Missing clientId');
    throw new AppError('Client ID is required (via query param or request body)', 400);
  }

  const sampleReview = await portfolioReviewService.createSampleReview(clientId);
  return res.status(201).json(sampleReview);
});

// Portfolio Recommendations
// POST /portfolio-recommendations - Create investment recommendation proposal
export const createRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const { clientId, flowType, funds, portfolioReviewId } = req.body;

  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Create recommendation failed: Missing clientId');
    throw new AppError('Client ID is required', 400);
  }

  if (!flowType || !Object.values(RecommendationFlowType).includes(flowType)) {
    logger.warn({ ip: req.ip, flowType }, 'Create recommendation failed: Invalid or missing flowType');
    throw new AppError(
      `Valid flowType is required (${Object.values(RecommendationFlowType).join(', ')})`,
      400
    );
  }

  if (!Array.isArray(funds) || funds.length === 0) {
    logger.warn({ ip: req.ip }, 'Create recommendation failed: Funds array is empty');
    throw new AppError('At least one proposed fund item is required', 400);
  }

  const recommendation = await portfolioReviewService.createRecommendation({
    clientId,
    portfolioReviewId,
    flowType,
    funds,
  });

  return res.status(201).json(recommendation);
});

// GET /portfolio-recommendations/:id - Get recommendation by ID
export const getRecommendation = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    logger.warn({ ip: req.ip }, 'Get recommendation failed: Missing id in params');
    throw new AppError('Recommendation ID is required', 400);
  }

  const recommendation = await portfolioReviewService.getRecommendation(id);
  return res.status(200).json(recommendation);
});

// GET /portfolio-recommendations?clientId=:clientId - Get recommendations by client
export const getRecommendationsByClient = asyncHandler(async (req: Request, res: Response) => {
  const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : undefined;

  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Get recommendations by client failed: Missing clientId query param');
    throw new AppError('Query parameter clientId is required', 400);
  }

  const recommendations = await portfolioReviewService.getRecommendationsByClient(clientId);
  return res.status(200).json(recommendations);
});

// POST /portfolio-recommendations/:id/generate-pdf - Trigger asynchronous PDF generation (HTTP 202)
export const triggerPdfGeneration = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    logger.warn({ ip: req.ip }, 'Trigger PDF generation failed: Missing id in params');
    throw new AppError('Recommendation ID is required', 400);
  }

  const recommendation = await portfolioReviewService.triggerPdfGeneration(id);
  return res.status(202).json(recommendation);
});

// Document Streaming
// GET /documents/recommendations/:filename - Stream generated PDF proposal document
export const downloadRecommendationPdf = asyncHandler(async (req: Request, res: Response) => {
  const { filename } = req.params;

  // Path traversal guard
  if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    logger.warn({ ip: req.ip, filename }, 'Download PDF rejected: Invalid filename path');
    throw new AppError('Invalid filename', 400);
  }

  const filePath = path.resolve(process.cwd(), 'uploads/recommendations', filename);

  if (!fs.existsSync(filePath)) {
    logger.warn({ ip: req.ip, filePath, filename }, 'Download PDF failed: File not found');
    throw new AppError(`Document not found: ${filename}`, 404);
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

  return res.sendFile(filePath);
});
