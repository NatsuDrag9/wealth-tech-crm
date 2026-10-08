import type { AgentStepTrace, AgentExecutionResult } from '@/definitions/agentTypes';

export interface StepLedgerItemProps {
  step: AgentStepTrace;
  stepNumber: number;
  isExpanded: boolean;
  onToggle: () => void;
}

export interface TraceModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: AgentExecutionResult | null;
}
