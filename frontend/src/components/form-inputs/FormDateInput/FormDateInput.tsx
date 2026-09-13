import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import type { FormDateInputProps } from './types';
import './FormDateInput.scss';

export function FormDateInput({
  name,
  label,
  min,
  max,
  disabled = false,
  id,
  className = '',
}: FormDateInputProps): ReactElement {
  const { control } = useFormContext();
  const {
    field: {
      value, onChange, onBlur, ref,
    },
    fieldState: { error, isTouched },
  } = useController({ name, control });

  const inputId = id || `form-date-input-${name}`;
  const hasError = Boolean(error) && isTouched;

  const controlClasses = [
    'form-date-input__control',
    hasError ? 'form-date-input__control--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`form-date-input ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="form-date-input__label">
          {label}
        </label>
      ) : null}

      <input
        id={inputId}
        name={name}
        type="date"
        value={value ?? ''}
        onChange={onChange}
        onBlur={onBlur}
        ref={ref}
        min={min}
        max={max}
        disabled={disabled}
        className={controlClasses}
        aria-invalid={hasError}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
      />

      {hasError && error?.message ? (
        <span
          id={`${inputId}-error`}
          className="form-date-input__error-text"
          role="alert"
        >
          {error.message}
        </span>
      ) : null}
    </div>
  );
}
