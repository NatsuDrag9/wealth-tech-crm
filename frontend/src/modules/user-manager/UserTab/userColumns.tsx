import { Edit } from 'lucide-react';
import type { ColumnDef } from '@/components/tables/StandardTable/types';
import type { UserRecord } from '@/definitions/userManagerTypes';
import { MainButton } from '@/components/buttons';

function formatUserName(user: UserRecord): string {
  if (user.fullName) return user.fullName;
  if (user.full_name) return user.full_name;
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  return '—';
}

function formatDepartment(user: UserRecord): string {
  if (!user.group) return '—';
  if (typeof user.group === 'object') {
    if ('name' in user.group && user.group.name) return user.group.name;
    if ('display_name' in user.group && user.group.display_name) return user.group.display_name;
  }
  return '—';
}

function formatRole(user: UserRecord): string {
  if (!user.role) return '—';
  if (typeof user.role === 'object') {
    if ('name' in user.role && user.role.name) return user.role.name;
    if ('display_name' in user.role && user.role.display_name) return user.role.display_name;
  }
  return '—';
}

function formatReportsTo(user: UserRecord): string {
  if (!user.reportsTo) return '—';
  if (typeof user.reportsTo === 'object') {
    if ('fullName' in user.reportsTo && user.reportsTo.fullName) {
      return user.reportsTo.fullName;
    }
    if ('display_name' in user.reportsTo && user.reportsTo.display_name) {
      return user.reportsTo.display_name;
    }
    if ('email' in user.reportsTo && user.reportsTo.email) {
      return user.reportsTo.email;
    }
  }
  return '—';
}

export function createUserColumns(
  onEditUser: (user: UserRecord) => void,
): ColumnDef<UserRecord>[] {
  return [
    {
      key: 'name',
      header: 'Name',
      width: '22%',
      sortable: true,
      render: (user: UserRecord) => (
        <span className="user-tab__name-cell">
          {formatUserName(user)}
        </span>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      width: '24%',
      sortable: true,
      render: (user: UserRecord) => (
        <span className="user-tab__email-cell">
          {user.email}
        </span>
      ),
    },
    {
      key: 'group',
      header: 'Department',
      width: '18%',
      render: (user: UserRecord) => (
        <span className="user-tab__badge user-tab__badge--group">
          {formatDepartment(user)}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      width: '16%',
      render: (user: UserRecord) => (
        <span className="user-tab__badge user-tab__badge--role">
          {formatRole(user)}
        </span>
      ),
    },
    {
      key: 'reportsTo',
      header: 'Reports To',
      width: '18%',
      render: (user: UserRecord) => formatReportsTo(user),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '10%',
      render: (user: UserRecord) => (
        <MainButton
          label="Edit"
          variant="secondary"
          size="sm"
          icon={<Edit size={14} />}
          iconPosition="left"
          onClick={() => onEditUser(user)}
          ariaLabel={`Edit user ${formatUserName(user)}`}
        />
      ),
    },
  ];
}
