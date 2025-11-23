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
