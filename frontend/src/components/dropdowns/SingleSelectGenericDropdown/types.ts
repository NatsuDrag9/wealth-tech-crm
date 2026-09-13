import type { DropdownType } from '@/types/genericTypes';

export interface SingleSelectGenericDropdownProps {
  options: DropdownType[];
  value?: string | null;
  onChange: (value: string, selectedOption: DropdownType) => void;
  label?: string;
  placeholder?: string;
  noDataMessage?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
}
