import type { ReactElement } from 'react';
import type { MainButtonProps } from './types';
import './MainButton.scss';

export function MainButton({
  label,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  isLoading = false,
  onClick,
  className = '',
  ariaLabel,
  icon,
  iconPosition = 'left',
  id,
  formId,
  title,
}: MainButtonProps): ReactElement {
  const isButtonDisabled = disabled || isLoading;

  const classNames = [
    'main-btn',
    `main-btn--${variant}`,
    `main-btn--${size}`,
    isLoading ? 'main-btn--loading' : '',
    isButtonDisabled ? 'main-btn--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      id={id}
      form={formId}
      type={type === 'submit' ? 'submit' : 'button'}
      disabled={isButtonDisabled}
      onClick={onClick}
      className={classNames}
      aria-label={ariaLabel || label}
      aria-busy={isLoading}
      aria-disabled={isButtonDisabled}
      title={title}
    >
      {isLoading ? (
        <span className="main-btn__spinner" aria-hidden="true" />
      ) : null}

      {!isLoading && icon && iconPosition === 'left' ? (
        <span className="main-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}

      <span className="main-btn__label">{label}</span>

      {!isLoading && icon && iconPosition === 'right' ? (
        <span className="main-btn__icon" aria-hidden="true">
          {icon}
        </span>
      ) : null}
    </button>
  );
}

export default MainButton;
