import type { PortfolioReview } from '@/definitions/portfolioTypes';

export interface HoldingsTabProps {
  review: PortfolioReview | null | undefined;
  isLoading: boolean;
  clientId: string;
  onSampleCreated: () => void;
}
