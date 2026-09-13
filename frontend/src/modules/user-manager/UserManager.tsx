import { useState, type ReactElement } from 'react';
import { Users, Building2 } from 'lucide-react';
import { UserTab } from './UserTab/UserTab';
import { GroupTab } from './GroupTab/GroupTab';
import './UserManager.scss';

type ActiveTab = 'users' | 'groups';

export function UserManager(): ReactElement {
  const [activeTab, setActiveTab] = useState<ActiveTab>('users');

  return (
    <div className="user-manager">
      <header className="user-manager__header">
        <h1 className="user-manager__title">User & Access Management</h1>
        <p className="user-manager__subtitle">
          Manage employee accounts, organizational departments, and RBAC permission matrices.
        </p>
      </header>

      <div
        className="user-manager__tab-nav"
        role="tablist"
        aria-label="User Management Sections"
      >
        <button
          type="button"
          role="tab"
          id="tab-users"
          aria-selected={activeTab === 'users'}
          aria-controls="panel-users"
          className={`user-manager__tab-btn ${
            activeTab === 'users' ? 'user-manager__tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          Employees & Users
        </button>

        <button
          type="button"
          role="tab"
          id="tab-groups"
          aria-selected={activeTab === 'groups'}
          aria-controls="panel-groups"
          className={`user-manager__tab-btn ${
            activeTab === 'groups' ? 'user-manager__tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('groups')}
        >
          <Building2 size={16} />
          Departments & Roles
        </button>
      </div>

      <main
        className="user-manager__tab-content"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {activeTab === 'users' ? <UserTab /> : <GroupTab />}
      </main>
    </div>
  );
}
