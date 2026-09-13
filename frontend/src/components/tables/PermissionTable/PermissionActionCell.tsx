import type { ReactElement } from 'react';
import { Check } from 'lucide-react';
import type { PermissionItem } from '@/definitions/tableTypes';
import type { PermissionActionKey } from './types';
import { TableCheckbox } from './TableCheckbox';

export interface PermissionActionCellProps {
  perm?: PermissionItem;
  actionKey: PermissionActionKey;
  isSelected: boolean;
  readOnly: boolean;
  onToggle: (permId: string | number) => void;
}

export function PermissionActionCell({
  perm,
  actionKey,
  isSelected,
  readOnly,
  onToggle,
}: PermissionActionCellProps): ReactElement {
  if (!perm) {
    return (
      <td key={actionKey} className="permission-table__checkbox-cell">
        <span className="permission-table__dash">-</span>
      </td>
    );
  }

  if (readOnly) {
    return (
      <td key={actionKey} className="permission-table__checkbox-cell">
        {isSelected ? (
          <Check size={16} className="permission-table__check-icon" />
        ) : (
          <span className="permission-table__dash">-</span>
        )}
      </td>
    );
  }

  return (
    <td key={actionKey} className="permission-table__checkbox-cell">
      <TableCheckbox
        checked={isSelected}
        onChange={() => onToggle(perm.id)}
        ariaLabel={`Permission ${perm.name}`}
      />
    </td>
  );
}
