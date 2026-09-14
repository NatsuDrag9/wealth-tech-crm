export type ReviewStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type EntryAction = 'HOLD' | 'SELL';

export type RecommendationFlowType = 'REPLACE_FUNDS' | 'NEW_PORTFOLIO';

export type RecommendationStatus = 'SAVED' | 'PDF_GENERATED' | 'PDF_FAILED';

export interface FlowTypeOption {
  code: RecommendationFlowType;
  displayName: string;
}

export interface EligibleFund {
  id: string | number;
  fundName: string;
  isin: string;
  fundSubCategory: string;
  assetClass: string;
  instrumentType: string;
  scoreCategory?: string | null;
}

export interface PortfolioEntry {
  id: string | number;
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

export interface PortfolioReview {
  id: string | number;
  clientId: string | number;
  status: ReviewStatus;
  totalInvested: number;
  totalCurrentValue: number;
  totalGain: number;
  gainPercentage: number;
  cagr: number;
  note?: string | null;
  entries: PortfolioEntry[];
  createdAt: string;
}

export interface ProposedFundRequestItem {
  eligibleFundId: string | number;
  amount: number;
  replacesEntryId?: string | number | null;
  displayOrder?: number;
}

export interface CreateRecommendationPayload {
  clientId: string | number;
  portfolioReviewId?: string | number | null;
  flowType: RecommendationFlowType;
  funds: ProposedFundRequestItem[];
}

export interface RecommendationFundItem {
  id: string | number;
  eligibleFund: EligibleFund;
  amount: number;
  replacesEntryId?: string | number | null;
  displayOrder: number;
}

export interface PortfolioRecommendation {
  id: string | number;
  clientId: string | number;
  portfolioReviewId?: string | number | null;
  flowType: RecommendationFlowType;
  status: RecommendationStatus;
  investorCategory?: string | null;
  generatedDocumentUrl?: string | null;
  funds: RecommendationFundItem[];
  createdAt: string;
}
