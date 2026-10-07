export type AgentMode = 'vanilla' | 'framework' | 'mcp';

export const AGENT_STORAGE_KEY = 'crm_active_agent_mode';

export const DEFAULT_AGENT_MODE: AgentMode = 'vanilla';

export interface AgentModeOption {
  value: AgentMode;
  label: string;
  badge: string;
  description: string;
  frameworkDetails: {
    java: string;
    nodejs: string;
  };
}

export const AGENT_MODE_OPTIONS: readonly AgentModeOption[] = [
  {
    value: 'vanilla',
    label: 'Vanilla Agent',
    badge: 'Step 1: ReAct Loop',
    description: 'Deterministic while-loop, hand-built ReAct reasoning, step-bounded guardrails, and dual-pass PII tokenization.',
    frameworkDetails: {
      java: 'VanillaAgentExecutor (Imperative while-loop, AgentToolRegistry)',
      nodejs: 'vanillaAgentExecutor (Async turn-loop, ToolRegistry)',
    },
  },
  {
    value: 'framework',
    label: 'AI Framework',
    badge: 'Step 2: Abstraction',
    description: 'Declarative framework orchestration with StateGraph DAG workflow (Node.js) or Spring AI ChatClient (Java).',
    frameworkDetails: {
      java: 'SpringAiChatClientExecutor (@Tool annotations, FrameworkToolRegistry)',
      nodejs: 'LangGraphAgentStrategy (StateGraph, ToolNode, conditional routing)',
    },
  },
  {
    value: 'mcp',
    label: 'Model Context Protocol',
    badge: 'Step 3: MCP Standard',
    description: 'Decoupled JSON-RPC 2.0 protocol boundary (tools/list & tools/call) adhering to Model Context Protocol standards.',
    frameworkDetails: {
      java: 'McpAgentExecutor + McpClient / McpServer (io.modelcontextprotocol.sdk:mcp)',
      nodejs: 'McpAgentStrategy + McpClient / McpServer (@modelcontextprotocol/sdk)',
    },
  },
] as const;

export function getActiveAgentMode(): AgentMode {
  const stored = localStorage.getItem(AGENT_STORAGE_KEY);
  if (stored === 'vanilla' || stored === 'framework' || stored === 'mcp') {
    return stored;
  }
  return DEFAULT_AGENT_MODE;
}

export function setActiveAgentMode(mode: AgentMode): void {
  localStorage.setItem(AGENT_STORAGE_KEY, mode);
}
