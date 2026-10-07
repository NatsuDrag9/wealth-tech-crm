import { Client } from '../../customer/models/Client';
import { ClientProfile } from '../../customer/models/ClientProfile';
import { AgentContext, AgentTool } from './types';
import { logger } from '../../../common/utils/logger';

export class ClientTool implements AgentTool {
  public readonly name = 'getClientDetails';
  public readonly description =
    'Fetches client profile, KYC verification status, and assigned Relationship Manager details by client ID.';

  public readonly parameters = {
    type: 'OBJECT' as const,
    properties: {
      clientId: {
        type: 'STRING',
        description: 'The unique MongoDB ObjectID or ID string of the client',
      },
    },
    required: ['clientId'],
  };

  public async execute(
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const clientId = String(args.clientId || context.clientId);

    try {
      const client = await Client.findById(clientId);
      if (!client) {
        return {
          found: false,
          error: `Client with ID '${clientId}' was not found.`,
        };
      }

      const profile = await ClientProfile.findOne({ client: client._id });

      return {
        found: true,
        clientId: client._id.toString(),
        fullName: `${client.firstName} ${client.lastName}`,
        email: client.email,
        phone: client.phone,
        pan: client.pan || 'NOT_PROVIDED',
        status: client.status,
        kycStatus: profile?.kycStatus || 'UNKNOWN',
        addressLine: profile?.addressLine || 'N/A',
        city: profile?.city || 'N/A',
        pincode: profile?.pincode || 'N/A',
      };
    } catch (error: unknown) {
      logger.error({ err: error, clientId }, 'Error executing getClientDetails tool');
      return {
        found: false,
        error: `Database lookup failed for client '${clientId}'.`,
      };
    }
  }
}

export const clientTool = new ClientTool();
