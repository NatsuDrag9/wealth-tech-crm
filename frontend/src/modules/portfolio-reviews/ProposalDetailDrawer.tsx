import {
  useState,
  useEffect,
  type ReactElement,
} from 'react';
import {
  FileDown,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Drawer } from '@/modules/user-manager/Drawer/Drawer';
import { MainButton } from '@/components/buttons';
import {
  useGetRecommendationByIdQuery,
  useTriggerPdfGenerationMutation,
} from '@/services/api/portfolioApi';
import './ProposalDetailDrawer.scss';

interface ProposalDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  proposalId: string | number | null;
}

export function ProposalDetailDrawer({
  isOpen,
  onClose,
  proposalId,
}: ProposalDetailDrawerProps): ReactElement {
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: proposal, isLoading } = useGetRecommendationByIdQuery(
    proposalId || '',
    {
      skip: !proposalId || !isOpen,
      pollingInterval: isGenerating ? 2500 : 0,
    },
  );

  const [triggerPdfGeneration, { isLoading: isTriggering }] = useTriggerPdfGenerationMutation();

  useEffect(() => {
    if (proposal?.status === 'PDF_GENERATED' || proposal?.status === 'PDF_FAILED') {
      setIsGenerating(false);
    }
  }, [proposal?.status]);

  async function handleGeneratePdf() {
    if (!proposalId) return;
    try {
      setIsGenerating(true);
      await triggerPdfGeneration(proposalId).unwrap();
    } catch {
      setIsGenerating(false);
    }
  }

  function handleDownload() {
    if (!proposal?.generatedDocumentUrl) return;
    const baseUrl = import.meta.env.VITE_BASE_URL || '/api/v1';
    const cleanPath = proposal.generatedDocumentUrl.replace(/^\//, '');
    const url = proposal.generatedDocumentUrl.startsWith('http')
      ? proposal.generatedDocumentUrl
      : `${baseUrl}/${cleanPath}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  const isPdfReady = proposal?.status === 'PDF_GENERATED';
  const totalAmount = (proposal?.funds || []).reduce(
    (sum, item) => sum + (item.amount || 0),
    0,
  );

  function renderActionButton(): ReactElement {
    if (isPdfReady) {
      return (
        <MainButton
          label="Download Recommendation PDF"
          variant="primary"
          size="md"
          icon={<FileDown size={16} />}
          iconPosition="left"
          onClick={handleDownload}
        />
      );
    }

    if (isGenerating || isTriggering) {
      return (
        <MainButton
          label="Generating Document..."
          variant="primary"
          size="md"
          icon={<Loader2 size={16} className="crm-spin" />}
          iconPosition="left"
          disabled
        />
      );
    }

    return (
      <MainButton
        label="Generate Proposal PDF"
        variant="primary"
        size="md"
        icon={<Sparkles size={16} />}
        iconPosition="left"
        onClick={handleGeneratePdf}
      />
    );
  }

  const dateStr = proposal?.createdAt
    ? new Date(proposal.createdAt).toLocaleDateString('en-IN')
    : '—';
  const flowStr = proposal?.flowType === 'REPLACE_FUNDS' ? 'Replace Funds' : 'New Portfolio';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Investment Proposal Summary"
      width="wide"
    >
      <div className="proposal-detail-drawer">
        {isLoading || !proposal ? (
          <p>Loading recommendation details...</p>
        ) : (
          <>
            {/* Header Metadata Card */}
            <div className="proposal-detail-drawer__header-card">
              <div className="proposal-detail-drawer__meta-group">
                <span className="proposal-detail-drawer__meta-title">
                  {`Proposal #${proposal.id.toString().slice(-8).toUpperCase()}`}
                </span>
                <span className="proposal-detail-drawer__meta-subtext">
                  {`Flow: ${flowStr} • Created on ${dateStr}`}
                </span>
              </div>

              <span
                className={`proposal-detail-drawer__pdf-status-pill ${
                  isPdfReady
                    ? 'proposal-detail-drawer__pdf-status-pill--ready'
                    : 'proposal-detail-drawer__pdf-status-pill--pending'
                }`}
              >
                {isPdfReady ? (
                  <>
                    <CheckCircle2 size={12} />
                    PDF Available
                  </>
                ) : (
                  'Draft Proposal'
                )}
              </span>
            </div>

            {/* Allocated Funds List */}
            <section className="proposal-detail-drawer__funds-section">
              <h3 className="proposal-detail-drawer__section-title">
                {`Proposed Fund Allocations (${proposal.funds.length})`}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {proposal.funds.map((item) => (
                  <div key={item.id} className="proposal-detail-drawer__fund-item">
                    <div className="proposal-detail-drawer__fund-info">
                      <span className="proposal-detail-drawer__fund-name">
                        {item.eligibleFund?.fundName || 'Mutual Fund Scheme'}
                      </span>
                      <span className="proposal-detail-drawer__fund-sub">
                        {`ISIN: ${item.eligibleFund?.isin || 'N/A'} • ${item.eligibleFund?.fundSubCategory || 'Equity'}`}
                      </span>
                    </div>

                    <span className="proposal-detail-drawer__fund-amount">
                      {`₹${item.amount.toLocaleString('en-IN')}`}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Total Allocation Banner */}
            <div className="proposal-detail-drawer__total-banner">
              <span className="proposal-detail-drawer__total-label">
                Total Recommended Capital:
              </span>
              <span className="proposal-detail-drawer__total-value">
                {`₹${totalAmount.toLocaleString('en-IN')}`}
              </span>
            </div>

            {/* PDF Generation Box */}
            <section className="proposal-detail-drawer__pdf-box">
              <h3 className="proposal-detail-drawer__section-title">
                Official Recommendation Document
              </h3>
              <p className="proposal-detail-drawer__pdf-desc">
                Generate a formal, regulatory-compliant investment recommendation proposal PDF
                with branded suitability analysis, allocations, and advisor certifications.
              </p>

              <div className="proposal-detail-drawer__pdf-actions">
                {renderActionButton()}
              </div>
            </section>
          </>
        )}
      </div>
    </Drawer>
  );
}
