export type User = {
  id: string;
  email: string;
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

export type ReservationStatus = "CONFIRMED" | "CANCELLED";

export type Reservation = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: ReservationStatus;
  cancelledAt: string | null;
  createdAt: string;
  room: Pick<Room, "id" | "code" | "name" | "location" | "capacity">;
};

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
