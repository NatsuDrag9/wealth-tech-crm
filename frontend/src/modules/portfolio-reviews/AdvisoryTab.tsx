import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import { FilePlus, Compass } from 'lucide-react';
import { StandardTable } from '@/components/tables';
import { MainButton } from '@/components/buttons';
import { useGetRecommendationsByClientQuery } from '@/services/api/portfolioApi';
import type {
  PortfolioRecommendation,
  PortfolioReview,
} from '@/definitions/portfolioTypes';
import { createProposalColumns } from './proposalColumns';
import { ProposalDrawer } from './ProposalDrawer';
import { ProposalDetailDrawer } from './ProposalDetailDrawer';
import './AdvisoryTab.scss';

interface AdvisoryTabProps {
  clientId: string;
  latestReview?: PortfolioReview | null;
}

export function AdvisoryTab({
  clientId,
  latestReview,
}: AdvisoryTabProps): ReactElement {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<PortfolioRecommendation | null>(null);

  const {
    data: proposals = [],
    isLoading,
    refetch,
  } = useGetRecommendationsByClientQuery(clientId, {
    skip: !clientId,
  });

  const columns = useMemo(
    () => createProposalColumns((proposal) => setSelectedProposal(proposal)),
    [],
  );

  const hasProposals = proposals.length > 0;

  return (
    <div className="advisory-tab">
      {/* Action Toolbar */}
      <div className="advisory-tab__toolbar">
        <div className="advisory-tab__heading">
          <h2 className="advisory-tab__title">Investment Recommendation Proposals</h2>
          <p className="advisory-tab__subtitle">
            Strategic fund allocations, replacement models, and branded SEBI proposals.
          </p>
        </div>

        <MainButton
          label="New Recommendation"
          variant="primary"
          size="md"
          icon={<FilePlus size={16} />}
          iconPosition="left"
          onClick={() => setIsCreateOpen(true)}
        />
      </div>

      {/* Proposals List or Empty State */}
      {!hasProposals && !isLoading ? (
        <div className="advisory-tab__empty-card">
          <div className="advisory-tab__empty-icon">
            <Compass size={28} />
          </div>
          <h3 className="advisory-tab__empty-title">
            No Recommendations Generated Yet
          </h3>
          <p className="advisory-tab__empty-desc">
            No forward-looking investment proposals have been constructed for this client yet.
            Launch the proposal builder to replace underperforming holdings or allocate
            fresh capital.
          </p>

          <MainButton
            label="Create Recommendation Proposal"
            variant="primary"
            size="md"
            icon={<FilePlus size={16} />}
            iconPosition="left"
            onClick={() => setIsCreateOpen(true)}
          />
        </div>
      ) : (
        <div className="advisory-tab__table-wrapper">
          <StandardTable<PortfolioRecommendation>
            columns={columns}
            data={proposals}
            rowKey="id"
            isLoading={isLoading}
            emptyMessage="No recommendation proposals found."
          />
        </div>
      )}

      {/* Slide-over Drawers */}
      <ProposalDrawer
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        clientId={clientId}
        latestReview={latestReview}
        onSuccess={() => refetch()}
      />

      <ProposalDetailDrawer
        isOpen={Boolean(selectedProposal)}
        onClose={() => setSelectedProposal(null)}
        proposalId={selectedProposal?.id ?? null}
      />
    </div>
  );
}
