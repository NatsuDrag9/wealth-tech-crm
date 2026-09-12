import React from 'react';
import { usePermission } from '@/hooks/usePermission';
import { PermissionCode } from '@/constants/authConstants';

export interface PermissionGateProps {
  permission: PermissionCode | PermissionCode[];
  strategy?: 'ALL' | 'ANY';
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function PermissionGate({
  permission,
  strategy = 'ALL',
  fallback = null,
  children,
}: PermissionGateProps): React.ReactElement {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermission();

  const isAllowed = Array.isArray(permission)
    ? strategy === 'ANY'
      ? hasAnyPermission(permission)
      : hasAllPermissions(permission)
    : hasPermission(permission);

  if (!isAllowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
