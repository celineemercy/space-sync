export const roomWithFacilities = {
  roomFacilities: {
    include: { facility: true },
    orderBy: { facility: { name: 'asc' as const } },
  },
} as const;

type RoomRecord = {
  id: string;
  code: string;
  name: string;
  location: string;
  capacity: number;
  description: string | null;
  roomFacilities: Array<{ facility: { id: string; name: string } }>;
};

export function toRoomDto(room: RoomRecord) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    location: room.location,
    capacity: room.capacity,
    description: room.description,
    facilities: room.roomFacilities.map(({ facility }) => facility),
  };
}
