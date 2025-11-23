export const ERROR_MESSAGES = {
  GENERIC: 'Bir hata oluştu',
  NETWORK: 'Ağ bağlantısı hatası. Lütfen internet bağlantınızı kontrol edin.',
  UNAUTHORIZED: 'Yetkiniz bulunmuyor. Lütfen tekrar giriş yapın.',
  FORBIDDEN: 'Bu işlem için yetkiniz bulunmuyor.',
  NOT_FOUND: 'İstenen kaynak bulunamadı.',
  SERVER_ERROR: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
  VALIDATION: 'Girdiğiniz bilgileri kontrol edin.',
  TIMEOUT: 'İstek zaman aşımına uğradı. Lütfen tekrar deneyin.',
} as const;

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return ERROR_MESSAGES.GENERIC;
};
