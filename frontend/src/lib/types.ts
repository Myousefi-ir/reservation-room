export type Role = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'rejected';
export type ReservationStatus = 'active' | 'cancelled' | 'deleted';
export type SlotStatus = 'available' | 'past' | 'booked' | 'closed';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface Slot {
  start: string;
  end: string;
  hour: number;
  status: SlotStatus;
}

export interface RoomAvailability {
  roomId: string;
  roomName: string;
  slots: Slot[];
}

export interface Availability {
  date: string;
  weekday: number;
  isAllowedDay: boolean;
  isWithinWindow: boolean;
  rooms: RoomAvailability[];
}

export interface Room {
  id: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface Participant {
  type: 'user' | 'guest';
  userId?: string;
  name: string;
}

export interface Reservation {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  attendees: number;
  status: ReservationStatus;
  createdAt: string;
  room: { id: string; name: string };
  canCancel?: boolean;
  participants: Participant[];
  reservedBy?: { id: string; name: string; mobile: string };
}

export interface UserSearchResult {
  id: string;
  fullName: string;
  mobile: string;
}

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  status: UserStatus;
  role: Role;
  createdAt: string;
}

export interface DashboardStats {
  users: { total: number; pending: number; active: number };
  reservations: { today: number; week: number };
  rooms: { total: number; freeNow: number; occupiedNow: number };
  week: { start: string; end: string };
  asOf: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
