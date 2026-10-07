import { PortfolioReview } from '../../portfolioreview/models/PortfolioReview';
import { EntryAction } from '../../portfolioreview/enums/portfolioEnums';
import { AgentContext, AgentTool } from './types';
import { logger } from '../../../common/utils/logger';

export class PortfolioReviewTool implements AgentTool {
  public readonly name = 'getPortfolioHoldings';
  public readonly description =
    'Fetches existing eCAS investment holdings for a portfolio review, categorizing holdings marked for SELL vs HOLD and calculating total investable exit proceeds.';

  public readonly parameters = {
    type: 'OBJECT' as const,
    properties: {
      portfolioReviewId: {
        type: 'STRING',
        description: 'Optional ID of the specific portfolio review record. If omitted, uses latest client review.',
      },
    },
  };

  public async execute(
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const reviewId = args.portfolioReviewId ? String(args.portfolioReviewId) : context.portfolioReviewId;

    try {
      let review = null;
      if (reviewId) {
        review = await PortfolioReview.findById(reviewId);
      } else if (context.clientId) {
        review = await PortfolioReview.findOne({ client: context.clientId }).sort({ createdAt: -1 });
      }

      if (!review) {
        return {
          found: false,
          totalInvestable: 100000,
          sellHoldings: [],
          holdHoldings: [],
          message:
            'No existing portfolio review statement found. Operating in NEW_PORTFOLIO mode with base allocation budget.',
        };
      }

      const entries = review.entries || [];
      const sellHoldings: Array<{
        entryId: string;
        fundName: string;
        isin: string;
        investedAmount: number;
        currentValue: number;
        action: string;
      }> = [];

      const holdHoldings: Array<{
        entryId: string;
        fundName: string;
        isin: string;
        currentValue: number;
        action: string;
      }> = [];

      let totalSellProceeds = 0;

      for (const entry of entries) {
        const item = {
          entryId: entry._id.toString(),
          fundName: entry.fundName,
          isin: entry.isin,
          investedAmount: entry.investedAmount,
          currentValue: entry.currentValue,
          action: entry.action,
        };

        if (entry.action === EntryAction.SELL) {
          sellHoldings.push(item);
          totalSellProceeds += entry.currentValue;
        } else {
          holdHoldings.push(item);
        }
      }

      return {
        found: true,
        reviewId: review._id.toString(),
        totalInvested: review.totalInvested,
        currentTotalValue: review.totalCurrentValue,
        totalSellProceeds,
        sellCount: sellHoldings.length,
        holdCount: holdHoldings.length,
        sellHoldings,
        holdHoldings,
      };
    } catch (error: unknown) {
      logger.error({ err: error, reviewId }, 'Error executing getPortfolioHoldings tool');
      return {
        found: false,
        error: 'Database lookup failed during portfolio review query.',
      };
    }
  }
}

export const portfolioReviewTool = new PortfolioReviewTool();
