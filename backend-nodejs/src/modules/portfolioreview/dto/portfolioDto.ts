import { EntryAction, RecommendationFlowType, RecommendationStatus, ReviewStatus } from "../enums/portfolioEnums";

// Flow type DTO
export interface FlowTypeResponseDto {
    code: RecommendationFlowType;
    displayName: string;
}

// Fund universe
export interface EligibleFundResponseDto {
    id: string;
    fundName: string;
    isin: string;
    fundSubCategory: string;
    assetClass: string;
    instrumentType: string;
    scoreCategory?: string | null;
}

// Portfolio Review
export interface PortfolioEntryResponseDto {
    id: string;
    fundName: string;
    isin: string;
    units: number;
    purchaseNav: number;
    currentNav: number;
    investedAmount: number;
    currentValue: number;
    absReturnPct: number;
    gain: number;
    cagrPct: number;
    holdingDays: number;
    action: EntryAction;
}

// Portfolio Review Response
export interface PortfolioReviewResponseDto {
    id: string;
    clientId: string;
    status: ReviewStatus;
    totalInvested: number;
    totalCurrentValue: number;
    totalGain: number;
    gainPercentage: number;
    cagr: number;
    note?: string | null;
    ecasFileKey?: string | null;
    ecasFileUrl?: string | null;
    entries: PortfolioEntryResponseDto[];
    createdAt: Date;
}

export interface MasterFundUploadResponseDto {
    status: string;
    message: string;
    filename: string;
    s3Key: string;
    fileUrl: string | null;
    totalRecords: number;
    insertedRecords: number;
    updatedRecords: number;
}

export interface EcasUploadResponseDto {
    status: string;
    message: string;
    clientId?: string | null;
    filename: string;
    s3Key: string;
    fileUrl: string | null;
}

// Recommendation Proposal DTOs
export interface RfItemRequestDto {
    eligibleFundId: string;
    amount: number;
    replacesEntryId?: string | null;
    displayOrder?: number;
}

export interface CreateRecommendationDto {
    clientId: string;
    portfolioReviewId?: string | null;
    flowType: RecommendationFlowType;
    funds: RfItemRequestDto[];
}

export interface RfItemResponseDto {
    id: string;
    eligibleFund: EligibleFundResponseDto;
    amount: number;
    replacesEntryId?: string | null;
    displayOrder: number;
}

export interface PortfolioRecommendationResponseDto {
    id: string;
    clientId: string;
    portfolioReviewId?: string | null;
    flowType: RecommendationFlowType;
    status: RecommendationStatus;
    investorCategory?: string | null;
    generatedDocumentUrl?: string | null;
    documentS3Key?: string | null;
    funds: RfItemResponseDto[];
    createdAt: Date;
}