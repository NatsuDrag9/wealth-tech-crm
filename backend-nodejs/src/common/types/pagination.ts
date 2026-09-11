export interface CursorPaginationResponse<T> {
  results: T[];
  next: string | null;
  previous: string | null;
  pageNumber: number | null;
  totalPages: number | null;
  totalSize: number | null;
}