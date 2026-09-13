import React from 'react';
import { Navigate } from 'react-router-dom';
import { PermissionsEnum, PermissionCode } from '@/constants/authConstants';
import { MainLayout } from '@/layouts/MainLayout/MainLayout';
import { Unauthorized } from '@/modules/misc/Unauthorized';
import { NotFound } from '@/modules/misc/NotFound';
import { UserManager } from '@/modules/user-manager/UserManager';
import { ClientManager } from '@/modules/client-manager/ClientManager';
import { RiskAppetite } from '@/modules/risk-appetite/RiskAppetite';
import { App } from '@/App';

export interface RouteConfig {
  path: string;
  element: React.ReactNode;
  isPublic?: boolean;
  requiredPermissions?: PermissionCode[];
  children?: RouteConfig[];
}

export const APP_ROUTES: readonly RouteConfig[] = [
  // Public Fallback Routes
  {
    path: '/unauthorized',
    element: <Unauthorized />,
    isPublic: true,
  },

  // Protected Shell (MainLayout as parent)
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        path: '',
        element: <Navigate to="/clients" replace />,
      },
      {
        path: 'clients',
        element: <ClientManager />,
        requiredPermissions: [PermissionsEnum.CLIENT_READ],
      },
      {
        path: 'risk-appetite',
        element: <RiskAppetite />,
        requiredPermissions: [PermissionsEnum.RISK_APPETITE_READ],
      },
      {
        path: 'portfolio-reviews',
        element: <App />,
        requiredPermissions: [PermissionsEnum.PORTFOLIO_REVIEW_READ],
      },
      {
        path: 'user-manager',
        element: <UserManager />,
        requiredPermissions: [PermissionsEnum.USER_READ],
      },
    ],
  },

  // 404 Catch-All
  {
    path: '*',
    element: <NotFound />,
    isPublic: true,
  },
] as const;
