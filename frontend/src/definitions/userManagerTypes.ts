import type { DropdownOption, CursorPaginatedResponse } from './commonTypes';
import type { PermissionItem } from './tableTypes';

export type UserReportsTo =
  | DropdownOption<string | number>
  | { id: string | number; fullName?: string; email?: string }
  | null;

export interface UserRecord {
  id: string | number;
  email: string;
  fullName?: string;
  full_name?: string;
  firstName?: string;
  lastName?: string;
  group?: DropdownOption<string | number> | { id: string | number; name: string } | null;
  role?: DropdownOption<string | number> | { id: string | number; name: string } | null;
  reportsTo?: UserReportsTo;
  reports_to?: DropdownOption<string | number> | null;
  languages?: string[];
  createdAt?: string;
  created_at?: string;
}

export interface GroupRecord {
  id: string | number;
  name: string;
  description?: string;
  createdAt?: string;
  created_at?: string;
  createdBy?: DropdownOption<string | number> | null;
  created_by?: DropdownOption<string | number> | null;
}

export interface RoleRecord {
  id: string | number;
  name: string;
  description?: string;
  group?: DropdownOption<string | number> | { id: string | number; name: string } | null;
  permissions?: PermissionItem[] | string[];
  createdAt?: string;
  created_at?: string;
}

export interface CreateUserPayload {
  email: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  groupId: string | number;
  roleId: string | number;
  reportsToId?: string | number | null;
  languages?: string[];
}

export interface UpdateUserPayload {
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  groupId?: string | number;
  roleId?: string | number;
  reportsToId?: string | number | null;
  languages?: string[];
}

export interface CreateGroupPayload {
  name: string;
  description?: string;
}

export interface UpdateGroupPayload {
  name?: string;
  description?: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  groupId: string | number;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
}

export interface SetRolePermissionsPayload {
  permissionIds: (string | number)[];
}

export interface SetRolePermissionsParams extends SetRolePermissionsPayload {
  id: string | number;
}

export interface GetUsersQueryParams {
  search?: string;
  cursor?: string | number;
  pageSize?: number;
  page_size?: number;
}

export interface GetGroupsQueryParams {
  search?: string;
  cursor?: string | number;
  pageSize?: number;
  page_size?: number;
}

export interface GetRolesDropdownParams {
  groupId?: string | number;
}

export interface GetUsersDropdownParams {
  groupId?: string | number;
  excludeUserId?: string | number;
}

export type UsersPaginatedResponse = CursorPaginatedResponse<UserRecord>;
export type GroupsPaginatedResponse = CursorPaginatedResponse<GroupRecord>;
