import { AgentContext, AgentTool, GeminiFunctionDeclaration } from './types';
import { clientTool } from './clientTool';
import { riskAssessmentTool } from './riskAssessmentTool';
import { portfolioReviewTool } from './portfolioReviewTool';
import { fundResearchRagTool } from './fundResearchRagTool';
import { stageRecommendationDraftTool } from './stageRecommendationDraftTool';
import { logger } from '../../../common/utils/logger';

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  constructor() {
    this.register(clientTool);
    this.register(riskAssessmentTool);
    this.register(portfolioReviewTool);
    this.register(fundResearchRagTool);
    this.register(stageRecommendationDraftTool);
  }

  public register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Converts registered tools to Google Gemini function declaration schemas.
   */
  public getGeminiFunctionDeclarations(): GeminiFunctionDeclaration[] {
    return this.getAllTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  /**
   * Safely dispatches tool execution by name with error logging.
   */
  public async executeTool(
    name: string,
    args: Record<string, unknown>,
    context: AgentContext
  ): Promise<Record<string, unknown>> {
    const tool = this.getTool(name);
    if (!tool) {
      logger.warn({ toolName: name }, 'Agent requested unknown tool');
      return {
        error: `Tool '${name}' is not recognized in the Tool Registry.`,
      };
    }

    try {
      logger.info({ toolName: name, args }, 'Executing agent tool...');
      const result = await tool.execute(args, context);
      return result;
    } catch (error: unknown) {
      logger.error({ err: error, toolName: name, args }, 'Tool execution threw an unhandled exception');
      return {
        error: `Tool '${name}' failed during execution: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export const toolRegistry = new ToolRegistry();
