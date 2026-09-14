import { useState, type ReactElement } from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
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

  const [showPassword, setShowPassword] = useState(false);
  const inputId = id || `form-input-${name}`;
  const hasError = Boolean(error) && isTouched;
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  const controlClasses = [
    'form-input__control',
    isPassword ? 'form-input__control--password' : '',
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

      <div className="form-input__control-wrapper">
        <input
          id={inputId}
          name={name}
          type={resolvedType}
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

        {isPassword ? (
          <button
            type="button"
            className="form-input__toggle-password-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            tabIndex={-1}
            disabled={disabled}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>

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
