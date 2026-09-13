import type { AnyObjectSchema } from 'yup';
import type { DefaultValues, FieldValues } from 'react-hook-form';
import type { DropdownType } from '@/types/genericTypes';
import type { FormInputType } from '@/components/form-inputs';

interface BaseFieldConfig {
  name: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  colSpan?: 1 | 2;
  id?: string;
}

export interface InputFieldConfig extends BaseFieldConfig {
  fieldType: 'input';
  inputType?: FormInputType;
}

export interface TextAreaFieldConfig extends BaseFieldConfig {
  fieldType: 'textarea';
}

export interface SingleSelectFieldConfig extends BaseFieldConfig {
  fieldType: 'select';
  options: DropdownType[];
  noDataMessage?: string;
}

export interface MultiSelectFieldConfig extends BaseFieldConfig {
  fieldType: 'multiselect';
  options: DropdownType[];
  noDataMessage?: string;
}

export type FormFieldConfig =
  | InputFieldConfig
  | TextAreaFieldConfig
  | SingleSelectFieldConfig
  | MultiSelectFieldConfig;

export interface FormBuilderProps<T extends FieldValues> {
  id?: string;
  fields: FormFieldConfig[];
  validationSchema?: AnyObjectSchema;
  defaultValues: DefaultValues<T>;
  onSubmit: (data: T) => void | Promise<void>;
  submitText?: string;
  cancelText?: string;
  onCancel?: () => void;
  isLoading?: boolean;
  className?: string;
}
