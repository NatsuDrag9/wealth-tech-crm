import type { DropdownType } from '@/types/genericTypes';

export interface SingleSelectDropdownProps {
  name: string;
  options: DropdownType[];
  label?: string;
  placeholder?: string;
  noDataMessage?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}
