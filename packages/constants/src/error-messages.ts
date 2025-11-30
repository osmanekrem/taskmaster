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
  STATUS_IN_USE: 'Status issue\'lar tarafından kullanılıyor, silinemez',
  STATUS_IN_WORKFLOW: 'Status workflow\'larda kullanılıyor, silinemez',

  // Resolution errors
  RESOLUTION_NOT_FOUND: 'Resolution bulunamadı',
  RESOLUTION_NAME_EXISTS: 'Bu isimde bir resolution zaten mevcut',
  CANNOT_MODIFY_SYSTEM_RESOLUTION: 'Sistem resolution\'ları değiştirilemez',
  CANNOT_DELETE_SYSTEM_RESOLUTION: 'Sistem resolution\'ları silinemez',
  CANNOT_DELETE_DEFAULT_RESOLUTION: 'Varsayılan resolution silinemez',
  RESOLUTION_IN_USE: 'Resolution issue\'lar tarafından kullanılıyor, silinemez',

  // Workflow errors
  WORKFLOW_NOT_FOUND: 'Workflow bulunamadı',
  WORKFLOW_NAME_EXISTS: 'Bu isimde bir workflow zaten mevcut',
  CANNOT_DELETE_DEFAULT_WORKFLOW: 'Varsayılan workflow silinemez',
  WORKFLOW_IN_USE: 'Workflow kullanımda, silinemez',
  
  // Workflow status errors
  WORKFLOW_STATUS_NOT_FOUND: 'Workflow status bulunamadı',
  STATUS_ALREADY_IN_WORKFLOW: 'Bu status zaten workflow\'da mevcut',
  STATUS_NOT_IN_WORKFLOW: 'Bu status workflow\'da mevcut değil',
  CANNOT_REMOVE_ONLY_STATUS: 'Workflow\'daki tek status silinemez',

  // Transition errors
  TRANSITION_NOT_FOUND: 'Transition bulunamadı',
  INVALID_TRANSITION: 'Bu geçiş izin verilmiyor',
  TRANSITION_FAILED: 'Transition başarısız oldu',
  TRANSITION_CONDITION_FAILED: 'Transition koşulu sağlanamadı',
  TRANSITION_VALIDATION_FAILED: 'Transition doğrulaması başarısız',

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

  // Issue errors
  ISSUE_NOT_FOUND: 'Issue bulunamadı',
  INVALID_ISSUE_KEY: 'Geçersiz issue key formatı',
  ISSUE_TYPE_NOT_IN_PROJECT: 'Bu issue type bu projede kullanılamaz',
  INVALID_STATUS_TRANSITION: 'Bu status geçişi izin verilmiyor',
  RESOLUTION_REQUIRED: 'Bu status için resolution gerekli',
  CANNOT_SET_RESOLUTION: 'Bu status için resolution atanamaz',
  PARENT_ISSUE_NOT_FOUND: 'Üst issue bulunamadı',
  EPIC_NOT_FOUND: 'Epic bulunamadı',
  INVALID_PARENT_HIERARCHY: 'Geçersiz üst issue ilişkisi',
  INVALID_EPIC_HIERARCHY: 'Sadece epic türündeki issue\'lara bağlanabilir',
  CIRCULAR_HIERARCHY: 'Döngüsel bağımlılık tespit edildi',
  CANNOT_MOVE_ISSUE_WITH_SUBTASKS: 'Alt görevleri olan issue taşınamaz',
  FIELD_VALUE_REQUIRED: 'Bu alan zorunludur',
  INVALID_FIELD_VALUE: 'Geçersiz alan değeri',

  // Comment errors
  COMMENT_NOT_FOUND: 'Yorum bulunamadı',
  COMMENT_ALREADY_DELETED: 'Yorum zaten silinmiş',
  CANNOT_EDIT_DELETED_COMMENT: 'Silinmiş yorum düzenlenemez',
  CANNOT_REPLY_TO_DELETED_COMMENT: 'Silinmiş yoruma yanıt verilemez',
  NOT_COMMENT_AUTHOR: 'Bu yorumu düzenleme yetkiniz yok',

  // Attachment errors
  ATTACHMENT_NOT_FOUND: 'Ek bulunamadı',
  FILE_TOO_LARGE: 'Dosya boyutu çok büyük',
  INVALID_FILE_TYPE: 'Geçersiz dosya türü',
  UPLOAD_FAILED: 'Dosya yüklenemedi',

  // Reaction errors
  REACTION_ALREADY_EXISTS: 'Bu tepki zaten eklenmiş',
  REACTION_NOT_FOUND: 'Tepki bulunamadı',

  // Sprint errors
  SPRINT_NOT_FOUND: 'Sprint bulunamadı',
  SPRINT_ALREADY_ACTIVE: 'Bu projede zaten aktif bir sprint var',
  CANNOT_START_SPRINT: 'Sadece planlanan sprint\'ler başlatılabilir',
  CANNOT_COMPLETE_SPRINT: 'Sadece aktif sprint\'ler tamamlanabilir',
  CANNOT_DELETE_ACTIVE_SPRINT: 'Aktif sprint silinemez',
  ISSUE_ALREADY_IN_SPRINT: 'Bu issue zaten bir sprint\'te',

  NOT_FOUND: 'Kayıt bulunamadı',
  VALIDATION_ERROR: 'Geçersiz veri',
  CONFLICT: 'Çakışma hatası',
  UNAUTHORIZED: 'Yetkilendirme gerekli',
  FORBIDDEN: 'Bu işlem için yetki gerekli',
  PERMISSION_DENIED: 'Bu işlem için yetkiniz yok',
  
  // Issue type errors
  ISSUE_TYPE_NOT_FOUND: 'Issue type bulunamadı',
  ISSUE_TYPE_IN_USE: 'Issue type kullanımda, silinemez',
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
  
  // Sprint errors
  SPRINT_NOT_FOUND: 'Sprint bulunamadı',
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

