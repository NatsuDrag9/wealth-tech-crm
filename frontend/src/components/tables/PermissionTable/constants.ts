import type { PermissionItem } from '@/definitions/tableTypes';
import type { PermissionActionColumn, PermissionCategoryConfig } from './types';

export const PERMISSION_ACTIONS: PermissionActionColumn[] = [
  { key: 'read', label: 'View' },
  { key: 'create', label: 'Create' },
  { key: 'update', label: 'Edit' },
  { key: 'delete', label: 'Delete' },
];

export const RESOURCE_METADATA: Record<string, { displayName: string; codenamePrefix: string }> = {
  client: { displayName: 'Clients', codenamePrefix: 'client:*' },
  clientprofile: { displayName: 'Client Profiles & KYC', codenamePrefix: 'clientprofile:*' },
  riskappetite: { displayName: 'Risk Appetite Assessments', codenamePrefix: 'riskappetite:*' },
  portfolioreview: { displayName: 'Portfolio Reviews', codenamePrefix: 'portfolioreview:*' },
  portfolioentry: { displayName: 'Portfolio Holdings & Entries', codenamePrefix: 'portfolioentry:*' },
  user: { displayName: 'Users', codenamePrefix: 'user:*' },
  userprofile: { displayName: 'User Profiles', codenamePrefix: 'userprofile:*' },
  crmgroup: { displayName: 'Departments (CRM Groups)', codenamePrefix: 'crmgroup:*' },
  role: { displayName: 'Roles', codenamePrefix: 'role:*' },
  rolepermission: { displayName: 'Role Permissions', codenamePrefix: 'rolepermission:*' },
};

export const PERMISSION_CATEGORIES: PermissionCategoryConfig[] = [
  {
    key: 'client-management',
    name: 'Client Management',
    description: 'Clients, KYC compliance, risk appetite profiling, and portfolio reviews',
    contentTypes: ['client', 'clientprofile', 'riskappetite', 'portfolioreview', 'portfolioentry'],
  },
  {
    key: 'user-management',
    name: 'User & Access Management',
    description: 'Internal CRM users, employee profiles, departments, and RBAC roles',
    contentTypes: ['user', 'userprofile', 'crmgroup', 'role', 'rolepermission'],
  },
];

export const DEFAULT_EMPTY_PERMISSIONS_MESSAGE = 'No permissions available in catalogue.';

export const PERMISSION_SKELETON_CATEGORY_IDS = ['skel-cat-1', 'skel-cat-2'];
export const PERMISSION_SKELETON_ROW_IDS = ['skel-row-1', 'skel-row-2', 'skel-row-3', 'skel-row-4'];

function createMock(
  id: string,
  codename: string,
  name: string,
  contentType: string,
): PermissionItem {
  return {
    id,
    codename: codename as never,
    name,
    content_type: contentType,
  };
}

// Sample mock data strictly for Storybook testing and documentation
export const MOCK_PERMISSIONS: PermissionItem[] = [
  // Client Management -> Clients
  createMock('1', 'client:read', 'View Client', 'client'),
  createMock('2', 'client:create', 'Create Client', 'client'),
  createMock('3', 'client:update', 'Update Client', 'client'),
  createMock('4', 'client:delete', 'Delete Client', 'client'),

  // Client Profiles
  createMock('5', 'clientprofile:read', 'View Client Profile', 'clientprofile'),
  createMock('6', 'clientprofile:create', 'Create Client Profile', 'clientprofile'),
  createMock('7', 'clientprofile:update', 'Update Client Profile', 'clientprofile'),
  createMock('8', 'clientprofile:delete', 'Delete Client Profile', 'clientprofile'),

  // Risk Appetite
  createMock('9', 'riskappetite:read', 'View Risk Appetite', 'riskappetite'),
  createMock('10', 'riskappetite:create', 'Create Risk Appetite', 'riskappetite'),
  createMock('11', 'riskappetite:update', 'Update Risk Appetite', 'riskappetite'),
  createMock('12', 'riskappetite:delete', 'Delete Risk Appetite', 'riskappetite'),

  // Portfolio Review
  createMock('13', 'portfolioreview:read', 'View Portfolio Review', 'portfolioreview'),
  createMock('14', 'portfolioreview:create', 'Create Portfolio Review', 'portfolioreview'),
  createMock('15', 'portfolioreview:update', 'Update Portfolio Review', 'portfolioreview'),
  createMock('16', 'portfolioreview:delete', 'Delete Portfolio Review', 'portfolioreview'),

  // Portfolio Entry
  createMock('17', 'portfolioentry:read', 'View Portfolio Entry', 'portfolioentry'),
  createMock('18', 'portfolioentry:create', 'Create Portfolio Entry', 'portfolioentry'),
  createMock('19', 'portfolioentry:update', 'Update Portfolio Entry', 'portfolioentry'),
  createMock('20', 'portfolioentry:delete', 'Delete Portfolio Entry', 'portfolioentry'),

  // User Management -> Users
  createMock('21', 'user:read', 'View User', 'user'),
  createMock('22', 'user:create', 'Create User', 'user'),
  createMock('23', 'user:update', 'Update User', 'user'),
  createMock('24', 'user:delete', 'Delete User', 'user'),

  // User Profile
  createMock('25', 'userprofile:read', 'View User Profile', 'userprofile'),

  // CRM Groups
  createMock('26', 'crmgroup:read', 'View CRM Group', 'crmgroup'),
  createMock('27', 'crmgroup:create', 'Create CRM Group', 'crmgroup'),
  createMock('28', 'crmgroup:update', 'Update CRM Group', 'crmgroup'),
  createMock('29', 'crmgroup:delete', 'Delete CRM Group', 'crmgroup'),

  // Roles
  createMock('30', 'role:read', 'View Role', 'role'),
  createMock('31', 'role:create', 'Create Role', 'role'),
  createMock('32', 'role:update', 'Update Role', 'role'),

  // Role Permissions
  createMock('33', 'rolepermission:read', 'View Role Permission', 'rolepermission'),
  createMock('34', 'rolepermission:create', 'Create Role Permission', 'rolepermission'),
  createMock('35', 'rolepermission:update', 'Update Role Permission', 'rolepermission'),
  createMock('36', 'rolepermission:delete', 'Delete Role Permission', 'rolepermission'),
];
