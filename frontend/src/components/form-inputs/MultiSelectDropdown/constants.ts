import type { DropdownType } from '@/types/genericTypes';

export const DEFAULT_MULTI_SELECT_PLACEHOLDER = 'Select options...';
export const NO_DATA_MESSAGE = 'No options available';
export const TYPEAHEAD_TIMEOUT_MS = 500;

export const MOCK_MULTI_SELECT_OPTIONS: DropdownType[] = [
  { value: 'EQUITIES', displayName: 'Equities' },
  { value: 'FIXED_INCOME', displayName: 'Fixed Income' },
  { value: 'REAL_ESTATE', displayName: 'Real Estate' },
  { value: 'COMMODITIES', displayName: 'Commodities' },
  { value: 'CASH', displayName: 'Cash & Equivalents' },
  { value: 'ALTERNATIVES', displayName: 'Alternative Investments' },
];
