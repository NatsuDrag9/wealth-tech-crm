import { baseApi } from './baseApi';
import { ENDPOINTS } from '@/constants/endpoints';
import type { DropdownOption } from '@/definitions/commonTypes';
import type { PermissionItem } from '@/definitions/tableTypes';
import type {
  UserRecord,
  UsersPaginatedResponse,
  GetUsersQueryParams,
  CreateUserPayload,
  UpdateUserPayload,
  GroupRecord,
  GroupsPaginatedResponse,
  GetGroupsQueryParams,
  CreateGroupPayload,
  UpdateGroupPayload,
  RoleRecord,
  CreateRolePayload,
  UpdateRolePayload,
  SetRolePermissionsParams,
  GetRolesDropdownParams,
  GetUsersDropdownParams,
} from '@/definitions/userManagerTypes';

export const userManagerApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Users Queries & Mutations
    getUsers: builder.query<UsersPaginatedResponse, GetUsersQueryParams | void>({
      query: (params) => ({
        url: ENDPOINTS.USERS,
        params: {
          search: params?.search || undefined,
          cursor: params?.cursor || undefined,
          page_size: params?.pageSize ?? params?.page_size ?? 50,
        },
      }),
      providesTags: (result) => (result
        ? [
          ...result.results.map(({ id }) => ({ type: 'User' as const, id })),
          { type: 'User', id: 'LIST' },
        ]
        : [{ type: 'User', id: 'LIST' }]),
    }),

    getUserById: builder.query<UserRecord, string | number>({
      query: (id) => ({ url: ENDPOINTS.USER_DETAIL(id) }),
      providesTags: (_result, _error, id) => [{ type: 'User', id }],
    }),

    createUser: builder.mutation<UserRecord, CreateUserPayload>({
      query: (body) => ({
        url: ENDPOINTS.USERS,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
    }),

    updateUser: builder.mutation<UserRecord, { id: string | number } & UpdateUserPayload>({
      query: ({ id, ...patch }) => ({
        url: ENDPOINTS.USER_DETAIL(id),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
      ],
    }),

    // 2. Groups Queries & Mutations
    getGroups: builder.query<GroupsPaginatedResponse, GetGroupsQueryParams | void>({
      query: (params) => ({
        url: ENDPOINTS.GROUPS,
        params: {
          search: params?.search || undefined,
          cursor: params?.cursor || undefined,
          page_size: params?.pageSize ?? params?.page_size ?? 50,
        },
      }),
      providesTags: (result) => (result
        ? [
          ...result.results.map(({ id }) => ({ type: 'Group' as const, id })),
          { type: 'Group', id: 'LIST' },
        ]
        : [{ type: 'Group', id: 'LIST' }]),
    }),

    getGroupById: builder.query<GroupRecord, string | number>({
      query: (id) => ({ url: ENDPOINTS.GROUP_DETAIL(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Group', id }],
    }),

    createGroup: builder.mutation<GroupRecord, CreateGroupPayload>({
      query: (body) => ({
        url: ENDPOINTS.GROUPS,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Group', id: 'LIST' }],
    }),

    updateGroup: builder.mutation<GroupRecord, { id: string | number } & UpdateGroupPayload>({
      query: ({ id, ...patch }) => ({
        url: ENDPOINTS.GROUP_DETAIL(id),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Group', id },
        { type: 'Group', id: 'LIST' },
      ],
    }),

    // 3. Roles Queries & Mutations
    getRoles: builder.query<RoleRecord[], void>({
      query: () => ({ url: ENDPOINTS.ROLES }),
      providesTags: (result) => (result
        ? [
          ...result.map(({ id }) => ({ type: 'Role' as const, id })),
          { type: 'Role', id: 'LIST' },
        ]
        : [{ type: 'Role', id: 'LIST' }]),
    }),

    getRoleById: builder.query<RoleRecord, string | number>({
      query: (id) => ({ url: ENDPOINTS.ROLE_DETAIL(id) }),
      providesTags: (_result, _error, id) => [{ type: 'Role', id }],
    }),

    createRole: builder.mutation<RoleRecord, CreateRolePayload>({
      query: (body) => ({
        url: ENDPOINTS.ROLES,
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Role', id: 'LIST' }],
    }),

    updateRole: builder.mutation<RoleRecord, { id: string | number } & UpdateRolePayload>({
      query: ({ id, ...patch }) => ({
        url: ENDPOINTS.ROLE_DETAIL(id),
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    setRolePermissions: builder.mutation<RoleRecord, SetRolePermissionsParams>({
      query: ({ id, permissionIds }) => ({
        url: ENDPOINTS.ROLE_PERMISSIONS(id),
        method: 'POST',
        body: {
          permissionIds,
          permission_ids: permissionIds,
        },
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Role', id },
        { type: 'Role', id: 'LIST' },
      ],
    }),

    // 4. Permissions Catalogue
    getPermissions: builder.query<PermissionItem[], void>({
      query: () => ({ url: ENDPOINTS.PERMISSIONS }),
      providesTags: ['Permission'],
    }),

    // 5. Cascading Dropdown Endpoints
    getGroupsDropdown: builder.query<DropdownOption[], void>({
      query: () => ({ url: ENDPOINTS.GROUPS_DROPDOWN }),
    }),

    getRolesDropdown: builder.query<DropdownOption[], GetRolesDropdownParams | void>({
      query: (params) => ({
        url: ENDPOINTS.ROLES_DROPDOWN,
        params: params?.groupId ? { groupId: params.groupId, group_id: params.groupId } : undefined,
      }),
    }),

    getUsersDropdown: builder.query<DropdownOption[], GetUsersDropdownParams | void>({
      query: (params) => ({
        url: ENDPOINTS.USERS_DROPDOWN,
        params: {
          groupId: params?.groupId || undefined,
          group_id: params?.groupId || undefined,
          excludeUserId: params?.excludeUserId || undefined,
          exclude_user_id: params?.excludeUserId || undefined,
        },
      }),
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetGroupsQuery,
  useGetGroupByIdQuery,
  useCreateGroupMutation,
  useUpdateGroupMutation,
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useSetRolePermissionsMutation,
  useGetPermissionsQuery,
  useGetGroupsDropdownQuery,
  useGetRolesDropdownQuery,
  useGetUsersDropdownQuery,
} = userManagerApi;
