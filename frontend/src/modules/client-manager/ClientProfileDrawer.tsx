import { type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Compass,
  Briefcase,
  User,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { Drawer } from '@/modules/user-manager/Drawer/Drawer';
import { MainButton } from '@/components/buttons';
import {
  useGetClientProfileQuery,
  useVerifyKycMutation,
} from '@/services/api/clientApi';
import type { ClientRecord } from '@/definitions/clientTypes';
import { showSuccessToast, showErrorToast } from '@/utils/toastUtils';
import './ClientProfileDrawer.scss';

interface ClientProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientRecord | null;
}

export function ClientProfileDrawer({
  isOpen,
  onClose,
  client,
}: ClientProfileDrawerProps): ReactElement | null {
  const navigate = useNavigate();

  const clientId = client ? client.id : '';
  const { data: profile, isLoading: isProfileLoading } = useGetClientProfileQuery(
    clientId,
    { skip: !isOpen || !client },
  );

  const [verifyKyc, { isLoading: isVerifying }] = useVerifyKycMutation();

  if (!client) return null;

  const clientName = client.fullName || client.full_name
    || `${client.firstName} ${client.lastName}`;

  async function handleVerifyKyc(status: 'VERIFIED' | 'REJECTED') {
    if (!client) return;
    try {
      await verifyKyc({
        id: client.id,
        kycStatus: status,
        remarks: `KYC ${status === 'VERIFIED' ? 'Approved' : 'Rejected'} by compliance officer`,
      }).unwrap();

      showSuccessToast(
        status === 'VERIFIED'
          ? 'Client KYC verified & promoted to ACTIVE'
          : 'Client KYC marked as REJECTED',
      );
    } catch {
      showErrorToast('Failed to update KYC status. Please try again.');
    }
  }

  const kycStatus = profile?.kycStatus || profile?.kyc_status
    || client.kycStatus || client.kyc_status || 'PENDING';

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Client 360: ${clientName}`}
      subtitle={`Account ID #${client.id} • Status: ${client.status}`}
      id="client-profile-drawer"
      width="default"
      footer={(
        <div className="client-profile-drawer__footer-actions">
          <MainButton
            label="Close"
            variant="secondary"
            size="md"
            onClick={onClose}
          />
        </div>
      )}
    >
      <div className="client-profile-drawer">
        {/* Personal & Contact Information */}
        <div className="client-profile-drawer__card">
          <h4 className="client-profile-drawer__section-header">
            <User size={16} />
            Personal & Contact Info
          </h4>
          <div className="client-profile-drawer__grid-2">
            <div className="client-profile-drawer__data-item">
              <span className="client-profile-drawer__label">Email</span>
              <span className="client-profile-drawer__value">{client.email}</span>
            </div>
            <div className="client-profile-drawer__data-item">
              <span className="client-profile-drawer__label">Phone</span>
              <span className="client-profile-drawer__value">{client.phone}</span>
            </div>
            <div className="client-profile-drawer__data-item">
              <span className="client-profile-drawer__label">PAN Card</span>
              <span className="client-profile-drawer__value">{client.pan || '—'}</span>
            </div>
            <div className="client-profile-drawer__data-item">
              <span className="client-profile-drawer__label">Date of Birth</span>
              <span className="client-profile-drawer__value">
                {client.dateOfBirth || client.date_of_birth || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Address & Residential Info */}
        <div className="client-profile-drawer__card">
          <h4 className="client-profile-drawer__section-header">
            <MapPin size={16} />
            Registered Address
          </h4>
          {isProfileLoading ? (
            <p style={{ margin: 0, color: '#64748b' }}>Loading address details...</p>
          ) : (
            <div className="client-profile-drawer__grid-2">
              <div className="client-profile-drawer__data-item">
                <span className="client-profile-drawer__label">Address Line</span>
                <span className="client-profile-drawer__value">
                  {profile?.addressLine || profile?.address_line || '—'}
                </span>
              </div>
              <div className="client-profile-drawer__data-item">
                <span className="client-profile-drawer__label">City & State</span>
                <span className="client-profile-drawer__value">
                  {profile?.city ? `${profile.city}, ${profile.state || ''}` : '—'}
                </span>
              </div>
              <div className="client-profile-drawer__data-item">
                <span className="client-profile-drawer__label">Postal PIN</span>
                <span className="client-profile-drawer__value">
                  {profile?.pincode || '—'}
                </span>
              </div>
              <div className="client-profile-drawer__data-item">
                <span className="client-profile-drawer__label">Country</span>
                <span className="client-profile-drawer__value">
                  {profile?.country || 'India'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Compliance & KYC Status Action */}
        <div className="client-profile-drawer__card">
          <h4 className="client-profile-drawer__section-header">
            <ShieldCheck size={16} />
            Compliance & KYC Audit
          </h4>
          <div className="client-profile-drawer__kyc-box">
            <div className="client-profile-drawer__data-item">
              <span className="client-profile-drawer__label">KYC Verification Status</span>
              <span className="client-profile-drawer__value">{String(kycStatus)}</span>
            </div>

            {kycStatus === 'PENDING' ? (
              <div className="client-profile-drawer__kyc-actions">
                <MainButton
                  label="Approve"
                  variant="primary"
                  size="sm"
                  icon={<CheckCircle2 size={14} />}
                  iconPosition="left"
                  onClick={() => handleVerifyKyc('VERIFIED')}
                  isLoading={isVerifying}
                />
                <MainButton
                  label="Reject"
                  variant="secondary"
                  size="sm"
                  icon={<XCircle size={14} />}
                  iconPosition="left"
                  onClick={() => handleVerifyKyc('REJECTED')}
                  disabled={isVerifying}
                />
              </div>
            ) : null}
          </div>
        </div>

        {/* Advisory Jump CTAs */}
        <div>
          <h4 className="client-profile-drawer__section-header">
            Advisory & Wealth Services
          </h4>
          <div className="client-profile-drawer__jump-actions">
            <MainButton
              label="Risk Appetite"
              variant="secondary"
              size="md"
              icon={<Compass size={16} />}
              iconPosition="left"
              onClick={() => {
                onClose();
                navigate(client ? `/risk-appetite?clientId=${client.id}` : '/risk-appetite');
              }}
            />
            <MainButton
              label="Portfolio Reviews"
              variant="secondary"
              size="md"
              icon={<Briefcase size={16} />}
              iconPosition="left"
              onClick={() => {
                onClose();
                navigate(client ? `/portfolio-reviews?clientId=${client.id}` : '/portfolio-reviews');
              }}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}
