import type { DropdownType } from '@/types/genericTypes';

export const DEFAULT_DROPDOWN_PLACEHOLDER = 'Select an option';
export const NO_DATA_MESSAGE = 'No options available';

export const MOCK_DROPDOWN_OPTIONS: DropdownType[] = [
  { value: 'CONSERVATIVE', displayName: 'Conservative' },
  { value: 'MODERATE', displayName: 'Moderate' },
  { value: 'GROWTH', displayName: 'Growth' },
  { value: 'AGGRESSIVE', displayName: 'Aggressive' },
];
