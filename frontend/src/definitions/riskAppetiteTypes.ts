export type AssessmentStatus = 'IN_PROGRESS' | 'COMPLETED';

export type ScoreCategoryCode =
  | 'very_conservative'
  | 'conservative'
  | 'moderate'
  | 'aggressive'
  | 'very_aggressive';

export interface ScoreCategoryInfo {
  code: ScoreCategoryCode | string;
  displayName: string;
  minScore: number;
  maxScore: number;
}

export interface RiskOption {
  id: string | number;
  optionLetter: string;
  optionText: string;
  points: number;
}

export interface RiskQuestion {
  id: string | number;
  questionText: string;
  rationale: string;
  displayOrder?: number;
  order?: number;
  options: RiskOption[];
}

export interface RiskAnswer {
  questionId: string | number;
  optionId: string | number;
  points?: number;
  answeredAt?: string | Date;
}

export interface StartAssessmentPayload {
  clientId: string | number;
}

export interface StartAssessmentResponse {
  id: string | number;
  clientId: string | number;
  status: AssessmentStatus;
  answers: RiskAnswer[];
}

export interface SubmitAnswerParams {
  raId: string | number;
  questionId: string | number;
  optionId: string | number;
}

export interface CompleteAssessmentParams {
  raId: string | number;
}

export interface AssessmentResultResponse {
  id: string | number;
  clientId: string | number;
  status: AssessmentStatus;
  totalScore?: number;
  scoreCategory?: ScoreCategoryInfo | null;
  createdAt: string;
  completedAt?: string | null;
}
