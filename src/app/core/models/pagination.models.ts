export interface PaginatedQueryModel {
  page?: number;
  limit?: number;
}

export interface PaginatedResultModel<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
