// Server-side error messages
export const ErrorMessages = {
  USER_NOT_FOUND: 'Kullanıcı bulunamadı',
  USER_EMAIL_ALREADY_EXISTS: 'Bu e-posta adresi zaten kullanılıyor',

  FIELD_NOT_FOUND: 'Alan bulunamadı',

  FIELD_TYPE_NOT_FOUND: 'Alan türü bulunamadı',

  TICKET_TYPE_NOT_FOUND: 'Bilet türü bulunamadı',

  ISSUE_TYPE_FIELD_NOT_FOUND: 'Bu alan bilet türüne atanmamış',

  // Status errors
  STATUS_NOT_FOUND: 'Status bulunamadı',
  STATUS_NAME_EXISTS: 'Bu isimde bir status zaten mevcut',
  CANNOT_MODIFY_SYSTEM_STATUS: 'Sistem statusleri değiştirilemez',
  CANNOT_DELETE_SYSTEM_STATUS: 'Sistem statusleri silinemez',

  // Resolution errors
  RESOLUTION_NOT_FOUND: 'Resolution bulunamadı',
  RESOLUTION_NAME_EXISTS: 'Bu isimde bir resolution zaten mevcut',
  CANNOT_MODIFY_SYSTEM_RESOLUTION: 'Sistem resolution\'ları değiştirilemez',
  CANNOT_DELETE_SYSTEM_RESOLUTION: 'Sistem resolution\'ları silinemez',
  CANNOT_DELETE_DEFAULT_RESOLUTION: 'Varsayılan resolution silinemez',

  // Workflow errors
  WORKFLOW_NOT_FOUND: 'Workflow bulunamadı',
  WORKFLOW_NAME_EXISTS: 'Bu isimde bir workflow zaten mevcut',
  CANNOT_DELETE_DEFAULT_WORKFLOW: 'Varsayılan workflow silinemez',
  
  // Workflow status errors
  WORKFLOW_STATUS_NOT_FOUND: 'Workflow status bulunamadı',
  STATUS_ALREADY_IN_WORKFLOW: 'Bu status zaten workflow\'da mevcut',
  STATUS_NOT_IN_WORKFLOW: 'Bu status workflow\'da mevcut değil',
  CANNOT_REMOVE_ONLY_STATUS: 'Workflow\'daki tek status silinemez',

  // Transition errors
  TRANSITION_NOT_FOUND: 'Transition bulunamadı',
  INVALID_TRANSITION: 'Bu geçiş izin verilmiyor',

  // Project errors
  PROJECT_NOT_FOUND: 'Proje bulunamadı',
  PROJECT_KEY_EXISTS: 'Bu proje anahtarı zaten kullanılıyor',
  PROJECT_NAME_EXISTS: 'Bu isimde bir proje zaten mevcut',
  CANNOT_DELETE_ARCHIVED_PROJECT: 'Arşivlenmiş proje silinemez, önce arşivden çıkarın',
  PROJECT_HAS_ISSUES: 'Bu projede issue\'lar var, önce issue\'ları silin veya taşıyın',
  
  // Project issue type errors
  PROJECT_ISSUE_TYPE_NOT_FOUND: 'Bu issue type projede bulunamadı',
  ISSUE_TYPE_ALREADY_IN_PROJECT: 'Bu issue type zaten projede mevcut',
  CANNOT_REMOVE_ISSUE_TYPE_WITH_ISSUES: 'Bu issue type\'da issue\'lar var, önce issue\'ları silin veya taşıyın',

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

