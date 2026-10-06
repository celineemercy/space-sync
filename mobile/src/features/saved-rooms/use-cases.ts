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
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.list();
}

export function saveRoom(
  input: CreateSavedRoomInput,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.create({ ...input, note: normalizeNote(input.note ?? "") });
}

export function changeSavedRoomNote(
  input: UpdateSavedRoomInput,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.update({ ...input, note: normalizeNote(input.note) });
}

export function deleteSavedRoom(
  id: string,
  repository: SavedRoomsRepository = savedRoomsRepository,
) {
  return repository.delete(id);
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
