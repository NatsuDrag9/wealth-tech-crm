import { BackendTarget } from '@/config/backendConfig';

export interface BackendToggleSwitchProps {
  /** Override active backend target (defaults to getActiveBackend()) */
  activeTarget?: BackendTarget;
  /** Optional callback fired when the backend target changes */
  onChange?: (target: BackendTarget) => void;
  /** Visual presentation style */
  variant?: 'compact' | 'full';
  /** Whether the toggle buttons are disabled */
  disabled?: boolean;
  /** Optional custom CSS class name */
  className?: string;
}
