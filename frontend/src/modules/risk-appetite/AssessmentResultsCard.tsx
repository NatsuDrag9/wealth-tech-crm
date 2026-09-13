import type { ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  RotateCcw,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { MainButton } from '@/components/buttons';
import type {
  AssessmentResultResponse,
  ScoreCategoryCode,
} from '@/definitions/riskAppetiteTypes';
import './AssessmentResultsCard.scss';

interface AssessmentResultsCardProps {
  result: AssessmentResultResponse;
  clientName?: string;
  onRetake: () => void;
  isRetaking?: boolean;
}

const CATEGORY_MODIFIERS: Record<string, string> = {
  very_conservative: 'very-conservative',
  conservative: 'conservative',
  moderate: 'moderate',
  aggressive: 'aggressive',
  very_aggressive: 'very-aggressive',
};

const CATEGORY_PHILOSOPHIES: Record<string, string> = {
  very_conservative:
    'Prioritizes absolute preservation of capital and liquid short-term cash reserves. Suitable primarily for liquid fixed-income instruments and overnight treasury funds.',
  conservative:
    'Seeks steady income generation with minimal portfolio volatility. Suitable for short-to-medium duration debt mutual funds and sovereign bonds with minor defensive equity exposure.',
  moderate:
    'A balanced approach combining capital preservation with reasonable wealth appreciation. Recommended for a standard balanced portfolio with 40–60% equity allocations.',
  aggressive:
    'Targets long-term wealth growth through active high-equity allocations, tolerating significant temporary drawdowns in pursuit of higher alpha.',
  very_aggressive:
    'Maximized growth and equity participation across mid/small caps and tactical opportunities. Geared towards experienced investors comfortable with substantial market volatility.',
};

export function AssessmentResultsCard({
  result,
  clientName,
  onRetake,
  isRetaking = false,
}: AssessmentResultsCardProps): ReactElement {
  const navigate = useNavigate();

  const rawCode = (result.scoreCategory?.code || 'moderate').toLowerCase() as ScoreCategoryCode;
  const modifier = CATEGORY_MODIFIERS[rawCode] || 'moderate';
  const displayName = result.scoreCategory?.displayName || 'Moderate';
  const totalScore = result.totalScore ?? 0;
  const minScore = result.scoreCategory?.minScore ?? 14;
  const maxScore = result.scoreCategory?.maxScore ?? 70;
  const philosophy = CATEGORY_PHILOSOPHIES[rawCode]
    || CATEGORY_PHILOSOPHIES.moderate;

  const completedDate = result.completedAt
    ? new Date(result.completedAt).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : 'Recently';

  function handleProceedToPortfolio() {
    navigate(`/portfolio-reviews?clientId=${result.clientId}`);
  }

  return (
    <div className="assessment-results-card">
      <header className="assessment-results-card__header">
        <div className="assessment-results-card__title-group">
          <h2 className="assessment-results-card__title">
            Certified Risk Suitability Profile
          </h2>
          <p className="assessment-results-card__subtitle">
            {clientName ? `Client: ${clientName} • ` : ''}
            Completed on
            {' '}
            {completedDate}
          </p>
        </div>

        <span className="assessment-results-card__status-pill">
          <CheckCircle2 size={14} />
          SEBI Compliant
        </span>
      </header>

      {/* Primary Overview Grid */}
      <div className="assessment-results-card__overview-grid">
        {/* Score Panel */}
        <div className="assessment-results-card__score-panel">
          <span className="assessment-results-card__score-label">
            Calculated Risk Score
          </span>
          <div className="assessment-results-card__score-value">
            {totalScore}
            <span> / 70</span>
          </div>

          <div
            className={`assessment-results-card__category-badge assessment-results-card__category-badge--${modifier}`}
          >
            <ShieldCheck size={18} />
            {displayName}
          </div>
        </div>

        {/* Details & Rationale Panel */}
        <div className="assessment-results-card__details-panel">
          <div className="assessment-results-card__range-info">
            <span className="assessment-results-card__range-title">
              Classification Score Range
            </span>
            <p className="assessment-results-card__range-text">
              {minScore}
              {' '}
              to
              {' '}
              {maxScore}
              {' '}
              Points (Category:
              {' '}
              {displayName}
              )
            </p>
          </div>

          <div className="assessment-results-card__guidance-box">
            <Info size={18} />
            <div>
              <strong>Advisory Suitability: </strong>
              {philosophy}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Spectrum Meter */}
      <div className="assessment-results-card__meter">
        <div className="assessment-results-card__meter-track">
          <div
            className={`assessment-results-card__meter-segment assessment-results-card__meter-segment--very-conservative ${
              modifier !== 'very-conservative' ? 'assessment-results-card__meter-segment--inactive' : ''
            }`}
          />
          <div
            className={`assessment-results-card__meter-segment assessment-results-card__meter-segment--conservative ${
              modifier !== 'conservative' ? 'assessment-results-card__meter-segment--inactive' : ''
            }`}
          />
          <div
            className={`assessment-results-card__meter-segment assessment-results-card__meter-segment--moderate ${
              modifier !== 'moderate' ? 'assessment-results-card__meter-segment--inactive' : ''
            }`}
          />
          <div
            className={`assessment-results-card__meter-segment assessment-results-card__meter-segment--aggressive ${
              modifier !== 'aggressive' ? 'assessment-results-card__meter-segment--inactive' : ''
            }`}
          />
          <div
            className={`assessment-results-card__meter-segment assessment-results-card__meter-segment--very-aggressive ${
              modifier !== 'very-aggressive' ? 'assessment-results-card__meter-segment--inactive' : ''
            }`}
          />
        </div>
        <div className="assessment-results-card__meter-labels">
          <span>Very Conservative (14-28)</span>
          <span>Moderate (43-56)</span>
          <span>Very Aggressive (64-70)</span>
        </div>
      </div>

      {/* Actions Footer */}
      <div className="assessment-results-card__actions">
        <MainButton
          label="Retake Assessment"
          variant="secondary"
          size="md"
          icon={<RotateCcw size={16} />}
          iconPosition="left"
          onClick={onRetake}
          isLoading={isRetaking}
        />

        <MainButton
          label="Proceed to Portfolio Review"
          variant="primary"
          size="md"
          icon={<Briefcase size={16} />}
          iconPosition="left"
          onClick={handleProceedToPortfolio}
        />
      </div>
    </div>
  );
}
