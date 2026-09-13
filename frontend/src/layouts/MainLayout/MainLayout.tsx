import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Layers,
  Users,
  ShieldAlert,
  PieChart,
  UserCog,
  LogOut,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { usePermission } from '@/hooks/usePermission';
import { NAV_ITEMS, NavItemConfig } from '@/constants/navConstants';
import './MainLayout.scss';

function renderNavIcon(iconName: NavItemConfig['iconName']): React.ReactElement {
  switch (iconName) {
    case 'clients':
      return <Users size={18} />;
    case 'risk':
      return <ShieldAlert size={18} />;
    case 'portfolio':
      return <PieChart size={18} />;
    case 'users':
      return <UserCog size={18} />;
    default:
      return <Users size={18} />;
  }
}

export function MainLayout(): React.ReactElement {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);
  const { hasPermission, hasAnyPermission } = usePermission();

  function handleLogout(): void {
    dispatch(logout());
    navigate('/login');
  }

  function getNavLinkClass({ isActive }: { isActive: boolean }): string {
    return `main-layout__nav-link ${isActive ? 'main-layout__nav-link--active' : ''}`;
  }

  function isItemAllowed(item: NavItemConfig): boolean {
    if (!item.requiredPermission) {
      return true;
    }
    if (Array.isArray(item.requiredPermission)) {
      return hasAnyPermission(item.requiredPermission);
    }
    return hasPermission(item.requiredPermission);
  }

  return (
    <div className="main-layout">
      <header className="main-layout__topbar">
        <div className="main-layout__brand">
          <Layers size={22} />
          <span>WealthTech CRM</span>
        </div>

        <div className="main-layout__user-panel">
          <div className="main-layout__user-info">
            <span className="user-name">
              {auth.user?.full_name || auth.user?.email || 'Guest User'}
            </span>
            <span className="user-role">{auth.user?.role || 'Relationship Manager'}</span>
          </div>

          <button
            type="button"
            className="main-layout__logout-btn"
            onClick={handleLogout}
            title="Log Out"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
        </div>
      </header>

      <div className="main-layout__body">
        <aside className="main-layout__sidebar">
          <nav className="main-layout__nav">
            {NAV_ITEMS.filter(isItemAllowed).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={getNavLinkClass}
              >
                {renderNavIcon(item.iconName)}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="main-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
