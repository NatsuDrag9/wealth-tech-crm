import type { ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import type { FormTextAreaProps } from './types';
import './FormTextArea.scss';

export function FormTextArea({
  name,
  label,
  placeholder,
  disabled = false,
  id,
  className = '',
}: FormTextAreaProps): ReactElement {
  const { control } = useFormContext();
  const {
    field: {
      value, onChange, onBlur, ref,
    },
    fieldState: { error, isTouched },
  } = useController({ name, control });

  const inputId = id || `form-textarea-${name}`;
  const hasError = Boolean(error) && isTouched;

  const controlClasses = [
    'form-textarea__control',
    hasError ? 'form-textarea__control--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`form-textarea ${className}`.trim()}>
      {label ? (
        <label htmlFor={inputId} className="form-textarea__label">
          {label}
        </label>
      ) : null}

      <textarea
        id={inputId}
        name={name}
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
          className="form-textarea__error-text"
          role="alert"
        >
          {error.message}
        </span>
      ) : null}
    </div>
  );
}
