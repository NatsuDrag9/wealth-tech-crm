import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import {
  X,
  ArrowRight,
  Sparkles,
  Bot,
  Layers,
} from 'lucide-react';
import { MainButton } from '@/components/buttons';
import { useRunAgentMutation } from '@/services/api/agentApi';
import { useAppDispatch } from '@/store';
import { setLatestAgentResult } from '@/store/slices/agentSlice';
import { getActiveAgentMode } from '@/config/agentConfig';
import type {
  RecommendationDiffModalProps,
  DiffRowData,
} from './types';
import './RecommendationDiffModal.scss';

export function RecommendationDiffModal({
  isOpen,
  onClose,
  clientId,
  proposal,
  latestReview,
  onProposalRefined,
}: RecommendationDiffModalProps): ReactElement | null {
  const dispatch = useAppDispatch();
  const [feedbackText, setFeedbackText] = useState('');
  const [runAgent, { isLoading: isRefining }] = useRunAgentMutation();

  const diffRows = useMemo<DiffRowData[]>(() => {
    if (!proposal || !proposal.funds) return [];

    const existingEntries = latestReview?.entries ?? [];

    return proposal.funds.map((fundItem) => {
      const replacesId = fundItem.replacesEntryId;
      const matchedHolding = replacesId
        ? existingEntries.find((e) => String(e.id) === String(replacesId))
        : undefined;

      return {
        id: fundItem.id,
        replacedFundName: matchedHolding?.fundName,
        replacedIsin: matchedHolding?.isin,
        replacedCurrentValue: matchedHolding?.currentValue,
        proposedFundName: fundItem.eligibleFund?.fundName ?? 'Eligible Fund',
        proposedIsin: fundItem.eligibleFund?.isin ?? '',
        proposedAmount: fundItem.amount,
        proposedCategory: fundItem.eligibleFund?.scoreCategory ?? undefined,
      };
    });
  }, [proposal, latestReview]);

  const totalLiquidated = useMemo(() => diffRows.reduce(
    (sum, r) => sum + (r.replacedCurrentValue ?? 0),
    0,
  ), [diffRows]);

  const totalProposed = useMemo(() => diffRows.reduce(
    (sum, r) => sum + (r.proposedAmount ?? 0),
    0,
  ), [diffRows]);

  const netCashDelta = totalProposed - totalLiquidated;

  if (!isOpen || !proposal) return null;

  async function handleRefineWithAi() {
    if (!feedbackText.trim() || isRefining) return;

    try {
      const reviewId = latestReview?.id ? String(latestReview.id) : null;
      const agentMode = getActiveAgentMode();

      const result = await runAgent({
        clientId,
        portfolioReviewId: reviewId,
        flowType: proposal?.flowType ?? 'REPLACE_FUNDS',
        reviewFeedback: feedbackText.trim(),
        previousProposalId: proposal?.id ?? null,
        agentMode,
      }).unwrap();

      dispatch(setLatestAgentResult(result));
      setFeedbackText('');

      if (onProposalRefined) {
        onProposalRefined();
      }
    } catch {
      // Error handled by RTK Query
    }
  }

  return (
    <div className="recommendation-diff-modal" role="dialog" aria-modal="true">
      <div className="recommendation-diff-modal__container">
        {/* Header */}
        <div className="recommendation-diff-modal__header">
          <div className="recommendation-diff-modal__header-left">
            <Layers size={22} />
            <div>
              <h2 className="recommendation-diff-modal__title">
                Portfolio Restructuring Diff View
              </h2>
              <p className="recommendation-diff-modal__subtitle">
                {`Proposal #${proposal.id} • Holistic transition comparison`}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="recommendation-diff-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="recommendation-diff-modal__body">
          {/* Top Metrics Delta Strip */}
          <div className="recommendation-diff-modal__summary-strip">
            <div className="recommendation-diff-modal__summary-card">
              <span className="recommendation-diff-modal__summary-card-label">
                Total Value Liquidated (SELL)
              </span>
              <span
                className="recommendation-diff-modal__summary-card-value
                  recommendation-diff-modal__summary-card-value--sell"
              >
                {`₹${totalLiquidated.toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="recommendation-diff-modal__summary-card">
              <span className="recommendation-diff-modal__summary-card-label">
                Total Proposed Capital (BUY)
              </span>
              <span
                className="recommendation-diff-modal__summary-card-value
                  recommendation-diff-modal__summary-card-value--buy"
              >
                {`₹${totalProposed.toLocaleString('en-IN')}`}
              </span>
            </div>

            <div className="recommendation-diff-modal__summary-card">
              <span className="recommendation-diff-modal__summary-card-label">
                Net Capital Balance Delta
              </span>
              <span className="recommendation-diff-modal__summary-card-value">
                {`${netCashDelta >= 0 ? '+' : ''}₹${netCashDelta.toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          {/* All Rows Diff Table */}
          <div className="recommendation-diff-modal__table-wrapper">
            <table className="recommendation-diff-modal__table">
              <thead>
                <tr>
                  <th>Current Holding (SELL)</th>
                  <th style={{ textAlign: 'right' }}>Current Value</th>
                  <th style={{ width: '3rem' }}>{/* Arrow */}</th>
                  <th>Proposed Target Fund (BUY)</th>
                  <th>Score Category</th>
                  <th style={{ textAlign: 'right' }}>Proposed Allocation</th>
                </tr>
              </thead>
              <tbody>
                {diffRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.replacedFundName ? (
                        <div className="recommendation-diff-modal__fund-info">
                          <span className="recommendation-diff-modal__fund-name">
                            {row.replacedFundName}
                          </span>
                          <span className="recommendation-diff-modal__fund-sub">
                            {row.replacedIsin ? `ISIN: ${row.replacedIsin}` : ''}
                          </span>
                        </div>
                      ) : (
                        <span className="recommendation-diff-modal__tag
                          recommendation-diff-modal__tag--fresh"
                        >
                          Fresh Allocation
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {row.replacedCurrentValue ? (
                        <span className="recommendation-diff-modal__amount
                          recommendation-diff-modal__amount--sell"
                        >
                          {`₹${row.replacedCurrentValue.toLocaleString('en-IN')}`}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td className="recommendation-diff-modal__arrow-cell">
                      <ArrowRight size={16} />
                    </td>
                    <td>
                      <div className="recommendation-diff-modal__fund-info">
                        <span className="recommendation-diff-modal__fund-name">
                          {row.proposedFundName}
                        </span>
                        <span className="recommendation-diff-modal__fund-sub">
                          {row.proposedIsin ? `ISIN: ${row.proposedIsin}` : ''}
                        </span>
                      </div>
                    </td>
                    <td>
                      {row.proposedCategory ? (
                        <span className="recommendation-diff-modal__tag
                          recommendation-diff-modal__tag--buy"
                        >
                          {row.proposedCategory}
                        </span>
                      ) : (
                        <span>—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="recommendation-diff-modal__amount
                        recommendation-diff-modal__amount--buy"
                      >
                        {`₹${row.proposedAmount.toLocaleString('en-IN')}`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Relationship Manager Review & Refinement Loop */}
          <div className="recommendation-diff-modal__review-section">
            <h3 className="recommendation-diff-modal__review-title">
              Relationship Manager Review & AI Re-Run Loop
            </h3>
            <p className="recommendation-diff-modal__review-desc">
              Have client feedback or specific allocation adjustments?
              Enter your review notes below and trigger the backend AI agent to re-evaluate
              fund selection and adjust the staged proposal.
            </p>

            <textarea
              className="recommendation-diff-modal__review-textarea"
              placeholder="e.g. Client requested lower equity risk; reduce tech funds by 15% and reallocate to conservative debt funds..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              disabled={isRefining}
            />

            <div className="recommendation-diff-modal__review-actions">
              <MainButton
                label="Close"
                variant="secondary"
                size="md"
                onClick={onClose}
              />

              <MainButton
                label={isRefining ? 'Re-running Agent Loop...' : 'Refine with AI Agent'}
                variant="primary"
                size="md"
                icon={isRefining ? <Sparkles size={16} /> : <Bot size={16} />}
                iconPosition="left"
                onClick={handleRefineWithAi}
                disabled={!feedbackText.trim() || isRefining}
                isLoading={isRefining}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
