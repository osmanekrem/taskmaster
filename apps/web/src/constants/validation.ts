export const VALIDATION_MESSAGES = {
  REQUIRED: 'Bu alan zorunludur',
  INVALID_EMAIL: 'Geçerli bir e-posta adresi girin',
  MIN_LENGTH: (min: number) => `En az ${min} karakter olmalıdır`,
  MAX_LENGTH: (max: number) => `En fazla ${max} karakter olabilir`,
  PASSWORD_MISMATCH: 'Şifreler eşleşmiyor',
  INVALID_EMAIL_OR_PASSWORD: 'Hatalı e-posta veya şifre',
} as const;
