export type FormInputType = 'text' | 'email' | 'tel' | 'number' | 'password';

export interface FormInputProps {
  name: string;
  label?: string;
  type?: FormInputType;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}
