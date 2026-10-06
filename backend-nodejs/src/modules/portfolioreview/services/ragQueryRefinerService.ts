export interface RefinedQueryResult {
  originalQuery: string;
  refinedQuery: string;
  wasRefined: boolean;
  refinementStrategy: string;
}

/**
 * Service for refining natural-language search queries when initial RAG retrieval
 * fails the Evidence Quality Gate threshold.
 * Reformulates conversational queries into canonical mutual fund entity and document terms.
 */
export class RagQueryRefinerService {
  /**
   * Reformulates a query to maximize semantic and lexical overlap with official fund disclosures.
   */
  public refineQuery(originalQuery: string): RefinedQueryResult {
    if (!originalQuery || originalQuery.trim().length === 0) {
      return {
        originalQuery: originalQuery || '',
        refinedQuery: '',
        wasRefined: false,
        refinementStrategy: 'NONE',
      };
    }

    const lower = originalQuery.toLowerCase();
    let expansion = '';
    let strategy = '';

    if (lower.includes('cost') || lower.includes('fee') || lower.includes('expense') || lower.includes('ter')) {
      expansion = ' Total Expense Ratio TER Direct Plan Regular Plan expense disclosure';
      strategy = 'EXPENSE_RATIO_EXPANSION';
    } else if (lower.includes('risk') || lower.includes('safe') || lower.includes('volatile') || lower.includes('danger')) {
      expansion = ' Riskometer Product Labeling SEBI risk band suitability';
      strategy = 'RISKOMETER_EXPANSION';
    } else if (lower.includes('sector') || lower.includes('holding') || lower.includes('stock') || lower.includes('company')) {
      expansion = ' portfolio holdings sector allocation top 10 assets factsheet';
      strategy = 'HOLDINGS_PORTFOLIO_EXPANSION';
    } else if (lower.includes('hybrid') || lower.includes('conservative') || lower.includes('debt')) {
      expansion = ' Parag Parikh Conservative Hybrid Fund asset allocation debt equity SID';
      strategy = 'HYBRID_SCHEME_EXPANSION';
    } else if (lower.includes('tax') || lower.includes('elss') || lower.includes('80c')) {
      expansion = ' Parag Parikh ELSS Tax Saver Fund 3 year lock-in equity SID';
      strategy = 'ELSS_TAX_EXPANSION';
    } else {
      expansion = ' mutual fund factsheet Scheme Information Document SID disclosure';
      strategy = 'GENERAL_CANONICAL_EXPANSION';
    }

    const finalQuery = `${originalQuery.trim()}${expansion}`;

    return {
      originalQuery,
      refinedQuery: finalQuery,
      wasRefined: true,
      refinementStrategy: strategy,
    };
  }
}

export const ragQueryRefinerService = new RagQueryRefinerService();
