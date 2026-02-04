/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    currentPage: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  code?: string;
  status?: number;
}
