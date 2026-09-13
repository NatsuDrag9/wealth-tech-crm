import type { ReactElement, ReactNode } from 'react';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import type { SortDirection } from './types';

export interface TableSortButtonProps {
  header: ReactNode;
  isSorted: boolean;
  sortDirection: SortDirection | null;
  onSort: () => void;
}

function renderSortIcon(isSorted: boolean, sortDirection: SortDirection | null): ReactElement {
  if (!isSorted) {
    return <ArrowUpDown size={14} />;
  }
  if (sortDirection === 'asc') {
    return <ArrowUp size={14} />;
  }
  return <ArrowDown size={14} />;
}

export function TableSortButton({
  header,
  isSorted,
  sortDirection,
  onSort,
}: TableSortButtonProps): ReactElement {
  const activeClass = isSorted ? 'standard-table__sort-btn--active' : '';
  const iconActiveClass = isSorted ? 'standard-table__sort-icon--active' : '';

  return (
    <button
      type="button"
      onClick={onSort}
      className={`standard-table__sort-btn ${activeClass}`.trim()}
    >
      <span>{header}</span>
      <span
        className={`standard-table__sort-icon ${iconActiveClass}`.trim()}
        aria-hidden="true"
      >
        {renderSortIcon(isSorted, sortDirection)}
      </span>
    </button>
  );
}
