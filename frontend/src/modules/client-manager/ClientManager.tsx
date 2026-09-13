import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import {
  UserPlus,
  Users,
  UserCheck,
} from 'lucide-react';
import { SearchInput } from '@/components/inputs';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import { MainButton } from '@/components/buttons';
import { StandardTable } from '@/components/tables';
import { Pagination } from '@/components/generics';
import { useGetClientsQuery } from '@/services/api/clientApi';
import { useGetUsersDropdownQuery } from '@/services/api/userManagerApi';
import type { ClientRecord, ClientStatus } from '@/definitions/clientTypes';
import type { DropdownType } from '@/types/genericTypes';
import { createClientColumns } from './clientColumns';
import { ClientDrawer } from './ClientDrawer';
import { ClientProfileDrawer } from './ClientProfileDrawer';
import { BulkReassignDrawer } from './BulkReassignDrawer';
import './ClientManager.scss';

const STATUS_FILTER_OPTIONS: DropdownType[] = [
  { displayName: 'All Statuses', value: '' },
  { displayName: 'Onboarding', value: 'ONBOARDING' },
  { displayName: 'Active', value: 'ACTIVE' },
  { displayName: 'Inactive', value: 'INACTIVE' },
];

export function ClientManager(): ReactElement {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [rmFilter, setRmFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bulk mode & selection state
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Drawers
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [profileClient, setProfileClient] = useState<ClientRecord | null>(null);
  const [isReassignOpen, setIsReassignOpen] = useState(false);

  const { data: userOptions = [] } = useGetUsersDropdownQuery();

  const { data: clientsData, isLoading } = useGetClientsQuery({
    search: searchTerm || undefined,
    status: (statusFilter as ClientStatus) || undefined,
    rmId: rmFilter || undefined,
    pageSize,
  });

  const rmFilterOptions = useMemo<DropdownType[]>(
    () => [
      { displayName: 'All Relationship Managers', value: '' },
      ...userOptions.map((opt) => ({
        displayName: opt.display_name,
        value: String(opt.value),
      })),
    ],
    [userOptions],
  );

  function handleToggleBulkMode() {
    setIsBulkMode((prev) => {
      if (prev) {
        setSelectedClientIds([]);
      }
      return !prev;
    });
  }

  function handleViewProfile(client: ClientRecord) {
    setProfileClient(client);
  }

  const columns = useMemo(
    () => createClientColumns(handleViewProfile),
    [],
  );

  const clients = useMemo(
    () => clientsData?.results ?? [],
    [clientsData],
  );
  const totalItems = clientsData?.total_size ?? clients.length;

  const selectedClientsList = useMemo(
    () => clients.filter((c) => selectedClientIds.includes(String(c.id))),
    [clients, selectedClientIds],
  );

  return (
    <div className="client-manager">
      <header className="client-manager__header">
        <h1 className="client-manager__title">Client Lifecycle & Portfolio Directory</h1>
        <p className="client-manager__subtitle">
          Manage wealth clients, KYC compliance verification, and relationship manager assignments.
        </p>
      </header>

      {/* Toolbar: Inline Filters on Left, Actions on Right */}
      <div className="client-manager__toolbar">
        <div className="client-manager__filters">
          <div className="client-manager__search">
            <SearchInput
              value={searchTerm}
              onChange={(term) => {
                setSearchTerm(term);
                setCurrentPage(1);
              }}
              onClear={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              placeholder="Search by name, PAN, email..."
              ariaLabel="Search clients"
            />
          </div>

          <div className="client-manager__dropdown">
            <SingleSelectGenericDropdown
              id="client-status-filter"
              options={STATUS_FILTER_OPTIONS}
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val ? String(val) : '');
                setCurrentPage(1);
              }}
              placeholder="Status: All"
            />
          </div>

          <div className="client-manager__dropdown">
            <SingleSelectGenericDropdown
              id="client-rm-filter"
              options={rmFilterOptions}
              value={rmFilter}
              onChange={(val) => {
                setRmFilter(val ? String(val) : '');
                setCurrentPage(1);
              }}
              placeholder="RM: All RMs"
            />
          </div>
        </div>

        <div className="client-manager__actions">
          <MainButton
            label={isBulkMode ? 'Exit Bulk Mode' : 'Bulk Reassignment'}
            variant={isBulkMode ? 'primary' : 'secondary'}
            size="md"
            icon={<Users size={16} />}
            iconPosition="left"
            onClick={handleToggleBulkMode}
            ariaLabel="Toggle bulk client reassignment mode"
          />

          <MainButton
            label="Add Client"
            variant="primary"
            size="md"
            icon={<UserPlus size={16} />}
            iconPosition="left"
            onClick={() => setIsAddClientOpen(true)}
            ariaLabel="Onboard new client"
          />
        </div>
      </div>

      {/* Bulk Action Banner */}
      {isBulkMode && selectedClientIds.length > 0 ? (
        <div className="client-manager__bulk-banner">
          <span className="client-manager__bulk-count">
            <strong>{selectedClientIds.length}</strong>
            {' '}
            clients selected for reassignment
          </span>

          <div className="client-manager__bulk-actions">
            <MainButton
              label={`Reassign RM (${selectedClientIds.length})`}
              variant="primary"
              size="sm"
              icon={<UserCheck size={14} />}
              iconPosition="left"
              onClick={() => setIsReassignOpen(true)}
            />
            <MainButton
              label="Deselect All"
              variant="secondary"
              size="sm"
              onClick={() => setSelectedClientIds([])}
            />
          </div>
        </div>
      ) : null}

      {/* Standard Table */}
      <div className="client-manager__table-wrapper">
        <StandardTable<ClientRecord>
          columns={columns}
          data={clients}
          rowKey="id"
          selectable={isBulkMode}
          selectedRowKeys={selectedClientIds}
          onSelectionChange={setSelectedClientIds}
          isLoading={isLoading}
          emptyMessage="No clients match the specified search and filter criteria."
        />
      </div>

      {/* Pagination */}
      <div className="client-manager__footer">
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

      {/* Drawers */}
      <ClientDrawer
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
      />

      <ClientProfileDrawer
        isOpen={Boolean(profileClient)}
        onClose={() => setProfileClient(null)}
        client={profileClient}
      />

      <BulkReassignDrawer
        isOpen={isReassignOpen}
        onClose={() => setIsReassignOpen(false)}
        selectedClients={selectedClientsList}
        onSuccess={() => setSelectedClientIds([])}
      />
    </div>
  );
}
