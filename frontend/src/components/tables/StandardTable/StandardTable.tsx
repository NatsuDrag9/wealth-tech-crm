import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import type { StandardTableProps, SortDirection } from './types';
import { DEFAULT_EMPTY_MESSAGE, SKELETON_ROW_IDS } from './constants';
import {
  getRowIdentifier,
  getNextSortState,
  sortTableData,
} from './helperFunctions';
import { TableHeaderCheckboxCell } from './TableHeaderCheckboxCell';
import { TableSortButton } from './TableSortButton';
import './StandardTable.scss';

export function StandardTable<T>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  onRowClick,
  selectable = false,
  selectedRowKeys = [],
  onSelectionChange,
  className = '',
  id,
}: StandardTableProps<T>): ReactElement {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection | null>(null);

  function getRowId(row: T): string {
    return getRowIdentifier(row, rowKey);
  }

  function handleHeaderSort(key: string, sortable?: boolean) {
    if (!sortable) return;

    const { nextKey, nextDirection } = getNextSortState(
      sortKey,
      key,
      sortDirection,
    );
    setSortKey(nextKey);
    setSortDirection(nextDirection);
  }

  const sortedData = useMemo(() => (
    sortTableData(data, sortKey, sortDirection)
  ), [data, sortKey, sortDirection]);

  const allRowKeys = useMemo(() => (
    data.map((row) => getRowIdentifier(row, rowKey))
  ), [data, rowKey]);

  const isAllSelected = data.length > 0 && allRowKeys.every((key) => selectedRowKeys.includes(key));
  const isPartiallySelected = selectedRowKeys.length > 0 && !isAllSelected;

  function handleSelectAll() {
    if (!onSelectionChange) return;
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(allRowKeys);
    }
  }

  function handleRowSelect(rowId: string) {
    if (!onSelectionChange) return;

    const isCurrentlySelected = selectedRowKeys.includes(rowId);
    const updated = isCurrentlySelected
      ? selectedRowKeys.filter((k) => k !== rowId)
      : [...selectedRowKeys, rowId];

    onSelectionChange(updated);
  }

  const totalColumns = columns.length + (selectable ? 1 : 0);

  function renderTableBody(): ReactElement | ReactElement[] {
    if (isLoading) {
      return SKELETON_ROW_IDS.map((skelId) => (
        <tr key={skelId} className="standard-table__row">
          {selectable ? (
            <td className="standard-table__checkbox-cell">
              <div className="standard-table__skeleton-bar" style={{ width: '1.6rem' }} />
              <span className="standard-table__sr-only">Loading selection</span>
            </td>
          ) : null}
          {columns.map((col) => (
            <td key={col.key}>
              <div
                className="standard-table__skeleton-bar"
                style={{ width: '60%' }}
              />
              <span className="standard-table__sr-only">Loading</span>
            </td>
          ))}
        </tr>
      ));
    }

    if (sortedData.length === 0) {
      return (
        <tr>
          <td colSpan={totalColumns} className="standard-table__empty">
            <span role="status">{emptyMessage}</span>
          </td>
        </tr>
      );
    }

    return sortedData.map((row, rowIndex) => {
      const rowId = getRowId(row);
      const isSelected = selectedRowKeys.includes(rowId);

      const rowClasses = [
        'standard-table__row',
        onRowClick ? 'standard-table__row--clickable' : '',
        isSelected ? 'standard-table__row--selected' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return (
        <tr
          key={rowId}
          onClick={() => onRowClick?.(row)}
          className={rowClasses}
        >
          {selectable ? (
            <td className="standard-table__checkbox-cell">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleRowSelect(rowId)}
                onClick={(e) => e.stopPropagation()}
                aria-label={`Select row ${rowId}`}
              />
            </td>
          ) : null}

          {columns.map((col) => {
            const cellContent = col.render
              ? col.render(row, rowIndex)
              : String((row as Record<string, unknown>)[col.key] ?? '');

            return (
              <td key={col.key}>
                {cellContent}
              </td>
            );
          })}
        </tr>
      );
    });
  }

  return (
    <div id={id} className={`standard-table-wrapper ${className}`.trim()}>
      <table className="standard-table">
        <colgroup>
          {selectable ? <col style={{ width: '4.8rem' }} /> : null}
          {columns.map((col) => (
            <col key={col.key} style={{ width: col.width }} />
          ))}
        </colgroup>

        <thead>
          <tr>
            {selectable ? (
              <TableHeaderCheckboxCell
                isAllSelected={isAllSelected}
                isPartiallySelected={isPartiallySelected}
                onSelectAll={handleSelectAll}
              />
            ) : null}

            {columns.map((col) => {
              const isSorted = sortKey === col.key;

              return (
                <th key={col.key} scope="col">
                  {col.sortable ? (
                    <TableSortButton
                      header={col.header}
                      isSorted={isSorted}
                      sortDirection={sortDirection}
                      onSort={() => handleHeaderSort(col.key, col.sortable)}
                    />
                  ) : (
                    <span>{col.header}</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {renderTableBody()}
        </tbody>
      </table>
    </div>
  );
}
