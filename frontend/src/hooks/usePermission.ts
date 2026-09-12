import { useCallback } from 'react';
import { useAppSelector } from '@/store';
import { PermissionCode } from '@/constants/authConstants';

export interface UsePermissionReturn {
  hasPermission: (permission: PermissionCode) => boolean;
  hasAnyPermission: (permissions: PermissionCode[]) => boolean;
  hasAllPermissions: (permissions: PermissionCode[]) => boolean;
}

export function usePermission(): UsePermissionReturn {
  const userPermissions = useAppSelector((state) => state.auth.permissions);

  const hasPermission = useCallback(
    (permission: PermissionCode): boolean => {
      return userPermissions.includes(permission);
    },
    [userPermissions]
  );

  const hasAnyPermission = useCallback(
    (permissions: PermissionCode[]): boolean => {
      return permissions.some((perm) => userPermissions.includes(perm));
    },
    [userPermissions]
  );

  const hasAllPermissions = useCallback(
    (permissions: PermissionCode[]): boolean => {
      return permissions.every((perm) => userPermissions.includes(perm));
    },
    [userPermissions]
  );

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
