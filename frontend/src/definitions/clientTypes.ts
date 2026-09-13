import type { DropdownOption, CursorPaginatedResponse } from './commonTypes';

export type ClientStatus = 'ONBOARDING' | 'ACTIVE' | 'INACTIVE';
export type KycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export interface ClientRecord {
  id: string | number;
  firstName?: string;
  first_name?: string;
  lastName?: string;
  last_name?: string;
  fullName?: string;
  full_name?: string;
  email: string;
  phone: string;
  pan?: string;
  dateOfBirth?: string;
  date_of_birth?: string;
  gender?: Gender | string;
  status: ClientStatus | string;
  kycStatus?: KycStatus | string;
  kyc_status?: KycStatus | string;
  relationshipManager?: DropdownOption<string | number> | null;
  relationship_manager?: DropdownOption<string | number> | null;
  signUpDate?: string;
  sign_up_date?: string;
  createdAt?: string;
  created_at?: string;
}

export interface ClientProfileRecord {
  id: string | number;
  clientId?: string | number;
  client_id?: string | number;
  kycStatus?: KycStatus | string;
  kyc_status?: KycStatus | string;
  clientStatus?: ClientStatus | string;
  client_status?: ClientStatus | string;
  addressLine?: string;
  address_line?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface CreateClientPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pan?: string;
  dateOfBirth?: string;
  gender?: Gender | string;
  relationshipManagerId?: string | number;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

export interface UpdateClientStatusPayload {
  status: ClientStatus;
}

export interface UpdateClientStatusParams extends UpdateClientStatusPayload {
  id: string | number;
}

export interface UpdateClientRmPayload {
  rmId: string | number;
}

export interface UpdateClientRmParams extends UpdateClientRmPayload {
  id: string | number;
}

export interface VerifyKycPayload {
  kycStatus?: KycStatus;
  status?: KycStatus;
  remarks?: string;
}

export interface VerifyKycParams extends VerifyKycPayload {
  id: string | number;
}

export interface BulkReassignPayload {
  clientIds: (string | number)[];
  newRmId: string | number;
}

export interface BulkReassignResponse {
  message: string;
  count: number;
}

export interface GetClientsQueryParams {
  search?: string;
  status?: ClientStatus | string;
  rmId?: string | number;
  rm_id?: string | number;
  cursor?: string | number;
  pageSize?: number;
  page_size?: number;
}

export type ClientsPaginatedResponse = CursorPaginatedResponse<ClientRecord>;
