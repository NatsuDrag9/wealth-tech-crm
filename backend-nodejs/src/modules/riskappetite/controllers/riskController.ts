import { Request, Response } from 'express';
import { asyncHandler } from '../../../common/middleware/asyncHandler';
import { AppError } from '../../../common/utils/AppError';
import { logger } from '../../../common/utils/logger';
import { riskService } from '../services/RiskService';

// 1. GET /risk-questions - Full question bank sorted by display order
export const getQuestions = asyncHandler(async (_req: Request, res: Response) => {
  const questions = await riskService.getQuestions();
  return res.status(200).json(questions);
});

// 2. GET /risk-assessments/clients/:clientId/latest - Latest completed assessment for a client
export const getLatestCompletedAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { clientId } = req.params;

  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Get latest assessment failed: Missing clientId');
    throw new AppError('Client ID is required', 400);
  }

  const assessment = await riskService.getLatestCompletedAssessment(clientId);
  return res.status(200).json(assessment);
});

// 3. GET /risk-assessments/:raId/results - Result detail for the assessment completion popup
export const getAssessmentResult = asyncHandler(async (req: Request, res: Response) => {
  const { raId } = req.params;

  if (!raId) {
    logger.warn({ ip: req.ip }, 'Get assessment result failed: Missing raId');
    throw new AppError('Assessment ID is required', 400);
  }

  const result = await riskService.getAssessmentResult(raId);
  return res.status(200).json(result);
});

// 4. POST /risk-assessments/start-assessment - Start a new or resume active assessment
export const startAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { clientId } = req.body;

  if (!clientId) {
    logger.warn({ ip: req.ip }, 'Start assessment failed: Missing clientId in request body');
    throw new AppError('Client ID is required', 400);
  }

  const assessment = await riskService.startOrResumeAssessment(clientId);
  return res.status(201).json(assessment);
});

// 5. POST /risk-assessments/:raId/submit-answer - Submit or update answer to an assessment question
export const submitAnswer = asyncHandler(async (req: Request, res: Response) => {
  const { raId } = req.params;
  const { questionId, optionId } = req.body;

  if (!raId) {
    logger.warn({ ip: req.ip }, 'Submit answer failed: Missing raId in request parameters');
    throw new AppError('Assessment ID is required', 400);
  }

  if (!questionId || !optionId) {
    logger.warn({ ip: req.ip, raId }, 'Submit answer failed: Missing questionId or optionId');
    throw new AppError('Both questionId and optionId are required', 400);
  }

  await riskService.submitAnswer(raId, { questionId, optionId });
  return res.status(200).json({ message: 'Answer saved successfully' });
});

// 6. POST /risk-assessments/:raId/complete-assessment - Finalize assessment and compute server-side score
export const completeAssessment = asyncHandler(async (req: Request, res: Response) => {
  const { raId } = req.params;

  if (!raId) {
    logger.warn({ ip: req.ip }, 'Complete assessment failed: Missing raId in request parameters');
    throw new AppError('Assessment ID is required', 400);
  }

  const result = await riskService.completeAssessment(raId);
  return res.status(200).json(result);
});
