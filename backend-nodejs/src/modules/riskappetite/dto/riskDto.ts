import { AssessmentStatus, IScoreCategoryInfo } from "../enums/riskEnums";

export interface StartAssessmentDto {
    clientId: string;
}

export interface SubmitAnswerDto {
    questionId: string;
    optionId: string;
}

// Question and Option Response DTOs
export interface RaOptionResponseDto {
    id: string;
    optionLetter: string;
    optionText: string;
    points: number;
}

export interface RaQuestionResponseDto {
    id: string;
    questionText: string;
    rationale: string;
    displayOrder: number;
    options: RaOptionResponseDto[];
}

// Assessment and Answer State DTOs
export interface RaAnswerResponseDto {
    questionId: string;
    optionId: string;
    points?: number;
    answeredAt?: Date;
}

export interface RaStartResponseDto {
    id: string;
    clientId: string;
    status: AssessmentStatus;
    answers: RaAnswerResponseDto[];
}

// Result DTO for Completion and Latest Assessment Queries
export interface RaResultResponseDto {
    id: string;
    clientId: string;
    status: AssessmentStatus;
    totalScore?: number;
    scoreCategory?: IScoreCategoryInfo | null;
    createdAt: Date;
    completedAt?: Date | null;
}

