export const MESSAGES = {
  // User Management
  USER: {
    CREATED: 'Kullanıcı başarıyla oluşturuldu',
    UPDATED: 'Kullanıcı başarıyla düzenlendi',
    DELETED: 'Kullanıcı başarıyla silindi',
    DELETE_ERROR: 'Kullanıcı silinirken hata oluştu',
    ADD: 'Kullanıcı Ekle',
    MANAGEMENT: 'Kullanıcı Yönetimi',
  },
  // Field Management
  FIELD: {
    CREATED: 'Alan başarıyla oluşturuldu',
    UPDATED: 'Alan başarıyla güncellendi',
    DELETED: 'Alan başarıyla silindi',
    CUSTOMIZE: 'Alan Özelliklerini Özelleştir',
    OPTION_ADD: 'Seçenek Ekle',
    OPTION_PREFIX: 'Seçenek',
    CHANGES_WARNING:
      'Dikkat: Alan seçeneklerinde değişiklik yaptınız, ancak bu değişiklikler kaydedilmedi.',
    SAVE_CHANGES: 'Değişiklikleri Kaydet',
  },
  // Ticket Type Management
  TICKET_TYPE: {
    CREATED: 'Ticket tipi başarıyla oluşturuldu',
    UPDATED: 'Ticket tipi başarıyla güncellendi',
    DELETED: 'Ticket tipi başarıyla silindi',
  },
  // Common
  COMMON: {
    LOADING: 'Gönderiliyor...',
    RETRY: 'Tekrar Dene',
    GO_HOME: 'Ana Sayfaya Dön',
    ERROR_OCCURRED: 'Bir hata oluştu',
    DEFAULT_OPTION_PLACEHOLDER: 'Varsayılan seçenek seçin',
  },
  // Form Labels
  LABELS: {
    FIRST_NAME: 'Ad',
    LAST_NAME: 'Soyad',
    EMAIL: 'E-Posta',
    PASSWORD: 'Şifre',
    ROLE: 'Rol',
    CREATED_AT: 'Oluşturulma Tarihi',
  },
} as const;
