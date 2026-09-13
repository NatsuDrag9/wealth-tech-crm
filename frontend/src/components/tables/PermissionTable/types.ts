import type { PermissionItem } from '@/definitions/tableTypes';

export type PermissionActionKey = 'read' | 'create' | 'update' | 'delete';

export interface PermissionActionColumn {
  key: PermissionActionKey;
  label: string;
}

export interface PermissionResourceRow {
  contentType: string;
  displayName: string;
  codenamePrefix: string;
  permissionsByAction: Partial<Record<PermissionActionKey, PermissionItem>>;
  availablePermissionIds: (string | number)[];
}

export interface PermissionCategoryGroup {
  key: string;
  name: string;
  description?: string;
  resources: PermissionResourceRow[];
  allPermissionIds: (string | number)[];
}

export interface PermissionCategoryConfig {
  key: string;
  name: string;
  description?: string;
  contentTypes: string[];
}

export interface PermissionTableProps {
  permissions: PermissionItem[];
  selectedPermissionIds: (string | number)[];
  onChange?: (selectedIds: (string | number)[]) => void;
  readOnly?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
  id?: string;
}
