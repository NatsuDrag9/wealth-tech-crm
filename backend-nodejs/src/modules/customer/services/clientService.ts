import { FilterQuery, Types } from 'mongoose';
import { Client, IClient } from '../models/Client';
import { ClientProfile, IClientProfile } from '../models/ClientProfile';
import { User } from '../../usermanager/models/User';
import {
  CreateClientDto,
  UpdateClientStatusDto,
  UpdateClientRmDto,
  VerifyKycDto,
  BulkReassignRmDto,
  ClientResponseDto,
  ClientProfileResponseDto,
} from '../dto/clientDto';
import { clientExcelService } from './clientExcelService';
import { DropdownOption } from '../../../common/types/dropdown';
import { ClientStatus, KycStatus } from '../enums/clientEnums';
import { CursorPaginationResponse } from '../../../common/types/pagination';
import { logger } from '../../../common/utils/logger';
import { AppError } from '../../../common/utils/AppError';

interface PopulatedRm {
  _id: Types.ObjectId;
  fullName?: string;
  email: string;
}

type PopulatedClient = Omit<IClient, 'relationshipManager'> & {
  relationshipManager?: Types.ObjectId | PopulatedRm | null;
};

export class ClientService {
  // Helper to format a populated Client document into ClientResponseDto
  private mapToClientResponse(client: PopulatedClient, profile?: IClientProfile | null): ClientResponseDto {
    let rmDropdown: DropdownOption<string> | null = null;

    if (
      client.relationshipManager &&
      typeof client.relationshipManager === 'object' &&
      '_id' in client.relationshipManager
    ) {
      const rm = client.relationshipManager as PopulatedRm;
      rmDropdown = {
        display_name: rm.fullName || rm.email,
        value: rm._id.toString(),
      };
    }

    const kycStatus = profile?.kycStatus || KycStatus.PENDING;

    return {
      id: client._id.toString(),
      firstName: client.firstName,
      lastName: client.lastName,
      fullName: client.fullName || `${client.firstName} ${client.lastName}`.trim(),
      email: client.email,
      phone: client.phone,
      pan: client.pan,
      dateOfBirth: client.dateOfBirth,
      gender: client.gender,
      status: client.status,
      kycStatus,
      relationshipManager: rmDropdown,
      signUpDate: client.signUpDate,
      createdAt: client.createdAt,
    };
  }

