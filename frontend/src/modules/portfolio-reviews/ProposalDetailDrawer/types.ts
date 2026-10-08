import type { PortfolioReview } from '@/definitions/portfolioTypes';

export interface ProposalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | number | null;
  clientId: string;
  latestReview?: PortfolioReview | null;
}
