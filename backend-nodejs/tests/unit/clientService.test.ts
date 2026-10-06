import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { ClientService } from '../../src/modules/customer/services/clientService';
import { Client } from '../../src/modules/customer/models/Client';
import { ClientProfile } from '../../src/modules/customer/models/ClientProfile';
import { User } from '../../src/modules/usermanager/models/User';
import { AppError } from '../../src/common/utils/AppError';
import { ClientStatus, KycStatus } from '../../src/modules/customer/enums/clientEnums';
import { CreateClientDto, VerifyKycDto } from '../../src/modules/customer/dto/clientDto';

describe('Client Service (Core CRM Lifecycle & KYC)', () => {
  let clientService: ClientService;

  beforeEach(() => {
    vi.restoreAllMocks();
    clientService = new ClientService();
  });

  describe('createClient - Duplicate Prevention', () => {
    const validDto: CreateClientDto = {
      firstName: 'Vikram',
      lastName: 'Mehta',
      email: 'vikram.mehta@example.com',
      phone: '9876543210',
      pan: 'ABCDE1234F',
    };

    it('should throw 409 Conflict if email already exists', async () => {
      vi.spyOn(Client, 'findOne').mockResolvedValueOnce({ _id: new Types.ObjectId() } as any);

      await expect(clientService.createClient(validDto)).rejects.toThrow(
        new AppError(`Client with email '${validDto.email}' already exists`, 409)
      );
    });

    it('should throw 409 Conflict if phone already exists', async () => {
      // First findOne (email) returns null, second findOne (phone) returns existing
      vi.spyOn(Client, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: new Types.ObjectId() } as any);

      await expect(clientService.createClient(validDto)).rejects.toThrow(
        new AppError(`Client with phone '${validDto.phone}' already exists`, 409)
      );
    });

    it('should throw 409 Conflict if PAN already exists', async () => {
      // First findOne (email) null, second (phone) null, third (pan) existing
      vi.spyOn(Client, 'findOne')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ _id: new Types.ObjectId() } as any);

      await expect(clientService.createClient(validDto)).rejects.toThrow(
        new AppError(`Client with PAN '${validDto.pan}' already exists`, 409)
      );
    });
  });

  describe('createClient - Automatic RM Assignment', () => {
    const currentAdvisorId = new Types.ObjectId().toString();
    const validDto: CreateClientDto = {
      firstName: 'Ananya',
      lastName: 'Iyer',
      email: 'ananya.iyer@example.com',
      phone: '9123456789',
      pan: 'XYZPA1234K',
    };

    it('should automatically assign currentUserId as RM when relationshipManagerId is not provided', async () => {
      vi.spyOn(Client, 'findOne').mockResolvedValue(null);

      const createdClientId = new Types.ObjectId();
      const mockCreatedClient = {
        _id: createdClientId,
        ...validDto,
        status: ClientStatus.ONBOARDING,
        relationshipManager: new Types.ObjectId(currentAdvisorId),
        signUpDate: new Date(),
        createdAt: new Date(),
      };

      vi.spyOn(Client, 'create').mockResolvedValue(mockCreatedClient as any);
      vi.spyOn(Client, 'findById').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockCreatedClient),
      } as any);
      vi.spyOn(ClientProfile, 'create').mockResolvedValue({
        _id: new Types.ObjectId(),
        client: createdClientId,
        kycStatus: KycStatus.PENDING,
        clientStatus: ClientStatus.ONBOARDING,
      } as any);

      const response = await clientService.createClient(validDto, currentAdvisorId);

      expect(Client.create).toHaveBeenCalledWith(
        expect.objectContaining({
          relationshipManager: new Types.ObjectId(currentAdvisorId),
          status: ClientStatus.ONBOARDING,
        })
      );
      expect(response.status).toBe(ClientStatus.ONBOARDING);
    });
  });

  describe('verifyKyc - The KYC Approval State Machine Trigger', () => {
    it('should promote client from ONBOARDING to ACTIVE when KYC is verified', async () => {
      const clientId = new Types.ObjectId().toString();

      const mockClient = {
        _id: new Types.ObjectId(clientId),
        status: ClientStatus.ONBOARDING,
        save: vi.fn().mockResolvedValue(true),
      };

      const mockProfile = {
        _id: new Types.ObjectId(),
        client: new Types.ObjectId(clientId),
        kycStatus: KycStatus.PENDING,
        clientStatus: ClientStatus.ONBOARDING,
        country: 'India',
        createdAt: new Date(),
        updatedAt: new Date(),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(Client, 'findById').mockResolvedValue(mockClient as any);
      vi.spyOn(ClientProfile, 'findOne').mockResolvedValue(mockProfile as any);

      const kycDto: VerifyKycDto = {
        kycStatus: KycStatus.VERIFIED,
      };

      const response = await clientService.verifyKyc(clientId, kycDto);

      // Asserts automatic promotion
      expect(mockClient.status).toBe(ClientStatus.ACTIVE);
      expect(mockProfile.clientStatus).toBe(ClientStatus.ACTIVE);
      expect(mockProfile.kycStatus).toBe(KycStatus.VERIFIED);
      expect(mockClient.save).toHaveBeenCalled();
      expect(mockProfile.save).toHaveBeenCalled();
      expect(response.kycStatus).toBe(KycStatus.VERIFIED);
      expect(response.clientStatus).toBe(ClientStatus.ACTIVE);
    });

    it('should throw 404 if client does not exist during KYC verification', async () => {
      vi.spyOn(Client, 'findById').mockResolvedValue(null);

      await expect(
        clientService.verifyKyc('nonexistent_id', { kycStatus: KycStatus.VERIFIED })
      ).rejects.toThrow(new AppError('Client not found', 404));
    });
  });
});
