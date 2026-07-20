export interface PaginatedQueryModel {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface SingleResponseModel<T> {
  object: T;
}

export interface ListResponseModel<T> {
  objects: T[];
  count: number;
}
