export interface AppError {
  message: string;
  code?: string;
  statusCode?: number;
  details?: unknown;
}

export interface ApiError extends AppError {
  statusCode: number;
  code: string;
}

export interface ValidationError extends AppError {
  field?: string;
  errors?: Array<{ field: string; message: string }>;
}

export type ErrorType = 'api' | 'validation' | 'network' | 'unknown';
