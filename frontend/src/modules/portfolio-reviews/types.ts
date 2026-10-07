import type {
  PortfolioRecommendation,
  PortfolioReview,
} from '@/definitions/portfolioTypes';
import type { AgentRecommendationDraft } from '@/definitions/agentTypes';

export interface AllocationRow {
  id: string;
  eligibleFundId: string;
  amount: number;
  replacesEntryId?: string;
}

export interface ProposalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  latestReview?: PortfolioReview | null;
  onSuccess: () => void;
  stagedRecommendation?: PortfolioRecommendation | null;
  recommendationDraft?: AgentRecommendationDraft | null;
}

export interface AdvisoryTabProps {
  clientId: string;
  latestReview?: PortfolioReview | null;
}

export interface ProposalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | number | null;
}
