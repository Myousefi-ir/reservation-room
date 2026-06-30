/**
 * SQLite (via Prisma) has no native enum type, so the database columns are plain
 * strings. These union types mirror the allowed values and keep the rest of the
 * codebase type-safe. Keep them in sync with the comments in prisma/schema.prisma.
 */

export type UserStatus = 'pending' | 'active' | 'rejected';

export type UserRole = 'user' | 'admin';

export type ReservationStatus = 'active' | 'cancelled' | 'deleted';

export type AuditAction =
  | 'reservation_created'
  | 'reservation_cancelled'
  | 'reservation_updated'
  | 'reservation_rejected'
  | 'reservation_deleted'
  | 'user_approved'
  | 'user_rejected'
  | 'user_deleted'
  | 'role_granted'
  | 'role_revoked';
