import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { portfolioMcpServer } from './portfolioMcpServer';
import { logger } from '../../../common/utils/logger';

export class PortfolioMcpClient {
  private client: Client | null = null;
  private clientTransport: Transport | null = null;
  private serverTransport: Transport | null = null;
  private isConnected = false;

  /**
   * Establishes a standardized MCP connection to the Portfolio MCP Server.
   */
  public async connect(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    logger.info('Initializing MCP Client and connecting to Portfolio MCP Server over InMemoryTransport...');

    this.client = new Client(
      {
        name: 'wealthtech-portfolio-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    this.clientTransport = clientTransport;
    this.serverTransport = serverTransport;

    await portfolioMcpServer.getServer().connect(serverTransport);
    await this.client.connect(clientTransport);

    this.isConnected = true;
    logger.info('MCP Client successfully connected to MCP Server');
  }

  /**
   * Discovers available tools published by the MCP Server.
   */
  public async listTools(): Promise<Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }>> {
    await this.ensureConnected();

    if (!this.client) {
      throw new Error('MCP Client is not connected');
    }

    try {
      const response = await this.client.listTools();
      return (response.tools || []).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema as Record<string, unknown>,
      }));
    } catch (error: unknown) {
      logger.error({ err: error }, 'Failed to list tools from MCP Server');
      throw error;
    }
  }

  /**
   * Invokes an MCP tool across the standardized protocol boundary.
   */
  public async callTool(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.ensureConnected();

    if (!this.client) {
      throw new Error('MCP Client is not connected');
    }

    logger.info({ tool: name, args }, 'Dispatching tool call across MCP protocol boundary');

    try {
      const response = await this.client.callTool({
        name,
        arguments: args,
      });

      const contentPart = response.content?.[0];
      if (contentPart && contentPart.type === 'text') {
        try {
          return JSON.parse(contentPart.text) as Record<string, unknown>;
        } catch {
          return { raw: contentPart.text };
        }
      }

      return { result: response.content };
    } catch (error: unknown) {
      logger.error({ err: error, tool: name }, 'MCP tool invocation failed across protocol boundary');
      return {
        error: `MCP Tool execution failed for '${name}'.`,
      };
    }
  }

  public async disconnect(): Promise<void> {
    if (this.clientTransport) {
      await this.clientTransport.close();
    }
    if (this.serverTransport) {
      await this.serverTransport.close();
    }
    this.client = null;
    this.isConnected = false;
    logger.info('MCP Client disconnected');
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isConnected || !this.client) {
      await this.connect();
    }
  }
}

export const portfolioMcpClient = new PortfolioMcpClient();
