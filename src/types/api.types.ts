export interface ApiSuccess<TData> {
  success: true;
  message?: string;
  data: TData;
}

export interface ApiFailure {
  success: false;
  message: string;
  code?: string;
  details?: Record<string, unknown>;
}
