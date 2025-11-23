export const USER_ROLES = {
  USER_MANAGEMENT: 'user-management',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

