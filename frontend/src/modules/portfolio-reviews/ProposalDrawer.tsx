import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import {
  RotateCcw,
  PlusCircle,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Drawer } from '@/modules/user-manager/Drawer/Drawer';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import { MainButton } from '@/components/buttons';
import {
  useGetEligibleFundsQuery,
  useCreateRecommendationMutation,
} from '@/services/api/portfolioApi';
import type {
  PortfolioReview,
  RecommendationFlowType,
} from '@/definitions/portfolioTypes';
import type { DropdownType } from '@/types/genericTypes';
import './ProposalDrawer.scss';

interface ProposalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  latestReview?: PortfolioReview | null;
  onSuccess: () => void;
}

interface AllocationRow {
  id: string;
  eligibleFundId: string;
  amount: number;
  replacesEntryId?: string;
}

export function ProposalDrawer({
  isOpen,
  onClose,
  clientId,
  latestReview,
  onSuccess,
}: ProposalDrawerProps): ReactElement {
  const [flowType, setFlowType] = useState<RecommendationFlowType>('REPLACE_FUNDS');
  const [allocations, setAllocations] = useState<AllocationRow[]>([
    { id: '1', eligibleFundId: '', amount: 100000 },
  ]);

  const { data: eligibleFunds = [], isLoading: isLoadingFunds } = useGetEligibleFundsQuery();
  const [createRecommendation, { isLoading: isSubmitting }] = useCreateRecommendationMutation();

  const fundOptions = useMemo<DropdownType[]>(
    () => eligibleFunds.map((f) => ({
      displayName: `${f.fundName} (${f.isin})`,
      value: String(f.id),
    })),
    [eligibleFunds],
  );

  const sellEntries = useMemo(
    () => (latestReview?.entries ?? []).filter((e) => e.action === 'SELL'),
    [latestReview],
  );

  const replacesOptions = useMemo<DropdownType[]>(
    () => [
      { displayName: '— Select Holding to Replace —', value: '' },
      ...sellEntries.map((e) => ({
        displayName: `${e.fundName} (Val: ₹${e.currentValue.toLocaleString('en-IN')})`,
        value: String(e.id),
      })),
    ],
    [sellEntries],
  );

  function handleAddRow() {
    setAllocations((prev) => [
      ...prev,
      { id: String(Date.now()), eligibleFundId: '', amount: 50000 },
    ]);
  }

  function handleRemoveRow(rowId: string) {
    setAllocations((prev) => prev.filter((r) => r.id !== rowId));
  }

  function handleUpdateRow(rowId: string, field: keyof AllocationRow, value: unknown) {
    setAllocations((prev) => prev.map((r) => {
      if (r.id === rowId) {
        return { ...r, [field]: value };
      }
      return r;
    }));
  }

  const totalProposedAmount = useMemo(
    () => allocations.reduce((sum, r) => sum + (Number(r.amount) || 0), 0),
    [allocations],
  );

  const isValid = allocations.length > 0
    && allocations.every((r) => Boolean(r.eligibleFundId) && Number(r.amount) > 0);

  async function handleSubmit() {
    if (!isValid) return;

    const fundsPayload = allocations.map((row, index) => ({
      eligibleFundId: row.eligibleFundId,
      amount: Number(row.amount),
      replacesEntryId: flowType === 'REPLACE_FUNDS' ? (row.replacesEntryId || null) : null,
      displayOrder: index + 1,
    }));

    try {
      await createRecommendation({
        clientId,
        portfolioReviewId: flowType === 'REPLACE_FUNDS' ? (latestReview?.id || null) : null,
        flowType,
        funds: fundsPayload,
      }).unwrap();

      onSuccess();
      onClose();
    } catch {
      // Error handled by RTK Query
    }
  }

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create Investment Recommendation Proposal"
      width="wide"
    >
      <div className="proposal-drawer">
        {/* Strategy Flow Selection */}
        <section className="proposal-drawer__section">
          <h3 className="proposal-drawer__section-title">
            1. Select Advisory Strategy Flow
          </h3>

          <div className="proposal-drawer__strategy-grid">
            <button
              type="button"
              className={`proposal-drawer__strategy-card ${
                flowType === 'REPLACE_FUNDS' ? 'proposal-drawer__strategy-card--selected' : ''
              }`}
              onClick={() => setFlowType('REPLACE_FUNDS')}
            >
              <div className="proposal-drawer__strategy-header">
                <RotateCcw size={16} />
                <span>Replace Funds</span>
              </div>
              <p className="proposal-drawer__strategy-desc">
                Reallocate capital by liquidating underperforming holdings marked SELL.
              </p>
            </button>

            <button
              type="button"
              className={`proposal-drawer__strategy-card ${
                flowType === 'NEW_PORTFOLIO' ? 'proposal-drawer__strategy-card--selected' : ''
              }`}
              onClick={() => setFlowType('NEW_PORTFOLIO')}
            >
              <div className="proposal-drawer__strategy-header">
                <Sparkles size={16} />
                <span>New Portfolio</span>
              </div>
              <p className="proposal-drawer__strategy-desc">
                Allocate fresh investment capital into a newly tailored fund basket.
              </p>
            </button>
          </div>
        </section>

        {/* Allocations Builder */}
        <section className="proposal-drawer__section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 className="proposal-drawer__section-title">
              2. Proposed Fund Allocations
            </h3>
            <MainButton
              label="Add Fund"
              variant="secondary"
              size="sm"
              icon={<PlusCircle size={14} />}
              iconPosition="left"
              onClick={handleAddRow}
            />
          </div>

          <div className="proposal-drawer__allocations-list">
            {allocations.map((row, idx) => (
              <div key={row.id} className="proposal-drawer__allocation-card">
                <div className="proposal-drawer__allocation-header">
                  <span>{`Allocation #${idx + 1}`}</span>
                  {allocations.length > 1 ? (
                    <button
                      type="button"
                      className="proposal-drawer__remove-btn"
                      onClick={() => handleRemoveRow(row.id)}
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  ) : null}
                </div>

                {flowType === 'REPLACE_FUNDS' ? (
                  <div className="proposal-drawer__input-group">
                    <span className="proposal-drawer__input-label">
                      Replaces Underperforming Holding (Optional):
                    </span>
                    <SingleSelectGenericDropdown
                      id={`replace-${row.id}`}
                      options={replacesOptions}
                      value={row.replacesEntryId || ''}
                      onChange={(val) => handleUpdateRow(row.id, 'replacesEntryId', val ? String(val) : '')}
                      placeholder="Select holding to replace..."
                    />
                  </div>
                ) : null}

                <div className="proposal-drawer__inputs-row">
                  <div className="proposal-drawer__input-group">
                    <span className="proposal-drawer__input-label">
                      Target Eligible Fund:
                    </span>
                    <SingleSelectGenericDropdown
                      id={`fund-${row.id}`}
                      options={fundOptions}
                      value={row.eligibleFundId}
                      onChange={(val) => handleUpdateRow(row.id, 'eligibleFundId', val ? String(val) : '')}
                      placeholder={isLoadingFunds ? 'Loading funds...' : 'Select eligible fund...'}
                    />
                  </div>

                  <div className="proposal-drawer__input-group">
                    <span className="proposal-drawer__input-label">
                      Proposed Amount (₹):
                    </span>
                    <input
                      type="number"
                      className="proposal-drawer__text-input"
                      value={row.amount}
                      onChange={(e) => handleUpdateRow(row.id, 'amount', Number(e.target.value))}
                      min={1000}
                      step={5000}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Live Total Summary */}
        <div className="proposal-drawer__summary-banner">
          <span className="proposal-drawer__summary-label">
            Total Proposed Capital Allocation:
          </span>
          <span className="proposal-drawer__summary-value">
            {`₹${totalProposedAmount.toLocaleString('en-IN')}`}
          </span>
        </div>

        {/* Actions Footer */}
        <div className="proposal-drawer__actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
          />

          <MainButton
            label="Create Recommendation Proposal"
            variant="primary"
            size="md"
            icon={<CheckCircle2 size={16} />}
            iconPosition="left"
            onClick={handleSubmit}
            disabled={!isValid}
            isLoading={isSubmitting}
          />
        </div>
      </div>
    </Drawer>
  );
}
