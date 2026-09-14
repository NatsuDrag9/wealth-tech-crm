import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { baseApi } from '@/services/api/baseApi';
import {
  BackendTarget,
  getActiveBackend,
  setStoredBackend,
} from '@/config/backendConfig';
import { BackendToggleSwitchProps } from './types';
import './BackendToggleSwitch.scss';

export function BackendToggleSwitch({
  activeTarget,
  onChange,
  variant = 'compact',
  disabled = false,
  className = '',
}: BackendToggleSwitchProps): React.ReactElement {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [currentBackend, setCurrentBackend] = useState<BackendTarget>(() => (
    activeTarget || getActiveBackend()
  ));

  useEffect(() => {
    if (activeTarget && activeTarget !== currentBackend) {
      setCurrentBackend(activeTarget);
    }
  }, [activeTarget, currentBackend]);

  const handleSelect = (target: BackendTarget): void => {
    if (target === currentBackend || disabled) {
      return;
    }

    setStoredBackend(target);
    setCurrentBackend(target);

    // End current session and invalidate cached RTK Query state
    dispatch(logout());
    dispatch(baseApi.util.resetApiState());

    if (onChange) {
      onChange(target);
    }

    navigate('/login', { replace: true });
  };

  const getButtonClass = (target: BackendTarget): string => {
    const base = 'backend-toggle__btn';
    return target === currentBackend ? `${base} ${base}--active` : base;
  };

  const rootClass = [
    'backend-toggle',
    `backend-toggle--${variant}`,
    disabled ? 'backend-toggle--disabled' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={rootClass}
      role="group"
      aria-label="Backend selection"
    >
      <div className="backend-toggle__btn-group">
        <button
          type="button"
          className={getButtonClass('java')}
          onClick={() => handleSelect('java')}
          disabled={disabled}
          aria-pressed={currentBackend === 'java'}
          data-testid="backend-btn-java"
        >
          Java
        </button>

        <button
          type="button"
          className={getButtonClass('nodejs')}
          onClick={() => handleSelect('nodejs')}
          disabled={disabled}
          aria-pressed={currentBackend === 'nodejs'}
          data-testid="backend-btn-nodejs"
        >
          NodeJS
        </button>
      </div>
    </div>
  );
}

export default BackendToggleSwitch;
