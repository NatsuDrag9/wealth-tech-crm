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
}: PermissionGateProps): React.ReactElement | null {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = usePermission();

  let isAllowed = false;
  if (Array.isArray(permission)) {
    isAllowed = strategy === 'ANY'
      ? hasAnyPermission(permission)
      : hasAllPermissions(permission);
  } else {
    isAllowed = hasPermission(permission);
  }

  if (!isAllowed) {
    return fallback as React.ReactElement | null;
  }

  return children as React.ReactElement;
}
