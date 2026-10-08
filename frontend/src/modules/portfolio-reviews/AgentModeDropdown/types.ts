import type { AgentMode } from '@/config/agentConfig';

export interface AgentModeDropdownProps {
  value: AgentMode;
  onChange: (mode: AgentMode) => void;
  disabled?: boolean;
  compact?: boolean;
}
