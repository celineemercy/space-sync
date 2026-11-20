import {
  SAVED_ROOM_NOTE_MAX_LENGTH,
  type CreateSavedRoomInput,
  type UpdateSavedRoomInput,
} from "@/features/saved-rooms/model";
import {
  savedRoomsRepository,
  type SavedRoomsRepository,
} from "@/features/saved-rooms/repository";

export function listSavedRooms(
  userId: string,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.list(userId);
}

export function saveRoom(
  userId: string,
  input: CreateSavedRoomInput,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.create(userId, { ...input, note: normalizeNote(input.note ?? "") });
}

export function changeSavedRoomNote(
  userId: string,
  input: UpdateSavedRoomInput,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.update(userId, { ...input, note: normalizeNote(input.note) });
}

export function deleteSavedRoom(
  userId: string,
  id: string,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.delete(userId, id);
}

function normalizeNote(note: string) {
  const normalized = note.trim();
  if (normalized.length > SAVED_ROOM_NOTE_MAX_LENGTH) {
    throw new Error(
      `Note must be ${SAVED_ROOM_NOTE_MAX_LENGTH} characters or fewer.`,
    );
  }
  return normalized;
}
