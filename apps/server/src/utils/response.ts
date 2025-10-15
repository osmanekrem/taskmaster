export function successResponse<T>(data: T, message?: string) {
    return {
        success: true,
        message,
        data,
    } as const;
}

export function errorResponse(message: string, code?: string, details?: unknown) {
    return {
        success: false,
        message,
        error: {
            code,
            details,
        } as const,
    } as const;
}