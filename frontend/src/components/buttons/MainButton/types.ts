import type { MouseEvent, ReactNode } from 'react';
import type { MAIN_BUTTON_VARIANTS, MAIN_BUTTON_SIZES } from './constants';

export type MainButtonVariant = (typeof MAIN_BUTTON_VARIANTS)[number];
export type MainButtonSize = (typeof MAIN_BUTTON_SIZES)[number];

export interface MainButtonProps {
  label: string;
  variant?: MainButtonVariant;
  size?: MainButtonSize;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  isLoading?: boolean;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  id?: string;
  formId?: string;
  title?: string;
}
