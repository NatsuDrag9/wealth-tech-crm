import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { SingleSelectGenericDropdown } from '@/components/dropdowns';
import type { SingleSelectDropdownProps } from './types';

export function SingleSelectDropdown({
  name,
  options,
  label,
  placeholder,
  noDataMessage,
  disabled = false,
  id,
  className = '',
}: SingleSelectDropdownProps): ReactElement {
  const { control } = useFormContext();
  const {
    field: { value, onChange, onBlur },
    fieldState: { error, isTouched },
  } = useController({ name, control });

  const inputId = id || `single-select-${name}`;
  const hasError = Boolean(error) && isTouched;
  const errorMessage = hasError && error?.message ? error.message : undefined;

  return (
    <SingleSelectGenericDropdown
      id={inputId}
      options={options}
      value={value ?? null}
      onChange={(newValue) => {
        onChange(newValue);
      }}
      onBlur={onBlur}
      label={label}
      placeholder={placeholder}
      noDataMessage={noDataMessage}
      disabled={disabled}
      error={errorMessage}
      className={className}
    />
  );
}
