import type { PortfolioReview } from '@/definitions/portfolioTypes';

export interface AdvisoryTabProps {
  clientId: string;
  latestReview?: PortfolioReview | null;
}
