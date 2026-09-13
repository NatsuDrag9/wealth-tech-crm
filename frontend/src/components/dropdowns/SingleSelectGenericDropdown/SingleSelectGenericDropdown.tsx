import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
  type KeyboardEvent,
} from 'react';
import { ChevronDown, Check } from 'lucide-react';
import type { DropdownType } from '@/types/genericTypes';
import type { SingleSelectGenericDropdownProps } from './types';
import {
  DEFAULT_DROPDOWN_PLACEHOLDER,
  NO_DATA_MESSAGE,
  TYPEAHEAD_TIMEOUT_MS,
} from './constants';
import './SingleSelectGenericDropdown.scss';

export function SingleSelectGenericDropdown({
  options,
  value = null,
  onChange,
  onBlur,
  label,
  placeholder = DEFAULT_DROPDOWN_PLACEHOLDER,
  noDataMessage = NO_DATA_MESSAGE,
  disabled = false,
  error,
  id,
  className = '',
}: SingleSelectGenericDropdownProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchBufferRef = useRef<string>('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIndex = options.findIndex((opt) => opt.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;

  useEffect(() => {
    if (isOpen) {
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    } else {
      setHighlightedIndex(-1);
    }
  }, [isOpen, selectedIndex]);

  useEffect(() => {
    if (isOpen && listRef.current && highlightedIndex >= 0) {
      const items = listRef.current.querySelectorAll('li[role="option"]');
      const target = items[highlightedIndex] as HTMLElement | undefined;
      if (target) {
        target.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [isOpen, highlightedIndex]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current
        && !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        onBlur?.();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onBlur]);

  function handleBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (
      containerRef.current
      && !containerRef.current.contains(event.relatedTarget as Node)
    ) {
      setIsOpen(false);
      onBlur?.();
    }
  }

  function toggleOpen() {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }

  function handleSelect(option: DropdownType) {
    onChange(option.value, option);
    setIsOpen(false);
    onBlur?.();
  }

  function handleTypeahead(char: string) {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchBufferRef.current += char.toLowerCase();
    const query = searchBufferRef.current;

    searchTimeoutRef.current = setTimeout(() => {
      searchBufferRef.current = '';
    }, TYPEAHEAD_TIMEOUT_MS);

    let matchIdx = options.findIndex((opt) => (
      opt.displayName.toLowerCase().startsWith(query)
    ));
    if (matchIdx === -1) {
      matchIdx = options.findIndex((opt) => (
        opt.displayName.toLowerCase().includes(query)
      ));
    }

    if (matchIdx !== -1) {
      if (!isOpen) {
        setIsOpen(true);
      }
      setHighlightedIndex(matchIdx);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return;

    if (e.key === 'Escape') {
      setIsOpen(false);
      onBlur?.();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (
          prev < options.length - 1 ? prev + 1 : 0
        ));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (
          prev > 0 ? prev - 1 : options.length - 1
        ));
      }
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (isOpen && highlightedIndex >= 0 && options[highlightedIndex]) {
        handleSelect(options[highlightedIndex]);
      } else {
        toggleOpen();
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      handleTypeahead(e.key);
    }
  }

  const controlClasses = [
    'single-select-dropdown__control',
    isOpen ? 'single-select-dropdown__control--open' : '',
    disabled ? 'single-select-dropdown__control--disabled' : '',
    error ? 'single-select-dropdown__control--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const chevronClasses = [
    'single-select-dropdown__chevron',
    isOpen ? 'single-select-dropdown__chevron--open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      id={id}
      className={`single-select-dropdown ${className}`.trim()}
      onBlur={handleBlur}
    >
      {label ? (
        <span className="single-select-dropdown__label">{label}</span>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-describedby={error && id ? `${id}-error` : undefined}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={controlClasses}
      >
        <span
          className={`single-select-dropdown__value ${
            !selectedOption ? 'single-select-dropdown__value--placeholder' : ''
          }`}
        >
          {selectedOption ? selectedOption.displayName : placeholder}
        </span>

        <span className={chevronClasses} aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </div>

      {isOpen && !disabled ? (
        <ul ref={listRef} className="single-select-dropdown__menu" role="listbox">
          {options.length === 0 ? (
            <li className="single-select-dropdown__no-data" role="status">
              {noDataMessage}
            </li>
          ) : (
            options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              const itemClasses = [
                'single-select-dropdown__item',
                isSelected ? 'single-select-dropdown__item--selected' : '',
                isHighlighted
                  ? 'single-select-dropdown__item--highlighted'
                  : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(option)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSelect(option);
                    }
                  }}
                  tabIndex={-1}
                  className={itemClasses}
                >
                  <span>{option.displayName}</span>
                  {isSelected ? <Check size={14} /> : null}
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {error ? (
        <span
          id={id ? `${id}-error` : undefined}
          className="single-select-dropdown__error-text"
          role="alert"
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
