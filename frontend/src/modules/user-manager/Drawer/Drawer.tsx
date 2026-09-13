import { useEffect, type ReactElement } from 'react';
import { X } from 'lucide-react';
import type { DrawerProps } from './types';
import './Drawer.scss';

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'default',
  id = 'crm-drawer',
}: DrawerProps): ReactElement | null {
  useEffect(() => {
    if (!isOpen) return undefined;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        className="crm-drawer-backdrop"
        onClick={onClose}
        role="presentation"
      />
      <aside
        className={`crm-drawer crm-drawer--${width}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
      >
        <header className="crm-drawer__header">
          <div>
            <h2 id={`${id}-title`} className="crm-drawer__title">
              {title}
            </h2>
            {subtitle ? (
              <p className="crm-drawer__subtitle">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="crm-drawer__close-btn"
            onClick={onClose}
            aria-label="Close panel"
          >
            <X size={18} />
          </button>
        </header>

        <div className="crm-drawer__body">
          {children}
        </div>

        {footer ? (
          <footer className="crm-drawer__footer">
            {footer}
          </footer>
        ) : null}
      </aside>
    </>
  );
}
