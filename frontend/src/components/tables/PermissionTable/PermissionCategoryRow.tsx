import type { ReactElement } from 'react';
import type { PermissionCategoryGroup } from './types';
import { areAllSelected, areSomeSelected } from './helperFunctions';
import { TableCheckbox } from './TableCheckbox';

export interface PermissionCategoryRowProps {
  category: PermissionCategoryGroup;
  selectedPermissionIds: (string | number)[];
  readOnly: boolean;
  onCategoryToggle: (category: PermissionCategoryGroup) => void;
}

export function PermissionCategoryRow({
  category,
  selectedPermissionIds,
  readOnly,
  onCategoryToggle,
}: PermissionCategoryRowProps): ReactElement {
  const isCategoryAllSelected = areAllSelected(
    selectedPermissionIds,
    category.allPermissionIds,
  );
  const isCategorySomeSelected = areSomeSelected(
    selectedPermissionIds,
    category.allPermissionIds,
  );

  const rowClasses = [
    'permission-table__category-row',
    readOnly ? 'permission-table__category-row--readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr className={rowClasses}>
      <td colSpan={6}>
        <div className="permission-table__category-header">
          {!readOnly && (
            <TableCheckbox
              checked={isCategoryAllSelected}
              indeterminate={isCategorySomeSelected}
              onChange={() => onCategoryToggle(category)}
              ariaLabel={`Select all permissions for ${category.name}`}
            />
          )}
          <span>{category.name}</span>
          <span className="permission-table__category-badge">
            {`${category.resources.length} resources • ${category.allPermissionIds.length} permissions`}
          </span>
        </div>
      </td>
    </tr>
  );
}
