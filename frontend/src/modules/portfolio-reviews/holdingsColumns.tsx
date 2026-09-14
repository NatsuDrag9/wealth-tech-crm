import type { ReactNode } from 'react';
import type { ColumnDef } from '@/components/tables/StandardTable/types';
import type { PortfolioEntry } from '@/definitions/portfolioTypes';

export function createHoldingsColumns(): ColumnDef<PortfolioEntry>[] {
  return [
    {
      key: 'fundName',
      header: 'Fund Name & ISIN',
      width: '24%',
      render: (entry: PortfolioEntry): ReactNode => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <strong style={{ color: '#0f172a', fontWeight: 600 }}>{entry.fundName}</strong>
          <span style={{ fontSize: '1.2rem', color: '#64748b' }}>
            {`ISIN: ${entry.isin}`}
          </span>
        </div>
      ),
    },
    {
      key: 'units',
      header: 'Units',
      width: '8%',
      render: (entry: PortfolioEntry): ReactNode => (
        <span>{entry.units.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
      ),
    },
    {
      key: 'purchaseNav',
      header: 'Purchase NAV',
      width: '10%',
      render: (entry: PortfolioEntry): ReactNode => (
        <span>{`₹${entry.purchaseNav.toFixed(2)}`}</span>
      ),
    },
    {
      key: 'currentNav',
      header: 'Current NAV',
      width: '10%',
      render: (entry: PortfolioEntry): ReactNode => (
        <strong style={{ color: '#0f172a' }}>{`₹${entry.currentNav.toFixed(2)}`}</strong>
      ),
    },
    {
      key: 'investedAmount',
      header: 'Invested Amount',
      width: '12%',
      render: (entry: PortfolioEntry): ReactNode => (
        <span>{`₹${entry.investedAmount.toLocaleString('en-IN')}`}</span>
      ),
    },
    {
      key: 'currentValue',
      header: 'Current Value',
      width: '12%',
      render: (entry: PortfolioEntry): ReactNode => (
        <strong style={{ color: '#1e3a8a' }}>
          {`₹${entry.currentValue.toLocaleString('en-IN')}`}
        </strong>
      ),
    },
    {
      key: 'gain',
      header: 'Total Return',
      width: '12%',
      render: (entry: PortfolioEntry): ReactNode => {
        const isPositive = entry.gain >= 0;
        const color = isPositive ? '#16a34a' : '#dc2626';
        const prefix = isPositive ? '+' : '';
        return (
          <div style={{ color, fontWeight: 600 }}>
            <span>
              {`${prefix}₹${entry.gain.toLocaleString('en-IN')}`}
            </span>
            <span style={{ fontSize: '1.2rem', marginLeft: '0.4rem' }}>
              {`(${prefix}${entry.absReturnPct.toFixed(2)}%)`}
            </span>
          </div>
        );
      },
    },
    {
      key: 'cagrPct',
      header: 'CAGR',
      width: '6%',
      render: (entry: PortfolioEntry): ReactNode => (
        <span style={{ fontWeight: 600 }}>
          {entry.cagrPct > 0 ? `+${entry.cagrPct.toFixed(1)}%` : `${entry.cagrPct.toFixed(1)}%`}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      width: '6%',
      render: (entry: PortfolioEntry): ReactNode => {
        const isSell = entry.action === 'SELL';
        const bg = isSell ? '#fffbeb' : '#f0fdf4';
        const color = isSell ? '#d97706' : '#16a34a';
        const border = isSell ? '1px solid #fde68a' : '1px solid #bbf7d0';

        return (
          <span
            style={{
              display: 'inline-flex',
              padding: '0.2rem 0.8rem',
              borderRadius: '9999px',
              fontSize: '1.2rem',
              fontWeight: 700,
              backgroundColor: bg,
              color,
              border,
            }}
          >
            {entry.action}
          </span>
        );
      },
    },
  ];
}
