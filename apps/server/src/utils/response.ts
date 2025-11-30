export function successResponse<T>(data: T, message?: string) {
    return {
        success: true,
        message,
        data,
    } as const;
}

export function paginatedResponse<T>(data: T[], pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages?: number;
}) {
    return {
        success: true,
        data,
        pagination: {
            ...pagination,
            totalPages: pagination.totalPages ?? Math.ceil(pagination.total / pagination.limit),
        },
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