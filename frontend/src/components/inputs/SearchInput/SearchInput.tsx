import {
  useState,
  useRef,
  useEffect,
  type ReactElement,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { Search, X } from 'lucide-react';
import type { SearchInputProps } from './types';
import {
  DEFAULT_SEARCH_PLACEHOLDER,
  DEFAULT_DEBOUNCE_MS,
  DEFAULT_SEARCH_ARIA_LABEL,
  CLEAR_SEARCH_ARIA_LABEL,
} from './constants';
import './SearchInput.scss';

export function SearchInput({
  value,
  onChange,
  onSearch,
  onClear,
  placeholder = DEFAULT_SEARCH_PLACEHOLDER,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  disabled = false,
  isLoading = false,
  id,
  className = '',
  ariaLabel = DEFAULT_SEARCH_ARIA_LABEL,
}: SearchInputProps): ReactElement {
  const [query, setQuery] = useState(value ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

  useEffect(() => () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const nextQuery = e.target.value;
    setQuery(nextQuery);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (debounceMs > 0) {
      debounceTimerRef.current = setTimeout(() => {
        onChange(nextQuery);
      }, debounceMs);
    } else {
      onChange(nextQuery);
    }
  }

  function handleClear() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setQuery('');
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  }

  function handleSearchClick() {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onSearch?.(query);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearchClick();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  }

  const containerClasses = [
    'search-input',
    disabled ? 'search-input--disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const showClearButton = Boolean(query) && !disabled;

  return (
    <div className={containerClasses}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="searchbox"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className="search-input__control"
      />

      <div className="search-input__suffix">
        {showClearButton ? (
          <button
            type="button"
            aria-label={CLEAR_SEARCH_ARIA_LABEL}
            onClick={handleClear}
            className="search-input__btn search-input__btn--clear"
          >
            <X size={14} />
          </button>
        ) : null}

        {isLoading ? (
          <span className="search-input__spinner" aria-hidden="true" />
        ) : (
          <button
            type="button"
            aria-label={ariaLabel}
            onClick={handleSearchClick}
            disabled={disabled}
            className="search-input__btn search-input__btn--search"
          >
            <Search size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
