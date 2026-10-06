import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { RiskService } from '../../src/modules/riskappetite/services/RiskService';
import { Client } from '../../src/modules/customer/models/Client';
import { RiskAssessment } from '../../src/modules/riskappetite/models/RiskAssessment';
import { RiskQuestion } from '../../src/modules/riskappetite/models/RiskQuestion';
import { AppError } from '../../src/common/utils/AppError';
import { AssessmentStatus, ScoreCategoryCode } from '../../src/modules/riskappetite/enums/riskEnums';

describe('Risk Appetite Service (Lifecycle & Scoring)', () => {
  let riskService: RiskService;

  beforeEach(() => {
    vi.restoreAllMocks();
    riskService = new RiskService();
  });

  describe('startOrResumeAssessment', () => {
    it('should throw 404 if client does not exist', async () => {
      vi.spyOn(Client, 'findById').mockResolvedValue(null);

      await expect(riskService.startOrResumeAssessment('nonexistent_id')).rejects.toThrow(
        new AppError('Client not found', 404)
      );
    });

    it('should resume existing in-progress assessment if one exists', async () => {
      const clientId = new Types.ObjectId().toString();
      const existingId = new Types.ObjectId();

      vi.spyOn(Client, 'findById').mockResolvedValue({ _id: new Types.ObjectId(clientId) } as any);

      const mockAssessment = {
        _id: existingId,
        client: new Types.ObjectId(clientId),
        status: AssessmentStatus.IN_PROGRESS,
        answers: [],
      };

      const mockQuery = {
        sort: vi.fn().mockResolvedValue(mockAssessment),
      };
      vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(mockQuery as any);

      const result = await riskService.startOrResumeAssessment(clientId);

      expect(result.id).toBe(existingId.toString());
      expect(result.status).toBe(AssessmentStatus.IN_PROGRESS);
    });

    it('should create new assessment if no active in-progress assessment exists', async () => {
      const clientId = new Types.ObjectId().toString();
      const newId = new Types.ObjectId();

      vi.spyOn(Client, 'findById').mockResolvedValue({ _id: new Types.ObjectId(clientId) } as any);

      const mockQuery = {
        sort: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(RiskAssessment, 'findOne').mockReturnValue(mockQuery as any);

      const createdAssessment = {
        _id: newId,
        client: new Types.ObjectId(clientId),
        status: AssessmentStatus.IN_PROGRESS,
        answers: [],
      };
      vi.spyOn(RiskAssessment, 'create').mockResolvedValue(createdAssessment as any);

      const result = await riskService.startOrResumeAssessment(clientId);

      expect(RiskAssessment.create).toHaveBeenCalled();
      expect(result.id).toBe(newId.toString());
    });
  });

  describe('submitAnswer', () => {
    it('should throw 409 if assessment is already completed', async () => {
      const raId = new Types.ObjectId().toString();
      vi.spyOn(RiskAssessment, 'findById').mockResolvedValue({
        _id: new Types.ObjectId(raId),
        status: AssessmentStatus.COMPLETED,
      } as any);

      await expect(
        riskService.submitAnswer(raId, { questionId: 'q1', optionId: 'opt1' })
      ).rejects.toThrow(new AppError('Cannot submit answer for a completed assessment', 409));
    });

    it('should update existing answer if question was previously answered', async () => {
      const raId = new Types.ObjectId().toString();
      const qId = new Types.ObjectId();
      const opt1Id = new Types.ObjectId();
      const opt2Id = new Types.ObjectId();

      const mockAssessment = {
        _id: new Types.ObjectId(raId),
        status: AssessmentStatus.IN_PROGRESS,
        answers: [
          {
            question: qId,
            selectedOption: opt1Id,
            points: 2,
            answeredAt: new Date(),
          },
        ],
        save: vi.fn().mockResolvedValue(true),
      };

      const mockQuestion = {
        _id: qId,
        options: [
          { _id: opt1Id, points: 2 },
          { _id: opt2Id, points: 5 },
        ],
      };

      vi.spyOn(RiskAssessment, 'findById').mockResolvedValue(mockAssessment as any);
      vi.spyOn(RiskQuestion, 'findById').mockResolvedValue(mockQuestion as any);

      await riskService.submitAnswer(raId, {
        questionId: qId.toString(),
        optionId: opt2Id.toString(),
      });

      expect(mockAssessment.answers[0].selectedOption).toEqual(opt2Id);
      expect(mockAssessment.answers[0].points).toBe(5);
      expect(mockAssessment.save).toHaveBeenCalled();
    });
  });

  describe('completeAssessment', () => {
    it('should throw 400 if not all questions have been answered', async () => {
      const raId = new Types.ObjectId().toString();

      vi.spyOn(RiskAssessment, 'findById').mockResolvedValue({
        _id: new Types.ObjectId(raId),
        answers: [{ question: new Types.ObjectId(), points: 3 }],
      } as any);

      vi.spyOn(RiskQuestion, 'countDocuments').mockResolvedValue(5 as any);

      await expect(riskService.completeAssessment(raId)).rejects.toThrow(
        /All 5 questions must be answered/
      );
    });

    it('should compute total score, set category, and mark status COMPLETED', async () => {
      const raId = new Types.ObjectId().toString();

      const mockAssessment = {
        _id: new Types.ObjectId(raId),
        client: new Types.ObjectId(),
        status: AssessmentStatus.IN_PROGRESS,
        answers: [
          { question: new Types.ObjectId(), points: 10 },
          { question: new Types.ObjectId(), points: 15 },
          { question: new Types.ObjectId(), points: 25 },
        ], // Total = 50 -> Moderate
        save: vi.fn().mockImplementation(function () {
          return Promise.resolve(this);
        }),
      };

      vi.spyOn(RiskAssessment, 'findById').mockResolvedValue(mockAssessment as any);
      vi.spyOn(RiskQuestion, 'countDocuments').mockResolvedValue(3 as any);

      const result = await riskService.completeAssessment(raId);

      expect(mockAssessment.status).toBe(AssessmentStatus.COMPLETED);
      expect(mockAssessment.totalScore).toBe(50);
      expect(mockAssessment.scoreCategory?.code).toBe(ScoreCategoryCode.MODERATE);
      expect(result.status).toBe(AssessmentStatus.COMPLETED);
      expect(result.totalScore).toBe(50);
    });
  });
});
