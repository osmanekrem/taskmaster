import { toast } from 'sonner';
import type {
  AppError,
  ApiError,
  ValidationError,
  ErrorType,
} from './error-types';
import { ERROR_MESSAGES, getErrorMessage } from './error-messages';

export const handleApiError = (error: unknown): AppError => {
  if (error instanceof Error) {
    const errorObj = error as unknown as {
      code?: string;
      statusCode?: number;
      data?: unknown;
    };

    return {
      message: error.message || ERROR_MESSAGES.GENERIC,
      code: errorObj.code,
      statusCode: errorObj.statusCode,
      details: errorObj.data,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    return {
      message: (errorObj.message as string) || ERROR_MESSAGES.GENERIC,
      code: errorObj.code as string,
      statusCode: errorObj.statusCode as number,
      details: errorObj.details,
    };
  }

  return {
    message: getErrorMessage(error),
  };
};

export const handleError = (error: unknown, showToast = true): AppError => {
  const appError = handleApiError(error);

  if (showToast) {
    toast.error(appError.message, {
      description: appError.code ? `Hata kodu: ${appError.code}` : undefined,
    });
  }

  return appError;
};

export const getErrorType = (error: unknown): ErrorType => {
  const appError = handleApiError(error);

  if (appError.statusCode) {
    if (appError.statusCode >= 500) return 'api';
    if (appError.statusCode === 401 || appError.statusCode === 403)
      return 'api';
    if (appError.statusCode === 404) return 'api';
    if (appError.statusCode >= 400) return 'validation';
    return 'api';
  }

  if (appError.code === 'NETWORK_ERROR' || appError.code === 'TIMEOUT') {
    return 'network';
  }

  return 'unknown';
};

export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as ApiError).statusCode === 'number'
  );
};

export const isValidationError = (error: unknown): error is ValidationError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    'field' in error &&
    typeof (error as ValidationError).field === 'string'
  );
};
