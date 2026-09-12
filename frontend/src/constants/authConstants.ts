/**
 * Exhaustive permissions enum matching backend authority codenames.
 * Used for route guards and component-level authorization gating.
 */
export enum PermissionsEnum {
  // Client Management
  CLIENT_READ = 'client:read',
  CLIENT_CREATE = 'client:create',
  CLIENT_UPDATE = 'client:update',

  // Client Profile & KYC
  CLIENT_PROFILE_READ = 'clientprofile:read',
  CLIENT_PROFILE_UPDATE = 'clientprofile:update',

  // Risk Appetite Assessment
  RISK_APPETITE_READ = 'riskappetite:read',
  RISK_APPETITE_CREATE = 'riskappetite:create',
  RISK_APPETITE_UPDATE = 'riskappetite:update',

  // Portfolio Review & Recommendations
  PORTFOLIO_REVIEW_READ = 'portfolioreview:read',
  PORTFOLIO_REVIEW_CREATE = 'portfolioreview:create',
  PORTFOLIO_REVIEW_UPDATE = 'portfolioreview:update',

  // User Manager (RBAC)
  USER_READ = 'user:read',
  USER_CREATE = 'user:create',
  USER_UPDATE = 'user:update',

  CRM_GROUP_READ = 'crmgroup:read',
  CRM_GROUP_CREATE = 'crmgroup:create',
  CRM_GROUP_UPDATE = 'crmgroup:update',

  ROLE_READ = 'role:read',
  ROLE_CREATE = 'role:create',
  ROLE_UPDATE = 'role:update',
  ROLE_PERMISSION_UPDATE = 'rolepermission:update',
}

export type PermissionCode = `${PermissionsEnum}`;
