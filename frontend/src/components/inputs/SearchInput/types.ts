export interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  onSearch?: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  debounceMs?: number;
  disabled?: boolean;
  isLoading?: boolean;
  id?: string;
  className?: string;
  ariaLabel?: string;
}
