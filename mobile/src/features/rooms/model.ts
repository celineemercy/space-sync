import { z } from "zod";
import { ApiClientError } from "@/lib/api";
import type { AvailabilityResponse, Room } from "@/types/domain";

export const roomSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  location: z.string().min(1),
  capacity: z.number().int().positive(),
  description: z.string().nullable(),
  facilities: z.array(
    z.object({ id: z.string().min(1), name: z.string().min(1) }),
  ),
});

export const availabilitySchema = z.object({
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  rooms: z.array(roomSchema),
});

function parseResponse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ApiClientError(
      "The server returned invalid room data. Please try again.",
      0,
      "INVALID_RESPONSE",
    );
  }
  return result.data;
}

export function parseRoom(value: unknown): Room {
  return parseResponse(roomSchema, value);
}

export function parseRooms(value: unknown): Room[] {
  return parseResponse(z.array(roomSchema), value);
}

export function parseAvailability(value: unknown): AvailabilityResponse {
  return parseResponse(availabilitySchema, value);
}
