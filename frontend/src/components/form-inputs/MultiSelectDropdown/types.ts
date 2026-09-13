import type { DropdownType } from '@/types/genericTypes';

export interface MultiSelectDropdownProps {
  name: string;
  options: DropdownType[];
  label?: string;
  placeholder?: string;
  noDataMessage?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}
