import { Eye } from 'lucide-react';
import type { ColumnDef } from '@/components/tables/StandardTable/types';
import type { ClientRecord } from '@/definitions/clientTypes';
import { MainButton } from '@/components/buttons';

function formatClientName(client: ClientRecord): string {
  if (client.fullName) return client.fullName;
  if (client.full_name) return client.full_name;
  if (client.firstName && client.lastName) return `${client.firstName} ${client.lastName}`;
  if (client.first_name && client.last_name) return `${client.first_name} ${client.last_name}`;
  return '—';
}

function formatRM(client: ClientRecord): string {
  const rm = client.relationshipManager || client.relationship_manager;
  if (!rm) return 'Unassigned';
  if (typeof rm === 'object') {
    if ('display_name' in rm && rm.display_name) return rm.display_name;
    if ('name' in rm && (rm as { name: string }).name) return (rm as { name: string }).name;
  }
  return 'Unassigned';
}

function getStatusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
      return 'client-manager__badge client-manager__badge--active';
    case 'ONBOARDING':
      return 'client-manager__badge client-manager__badge--onboarding';
    case 'INACTIVE':
      return 'client-manager__badge client-manager__badge--inactive';
    default:
      return 'client-manager__badge client-manager__badge--neutral';
  }
}

function getKycBadgeClass(kycStatus: string): string {
  switch (kycStatus?.toUpperCase()) {
    case 'VERIFIED':
      return 'client-manager__badge client-manager__badge--verified';
    case 'PENDING':
      return 'client-manager__badge client-manager__badge--pending';
    case 'REJECTED':
      return 'client-manager__badge client-manager__badge--rejected';
    default:
      return 'client-manager__badge client-manager__badge--neutral';
  }
}

export function createClientColumns(
  onViewProfile: (client: ClientRecord) => void,
): ColumnDef<ClientRecord>[] {
  return [
    {
      key: 'name',
      header: 'Client Name',
      width: '22%',
      sortable: true,
      render: (client: ClientRecord) => (
        <div className="client-manager__client-cell">
          <span className="client-manager__client-name">
            {formatClientName(client)}
          </span>
          {client.pan ? (
            <span className="client-manager__pan-tag">
              PAN:
              {' '}
              {client.pan}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Info',
      width: '22%',
      render: (client: ClientRecord) => (
        <div className="client-manager__contact-cell">
          <span className="client-manager__email">{client.email}</span>
          <span className="client-manager__phone">{client.phone}</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Client Status',
      width: '14%',
      sortable: true,
      render: (client: ClientRecord) => (
        <span className={getStatusBadgeClass(client.status)}>
          {client.status}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      header: 'KYC Status',
      width: '14%',
      sortable: true,
      render: (client: ClientRecord) => {
        const kyc = client.kycStatus || client.kyc_status || 'PENDING';
        return (
          <span className={getKycBadgeClass(String(kyc))}>
            {String(kyc)}
          </span>
        );
      },
    },
    {
      key: 'rm',
      header: 'Assigned RM',
      width: '16%',
      render: (client: ClientRecord) => (
        <span className="client-manager__rm-cell">
          {formatRM(client)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '12%',
      render: (client: ClientRecord) => (
        <MainButton
          label="Profile"
          variant="secondary"
          size="sm"
          icon={<Eye size={14} />}
          iconPosition="left"
          onClick={() => onViewProfile(client)}
          ariaLabel={`View profile for ${formatClientName(client)}`}
        />
      ),
    },
  ];
}
