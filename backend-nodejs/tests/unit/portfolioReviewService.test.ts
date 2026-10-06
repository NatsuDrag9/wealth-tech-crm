import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { PortfolioReviewService } from '../../src/modules/portfolioreview/services/portfolioReviewService';
import { PortfolioReview } from '../../src/modules/portfolioreview/models/PortfolioReview';
import { PortfolioRecommendation } from '../../src/modules/portfolioreview/models/PortfolioRecommendation';
import { RiskAssessment } from '../../src/modules/riskappetite/models/RiskAssessment';
import { EligibleFund } from '../../src/modules/portfolioreview/models/EligibleFund';
import { AppError } from '../../src/common/utils/AppError';
import {
  RecommendationFlowType,
  EntryAction,
  RecommendationStatus,
} from '../../src/modules/portfolioreview/enums/portfolioEnums';
import { AssessmentStatus, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';
import { CreateRecommendationDto } from '../../src/modules/portfolioreview/dto/portfolioDto';

describe('Portfolio Review & Recommendation Service (SEBI Compliance)', () => {
  let service: PortfolioReviewService;

  beforeEach(() => {
    vi.restoreAllMocks();
    service = new PortfolioReviewService();
  });

  describe('createRecommendation - Regulatory Compliance Gate', () => {
    it('should block recommendation creation if client has not completed a risk assessment', async () => {
      const clientId = new Types.ObjectId().toString();

      // No completed assessment
      const mockQuery = {
        sort: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(mockQuery as any);

      const request: CreateRecommendationDto = {
        clientId,
        flowType: RecommendationFlowType.NEW_PORTFOLIO,
        funds: [{ eligibleFundId: new Types.ObjectId().toString(), amount: 50000 }],
      };

      await expect(service.createRecommendation(request)).rejects.toThrow(
        /must complete a risk assessment before receiving recommendations/
      );
    });
  });

  describe('createRecommendation - REPLACE_FUNDS Strategy Rules', () => {
    const clientId = new Types.ObjectId().toString();
    const reviewId = new Types.ObjectId().toString();
    const sellHoldingId = new Types.ObjectId();
    const holdHoldingId = new Types.ObjectId();

    beforeEach(() => {
      // Completed assessment mock
      const mockAssessment = {
        _id: new Types.ObjectId(),
        client: new Types.ObjectId(clientId),
        status: AssessmentStatus.COMPLETED,
        scoreCategory: { code: ScoreCategoryCode.MODERATE },
      };
      vi.spyOn(RiskAssessment, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue(mockAssessment),
      } as any);
    });

    it('should throw 400 if portfolioReviewId is missing in REPLACE_FUNDS flow', async () => {
      const request: CreateRecommendationDto = {
        clientId,
        flowType: RecommendationFlowType.REPLACE_FUNDS,
        funds: [{ eligibleFundId: new Types.ObjectId().toString(), amount: 25000 }],
      };

      await expect(service.createRecommendation(request)).rejects.toThrow(
        new AppError('portfolioReviewId is required for REPLACE_FUNDS flow', 400)
      );
    });

    it('should reject replacing a holding that is marked HOLD instead of SELL', async () => {
      const mockReview = {
        _id: new Types.ObjectId(reviewId),
        client: new Types.ObjectId(clientId),
        entries: [
          { _id: holdHoldingId, fundName: 'HDFC Top 100', action: EntryAction.HOLD },
          { _id: sellHoldingId, fundName: 'Axis Small Cap', action: EntryAction.SELL },
        ],
      };
      vi.spyOn(PortfolioReview, 'findById').mockResolvedValue(mockReview as any);

      const request: CreateRecommendationDto = {
        clientId,
        portfolioReviewId: reviewId,
        flowType: RecommendationFlowType.REPLACE_FUNDS,
        funds: [
          {
            eligibleFundId: new Types.ObjectId().toString(),
            amount: 50000,
            replacesEntryId: holdHoldingId.toString(), // Trying to replace a HOLD fund!
          },
        ],
      };

      await expect(service.createRecommendation(request)).rejects.toThrow(
        /only SELL holdings can be replaced/
      );
    });

    it('should succeed and create recommendation when replacing valid SELL holdings', async () => {
      const mockReview = {
        _id: new Types.ObjectId(reviewId),
        client: new Types.ObjectId(clientId),
        entries: [
          { _id: sellHoldingId, fundName: 'Axis Small Cap', action: EntryAction.SELL },
        ],
      };
      vi.spyOn(PortfolioReview, 'findById').mockResolvedValue(mockReview as any);

      const eligibleFundId = new Types.ObjectId();
      const mockFund = {
        _id: eligibleFundId,
        fundName: 'Parag Parikh Flexi Cap Fund',
        isin: 'INF879O01019',
      };
      vi.spyOn(EligibleFund, 'findById').mockResolvedValue(mockFund as any);

      const createdRecId = new Types.ObjectId();
      const mockCreatedRec = {
        _id: createdRecId,
        client: new Types.ObjectId(clientId),
        portfolioReview: new Types.ObjectId(reviewId),
        flowType: RecommendationFlowType.REPLACE_FUNDS,
        status: RecommendationStatus.SAVED,
        funds: [
          {
            eligibleFund: mockFund,
            amount: 50000,
            replacesEntryId: sellHoldingId,
            displayOrder: 1,
          },
        ],
        createdAt: new Date(),
      };

      vi.spyOn(PortfolioRecommendation, 'create').mockResolvedValue(mockCreatedRec as any);
      vi.spyOn(PortfolioRecommendation, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCreatedRec),
      } as any);

      const request: CreateRecommendationDto = {
        clientId,
        portfolioReviewId: reviewId,
        flowType: RecommendationFlowType.REPLACE_FUNDS,
        funds: [
          {
            eligibleFundId: eligibleFundId.toString(),
            amount: 50000,
            replacesEntryId: sellHoldingId.toString(),
          },
        ],
      };

      const result = await service.createRecommendation(request);

      expect(result.id).toBe(createdRecId.toString());
      expect(result.flowType).toBe(RecommendationFlowType.REPLACE_FUNDS);
      expect(result.funds.length).toBe(1);
      expect(result.funds[0].amount).toBe(50000);
    });
  });
});
