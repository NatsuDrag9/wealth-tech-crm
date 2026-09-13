import {
  useState,
  useMemo,
  type ReactElement,
} from 'react';
import { UserCheck } from 'lucide-react';
import { Drawer } from '@/modules/user-manager/Drawer/Drawer';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import { MainButton } from '@/components/buttons';
import { useGetUsersDropdownQuery } from '@/services/api/userManagerApi';
import { useBulkReassignRmMutation } from '@/services/api/clientApi';
import type { ClientRecord } from '@/definitions/clientTypes';
import type { DropdownType } from '@/types/genericTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './BulkReassignDrawer.scss';

interface BulkReassignDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: ClientRecord[];
  onSuccess: () => void;
}

export function BulkReassignDrawer({
  isOpen,
  onClose,
  selectedClients,
  onSuccess,
}: BulkReassignDrawerProps): ReactElement | null {
  const [selectedRmId, setSelectedRmId] = useState<string | null>(null);

  const {
    data: userOptions = [],
    isLoading: isUsersLoading,
  } = useGetUsersDropdownQuery();

  const [bulkReassignRm, { isLoading: isReassigning }] = useBulkReassignRmMutation();

  const rmDropdownOptions = useMemo<DropdownType[]>(
    () => userOptions.map((opt) => ({
      displayName: opt.display_name,
      value: String(opt.value),
    })),
    [userOptions],
  );

  async function handleConfirmReassign() {
    if (!selectedRmId) {
      showErrorToast('Please select a new Relationship Manager');
      return;
    }

    const clientIds = selectedClients.map((c) => c.id);

    try {
      const response = await bulkReassignRm({
        clientIds,
        newRmId: selectedRmId,
      }).unwrap();

      showSuccessToast(
        response.message || `Successfully reassigned ${selectedClients.length} clients`,
      );
      setSelectedRmId(null);
      onSuccess();
      onClose();
    } catch {
      showErrorToast('Failed to reassign relationship manager. Please try again.');
    }
  }

  const clientCount = selectedClients.length;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Reassign Relationship Manager"
      subtitle={`Transfer ${clientCount} selected clients to another manager`}
      id="bulk-reassign-drawer"
      footer={(
        <div className="bulk-reassign-drawer__footer-actions">
          <MainButton
            label="Cancel"
            variant="secondary"
            size="md"
            onClick={onClose}
            disabled={isReassigning}
          />
          <MainButton
            label={`Reassign ${clientCount} Clients`}
            variant="primary"
            size="md"
            icon={<UserCheck size={16} />}
            iconPosition="left"
            onClick={handleConfirmReassign}
            isLoading={isReassigning}
            disabled={!selectedRmId || isUsersLoading}
          />
        </div>
      )}
    >
      <div className="bulk-reassign-drawer">
        <p style={{ margin: 0, fontSize: '1.4rem', color: '#475569' }}>
          Selected Clients to Reassign:
        </p>

        <div className="bulk-reassign-drawer__client-list">
          {selectedClients.map((client) => {
            const name = client.fullName || client.full_name
              || `${client.firstName} ${client.lastName}`;
            return (
              <span key={client.id} className="bulk-reassign-drawer__chip">
                {name}
              </span>
            );
          })}
        </div>

        <div style={{ marginTop: '1.2rem' }}>
          <SingleSelectGenericDropdown
            id="bulk-reassign-rm-select"
            label="Target Relationship Manager *"
            placeholder={isUsersLoading ? 'Loading managers...' : 'Select Relationship Manager'}
            options={rmDropdownOptions}
            value={selectedRmId}
            onChange={(val) => setSelectedRmId(val ? String(val) : null)}
            disabled={isUsersLoading}
          />
        </div>
      </div>
    </Drawer>
  );
}