  // Format ClientProfile document into ClientProfileResponseDto
  private mapToProfileResponse(profile: IClientProfile): ClientProfileResponseDto {
    return {
      id: profile._id.toString(),
      clientId: profile.client.toString(),
      kycStatus: profile.kycStatus,
      clientStatus: profile.clientStatus,
      addressLine: profile.addressLine,
      city: profile.city,
      state: profile.state,
      pincode: profile.pincode,
      country: profile.country,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  // List clients with cursor pagination and multi-field search/filtering
  async getClients(params: {
    status?: ClientStatus;
    rmId?: string;
    search?: string;
    cursor?: string;
    pageSize?: number;
  }): Promise<CursorPaginationResponse<ClientResponseDto>> {
    const limit = Math.min(params.pageSize || 50, 1500);
    const filter: FilterQuery<IClient> = {};

    if (params.status) {
      filter.status = params.status;
    }

    if (params.rmId) {
      filter.relationshipManager = new Types.ObjectId(params.rmId);
    }

    if (params.search) {
      const searchRegex = { $regex: String(params.search), $options: 'i' };
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { pan: searchRegex },
      ];
    }

    if (params.cursor) {
      filter._id = { $gt: new Types.ObjectId(params.cursor) };
    }

    const [clients, totalCount] = await Promise.all([
      Client.find(filter)
        .populate('relationshipManager', 'fullName email')
        .sort({ _id: 1 })
        .limit(limit + 1),
      Client.countDocuments(params.search || params.status || params.rmId ? filter : {}),
    ]);

    const hasNextPage = clients.length > limit;
    const results = hasNextPage ? clients.slice(0, limit) : clients;
    const nextCursor = hasNextPage ? results[results.length - 1]._id.toString() : null;

    // Fetch corresponding profiles in parallel to attach kycStatus
    const clientIds = results.map((c) => c._id);
    const profiles = await ClientProfile.find({ client: { $in: clientIds } });
    const profileMap = new Map(profiles.map((p) => [p.client.toString(), p]));

    const responseResults = results.map((c) =>
      this.mapToClientResponse(c as unknown as PopulatedClient, profileMap.get(c._id.toString()))
    );

    return {
      results: responseResults,
      next: nextCursor,
      previous: null,
      pageNumber: null,
      totalPages: null,
      totalSize: totalCount,
    };
  }

  // Get single client by ID
  async getClientById(id: string): Promise<ClientResponseDto> {
    const client = await Client.findById(id).populate('relationshipManager', 'fullName email');
    if (!client) {
      logger.warn({ clientId: id }, 'Client lookup failed: Client not found');
      throw new AppError('Client not found', 404);
    }

    const profile = await ClientProfile.findOne({ client: client._id });
    return this.mapToClientResponse(client as unknown as PopulatedClient, profile);
  }

  // Get client KYC profile
  async getClientProfile(clientId: string): Promise<ClientProfileResponseDto> {
    const profile = await ClientProfile.findOne({ client: clientId });
    if (!profile) {
      logger.warn({ clientId }, 'Client profile lookup failed: Profile not found');
      throw new AppError('Client profile not found', 404);
    }

    return this.mapToProfileResponse(profile);
  }

  // Create client and associated profile
  async createClient(data: CreateClientDto, currentUserId?: string): Promise<ClientResponseDto> {
    const { firstName, lastName, email, phone, pan } = data;

    // Check unique email
    const existingEmail = await Client.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      logger.warn({ email }, 'Client creation failed: Email already exists');
      throw new AppError(`Client with email '${email}' already exists`, 409);
    }

    // Check unique phone
    const existingPhone = await Client.findOne({ phone: phone.trim() });
    if (existingPhone) {
      logger.warn({ phone }, 'Client creation failed: Phone already exists');
      throw new AppError(`Client with phone '${phone}' already exists`, 409);
    }

    // Check unique PAN (if provided)
    if (pan && pan.trim()) {
      const existingPan = await Client.findOne({ pan: pan.trim().toUpperCase() });
      if (existingPan) {
        logger.warn({ pan }, 'Client creation failed: PAN already exists');
        throw new AppError(`Client with PAN '${pan}' already exists`, 409);
      }
    }

    // Resolve RM - explicit RM assignment or auto-assign current user
    let rmId: Types.ObjectId | null = null;
    if (data.relationshipManagerId) {
      const rmUser = await User.findById(data.relationshipManagerId);
      if (!rmUser) {
        logger.warn({ rmId: data.relationshipManagerId }, 'Client creation failed: RM user not found');
        throw new AppError('Specified Relationship Manager does not exist', 404);
      }
      rmId = rmUser._id;
    } else if (currentUserId) {
      rmId = new Types.ObjectId(currentUserId);
    }

    // Create Client document
    const client = await Client.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      pan: pan ? pan.trim().toUpperCase() : undefined,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      status: ClientStatus.ONBOARDING,
      relationshipManager: rmId,
      signUpDate: new Date(),
      createdBy: currentUserId ? new Types.ObjectId(currentUserId) : undefined,
    });

    // Create corresponding ClientProfile document
    const profile = await ClientProfile.create({
      client: client._id,
      kycStatus: KycStatus.PENDING,
      clientStatus: ClientStatus.ONBOARDING,
      addressLine: data.addressLine,
      city: data.city,
      state: data.state,
      pincode: data.pincode,
      country: data.country || 'India',
    });

    const populatedClient = await Client.findById(client._id).populate(
      'relationshipManager',
      'fullName email'
    );

    logger.info({ clientId: client._id, email: client.email }, 'Client and profile created successfully');
    return this.mapToClientResponse(populatedClient as unknown as PopulatedClient, profile);
  }

  // Update client operational status
  async updateClientStatus(id: string, data: UpdateClientStatusDto): Promise<ClientResponseDto> {
    const client = await Client.findById(id).populate('relationshipManager', 'fullName email');
    if (!client) {
      logger.warn({ clientId: id }, 'Update status failed: Client not found');
      throw new AppError('Client not found', 404);
    }

    client.status = data.status;
    await client.save();

    // Synchronize status in ClientProfile
    const profile = await ClientProfile.findOne({ client: client._id });
    if (profile) {
      profile.clientStatus = data.status;
      await profile.save();
    }

    logger.info({ clientId: id, newStatus: data.status }, 'Client status updated successfully');
    return this.mapToClientResponse(client as unknown as PopulatedClient, profile);
  }

  // Update client Relationship Manager
  async updateClientRm(id: string, data: UpdateClientRmDto): Promise<ClientResponseDto> {
    const client = await Client.findById(id);
    if (!client) {
      logger.warn({ clientId: id }, 'Update RM failed: Client not found');
      throw new AppError('Client not found', 404);
    }

    const rmUser = await User.findById(data.rmId);
    if (!rmUser) {
      logger.warn({ rmId: data.rmId }, 'Update RM failed: RM user not found');
      throw new AppError('Relationship Manager not found', 404);
    }

    client.relationshipManager = rmUser._id;
    await client.save();

    const populatedClient = await Client.findById(client._id).populate(
      'relationshipManager',
      'fullName email'
    );
    const profile = await ClientProfile.findOne({ client: client._id });

    logger.info({ clientId: id, rmId: data.rmId }, 'Client RM reassigned successfully');
    return this.mapToClientResponse(populatedClient as unknown as PopulatedClient, profile);
  }

  // Verify KYC (approving KYC activates client)
  async verifyKyc(clientId: string, data: VerifyKycDto): Promise<ClientProfileResponseDto> {
    const client = await Client.findById(clientId);
    if (!client) {
      logger.warn({ clientId }, 'Verify KYC failed: Client not found');
      throw new AppError('Client not found', 404);
    }

    const profile = await ClientProfile.findOne({ client: clientId });
    if (!profile) {
      logger.warn({ clientId }, 'Verify KYC failed: Profile not found');
      throw new AppError('Client profile not found', 404);
    }

    profile.kycStatus = data.kycStatus;

    // Automatic Lifecycle Transition: Verified KYC activates the client
    if (data.kycStatus === KycStatus.VERIFIED) {
      client.status = ClientStatus.ACTIVE;
      profile.clientStatus = ClientStatus.ACTIVE;
      await client.save();
    }

    await profile.save();
    logger.info({ clientId, kycStatus: data.kycStatus }, 'Client KYC verified and status updated');
    return this.mapToProfileResponse(profile);
  }

  // Bulk reassign Relationship Manager
  async bulkReassignRm(data: BulkReassignRmDto): Promise<{ message: string; count: number }> {
    const rmUser = await User.findById(data.newRmId);
    if (!rmUser) {
      logger.warn({ rmId: data.newRmId }, 'Bulk reassign failed: New RM user not found');
      throw new AppError('Relationship Manager not found', 404);
    }

    const clientObjectIds = data.clientIds.map((id: string) => new Types.ObjectId(id));
    const result = await Client.updateMany(
      { _id: { $in: clientObjectIds } },
      { $set: { relationshipManager: rmUser._id } }
    );

    logger.info(
      { newRmId: data.newRmId, modifiedCount: result.modifiedCount },
      'Bulk reassigned relationship manager'
    );

    return {
      message: 'Successfully reassigned relationship manager',
      count: result.modifiedCount,
    };
  }

  // Process bulk upload asynchronously in background
  async processBulkUploadAsync(buffer: Buffer, currentUserId?: string): Promise<void> {
    logger.info({ currentUserId }, 'Starting background bulk client upload ingestion');
    try {
      const requests = await clientExcelService.parseClientExcel(buffer);
      logger.info({ totalRecords: requests.length }, 'Parsed records from uploaded Excel');

      let savedCount = 0;
      let skippedCount = 0;

      for (const req of requests) {
        // Skip duplicate records
        const duplicate = await Client.findOne({
          $or: [
            { email: req.email },
            { phone: req.phone },
            ...(req.pan ? [{ pan: req.pan }] : []),
          ],
        });

        if (duplicate) {
          logger.warn(
            { email: req.email, phone: req.phone, pan: req.pan },
            'Skipping duplicate client in bulk upload'
          );
          skippedCount++;
          continue;
        }

        try {
          await this.createClient(req, currentUserId);
          savedCount++;
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          logger.error({ email: req.email, err: errMsg }, 'Failed to save client in bulk upload');
          skippedCount++;
        }
      }

      logger.info(
        { savedCount, skippedCount },
        'Background bulk client upload ingestion finished'
      );
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ err: errMsg }, 'Failed to process bulk client upload');
    }
  }
}

export const clientService = new ClientService();