import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import {
  Plus,
  ShieldCheck,
  Edit,
  Building2,
} from 'lucide-react';
import { SearchInput } from '@/components/inputs';
import { MainButton } from '@/components/buttons';
import { StandardTable } from '@/components/tables';
import type { ColumnDef } from '@/components/tables/StandardTable/types';
import {
  useGetGroupsQuery,
  useGetGroupRolesQuery,
} from '@/services/api/userManagerApi';
import type { GroupRecord, RoleRecord } from '@/definitions/userManagerTypes';
import { DepartmentDrawer } from './DepartmentDrawer';
import { RoleDrawer } from './RoleDrawer';
import { RolePermissionsDrawer } from './RolePermissionsDrawer';
import './GroupTab.scss';

export function GroupTab(): ReactElement {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupRecord | null>(null);

  // Drawer states
  const [isDeptDrawerOpen, setIsDeptDrawerOpen] = useState(false);
  const [groupToEdit, setGroupToEdit] = useState<GroupRecord | null>(null);

  const [isRoleDrawerOpen, setIsRoleDrawerOpen] = useState(false);
  const [roleToEdit, setRoleToEdit] = useState<RoleRecord | null>(null);

  const [isPermissionsDrawerOpen, setIsPermissionsDrawerOpen] = useState(false);
  const [roleForPermissions, setRoleForPermissions] = useState<RoleRecord | null>(null);

  const { data: groupsData, isLoading: isGroupsLoading } = useGetGroupsQuery({
    search: searchTerm || undefined,
  });

  const groups = groupsData?.results ?? [];
  const activeGroup = selectedGroup ?? groups[0] ?? null;

  const {
    data: roles = [],
    isLoading: isRolesLoading,
  } = useGetGroupRolesQuery(
    activeGroup ? activeGroup.id : '',
    { skip: !activeGroup },
  );

  function handleAddDepartment() {
    setGroupToEdit(null);
    setIsDeptDrawerOpen(true);
  }

  function handleEditDepartment(group: GroupRecord) {
    setGroupToEdit(group);
    setIsDeptDrawerOpen(true);
  }

  function handleAddRole() {
    setRoleToEdit(null);
    setIsRoleDrawerOpen(true);
  }

  function handleEditRole(role: RoleRecord) {
    setRoleToEdit(role);
    setIsRoleDrawerOpen(true);
  }

  function handleConfigurePermissions(role: RoleRecord) {
    setRoleForPermissions(role);
    setIsPermissionsDrawerOpen(true);
  }

  const roleColumns: ColumnDef<RoleRecord>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Role Title',
        width: '32%',
        sortable: true,
      },
      {
        key: 'description',
        header: 'Description',
        width: '40%',
        render: (role) => role.description || '—',
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '28%',
        render: (role) => (
          <div className="group-tab__role-actions">
            <MainButton
              label="Permissions"
              variant="secondary"
              size="sm"
              icon={<ShieldCheck size={14} />}
              iconPosition="left"
              onClick={() => handleConfigurePermissions(role)}
              ariaLabel={`Configure permissions for ${role.name}`}
            />
            <MainButton
              label="Edit"
              variant="secondary"
              size="sm"
              icon={<Edit size={14} />}
              iconPosition="left"
              onClick={() => handleEditRole(role)}
              ariaLabel={`Edit role ${role.name}`}
            />
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="group-tab">
      {/* Left Column: Department List */}
      <div className="group-tab__left">
        <div className="group-tab__left-toolbar">
          <div className="group-tab__search">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              onClear={() => setSearchTerm('')}
              placeholder="Search departments..."
              ariaLabel="Search departments"
            />
          </div>

          <MainButton
            label="Add"
            variant="primary"
            size="md"
            icon={<Plus size={16} />}
            iconPosition="left"
            onClick={handleAddDepartment}
            ariaLabel="Add new department"
          />
        </div>

        <div className="group-tab__group-list">
          {groups.length === 0 && !isGroupsLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              No departments found.
            </div>
          ) : null}

          {groups.map((group) => {
            const isActive = activeGroup && activeGroup.id === group.id;
            const itemClasses = [
              'group-tab__group-item',
              isActive ? 'group-tab__group-item--active' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                type="button"
                key={group.id}
                className={itemClasses}
                onClick={() => setSelectedGroup(group)}
              >
                <div className="group-tab__group-info">
                  <span className="group-tab__group-name">{group.name}</span>
                  <span className="group-tab__group-desc">
                    {group.description || 'No description provided'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Active Department & Nested Roles */}
      <div className="group-tab__right">
        {activeGroup ? (
          <>
            <div className="group-tab__right-header">
              <div>
                <h2 className="group-tab__dept-title">{activeGroup.name}</h2>
                <p className="group-tab__dept-desc">
                  {activeGroup.description || 'No department description provided.'}
                </p>
              </div>

              <MainButton
                label="Edit Department"
                variant="secondary"
                size="sm"
                icon={<Edit size={14} />}
                iconPosition="left"
                onClick={() => handleEditDepartment(activeGroup)}
                ariaLabel={`Edit department ${activeGroup.name}`}
              />
            </div>

            <div className="group-tab__roles-section">
              <div className="group-tab__roles-toolbar">
                <h3 className="group-tab__roles-title">
                  Roles in
                  {' '}
                  {activeGroup.name}
                </h3>

                <MainButton
                  label="Add Role"
                  variant="primary"
                  size="sm"
                  icon={<Plus size={14} />}
                  iconPosition="left"
                  onClick={handleAddRole}
                  ariaLabel={`Add role to ${activeGroup.name}`}
                />
              </div>

              <div className="group-tab__roles-table">
                <StandardTable<RoleRecord>
                  columns={roleColumns}
                  data={roles}
                  rowKey="id"
                  isLoading={isRolesLoading}
                  emptyMessage={`No roles defined under ${activeGroup.name}.`}
                />
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
            <Building2 size={36} style={{ margin: '0 auto 1.2rem', opacity: 0.5 }} />
            <p>Select a department to view and manage its assigned operational roles.</p>
          </div>
        )}
      </div>

      {/* Drawers */}
      <DepartmentDrawer
        isOpen={isDeptDrawerOpen}
        onClose={() => setIsDeptDrawerOpen(false)}
        departmentToEdit={groupToEdit}
      />

      {activeGroup ? (
        <RoleDrawer
          isOpen={isRoleDrawerOpen}
          onClose={() => setIsRoleDrawerOpen(false)}
          groupId={activeGroup.id}
          groupName={activeGroup.name}
          roleToEdit={roleToEdit}
        />
      ) : null}

      <RolePermissionsDrawer
        isOpen={isPermissionsDrawerOpen}
        onClose={() => setIsPermissionsDrawerOpen(false)}
        role={roleForPermissions}
        groupName={activeGroup ? activeGroup.name : undefined}
      />
    </div>
  );
}
