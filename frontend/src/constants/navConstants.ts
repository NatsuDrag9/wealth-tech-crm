import { PermissionsEnum, PermissionCode } from './authConstants';

export interface NavItemConfig {
  to: string;
  label: string;
  iconName: 'clients' | 'risk' | 'portfolio' | 'users';
  requiredPermission?: PermissionCode | PermissionCode[];
}

export const NAV_ITEMS: readonly NavItemConfig[] = [
  {
    to: '/clients',
    label: 'Clients',
    iconName: 'clients',
    requiredPermission: PermissionsEnum.CLIENT_READ,
  },
  {
    to: '/risk-appetite',
    label: 'Risk Appetite',
    iconName: 'risk',
    requiredPermission: PermissionsEnum.RISK_APPETITE_READ,
  },
  {
    to: '/portfolio-reviews',
    label: 'Portfolio Review',
    iconName: 'portfolio',
    requiredPermission: PermissionsEnum.PORTFOLIO_REVIEW_READ,
  },
  {
    to: '/user-manager',
    label: 'User Manager',
    iconName: 'users',
    requiredPermission: [
      PermissionsEnum.USER_READ,
      PermissionsEnum.CRM_GROUP_READ,
    ],
  },
] as const;
