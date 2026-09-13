import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import { UserPlus } from 'lucide-react';
import { SearchInput } from '@/components/inputs';
import { MainButton } from '@/components/buttons';
import { StandardTable } from '@/components/tables';
import { Pagination } from '@/components/generics';
import { useGetUsersQuery } from '@/services/api/userManagerApi';
import type { UserRecord } from '@/definitions/userManagerTypes';
import { createUserColumns } from './userColumns';
import { UserDrawer } from './UserDrawer';
import './UserTab.scss';

export function UserTab(): ReactElement {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<UserRecord | null>(null);

  const { data, isLoading } = useGetUsersQuery({
    search: searchTerm || undefined,
    pageSize,
  });

  function handleEditUser(user: UserRecord) {
    setUserToEdit(user);
    setIsDrawerOpen(true);
  }

  function handleAddUser() {
    setUserToEdit(null);
    setIsDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
    setUserToEdit(null);
  }

  function handleSearchChange(term: string) {
    setSearchTerm(term);
    setCurrentPage(1);
  }

  function handleClearSearch() {
    setSearchTerm('');
    setCurrentPage(1);
  }

  const columns = useMemo(
    () => createUserColumns(handleEditUser),
    [],
  );

  const users = data?.results ?? [];
  const totalItems = data?.total_size ?? users.length;

  return (
    <div className="user-tab">
      <div className="user-tab__toolbar">
        <div className="user-tab__search">
          <SearchInput
            value={searchTerm}
            onChange={handleSearchChange}
            onClear={handleClearSearch}
            placeholder="Search users by name or email..."
            ariaLabel="Search users"
          />
        </div>

        <MainButton
          label="Add User"
          variant="primary"
          size="md"
          icon={<UserPlus size={16} />}
          iconPosition="left"
          onClick={handleAddUser}
          ariaLabel="Add new user"
        />
      </div>

      <div className="user-tab__table-wrapper">
        <StandardTable<UserRecord>
          columns={columns}
          data={users}
          rowKey="id"
          isLoading={isLoading}
          emptyMessage="No users found in this organization."
        />
      </div>

      <div className="user-tab__footer">
        <Pagination
          currentPage={currentPage}
          pageSize={pageSize}
          totalItems={totalItems}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          disabled={isLoading}
        />
      </div>

      <UserDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        userToEdit={userToEdit}
      />
    </div>
  );
}
