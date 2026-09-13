import { useMemo, type ReactElement } from 'react';
import type {
  PermissionActionKey,
  PermissionCategoryGroup,
  PermissionResourceRow,
  PermissionTableProps,
} from './types';
import {
  PERMISSION_ACTIONS,
  PERMISSION_CATEGORIES,
  DEFAULT_EMPTY_PERMISSIONS_MESSAGE,
  PERMISSION_SKELETON_CATEGORY_IDS,
  PERMISSION_SKELETON_ROW_IDS,
} from './constants';
import {
  groupPermissionsByCategory,
  buildActionColumnMap,
  toggleSinglePermission,
  computeNextRowSelection,
  computeNextCategorySelection,
  computeNextColumnSelection,
  computeNextGlobalSelection,
  areAllSelected,
  areSomeSelected,
} from './helperFunctions';
import { PermissionCategoryRow } from './PermissionCategoryRow';
import { PermissionTableRow } from './PermissionTableRow';
import { TableCheckbox } from './TableCheckbox';
import './PermissionTable.scss';

export function PermissionTable({
  permissions,
  selectedPermissionIds,
  onChange,
  readOnly = false,
  isLoading = false,
  emptyMessage = DEFAULT_EMPTY_PERMISSIONS_MESSAGE,
  className = '',
  id,
}: PermissionTableProps): ReactElement {
  const categoryGroups = useMemo(
    () => groupPermissionsByCategory(permissions, PERMISSION_CATEGORIES),
    [permissions],
  );

  const allTablePermissionIds = useMemo(
    () => permissions.map((p) => p.id),
    [permissions],
  );

  const actionColumnMap = useMemo(
    () => buildActionColumnMap(categoryGroups, PERMISSION_ACTIONS),
    [categoryGroups],
  );

  function handleCellToggle(permissionId: string | number) {
    if (readOnly || !onChange) return;
    onChange(toggleSinglePermission(selectedPermissionIds, permissionId));
  }

  function handleRowToggle(resourceRow: PermissionResourceRow) {
    if (readOnly || !onChange) return;
    onChange(computeNextRowSelection(selectedPermissionIds, resourceRow));
  }

  function handleCategoryToggle(categoryGroup: PermissionCategoryGroup) {
    if (readOnly || !onChange) return;
    onChange(computeNextCategorySelection(selectedPermissionIds, categoryGroup));
  }

  function handleColumnToggle(actionKey: PermissionActionKey) {
    if (readOnly || !onChange) return;
    onChange(computeNextColumnSelection(selectedPermissionIds, actionColumnMap[actionKey]));
  }

  function handleGlobalToggle() {
    if (readOnly || !onChange) return;
    onChange(computeNextGlobalSelection(selectedPermissionIds, allTablePermissionIds));
  }

  function renderTableBody(): ReactElement | ReactElement[] {
    if (isLoading) {
      return PERMISSION_SKELETON_CATEGORY_IDS.map((catSkelId) => (
        <tbody key={catSkelId}>
          <tr className="permission-table__category-row">
            <td colSpan={6}>
              <div className="permission-table__skeleton-bar" style={{ width: '20rem' }} />
              <span className="permission-table__sr-only">Loading category</span>
            </td>
          </tr>
          {PERMISSION_SKELETON_ROW_IDS.map((rowSkelId) => (
            <tr key={rowSkelId} className="permission-table__row">
              <td className="permission-table__resource-cell">
                <div className="permission-table__skeleton-bar" style={{ width: '12rem', margin: '0' }} />
                <span className="permission-table__sr-only">Loading resource</span>
              </td>
              {PERMISSION_ACTIONS.map(({ key }) => (
                <td key={key} className="permission-table__checkbox-cell">
                  <div className="permission-table__skeleton-bar" style={{ width: '1.6rem' }} />
                  <span className="permission-table__sr-only">Loading action</span>
                </td>
              ))}
              <td className="permission-table__checkbox-cell">
                <div className="permission-table__skeleton-bar" style={{ width: '1.6rem' }} />
                <span className="permission-table__sr-only">Loading action</span>
              </td>
            </tr>
          ))}
        </tbody>
      ));
    }

    if (categoryGroups.length === 0) {
      return (
        <tbody>
          <tr>
            <td colSpan={6} className="permission-table__empty">
              <span role="status">{emptyMessage}</span>
            </td>
          </tr>
        </tbody>
      );
    }

    return categoryGroups.map((group) => (
      <tbody key={group.key}>
        <PermissionCategoryRow
          category={group}
          selectedPermissionIds={selectedPermissionIds}
          readOnly={readOnly}
          onCategoryToggle={handleCategoryToggle}
        />

        {group.resources.map((resource) => (
          <PermissionTableRow
            key={resource.contentType}
            resource={resource}
            selectedPermissionIds={selectedPermissionIds}
            readOnly={readOnly}
            onCellToggle={handleCellToggle}
            onRowToggle={handleRowToggle}
          />
        ))}
      </tbody>
    ));
  }

  const isGlobalAll = areAllSelected(selectedPermissionIds, allTablePermissionIds);
  const isGlobalSome = areSomeSelected(selectedPermissionIds, allTablePermissionIds);

  return (
    <div id={id} className={`permission-table-wrapper ${className}`.trim()}>
      <table className="permission-table">
        <colgroup>
          <col style={{ width: '28rem' }} />
          <col style={{ width: '12rem' }} />
          <col style={{ width: '12rem' }} />
          <col style={{ width: '12rem' }} />
          <col style={{ width: '12rem' }} />
          <col style={{ width: '12rem' }} />
        </colgroup>

        <thead>
          <tr>
            <th scope="col" style={{ textAlign: 'left' }}>
              Resource / Module
            </th>

            {PERMISSION_ACTIONS.map(({ key, label }) => {
              const targetIds = actionColumnMap[key];
              const isColAll = areAllSelected(selectedPermissionIds, targetIds);
              const isColSome = areSomeSelected(selectedPermissionIds, targetIds);

              return (
                <th key={key} scope="col">
                  <div className="permission-table__header-action">
                    {!readOnly && (
                      <TableCheckbox
                        checked={isColAll}
                        indeterminate={isColSome}
                        onChange={() => handleColumnToggle(key)}
                        disabled={targetIds.length === 0}
                        ariaLabel={`Select all ${label} permissions`}
                      />
                    )}
                    <span>{label}</span>
                  </div>
                </th>
              );
            })}

            <th scope="col">
              <div className="permission-table__header-action">
                {!readOnly && (
                  <TableCheckbox
                    checked={isGlobalAll}
                    indeterminate={isGlobalSome}
                    onChange={handleGlobalToggle}
                    disabled={allTablePermissionIds.length === 0}
                    ariaLabel="Select all permissions across all modules"
                  />
                )}
                <span>All Access</span>
              </div>
            </th>
          </tr>
        </thead>

        {renderTableBody()}
      </table>
    </div>
  );
}
