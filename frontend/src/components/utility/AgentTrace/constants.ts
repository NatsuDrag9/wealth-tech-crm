export const AGENT_MODE_LABELS: Record<string, string> = {
  vanilla: 'Vanilla Agent (ReAct Loop)',
  framework: 'AI Framework (LangGraph / Spring AI)',
  mcp: 'Model Context Protocol (MCP Client/Server)',
};

export const EMPTY_TRACE_MESSAGE = 'No autonomous agent traces recorded yet. '
  + 'Execute "Perform with AI" on the Portfolio Advisory tab to inspect execution steps.';
