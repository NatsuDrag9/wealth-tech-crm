

import { Types } from "mongoose";
import { AppError } from "../../../common/utils/AppError";
import { logger } from "../../../common/utils/logger";
import { Client } from "../../customer/models/Client";
import { RaOptionResponseDto, RaQuestionResponseDto, RaResultResponseDto, RaStartResponseDto, SubmitAnswerDto } from "../dto/riskDto";
import { AssessmentStatus, getScoreCategoryFromScore } from "../enums/riskEnums";
import { IRiskAssessment, RiskAssessment } from "../models/RiskAssessment";
import { IRiskQuestion, RiskQuestion } from "../models/RiskQuestion";

export class RiskService {
    // Map Question Document to DTO
    private mapToQuestionResponse(q: IRiskQuestion): RaQuestionResponseDto {
        const options: RaOptionResponseDto[] = q.options.map((opt) => ({
            id: opt._id.toString(),
            optionLetter: opt.optionLetter,
            optionText: opt.optionText,
            points: opt.points
        }));

        return {
            id: q._id.toString(),
            questionText: q.questionText,
            rationale: q.rationale,
            displayOrder: q.displayOrder,
            options,
        };
    }

    private mapToResultResponse(a: IRiskAssessment): RaResultResponseDto {
        return {
            id: a._id.toString(),
            clientId: a.client.toString(),
            status: a.status,
            totalScore: a.totalScore,
            scoreCategory: a.scoreCategory || null,
            createdAt: a.createdAt,
            completedAt: a.completedAt || null,
        };
    }

    // Get full question bank sorted by displayOrder
    async getQuestions(): Promise<RaQuestionResponseDto[]> {
        const questions = await RiskQuestion.find().sort({ displayOrder: 1 });
        return questions.map((q) => this.mapToQuestionResponse(q));
    }

    // Start a new or resume active assessment for a client
    async startOrResumeAssessment(clientId: string): Promise<RaStartResponseDto> {
        const client = await Client.findById(clientId);
        if (!client) {
            logger.warn({ clientId }, "Start assessment failed: Client not found");
            throw new AppError("Client not found", 404);
        }

        let assessment = await RiskAssessment.findOne({
            client: new Types.ObjectId(clientId),
            status: AssessmentStatus.IN_PROGRESS,
        }).sort({ createdAt: -1 });

        if (!assessment) {
            assessment = await RiskAssessment.create({
                client: new Types.ObjectId(clientId),
                status: AssessmentStatus.IN_PROGRESS,
                answers: [],
            })

            logger.info({ assessmentId: assessment._id, clientId }, "New risk assessment started");
        }
        else {
            logger.info({ assessmentId: assessment._id, clientId }, "Resuming active risk assessment");
        }

        return {
            id: assessment._id.toString(),
            clientId: assessment.client.toString(),
            status: assessment.status,
            answers: assessment.answers.map((ans) => ({
                questionId: ans.question.toString(),
                optionId: ans.selectedOption.toString(),
                points: ans.points,
                answeredAt: ans.answeredAt
            })),
        };
    }

    // Submit or update an answer to a question
    async submitAnswer(raId: string, data: SubmitAnswerDto): Promise<void> {
        const assessment = await RiskAssessment.findById(raId);
        if (!assessment) {
            logger.warn({ raId }, "Submit answer failed: Assessment not found");
            throw new AppError('Assessment not found', 404);
        }

        if (assessment.status === AssessmentStatus.COMPLETED) {
            logger.warn({ raId }, "Submit answer failed: Assessment already completed");
            throw new AppError("Cannot submit answer for a completed assessment", 409);
        }

        const question = await RiskQuestion.findById(data.questionId);
        if (!question) {
            logger.warn({ questionId: data.questionId }, "Submit answer failed: Question not found");
            throw new AppError("Question not found", 404);
        }

        const option = question.options.find((opt) => opt._id.toString() === data.optionId);
        if (!option) {
            logger.warn({ optionId: data.optionId, questionId: data.questionId }, "Submit answer failed: Option not found for the specified question");
            throw new AppError("Option not found for the specified question", 404);
        }

        // Update if already answered else push new answer
        const existingIndex = assessment.answers.findIndex((ans) => ans.question.toString() === data.questionId);
        if (existingIndex >= 0) {
            assessment.answers[existingIndex].selectedOption = new Types.ObjectId(data.optionId);
            assessment.answers[existingIndex].points = option.points;
            assessment.answers[existingIndex].answeredAt = new Date();
        }
        else {
            assessment.answers.push({
                question: new Types.ObjectId(data.questionId),
                selectedOption: new Types.ObjectId(data.optionId),
                points: option.points,
                answeredAt: new Date()
            })
        }

        await assessment.save();
        logger.info({ raId, questionId: data.questionId, points: option.points }, "Answer saved successfully");
    }

    // Finalize assessment and compute server-side score
    async completeAssessment(raId: string): Promise<RaResultResponseDto> {
        const assessment = await RiskAssessment.findById(raId);
        if (!assessment) {
            logger.warn({ raId }, "Complete assessment failed: Assessment not found");
            throw new AppError("Assessment not found", 404);
        }

        const totalQuestions = await RiskQuestion.countDocuments();
        if (assessment.answers.length < totalQuestions) {
            logger.warn({ raId, answeredCount: assessment.answers.length, totalQuestions }, "Complete assessment failed: Missing answers");
            throw new AppError(`All ${totalQuestions} questions must be answered before completing the assessment`, 400);
        }

        // Tally points and calculate score-category
        const totalScore = assessment.answers.reduce((acc, ans) => acc + ans.points, 0);
        const scoreCategory = getScoreCategoryFromScore(totalScore);

        assessment.status = AssessmentStatus.COMPLETED;
        assessment.totalScore = totalScore;
        assessment.scoreCategory = scoreCategory;
        assessment.completedAt = new Date();

        const saved = await assessment.save();
        logger.info({ raId, totalScore, category: scoreCategory.code }, "Risk assessment completed and scored successfully");

        return this.mapToResultResponse(saved);
    }

    // Get assessment results by assessmentId
    async getAssessmentResult(raId: string): Promise<RaResultResponseDto> {
        const assessment = await RiskAssessment.findById(raId);
        if (!assessment) {
            logger.warn({ raId }, "Get assessment result failed: Assessment not found");
            throw new AppError("Assessment not found", 404);
        }

        return this.mapToResultResponse(assessment);
    }

    // Get latest completed assessment for a client
    async getLatestCompletedAssessment(clientId: string): Promise<RaResultResponseDto> {
        const assessment = await RiskAssessment.findOne({
            client: new Types.ObjectId(clientId),
            status: AssessmentStatus.COMPLETED
        }).sort({ completedAt: -1, createdAt: -1 });

        if (!assessment) {
            logger.warn({ clientId }, 'Get latest assessment failed: No completed assessment found');
            throw new AppError('No completed risk assessment found for client', 404);
        }

        return this.mapToResultResponse(assessment);
    }


}

export const riskService = new RiskService();