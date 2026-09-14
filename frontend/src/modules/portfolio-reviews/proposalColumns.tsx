import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import type { ColumnDef } from '@/components/tables/StandardTable/types';
import type { PortfolioRecommendation } from '@/definitions/portfolioTypes';
import { MainButton } from '@/components/buttons';

function getStatusBadgeConfig(status: string) {
  if (status === 'PDF_GENERATED') {
    return {
      bg: '#f0fdf4',
      color: '#16a34a',
      border: '1px solid #bbf7d0',
      label: 'PDF Ready',
    };
  }
  if (status === 'PDF_FAILED') {
    return {
      bg: '#fef2f2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      label: 'PDF Generation Failed',
    };
  }
  return {
    bg: '#f8fafc',
    color: '#475569',
    border: '1px solid #e2e8f0',
    label: 'Proposal Saved',
  };
}

export function createProposalColumns(
  onViewProposal: (proposal: PortfolioRecommendation) => void,
): ColumnDef<PortfolioRecommendation>[] {
  return [
    {
      key: 'id',
      header: 'Proposal Reference',
      width: '18%',
      render: (proposal: PortfolioRecommendation): ReactNode => (
        <strong style={{ color: '#1e3a8a', fontWeight: 600 }}>
          {`#${proposal.id.toString().slice(-8).toUpperCase()}`}
        </strong>
      ),
    },
    {
      key: 'flowType',
      header: 'Strategy Flow',
      width: '15%',
      render: (proposal: PortfolioRecommendation): ReactNode => {
        const isReplace = proposal.flowType === 'REPLACE_FUNDS';
        const bg = isReplace ? '#f0fdfa' : '#eff6ff';
        const color = isReplace ? '#0d9488' : '#1e3a8a';
        const border = isReplace ? '1px solid #99f6e4' : '1px solid #bfdbfe';

        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '0.2rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: bg,
              color,
              border,
            }}
          >
            {isReplace ? 'Replace Funds' : 'New Portfolio'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '15%',
      render: (proposal: PortfolioRecommendation): ReactNode => {
        const config = getStatusBadgeConfig(proposal.status);

        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '0.2rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '1.2rem',
              fontWeight: 600,
              backgroundColor: config.bg,
              color: config.color,
              border: config.border,
            }}
          >
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'funds',
      header: 'Allocated Funds',
      width: '12%',
      render: (proposal: PortfolioRecommendation): ReactNode => (
        <span>{`${proposal.funds?.length ?? 0} Funds`}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Total Proposed Amount',
      width: '16%',
      render: (proposal: PortfolioRecommendation): ReactNode => {
        const total = (proposal.funds || []).reduce(
          (sum, item) => sum + (item.amount || 0),
          0,
        );
        return (
          <strong style={{ color: '#0f172a' }}>
            {`₹${total.toLocaleString('en-IN')}`}
          </strong>
        );
      },
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      width: '12%',
      render: (proposal: PortfolioRecommendation): ReactNode => {
        const dateStr = proposal.createdAt
          ? new Date(proposal.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
          : '—';
        return <span>{dateStr}</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '12%',
      render: (proposal: PortfolioRecommendation): ReactNode => (
        <MainButton
          label="View & PDF"
          variant="secondary"
          size="sm"
          icon={<FileText size={14} />}
          iconPosition="left"
          onClick={() => onViewProposal(proposal)}
        />
      ),
    },
  ];
}
