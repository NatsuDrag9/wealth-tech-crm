export interface CursorPaginationResponse<T> {
    result: T[];
    next: String | null;
    prev: String | null;
    totalPages: number | null;
    pageNumber: number | null;
    totalSize: number | null;
}