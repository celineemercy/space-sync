import { fireEvent, render } from "@testing-library/react-native";
import SearchScreen from "@/app/(app)/(tabs)/search";
import type { AvailabilityResponse, Room } from "@/types/domain";

const mockPush = jest.fn();
const mockAvailability: {
  data: AvailabilityResponse | undefined;
  error: Error | null;
  isPending: boolean;
  mutate: jest.Mock;
  reset: jest.Mock;
} = {
  data: undefined,
  error: null,
  isPending: false,
  mutate: jest.fn(),
  reset: jest.fn(),
};

const mockCampusRoom: Room = {
  id: "campus-room",
  code: "A1",
  name: "Campus Room",
  location: "Main building",
  capacity: 10,
  description: null,
  facilities: [{ id: "projector", name: "Projector" }],
};
const availableRoom: Room = {
  ...mockCampusRoom,
  id: "available-room",
  code: "B1",
  name: "Available Room",
};

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { id: "user", email: "student@example.test" },
    signOut: jest.fn(),
  }),
}));
jest.mock("@/features/rooms/queries", () => ({
  useRooms: () => ({
    data: { rooms: [mockCampusRoom], stale: false, updatedAt: null },
    error: null,
    isLoading: false,
  }),
  useAvailabilitySearch: () => mockAvailability,
}));
jest.mock("@/components/date-time-controls", () => {
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    DateTimeControls: ({
      onDateChange,
      onStartChange,
      onEndChange,
    }: {
      onDateChange: (value: Date) => void;
      onStartChange: (value: Date) => void;
      onEndChange: (value: Date) => void;
    }) => (
      <>
        <Pressable onPress={() => onDateChange(new Date(2030, 0, 2))}>
          <Text>Change date</Text>
        </Pressable>
        <Pressable onPress={() => onStartChange(new Date(2030, 0, 1, 9))}>
          <Text>Change start</Text>
        </Pressable>
        <Pressable onPress={() => onEndChange(new Date(2030, 0, 1, 11))}>
          <Text>Change end</Text>
        </Pressable>
      </>
    ),
  };
});

beforeEach(() => {
  mockAvailability.data = {
    startsAt: "2030-01-01T02:00:00.000Z",
    endsAt: "2030-01-01T03:00:00.000Z",
    rooms: [availableRoom],
  };
  mockAvailability.mutate.mockClear();
  mockAvailability.reset.mockClear();
  mockPush.mockClear();
});

it.each(["capacity", "facility", "date", "start", "end"])(
  "removes old availability results when %s changes",
  async (field) => {
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByText("Search availability"));
    expect(screen.getByText("Available rooms")).toBeTruthy();
    expect(screen.getByText("Available Room")).toBeTruthy();

    switch (field) {
      case "capacity":
        await fireEvent.changeText(
          screen.getByLabelText("Minimum capacity (optional)"),
          "8",
        );
        break;
      case "facility":
        await fireEvent.press(screen.getByRole("checkbox", { name: "Projector" }));
        break;
      case "date":
        await fireEvent.press(screen.getByText("Change date"));
        break;
      case "start":
        await fireEvent.press(screen.getByText("Change start"));
        break;
      case "end":
        await fireEvent.press(screen.getByText("Change end"));
        break;
    }

    expect(screen.getByText("Campus rooms")).toBeTruthy();
    expect(screen.getByText("Campus Room")).toBeTruthy();
    expect(screen.queryByText("Available Room")).toBeNull();
    expect(mockAvailability.reset).toHaveBeenCalledTimes(1);
  },
);
