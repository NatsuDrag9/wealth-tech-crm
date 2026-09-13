import type { SortDirection } from './types';

export function getRowIdentifier<T>(
  row: T,
  rowKey: keyof T | ((row: T) => string),
): string {
  return typeof rowKey === 'function' ? rowKey(row) : String(row[rowKey]);
}

export function getNextSortState(
  currentKey: string | null,
  newKey: string,
  currentDirection: SortDirection | null,
): { nextKey: string | null; nextDirection: SortDirection | null } {
  if (currentKey !== newKey) {
    return { nextKey: newKey, nextDirection: 'asc' };
  }
  if (currentDirection === 'asc') {
    return { nextKey: newKey, nextDirection: 'desc' };
  }
  return { nextKey: null, nextDirection: null };
}

export function sortTableData<T>(
  data: T[],
  sortKey: string | null,
  sortDirection: SortDirection | null,
): T[] {
  if (!sortKey || !sortDirection) {
    return data;
  }

  return [...data].sort((a, b) => {
    const valA = (a as Record<string, unknown>)[sortKey];
    const valB = (b as Record<string, unknown>)[sortKey];

    if (valA === valB) return 0;
    if (valA == null) return 1;
    if (valB == null) return -1;

    let comparison = 0;
    if (typeof valA === 'number' && typeof valB === 'number') {
      comparison = valA - valB;
    } else {
      comparison = String(valA).localeCompare(String(valB));
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });
}
