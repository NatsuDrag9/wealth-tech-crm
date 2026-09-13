import type { ReactElement, ChangeEvent } from 'react';
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from 'lucide-react';
import type { PaginationProps } from './types';
import { DEFAULT_PAGE_SIZE_OPTIONS } from './constants';
import './Pagination.scss';

export function Pagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  disabled = false,
  id,
  className = '',
}: PaginationProps): ReactElement {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  const isFirstDisabled = disabled || safeCurrentPage <= 1;
  const isLastDisabled = disabled || safeCurrentPage >= totalPages;

  function handleFirst() {
    if (!isFirstDisabled) {
      onPageChange(1);
    }
  }

  function handlePrev() {
    if (!isFirstDisabled) {
      onPageChange(safeCurrentPage - 1);
    }
  }

  function handleNext() {
    if (!isLastDisabled) {
      onPageChange(safeCurrentPage + 1);
    }
  }

  function handleLast() {
    if (!isLastDisabled) {
      onPageChange(totalPages);
    }
  }

  function handlePageSizeSelect(e: ChangeEvent<HTMLSelectElement>) {
    const newSize = Number(e.target.value);
    onPageSizeChange(newSize);
    onPageChange(1);
  }

  return (
    <nav
      id={id}
      className={`pagination ${className}`.trim()}
      role="navigation"
      aria-label="Pagination Navigation"
    >
      <div className="pagination__info">
        <span>
          {`Showing ${startItem}–${endItem} of ${totalItems} items`}
        </span>
      </div>

      <div className="pagination__controls">
        <div className="pagination__page-size">
          <label htmlFor="pagination-page-size-select">
            Rows per page:
            <select
              id="pagination-page-size-select"
              value={pageSize}
              onChange={handlePageSizeSelect}
              disabled={disabled}
              aria-label="Rows per page"
              className="pagination__select"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="pagination__nav">
          <button
            type="button"
            onClick={handleFirst}
            disabled={isFirstDisabled}
            aria-label="Go to first page"
            className="pagination__btn pagination__btn--first"
          >
            <ChevronsLeft size={16} />
          </button>

          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirstDisabled}
            aria-label="Go to previous page"
            className="pagination__btn pagination__btn--prev"
          >
            <ChevronLeft size={16} />
          </button>

          <span className="pagination__status">
            {`Page ${safeCurrentPage} of ${totalPages}`}
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={isLastDisabled}
            aria-label="Go to next page"
            className="pagination__btn pagination__btn--next"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleLast}
            disabled={isLastDisabled}
            aria-label="Go to last page"
            className="pagination__btn pagination__btn--last"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
