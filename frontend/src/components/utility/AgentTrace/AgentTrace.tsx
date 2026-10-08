import {
  useState,
  type ReactElement,
} from 'react';
import {
  Bot,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store';
import {
  closeTraceModal,
  toggleTraceModal,
} from '@/store/slices/agentSlice';
import { getActiveBackend } from '@/config/backendConfig';
import type { AgentStepTrace } from '@/definitions/agentTypes';
import {
  AGENT_MODE_LABELS,
  EMPTY_TRACE_MESSAGE,
} from './constants';
import type {
  StepLedgerItemProps,
  TraceModalProps,
} from './types';
import './AgentTrace.scss';

function StepLedgerItem({
  step,
  stepNumber,
  isExpanded,
  onToggle,
}: StepLedgerItemProps): ReactElement {
  const isSuccess = step.success !== false;

  return (
    <div className="step-item">
      <button
        type="button"
        className="step-item__header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="step-item__header-left">
          <span className="step-item__step-num">{stepNumber}</span>
          <span className="step-item__tool-name">{step.toolName || 'Unknown Tool'}</span>
        </div>

        <div className="step-item__header-right">
          {isSuccess ? (
            <CheckCircle size={14} className="text-success" />
          ) : (
            <XCircle size={14} className="text-danger" />
          )}
          <span className="step-item__duration">{`${step.durationMs}ms`}</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {isExpanded ? (
        <div className="step-item__details">
          {step.arguments && Object.keys(step.arguments).length > 0 ? (
            <div className="step-item__section">
              <span className="step-item__section-label">Tool Arguments:</span>
              <pre className="step-item__code-block">
                {JSON.stringify(step.arguments, null, 2)}
              </pre>
            </div>
          ) : null}

          {step.observation ? (
            <div className="step-item__section">
              <span className="step-item__section-label">Observation:</span>
              <pre className="step-item__code-block">
                {step.observation}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TraceModal({
  isOpen,
  onClose,
  result,
}: TraceModalProps): ReactElement | null {
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const backendName = getActiveBackend() === 'java'
    ? 'Java Spring Boot'
    : 'Node.js Express';

  const modeLabel = result?.agentMode
    ? (AGENT_MODE_LABELS[result.agentMode] ?? result.agentMode)
    : 'Not Executed Yet';

  const isSuccess = result?.status === 'SUCCESS' || result?.success;
  const statusClass = isSuccess
    ? 'agent-trace-modal__status-pill--success'
    : 'agent-trace-modal__status-pill--failed';

  function toggleStep(idx: number) {
    setExpandedSteps((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  }

  return (
    <div className="agent-trace-modal" role="dialog" aria-modal="true">
      <div className="agent-trace-modal__container">
        <div className="agent-trace-modal__header">
          <div className="agent-trace-modal__header-left">
            <Activity size={20} />
            <div>
              <div className="agent-trace-modal__title">AI Agent Execution Trace</div>
              <div className="agent-trace-modal__subtitle">Autonomous Advisory Observability</div>
            </div>
          </div>

          <button
            type="button"
            className="agent-trace-modal__close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="agent-trace-modal__body">
          {result ? (
            <>
              {/* Runtime and Engine Banner */}
              <div className="agent-trace-modal__runtime-banner">
                <div className="agent-trace-modal__meta-item">
                  <span className="agent-trace-modal__meta-item-label">Backend Runtime</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={14} />
                    <span className="agent-trace-modal__meta-item-value">{backendName}</span>
                  </div>
                </div>

                <div className="agent-trace-modal__meta-item">
                  <span className="agent-trace-modal__meta-item-label">Agent Strategy</span>
                  <span className="agent-trace-modal__meta-item-value">{modeLabel}</span>
                </div>

                <div className="agent-trace-modal__meta-item">
                  <span className="agent-trace-modal__meta-item-label">Status</span>
                  <span className={`agent-trace-modal__status-pill ${statusClass}`}>
                    {result.status}
                  </span>
                </div>

                <div className="agent-trace-modal__meta-item">
                  <span className="agent-trace-modal__meta-item-label">Total Latency</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} />
                    <span className="agent-trace-modal__meta-item-value">
                      {`${result.totalDurationMs ?? 0}ms`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Execution Summary */}
              {result.summary ? (
                <div className="agent-trace-modal__summary-card">
                  <div className="agent-trace-modal__summary-card-title">Executive Summary</div>
                  <div className="agent-trace-modal__summary-card-text">{result.summary}</div>
                </div>
              ) : null}

              {/* Tool Steps Ledger */}
              <div className="agent-trace-modal__ledger">
                <div className="agent-trace-modal__ledger-title">
                  {`Execution Steps Ledger (${result.toolSteps.length})`}
                </div>

                {result.toolSteps.map((step: AgentStepTrace, idx: number) => (
                  <StepLedgerItem
                    key={step.step || idx}
                    step={step}
                    stepNumber={idx + 1}
                    isExpanded={Boolean(expandedSteps[idx])}
                    onToggle={() => toggleStep(idx)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="agent-trace-modal__empty">
              {EMPTY_TRACE_MESSAGE}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AgentTrace(): ReactElement {
  const dispatch = useAppDispatch();
  const latestResult = useAppSelector((state) => state.agent.latestResult);
  const isTraceModalOpen = useAppSelector((state) => state.agent.isTraceModalOpen);

  function handleToggle() {
    dispatch(toggleTraceModal());
  }

  function handleClose() {
    dispatch(closeTraceModal());
  }

  return (
    <>
      <button
        type="button"
        className="agent-trace-fab"
        onClick={handleToggle}
        title="Open AI Agent Trace Ledger"
        aria-label="Open AI Agent Trace Ledger"
      >
        <div className="agent-trace-fab__icon">
          <Bot size={22} />
        </div>
        {latestResult ? <div className="agent-trace-fab__badge" /> : null}
      </button>

      <TraceModal
        isOpen={isTraceModalOpen}
        onClose={handleClose}
        result={latestResult}
      />
    </>
  );
}
