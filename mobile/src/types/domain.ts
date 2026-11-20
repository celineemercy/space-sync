export type User = {
  id: string;
  email: string;
  role?: "STUDENT" | "ADMIN";
};

export type Facility = {
  id: string;
  name: string;
};

export type Room = {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  description: string | null;
  facilities: Facility[];
};

export type ReservationStatus = "PENDING" | "CONFIRMED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export type Reservation = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  cancelledAt: string | null;
  createdAt: string;
  decidedAt?: string | null;
  decidedById?: string | null;
  rejectionReason?: string | null;
  document?: { name: string | null; mime: string | null; size: number | null } | null;
  room: Pick<Room, "id" | "code" | "name" | "location" | "capacity">;
};

export type AdminReservation = Reservation & { student: Pick<User, "id" | "email"> };

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type AvailabilityResponse = {
  startsAt: string;
  endsAt: string;
  rooms: Room[];
};

export type AvailabilityInput = {
  startsAt: string;
  endsAt: string;
  minCapacity?: number;
  facilityIds?: string[];
};

export type RoomSchedule = { date: string; timeZone: string; items: { id: string; kind: 'class' | 'reservation'; startsAt: string; endsAt: string }[] };
export type CachedRoomSchedule = { schedule: RoomSchedule; updatedAt: string };
