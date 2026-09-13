import type { ReactElement } from 'react';
import { Check } from 'lucide-react';
import type { PermissionResourceRow } from './types';
import { PERMISSION_ACTIONS } from './constants';
import { areAllSelected, areSomeSelected } from './helperFunctions';
import { PermissionActionCell } from './PermissionActionCell';
import { TableCheckbox } from './TableCheckbox';

export interface PermissionTableRowProps {
  resource: PermissionResourceRow;
  selectedPermissionIds: (string | number)[];
  readOnly: boolean;
  onCellToggle: (permId: string | number) => void;
  onRowToggle: (resource: PermissionResourceRow) => void;
}

export function PermissionTableRow({
  resource,
  selectedPermissionIds,
  readOnly,
  onCellToggle,
  onRowToggle,
}: PermissionTableRowProps): ReactElement {
  const isRowAllSelected = areAllSelected(
    selectedPermissionIds,
    resource.availablePermissionIds,
  );
  const isRowSomeSelected = areSomeSelected(
    selectedPermissionIds,
    resource.availablePermissionIds,
  );

  function renderRowAllCell(): ReactElement {
    if (readOnly) {
      return (
        <td className="permission-table__checkbox-cell">
          {isRowAllSelected ? (
            <Check size={16} className="permission-table__check-icon" />
          ) : (
            <span className="permission-table__dash">-</span>
          )}
        </td>
      );
    }

    return (
      <td className="permission-table__checkbox-cell">
        <TableCheckbox
          checked={isRowAllSelected}
          indeterminate={isRowSomeSelected}
          onChange={() => onRowToggle(resource)}
          ariaLabel={`Select all permissions for ${resource.displayName}`}
        />
      </td>
    );
  }

  const rowClasses = [
    'permission-table__row',
    isRowAllSelected ? 'permission-table__row--selected' : '',
    readOnly ? 'permission-table__row--readonly' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <tr key={resource.contentType} className={rowClasses}>
      <td className="permission-table__resource-cell">
        <div className="permission-table__resource-info">
          <span className="permission-table__resource-name">{resource.displayName}</span>
          <span className="permission-table__resource-codename">{resource.codenamePrefix}</span>
        </div>
      </td>

      {PERMISSION_ACTIONS.map(({ key }) => {
        const perm = resource.permissionsByAction[key];
        const isSelected = Boolean(perm && selectedPermissionIds.includes(perm.id));

        return (
          <PermissionActionCell
            key={key}
            perm={perm}
            actionKey={key}
            isSelected={isSelected}
            readOnly={readOnly}
            onToggle={onCellToggle}
          />
        );
      })}

      {renderRowAllCell()}
    </tr>
  );
}
