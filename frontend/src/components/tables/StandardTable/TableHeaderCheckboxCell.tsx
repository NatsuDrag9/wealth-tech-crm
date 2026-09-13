import { useRef, useEffect, type ReactElement } from 'react';

export interface TableHeaderCheckboxCellProps {
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  onSelectAll: () => void;
}

export function TableHeaderCheckboxCell({
  isAllSelected,
  isPartiallySelected,
  onSelectAll,
}: TableHeaderCheckboxCellProps): ReactElement {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  return (
    <th scope="col" aria-label="Select all rows" className="standard-table__checkbox-cell">
      <input
        ref={checkboxRef}
        type="checkbox"
        checked={isAllSelected}
        onChange={onSelectAll}
        aria-label="Select all rows"
      />
    </th>
  );
}
