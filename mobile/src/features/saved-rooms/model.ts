import type { Room } from "@/types/domain";

export const SAVED_ROOM_NOTE_MAX_LENGTH = 200;

export type SavedRoom = {
  id: string;
  roomId: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateSavedRoomInput = {
  room: Room;
  note?: string;
};

export type UpdateSavedRoomInput = {
  id: string;
  note: string;
};
