export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  total: number;
  totalPages: number;
  current: number;
  size: number;
}

export interface ApiResponse<T> {
  status: boolean;
  statusCode: number;
  message: string;
  data: T;
  meta?: {
    pagination?: PaginationMeta;
  };
}
