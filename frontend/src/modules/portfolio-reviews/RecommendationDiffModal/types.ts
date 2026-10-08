import type { PortfolioRecommendation, PortfolioReview } from '@/definitions/portfolioTypes';

export interface RecommendationDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  proposal: PortfolioRecommendation | null;
  latestReview?: PortfolioReview | null;
  onProposalRefined?: () => void;
}

export interface DiffRowData {
  id: string | number;
  replacedFundName?: string;
  replacedIsin?: string;
  replacedCurrentValue?: number;
  proposedFundName: string;
  proposedIsin: string;
  proposedAmount: number;
  proposedCategory?: string;
}
