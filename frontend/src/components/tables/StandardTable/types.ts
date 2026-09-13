import type { ReactNode } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface ColumnDef<T> {
  key: string;
  header: string | ReactNode;
  width: string;
  render?: (row: T, index: number) => ReactNode;
  sortable?: boolean;
}

export interface StandardTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: keyof T | ((row: T) => string);
  isLoading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedRowKeys?: string[];
  onSelectionChange?: (selectedKeys: string[]) => void;
  className?: string;
  id?: string;
}
