import {
  useState,
  useEffect,
  type ReactElement,
} from 'react';
import { ShieldCheck } from 'lucide-react';
import { Drawer } from '../Drawer/Drawer';
import { MainButton } from '@/components/buttons';
import { PermissionTable } from '@/components/tables';
import {
  useGetPermissionsQuery,
  useSetRolePermissionsMutation,
} from '@/services/api/userManagerApi';
import type { RoleRecord } from '@/definitions/userManagerTypes';
import type { PermissionItem } from '@/definitions/tableTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './RolePermissionsDrawer.scss';

interface RolePermissionsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  role: RoleRecord | null;
  groupName?: string;
}

function extractRolePermissionIds(
  permissions: unknown[] | undefined,
  catalogue: PermissionItem[],
): (string | number)[] {
  if (!permissions || !Array.isArray(permissions)) {
    return [];
  }

  const codenameToIdMap = new Map<string, string | number>();
  catalogue.forEach((item) => {
    codenameToIdMap.set(item.codename, item.id);
  });

  return permissions
    .map((p) => {
      if (typeof p === 'number' || typeof p === 'string') {
        if (codenameToIdMap.has(p as string)) {
          return codenameToIdMap.get(p as string);
        }
        return p;
      }
      if (typeof p === 'object' && p !== null) {
        if ('id' in p && (typeof p.id === 'string' || typeof p.id === 'number')) {
          return p.id;
        }
        if ('codename' in p && typeof p.codename === 'string' && codenameToIdMap.has(p.codename)) {
          return codenameToIdMap.get(p.codename);
        }
      }
      return undefined;
    })
    .filter((id): id is string | number => id !== undefined);
}

export function RolePermissionsDrawer({
  isOpen,
  onClose,
  role,
  groupName = 'Department',
}: RolePermissionsDrawerProps): ReactElement | null {
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const { data: catalogue = [], isLoading: isCatalogueLoading } = useGetPermissionsQuery();
  const [setRolePermissions, { isLoading: isSaving }] = useSetRolePermissionsMutation();

  useEffect(() => {
    if (!isOpen || !role) {
      setSelectedIds([]);
      return;
    }

    const rawPermissions = role.permissions as unknown[] | undefined;
    const initialIds = extractRolePermissionIds(rawPermissions, catalogue);
    setSelectedIds(initialIds);
  }, [isOpen, role, catalogue]);

  async function handleSavePermissions() {
    if (!role) return;

    try {
      await setRolePermissions({
        id: role.id,
        permissionIds: selectedIds,
      }).unwrap();
      showSuccessToast('Role permissions updated successfully');
      onClose();
    } catch {
      showErrorToast('Failed to update role permissions. Please try again.');
    }
  }

  const roleName = role ? role.name : '';
  const drawerTitle = `Configure Permissions: ${roleName}`;
  const drawerSubtitle = `Grant and revoke functional access rights for ${roleName} (${groupName})`;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={drawerTitle}
      subtitle={drawerSubtitle}
      width="wide"
      id="role-permissions-drawer"
      footer={(
        <div className="role-permissions-drawer__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isSaving}
          />
          <MainButton
            label="Save Permissions"
            variant="primary"
            size="md"
            icon={<ShieldCheck size={16} />}
            iconPosition="left"
            onClick={handleSavePermissions}
            isLoading={isSaving}
            disabled={isCatalogueLoading}
          />
        </div>
      )}
    >
      <div className="role-permissions-drawer">
        <div className="role-permissions-drawer__banner">
          <span>
            Assigned to Department:
            {' '}
            <strong>{groupName}</strong>
          </span>
          <span className="role-permissions-drawer__badge">
            {selectedIds.length}
            {' '}
            Permissions Active
          </span>
        </div>

        <div className="role-permissions-drawer__matrix-container">
          <PermissionTable
            permissions={catalogue}
            selectedPermissionIds={selectedIds}
            onChange={setSelectedIds}
            isLoading={isCatalogueLoading}
            emptyMessage="No permissions catalogue available."
          />
        </div>
      </div>
    </Drawer>
  );
}
