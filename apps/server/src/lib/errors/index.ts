import { TRPCError } from '@trpc/server';
import { createHonoError } from '@osmanekrem/error-handler/hono';
import { AppError } from '@osmanekrem/error-handler/core';
import { ErrorMessages, type ErrorMessageKey } from '@taskmaster/constants';

function appErrorToTRPCError(error: AppError): TRPCError {
  const trpcCodeMap: Record<number, TRPCError['code']> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_CONTENT',
    500: 'INTERNAL_SERVER_ERROR',
  };

  const trpcCode = trpcCodeMap[error.statusCode] || 'INTERNAL_SERVER_ERROR';

  return new TRPCError({
    code: trpcCode,
    message: error.message,
    cause: error.context,
  });
}

export function toTRPCError(error: unknown): TRPCError {
  if (error instanceof AppError) {
    return appErrorToTRPCError(error);
  }

  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof Error) {
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message,
      cause: error,
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unknown error occurred',
  });
}

export function throwNotFoundError(
  messageKey: ErrorMessageKey = 'NOT_FOUND',
  context?: Record<string, unknown>,
): never {
  const message = ErrorMessages[messageKey];
  throw createHonoError('NOT_FOUND', message, 404, context);
}

export function throwValidationError(
  messageKey: ErrorMessageKey = 'VALIDATION_ERROR',
  context?: Record<string, unknown>,
): never {
  const message = ErrorMessages[messageKey];
  throw createHonoError('VALIDATION_ERROR', message, 400, context);
}

export function throwConflictError(
  messageKey: ErrorMessageKey = 'CONFLICT',
  context?: Record<string, unknown>,
): never {
  const message = ErrorMessages[messageKey];
  throw createHonoError('CONFLICT', message, 409, context);
}

export function throwUnauthorizedError(
  messageKey: ErrorMessageKey = 'UNAUTHORIZED',
  context?: Record<string, unknown>,
): never {
  const message = ErrorMessages[messageKey];
  throw createHonoError('UNAUTHORIZED', message, 401, context);
}

export function throwForbiddenError(
  messageKey: ErrorMessageKey = 'FORBIDDEN',
  context?: Record<string, unknown>,
): never {
  const message = ErrorMessages[messageKey];
  throw createHonoError('FORBIDDEN', message, 403, context);
}

export type { AppError } from '@osmanekrem/error-handler/core';
