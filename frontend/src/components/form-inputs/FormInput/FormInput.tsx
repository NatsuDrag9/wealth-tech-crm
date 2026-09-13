import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import type { FormInputProps } from './types';
import './FormInput.scss';

export function FormInput({
  name,
  label,
  type = 'text',
  placeholder,
  disabled = false,
  id,
  className = '',
}: FormInputProps): ReactElement {
  const { control } = useFormContext();
  const {
    field: {
      value, onChange, onBlur, ref,
    },
    fieldState: { error, isTouched },
  } = useController({ name, control });

  const inputId = id || `form-input-${name}`;
  const hasError = Boolean(error) && isTouched;

  const controlClasses = [
    'form-input__control',
    hasError ? 'form-input__control--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`form-input ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="form-input__label">
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
        placeholder={placeholder}
        disabled={disabled}
        className={controlClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
      />

      {hasError && error?.message ? (
        <span
          id={`${inputId}-error`}
          className="form-input__error-text"
          role="alert"
        >
          {error.message}
        </span>
      ) : null}
    </div>
  );
}
