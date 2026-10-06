import { describe, it, expect } from 'vitest';
import {
  RagQueryRefinerService,
  RefinedQueryResult,
} from '../../src/modules/portfolioreview/services/ragQueryRefinerService';

describe('RagQueryRefinerService', () => {
  const service = new RagQueryRefinerService();

  it('should return wasRefined false and strategy NONE for empty or whitespace query', () => {
    const emptyResult: RefinedQueryResult = service.refineQuery('');
    expect(emptyResult.wasRefined).toBe(false);
    expect(emptyResult.refinementStrategy).toBe('NONE');
    expect(emptyResult.refinedQuery).toBe('');

    const whitespaceResult: RefinedQueryResult = service.refineQuery('   ');
    expect(whitespaceResult.wasRefined).toBe(false);
    expect(whitespaceResult.refinementStrategy).toBe('NONE');
    expect(whitespaceResult.refinedQuery).toBe('');
  });

  it('should apply EXPENSE_RATIO_EXPANSION for fee, cost, and expense queries', () => {
    const queries = [
      'What is the annual management fee for HDFC Large Cap?',
      'What are the costs associated with regular plan?',
      'Tell me the expense ratio of this fund',
      'What is the TER of direct plan?',
    ];

    for (const q of queries) {
      const res = service.refineQuery(q);
      expect(res.wasRefined).toBe(true);
      expect(res.refinementStrategy).toBe('EXPENSE_RATIO_EXPANSION');
      expect(res.refinedQuery).toContain('Total Expense Ratio TER Direct Plan Regular Plan expense disclosure');
      expect(res.refinedQuery.startsWith(q.trim())).toBe(true);
    }
  });

  it('should apply RISKOMETER_EXPANSION for risk, safe, and volatility queries', () => {
    const queries = [
      'Is this fund safe for a conservative investor?',
      'What is the risk level of flexi cap?',
      'How volatile is this equity scheme?',
      'Is there danger of capital loss?',
    ];

    for (const q of queries) {
      const res = service.refineQuery(q);
      expect(res.wasRefined).toBe(true);
      expect(res.refinementStrategy).toBe('RISKOMETER_EXPANSION');
      expect(res.refinedQuery).toContain('Riskometer Product Labeling SEBI risk band suitability');
      expect(res.refinedQuery.startsWith(q.trim())).toBe(true);
    }
  });

  it('should apply HOLDINGS_PORTFOLIO_EXPANSION for sector, stock, and holding queries', () => {
    const queries = [
      'What are the top sector allocations?',
      'Which stock is the largest holding?',
      'Does this scheme invest in IT company shares?',
    ];

    for (const q of queries) {
      const res = service.refineQuery(q);
      expect(res.wasRefined).toBe(true);
      expect(res.refinementStrategy).toBe('HOLDINGS_PORTFOLIO_EXPANSION');
      expect(res.refinedQuery).toContain('portfolio holdings sector allocation top 10 assets factsheet');
      expect(res.refinedQuery.startsWith(q.trim())).toBe(true);
    }
  });

  it('should apply HYBRID_SCHEME_EXPANSION for hybrid and debt queries', () => {
    const queries = [
      'What is the asset allocation of conservative hybrid fund?',
      'How much debt allocation does this hybrid fund hold?',
    ];

    for (const q of queries) {
      const res = service.refineQuery(q);
      expect(res.wasRefined).toBe(true);
      expect(res.refinementStrategy).toBe('HYBRID_SCHEME_EXPANSION');
      expect(res.refinedQuery).toContain('Parag Parikh Conservative Hybrid Fund asset allocation debt equity SID');
      expect(res.refinedQuery.startsWith(q.trim())).toBe(true);
    }
  });

  it('should apply ELSS_TAX_EXPANSION for tax saving and 80C queries', () => {
    const queries = [
      'Can I get tax benefit under section 80c with this ELSS fund?',
      'What is the lock-in period for tax saving scheme?',
    ];

    for (const q of queries) {
      const res = service.refineQuery(q);
      expect(res.wasRefined).toBe(true);
      expect(res.refinementStrategy).toBe('ELSS_TAX_EXPANSION');
      expect(res.refinedQuery).toContain('Parag Parikh ELSS Tax Saver Fund 3 year lock-in equity SID');
      expect(res.refinedQuery.startsWith(q.trim())).toBe(true);
    }
  });

  it('should fall back to GENERAL_CANONICAL_EXPANSION for unclassified investment queries', () => {
    const res = service.refineQuery('Tell me more about this mutual fund overview');
    expect(res.wasRefined).toBe(true);
    expect(res.refinementStrategy).toBe('GENERAL_CANONICAL_EXPANSION');
    expect(res.refinedQuery).toContain('mutual fund factsheet Scheme Information Document SID disclosure');
  });
});
