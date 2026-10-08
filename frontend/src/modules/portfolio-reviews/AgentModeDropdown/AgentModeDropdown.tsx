import { type ReactElement, useMemo } from 'react';
import { Bot } from 'lucide-react';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import type { DropdownType } from '@/types/genericTypes';
import {
  AGENT_MODE_OPTIONS,
} from '@/config/agentConfig';
import type { AgentModeDropdownProps } from './types';
import './AgentModeDropdown.scss';

export function AgentModeDropdown({
  value,
  onChange,
  disabled = false,
  compact = false,
}: AgentModeDropdownProps): ReactElement {
  const options = useMemo<DropdownType[]>(
    () => AGENT_MODE_OPTIONS.map((opt) => ({
      displayName: `${opt.label} (${opt.badge})`,
      value: opt.value,
    })),
    [],
  );

  const selectedOpt = useMemo(
    () => AGENT_MODE_OPTIONS.find((o) => o.value === value) ?? AGENT_MODE_OPTIONS[0],
    [value],
  );

  return (
    <div className={`agent-mode-dropdown ${compact ? 'agent-mode-dropdown--compact' : ''}`}>
      <div className="agent-mode-dropdown__header">
        <Bot size={14} className="agent-mode-dropdown__icon" />
        <span className="agent-mode-dropdown__label">Agent Engine:</span>
      </div>
      <div className="agent-mode-dropdown__select-wrapper">
        <SingleSelectGenericDropdown
          id="agent-mode-selector"
          options={options}
          value={value}
          onChange={(val) => {
            if (val === 'vanilla' || val === 'framework' || val === 'mcp') {
              onChange(val);
            }
          }}
          disabled={disabled}
          placeholder="Select Agent Engine..."
        />
      </div>
      {!compact ? (
        <span className="agent-mode-dropdown__hint" title={selectedOpt.description}>
          {selectedOpt.description}
        </span>
      ) : null}
    </div>
  );
}
