import { fireEvent, render } from "@testing-library/react-native";
import SavedRoomsScreen from "@/app/(app)/(tabs)/saved";
import type { SavedRoom } from "@/features/saved-rooms/model";

const savedRoom: SavedRoom = {
  id: "room-1",
  roomId: "room-1",
  code: "A1",
  name: "Campus Room",
  location: "Main building",
  capacity: 10,
  note: "Quiet after lunch",
  createdAt: "2030-01-01T00:00:00.000Z",
  updatedAt: "2030-01-01T00:00:00.000Z",
};

const mockRefetch = jest.fn();
const mockSavedRoomsQuery: {
  data: SavedRoom[] | undefined;
  error: Error | null;
  isLoading: boolean;
  isFetching: boolean;
  refetch: jest.Mock;
} = {
  data: undefined,
  error: null,
  isLoading: false,
  isFetching: false,
  refetch: mockRefetch,
};
const mockUpdate = {
  error: null as Error | null,
  isPending: false,
  mutateAsync: jest.fn(),
  reset: jest.fn(),
};
const mockDelete = {
  error: null as Error | null,
  isPending: false,
  mutateAsync: jest.fn(),
  reset: jest.fn(),
};

jest.mock("@/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user", email: "student@example.test" } }),
}));
jest.mock("@/features/saved-rooms/queries", () => ({
  useSavedRooms: () => mockSavedRoomsQuery,
  useUpdateSavedRoom: () => mockUpdate,
  useDeleteSavedRoom: () => mockDelete,
}));

beforeEach(() => {
  mockSavedRoomsQuery.data = [savedRoom];
  mockSavedRoomsQuery.error = null;
  mockSavedRoomsQuery.isLoading = false;
  mockSavedRoomsQuery.isFetching = false;
  mockRefetch.mockReset();
  mockUpdate.error = null;
  mockUpdate.isPending = false;
  mockUpdate.mutateAsync.mockReset().mockResolvedValue(savedRoom);
  mockUpdate.reset.mockReset();
  mockDelete.error = null;
  mockDelete.isPending = false;
  mockDelete.mutateAsync.mockReset().mockResolvedValue(undefined);
  mockDelete.reset.mockReset();
});

it("reads saved rooms from local persistence", async () => {
  const screen = await render(<SavedRoomsScreen />);

  expect(screen.getByText("Campus Room")).toBeTruthy();
  expect(screen.getByText("Quiet after lunch")).toBeTruthy();
});

it("renders an empty state when nothing is saved", async () => {
  mockSavedRoomsQuery.data = [];
  const screen = await render(<SavedRoomsScreen />);

  expect(screen.getByText("No saved rooms yet")).toBeTruthy();
});

it("updates a personal note", async () => {
  const screen = await render(<SavedRoomsScreen />);

  await fireEvent.press(screen.getByLabelText("Edit note"));
  await fireEvent.changeText(
    screen.getByLabelText("Note for Campus Room"),
    "Bring an HDMI adapter",
  );
  await fireEvent.press(screen.getByLabelText("Save changes"));

  expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({
    id: savedRoom.id,
    note: "Bring an HDMI adapter",
  });
});

it("deletes a saved room after confirmation", async () => {
  const screen = await render(<SavedRoomsScreen />);

  await fireEvent.press(screen.getByLabelText("Remove Campus Room"));
  expect(screen.getByText("Remove this saved room?")).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Remove saved room"));

  expect(mockDelete.mutateAsync).toHaveBeenCalledWith(savedRoom.id);
});
