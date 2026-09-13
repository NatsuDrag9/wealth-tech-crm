import type { PermissionItem } from '@/definitions/tableTypes';
import type {
  PermissionActionColumn,
  PermissionActionKey,
  PermissionCategoryConfig,
  PermissionCategoryGroup,
  PermissionResourceRow,
} from './types';
import { RESOURCE_METADATA } from './constants';

export function parsePermissionCodename(codename: string): {
  resource: string;
  action: PermissionActionKey | null;
} {
  const [resource, actionRaw] = codename.split(':');
  const validActions: PermissionActionKey[] = ['read', 'create', 'update', 'delete'];
  const action = validActions.includes(actionRaw as PermissionActionKey)
    ? (actionRaw as PermissionActionKey)
    : null;

  return { resource, action };
}

export function groupPermissionsByCategory(
  permissions: PermissionItem[],
  categories: PermissionCategoryConfig[],
): PermissionCategoryGroup[] {
  // 1. Group raw permissions by contentType
  const resourceMap = new Map<string, PermissionResourceRow>();

  permissions.forEach((perm) => {
    const codenameResource = parsePermissionCodename(String(perm.codename)).resource;
    const contentType = perm.content_type || codenameResource;
    const { action } = parsePermissionCodename(String(perm.codename));

    if (!resourceMap.has(contentType)) {
      const metadata = RESOURCE_METADATA[contentType] || {
        displayName: contentType.charAt(0).toUpperCase() + contentType.slice(1),
        codenamePrefix: `${contentType}:*`,
      };

      resourceMap.set(contentType, {
        contentType,
        displayName: metadata.displayName,
        codenamePrefix: metadata.codenamePrefix,
        permissionsByAction: {},
        availablePermissionIds: [],
      });
    }

    const row = resourceMap.get(contentType)!;
    if (action) {
      row.permissionsByAction[action] = perm;
      row.availablePermissionIds.push(perm.id);
    }
  });

  // 2. Map into configured categories
  const processedContentTypes = new Set<string>();
  const categoryGroups: PermissionCategoryGroup[] = [];

  categories.forEach((catConfig) => {
    const matchedResources: PermissionResourceRow[] = [];
    const allCatIds: (string | number)[] = [];

    catConfig.contentTypes.forEach((cType) => {
      const row = resourceMap.get(cType);
      if (row) {
        matchedResources.push(row);
        allCatIds.push(...row.availablePermissionIds);
        processedContentTypes.add(cType);
      }
    });

    if (matchedResources.length > 0) {
      categoryGroups.push({
        key: catConfig.key,
        name: catConfig.name,
        description: catConfig.description,
        resources: matchedResources,
        allPermissionIds: allCatIds,
      });
    }
  });

  // 3. Collect any orphan contentTypes not explicitly assigned to a category
  const leftoverResources: PermissionResourceRow[] = [];
  const leftoverIds: (string | number)[] = [];

  resourceMap.forEach((row, cType) => {
    if (!processedContentTypes.has(cType)) {
      leftoverResources.push(row);
      leftoverIds.push(...row.availablePermissionIds);
    }
  });

  if (leftoverResources.length > 0) {
    categoryGroups.push({
      key: 'other-permissions',
      name: 'Other Permissions',
      description: 'Additional system permissions',
      resources: leftoverResources,
      allPermissionIds: leftoverIds,
    });
  }

  return categoryGroups;
}

export function buildActionColumnMap(
  categoryGroups: PermissionCategoryGroup[],
  actions: PermissionActionColumn[],
): Record<PermissionActionKey, (string | number)[]> {
  const map: Record<PermissionActionKey, (string | number)[]> = {
    read: [],
    create: [],
    update: [],
    delete: [],
  };

  categoryGroups.forEach((group) => {
    group.resources.forEach((resource) => {
      actions.forEach(({ key }) => {
        const perm = resource.permissionsByAction[key];
        if (perm) {
          map[key].push(perm.id);
        }
      });
    });
  });

  return map;
}

export function toggleSinglePermission(
  selectedIds: (string | number)[],
  targetId: string | number,
): (string | number)[] {
  const isSelected = selectedIds.includes(targetId);
  return isSelected
    ? selectedIds.filter((id) => id !== targetId)
    : [...selectedIds, targetId];
}

export function toggleBatchPermissions(
  selectedIds: (string | number)[],
  targetIds: (string | number)[],
  shouldSelect: boolean,
): (string | number)[] {
  if (shouldSelect) {
    const set = new Set([...selectedIds, ...targetIds]);
    return Array.from(set);
  }
  const removeSet = new Set(targetIds);
  return selectedIds.filter((id) => !removeSet.has(id));
}

export function areAllSelected(
  selectedIds: (string | number)[],
  targetIds: (string | number)[],
): boolean {
  if (targetIds.length === 0) return false;
  return targetIds.every((id) => selectedIds.includes(id));
}

export function areSomeSelected(
  selectedIds: (string | number)[],
  targetIds: (string | number)[],
): boolean {
  if (targetIds.length === 0) return false;
  const hasSome = targetIds.some((id) => selectedIds.includes(id));
  return hasSome && !areAllSelected(selectedIds, targetIds);
}

export function computeNextRowSelection(
  selectedIds: (string | number)[],
  resourceRow: PermissionResourceRow,
): (string | number)[] {
  const isAllRowSelected = areAllSelected(
    selectedIds,
    resourceRow.availablePermissionIds,
  );
  return toggleBatchPermissions(
    selectedIds,
    resourceRow.availablePermissionIds,
    !isAllRowSelected,
  );
}

export function computeNextCategorySelection(
  selectedIds: (string | number)[],
  categoryGroup: PermissionCategoryGroup,
): (string | number)[] {
  const isAllCatSelected = areAllSelected(
    selectedIds,
    categoryGroup.allPermissionIds,
  );
  return toggleBatchPermissions(
    selectedIds,
    categoryGroup.allPermissionIds,
    !isAllCatSelected,
  );
}

export function computeNextColumnSelection(
  selectedIds: (string | number)[],
  targetIds: (string | number)[],
): (string | number)[] {
  const isAllColSelected = areAllSelected(selectedIds, targetIds);
  return toggleBatchPermissions(selectedIds, targetIds, !isAllColSelected);
}

export function computeNextGlobalSelection(
  selectedIds: (string | number)[],
  allIds: (string | number)[],
): (string | number)[] {
  const isAllGlobalSelected = areAllSelected(selectedIds, allIds);
  return toggleBatchPermissions(selectedIds, allIds, !isAllGlobalSelected);
}
