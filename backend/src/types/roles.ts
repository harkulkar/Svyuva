export const USER_ROLES = ['ADMIN', 'COLLEGE'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const INSTITUTE_STATUSES = ['ACTIVE', 'INACTIVE', 'PENDING', 'REJECTED'] as const;
export type InstituteStatus = (typeof INSTITUTE_STATUSES)[number];
