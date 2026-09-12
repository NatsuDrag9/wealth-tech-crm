export interface DropdownOption<T = string | number> {
  display_name: string;
  value: T;
}

export interface CursorPaginatedResponse<T> {
  results: T[];
  next?: string | number | null;
  previous?: string | number | null;
  page_number?: number | null;
  total_pages?: number | null;
  total_size?: number | null;
}

export interface ApiErrorResponse {
  status?: string;
  message?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}
