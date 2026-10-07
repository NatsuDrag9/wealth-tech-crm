export interface AgentContext {
  clientId: string;
  portfolioReviewId?: string;
  flowType: 'REPLACE_FUNDS' | 'NEW_PORTFOLIO';
  userGoal?: string;
}

export interface ToolParameterProperty {
  type: string;
  description: string;
  enum?: string[];
  items?: { type: string };
}

export interface ToolParametersSchema {
  type: 'OBJECT' | 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: ToolParametersSchema;
  execute(args: Record<string, unknown>, context: AgentContext): Promise<Record<string, unknown>>;
}

export interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
}
