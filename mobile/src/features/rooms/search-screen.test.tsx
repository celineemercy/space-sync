import { fireEvent, render } from "@testing-library/react-native";
import SearchScreen from "@/app/(app)/(tabs)/search";
import type { AvailabilityResponse, Room } from "@/types/domain";

const mockPush = jest.fn();
const mockRefetchRooms = jest.fn();
const mockRoomsQuery: {
  data: { rooms: Room[]; stale: boolean; updatedAt: string | null } | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  refetch: mockRefetchRooms,
};
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

const campusRoom: Room = {
  id: "campus-room",
  code: "A1",
  name: "Campus Room",
  location: "Main building",
  capacity: 10,
  description: null,
  facilities: [{ id: "projector", name: "Projector" }],
};
const availableRoom: Room = {
  ...campusRoom,
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
  useRooms: () => mockRoomsQuery,
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
  mockRoomsQuery.data = {
    rooms: [campusRoom],
    stale: false,
    updatedAt: null,
  };
  mockRoomsQuery.error = null;
  mockRoomsQuery.isLoading = false;
  mockRoomsQuery.isFetching = false;
  mockAvailability.data = {
    startsAt: "2030-01-01T02:00:00.000Z",
    endsAt: "2030-01-01T03:00:00.000Z",
    rooms: [availableRoom],
  };
  mockAvailability.error = null;
  mockAvailability.isPending = false;
  mockAvailability.mutate.mockReset();
  mockAvailability.reset.mockReset();
  mockRefetchRooms.mockReset();
  mockPush.mockReset();
});

describe("SearchScreen primary states", () => {
  it("renders the initial loading state", async () => {
    mockRoomsQuery.data = undefined;
    mockRoomsQuery.isLoading = true;
    const screen = await render(<SearchScreen />);
    expect(screen.getByLabelText("Loading campus rooms...")).toBeTruthy();
  });

  it("renders rooms after data loads", async () => {
    const screen = await render(<SearchScreen />);
    expect(screen.getByText("Campus Room")).toBeTruthy();
    expect(screen.getByText("A1")).toBeTruthy();
  });

  it("renders the empty state", async () => {
    mockRoomsQuery.data = { rooms: [], stale: false, updatedAt: null };
    const screen = await render(<SearchScreen />);
    expect(screen.getByText("No rooms found")).toBeTruthy();
  });

  it("renders an error and retries the room query", async () => {
    mockRoomsQuery.data = undefined;
    mockRoomsQuery.error = new Error("Rooms could not be loaded.");
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByLabelText("Try again"));
    expect(screen.getByText("Rooms could not be loaded.")).toBeTruthy();
    expect(mockRefetchRooms).toHaveBeenCalledTimes(1);
  });

  it("validates the form before requesting availability", async () => {
    const screen = await render(<SearchScreen />);
    await fireEvent.changeText(
      screen.getByLabelText("Minimum capacity (optional)"),
      "0",
    );
    await fireEvent.press(screen.getByLabelText("Search availability"));
    expect(
      screen.getByText("Capacity must be a positive whole number."),
    ).toBeTruthy();
    expect(mockAvailability.mutate).not.toHaveBeenCalled();
  });

  it("disables repeat submission while availability is loading", async () => {
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByLabelText("Search availability"));
    expect(mockAvailability.mutate).toHaveBeenCalledTimes(1);

    mockAvailability.isPending = true;
    await screen.rerender(<SearchScreen />);
    const submit = screen.getByLabelText("Search availability");
    expect(submit.props.accessibilityState).toEqual({
      busy: true,
      disabled: true,
    });
    await fireEvent.press(submit);
    expect(mockAvailability.mutate).toHaveBeenCalledTimes(1);
  });

  it("shows search loading without presenting all rooms as availability results", async () => {
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByLabelText("Search availability"));

    mockAvailability.isPending = true;
    await screen.rerender(<SearchScreen />);
    expect(screen.getByLabelText("Searching available rooms...")).toBeTruthy();
    expect(screen.queryByText("Campus Room")).toBeNull();
    expect(screen.queryByText("No rooms found")).toBeNull();
  });

  it("shows search errors and retries the same request", async () => {
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByLabelText("Search availability"));
    const searchedInput = mockAvailability.mutate.mock.calls[0][0];

    mockAvailability.error = new Error("Availability could not be loaded.");
    await screen.rerender(<SearchScreen />);
    expect(screen.getByText("Availability could not be loaded.")).toBeTruthy();
    expect(screen.queryByText("Campus Room")).toBeNull();
    await fireEvent.press(screen.getByLabelText("Try again"));
    expect(mockAvailability.mutate).toHaveBeenLastCalledWith(searchedInput);
  });
});

it.each(["capacity", "facility", "date", "start", "end"])(
  "removes old availability results when %s changes",
  async (field) => {
    const screen = await render(<SearchScreen />);
    await fireEvent.press(screen.getByLabelText("Search availability"));
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
        await fireEvent.press(
          screen.getByRole("checkbox", { name: "Projector" }),
        );
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
