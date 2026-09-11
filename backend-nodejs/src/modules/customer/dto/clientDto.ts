import { DropdownOption } from '../../../common/types/dropdown';
import { ClientStatus, Gender, KycStatus } from '../enums/clientEnums';

// 1. DTO for creating a client - used by POST /clients and Excel bulk import
export interface CreateClientDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  pan?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  relationshipManagerId?: string; // Explicit RM assignment
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

// 2. DTO for updating client operational status - PATCH /clients/:id/status
export interface UpdateClientStatusDto {
  status: ClientStatus;
}

// 3. DTO for updating RM - PATCH /clients/:id/rm
export interface UpdateClientRmDto {
  rmId: string;
}
export type UpdateClientRMDto = UpdateClientRmDto;

// 4. DTO for verifying KYC - POST /clients/:id/profile/verify
export interface VerifyKycDto {
  kycStatus: KycStatus;
}

// 5. DTO for bulk reassigning RM - POST /clients/bulk-reassign
export interface BulkReassignRmDto {
  clientIds: string[];
  newRmId: string;
}
export type BulkReassignDto = BulkReassignRmDto;

// 6. Response DTO for Client with resolved dropdown and virtual fields
export interface ClientResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  pan?: string;
  dateOfBirth?: Date;
  gender?: Gender;
  status: ClientStatus;
  kycStatus: KycStatus;
  relationshipManager?: DropdownOption<string> | null;
  signUpDate: Date;
  createdAt: Date;
}

// 7. Response DTO for Client Profile screen (Address + KYC status)
export interface ClientProfileResponseDto {
  id: string;
  clientId: string;
  kycStatus: KycStatus;
  clientStatus: ClientStatus;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
}

// 8. Response DTO for async bulk upload ingestion
export interface BulkUploadResponseDto {
  status: string;
  message: string;
  filename: string;
}