import React from 'react';
import {
  Routes, Route, Navigate, useLocation,
} from 'react-router-dom';
import { useAppSelector } from '@/store';
import { usePermission } from '@/hooks/usePermission';
import { RouteConfig } from '@/config/routes';

interface GuardProps {
  route: RouteConfig;
  children: React.ReactNode;
}

interface RoutesWithGuardProps {
  routes: readonly RouteConfig[];
}

function RouteGuard({ route, children }: GuardProps): React.ReactElement {
  const location = useLocation();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const { hasAllPermissions } = usePermission();

  if (!route.isPublic && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (route.requiredPermissions && !hasAllPermissions(route.requiredPermissions)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children as React.ReactElement;
}

export function RoutesWithGuard({ routes }: RoutesWithGuardProps): React.ReactElement {
  function renderRoute(route: RouteConfig): React.ReactElement {
    const wrappedElement = (
      <RouteGuard route={route}>
        {route.element}
      </RouteGuard>
    );

    if (route.children && route.children.length > 0) {
      return (
        <Route key={route.path} path={route.path} element={wrappedElement}>
          {route.children.map(renderRoute)}
        </Route>
      );
    }

    return <Route key={route.path} path={route.path} element={wrappedElement} />;
  }

  return <Routes>{routes.map(renderRoute)}</Routes>;
}
