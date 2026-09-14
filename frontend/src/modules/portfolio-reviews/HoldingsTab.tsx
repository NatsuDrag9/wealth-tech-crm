import { useMemo, type ReactElement } from 'react';
import { Briefcase, Sparkles } from 'lucide-react';
import { StandardTable } from '@/components/tables';
import { MainButton } from '@/components/buttons';
import { useCreateSampleReviewMutation } from '@/services/api/portfolioApi';
import type { PortfolioReview, PortfolioEntry } from '@/definitions/portfolioTypes';
import { createHoldingsColumns } from './holdingsColumns';
import './HoldingsTab.scss';

interface HoldingsTabProps {
  review: PortfolioReview | null | undefined;
  isLoading: boolean;
  clientId: string;
  onSampleCreated: () => void;
}

export function HoldingsTab({
  review,
  isLoading,
  clientId,
  onSampleCreated,
}: HoldingsTabProps): ReactElement {
  const [createSampleReview, { isLoading: isCreatingSample }] = useCreateSampleReviewMutation();
  const columns = useMemo(() => createHoldingsColumns(), []);

  async function handleCreateSample() {
    if (!clientId) return;
    try {
      await createSampleReview(clientId).unwrap();
      onSampleCreated();
    } catch {
      // Error handled by RTK Query
    }
  }

  const entries = useMemo(() => review?.entries ?? [], [review]);
  const hasEntries = entries.length > 0;

  if (isLoading) {
    return (
      <div className="holdings-tab">
        <div className="holdings-tab__empty-card">
          <p className="holdings-tab__empty-desc">Loading portfolio holdings...</p>
        </div>
      </div>
    );
  }

  if (!hasEntries) {
    return (
      <div className="holdings-tab">
        <div className="holdings-tab__empty-card">
          <div className="holdings-tab__empty-icon">
            <Briefcase size={28} />
          </div>
          <h2 className="holdings-tab__empty-title">
            No Portfolio Holdings on Record
          </h2>
          <p className="holdings-tab__empty-desc">
            This client does not have imported CAS holdings or an existing investment portfolio.
            You can ingest electronic statement records or generate a sample eCAS portfolio session.
          </p>

          <MainButton
            label="Generate Sample eCAS Portfolio"
            variant="primary"
            size="md"
            icon={<Sparkles size={16} />}
            iconPosition="left"
            onClick={handleCreateSample}
            isLoading={isCreatingSample}
          />
        </div>
      </div>
    );
  }

  const totalInvested = review?.totalInvested ?? 0;
  const currentValue = review?.totalCurrentValue ?? 0;
  const totalGain = review?.totalGain ?? 0;
  const gainPct = review?.gainPercentage ?? 0;
  const cagr = review?.cagr ?? 0;
  const isGainPositive = totalGain >= 0;

  return (
    <div className="holdings-tab">
      {/* Top Metrics Stat Cards */}
      <div className="holdings-tab__metrics-grid">
        <div className="holdings-tab__metric-card">
          <span className="holdings-tab__metric-label">Total Invested</span>
          <span className="holdings-tab__metric-value">
            {`₹${totalInvested.toLocaleString('en-IN')}`}
          </span>
          <span className="holdings-tab__metric-subtext">Original capital cost</span>
        </div>

        <div className="holdings-tab__metric-card">
          <span className="holdings-tab__metric-label">Current Valuation</span>
          <span className="holdings-tab__metric-value holdings-tab__metric-value--primary">
            {`₹${currentValue.toLocaleString('en-IN')}`}
          </span>
          <span className="holdings-tab__metric-subtext">Latest market value</span>
        </div>

        <div className="holdings-tab__metric-card">
          <span className="holdings-tab__metric-label">Total Return</span>
          <span
            className={`holdings-tab__metric-value ${
              isGainPositive
                ? 'holdings-tab__metric-value--positive'
                : 'holdings-tab__metric-value--negative'
            }`}
          >
            {`${isGainPositive ? '+' : ''}₹${totalGain.toLocaleString('en-IN')}`}
          </span>
          <span className="holdings-tab__metric-subtext">
            {`${isGainPositive ? '+' : ''}${gainPct.toFixed(2)}% Absolute Return`}
          </span>
        </div>

        <div className="holdings-tab__metric-card">
          <span className="holdings-tab__metric-label">Portfolio CAGR</span>
          <span className="holdings-tab__metric-value holdings-tab__metric-value--positive">
            {cagr > 0 ? `+${cagr.toFixed(1)}%` : `${cagr.toFixed(1)}%`}
          </span>
          <span className="holdings-tab__metric-subtext">Annualized compound growth</span>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="holdings-tab__table-wrapper">
        <StandardTable<PortfolioEntry>
          columns={columns}
          data={entries}
          rowKey="id"
          isLoading={isLoading}
          emptyMessage="No portfolio holdings found."
        />
      </div>
    </div>
  );
}
