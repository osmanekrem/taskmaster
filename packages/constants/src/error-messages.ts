// Server-side error messages
export const ErrorMessages = {
  USER_NOT_FOUND: 'Kullanıcı bulunamadı',
  USER_EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kullanılıyor',

  FIELD_NOT_FOUND: 'Alan bulunamadı',

  FIELD_TYPE_NOT_FOUND: 'Alan türü bulunamadı',

  TICKET_TYPE_NOT_FOUND: 'Bilet türü bulunamadı',

  NOT_FOUND: 'Kayıt bulunamadı',
  VALIDATION_ERROR: 'Geçersiz veri',
  CONFLICT: 'Çakışma hatası',
  UNAUTHORIZED: 'Yetkilendirme gerekli',
  FORBIDDEN: 'Bu işlem için yetki gerekli',
} as const;

export type ErrorMessageKey = keyof typeof ErrorMessages;

// Client-side error messages
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

