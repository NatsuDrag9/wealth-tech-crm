import {
  useState,
  useRef,
  useEffect,
  useMemo,
  type ReactElement,
  type KeyboardEvent,
} from 'react';
import { useController, useFormContext } from 'react-hook-form';
import { ChevronDown, Check } from 'lucide-react';
import type { MultiSelectDropdownProps } from './types';
import {
  DEFAULT_MULTI_SELECT_PLACEHOLDER,
  NO_DATA_MESSAGE,
  TYPEAHEAD_TIMEOUT_MS,
} from './constants';
import './MultiSelectDropdown.scss';

export function MultiSelectDropdown({
  name,
  options,
  label,
  placeholder = DEFAULT_MULTI_SELECT_PLACEHOLDER,
  noDataMessage = NO_DATA_MESSAGE,
  disabled = false,
  id,
  className = '',
}: MultiSelectDropdownProps): ReactElement {
  const { control } = useFormContext();
  const {
    field: { value, onChange, onBlur },
    fieldState: { error, isTouched },
  } = useController({ name, control });

  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchBufferRef = useRef<string>('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const inputId = id || `multi-select-${name}`;
  const hasError = Boolean(error) && isTouched;
  const selectedValues = useMemo<string[]>(
    () => (Array.isArray(value) ? value : []),
    [value],
  );

  const selectedOptions = options.filter((opt) => (
    selectedValues.includes(opt.value)
  ));

  useEffect(() => {
    if (!isOpen) {
      setHighlightedIndex(-1);
    } else if (options.length > 0) {
      const firstSelectedIdx = options.findIndex((opt) => (
        selectedValues.includes(opt.value)
      ));
      setHighlightedIndex(firstSelectedIdx >= 0 ? firstSelectedIdx : 0);
    }
  }, [isOpen, options, selectedValues]);

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
        onBlur();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen, onBlur]);

  function handleContainerBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (
      containerRef.current
      && !containerRef.current.contains(event.relatedTarget as Node)
    ) {
      setIsOpen(false);
      onBlur();
    }
  }

  function toggleOpen() {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }

  function handleToggleOption(optValue: string) {
    const isSelected = selectedValues.includes(optValue);
    const updated = isSelected
      ? selectedValues.filter((val) => val !== optValue)
      : [...selectedValues, optValue];
    onChange(updated);
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
      onBlur();
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
        handleToggleOption(options[highlightedIndex].value);
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
    'multi-select-dropdown__control',
    isOpen ? 'multi-select-dropdown__control--open' : '',
    disabled ? 'multi-select-dropdown__control--disabled' : '',
    hasError ? 'multi-select-dropdown__control--error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const chevronClasses = [
    'multi-select-dropdown__chevron',
    isOpen ? 'multi-select-dropdown__chevron--open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      id={id}
      className={`multi-select-dropdown ${className}`.trim()}
      onBlur={handleContainerBlur}
    >
      {label ? (
        <span className="multi-select-dropdown__label">{label}</span>
      ) : null}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-disabled={disabled}
        aria-describedby={hasError ? `${inputId}-error` : undefined}
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        className={controlClasses}
      >
        <span
          className={`multi-select-dropdown__value ${
            selectedOptions.length === 0
              ? 'multi-select-dropdown__value--placeholder'
              : ''
          }`}
        >
          {selectedOptions.length === 0
            ? placeholder
            : selectedOptions.map((opt) => opt.displayName).join(', ')}
        </span>

        <span className={chevronClasses} aria-hidden="true">
          <ChevronDown size={16} />
        </span>
      </div>

      {isOpen && !disabled ? (
        <ul
          ref={listRef}
          className="multi-select-dropdown__menu"
          role="listbox"
          aria-multiselectable="true"
        >
          {options.length === 0 ? (
            <li className="multi-select-dropdown__no-data" role="status">
              {noDataMessage}
            </li>
          ) : (
            options.map((option, index) => {
              const isSelected = selectedValues.includes(option.value);
              const isHighlighted = index === highlightedIndex;

              const itemClasses = [
                'multi-select-dropdown__item',
                isSelected ? 'multi-select-dropdown__item--selected' : '',
                isHighlighted ? 'multi-select-dropdown__item--highlighted' : '',
              ]
                .filter(Boolean)
                .join(' ');

              const checkboxClasses = [
                'multi-select-dropdown__checkbox',
                isSelected ? 'multi-select-dropdown__checkbox--checked' : '',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleToggleOption(option.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleToggleOption(option.value);
                    }
                  }}
                  tabIndex={-1}
                  className={itemClasses}
                >
                  <span>{option.displayName}</span>
                  <div className={checkboxClasses} aria-hidden="true">
                    {isSelected ? <Check size={12} strokeWidth={3} /> : null}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      ) : null}

      {hasError && error?.message ? (
        <span
          id={`${inputId}-error`}
          className="multi-select-dropdown__error-text"
          role="alert"
        >
          {error.message}
        </span>
      ) : null}
    </div>
  );
}
