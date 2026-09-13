import type { Control, FieldValues, Path } from 'react-hook-form';

export type FormInputType = 'text' | 'email' | 'tel' | 'number';

export interface FormInputProps<T extends FieldValues = FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label?: string;
  type?: FormInputType;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}
